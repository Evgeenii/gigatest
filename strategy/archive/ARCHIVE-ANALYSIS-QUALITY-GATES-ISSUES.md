# Аналитический отчёт: Проблемы Quality Gates в GigaTest Audit

**Дата:** 2026-04-22
**Основание:** Анализ 4 audit-отчётов (1 def-restr + 3 defaults) + код gigatest

---

## 0. Резюме (Executive Summary)

Проанализированы 4 audit-отчёта, сгенерированных агентом `test-auditor` на двух Java-проектах:

| Отчёт | Проект | Источников | Тестов | Full | Partial | Invalid | Missing |
|-------|--------|-----------|--------|------|---------|---------|---------|
| def-restr 2026-04-20 | default-restructuring-services | 839 | 337 | **0** | 8 | 0 | 12 |
| defaults 2026-04-21 (run 1) | defaults | 45 targets | 68 | 28 (62%) | 12 (27%) | 1 (2%) | 4 (9%) |
| defaults 2026-04-21 (run 2) | defaults-core | 191 targets | 26 | 0 | 26 | 0 | 165 |
| defaults 2026-04-21 (run 3) | defaults | 45 targets | 68 | 28 (62%) | 12 (27%) | 1 (2%) | 4 (9%) |

**Выявлено 6 системных проблем**, от наиболее критичных к наименее:

| # | Проблема | Severity | Затронутые проекты |
|---|----------|----------|-------------------|
| P1 | Status inconsistency: `full` с failed quality gates | **BUG (P0)** | defaults |
| P2 | Quality Checklist: Q4/Q7/Q9 — blockers, слишком жёсткие | **DESIGN (P0)** | Все |
| P3 | Дубликаты задач в audit plan | **BUG (P1)** | defaults |
| P4 | LLM-based branch coverage — ненадёжная оценка | **DESIGN (P1)** | Все |
| P5 | Aggregate-метрики создают ложное впечатление о 0% full | **UX (P1)** | def-restr |
| P6 | "Error handling" не учитывает глобальные exception handlers | **DESIGN (P2)** | def-restr, defaults |

---

## P1. BUG: Status `full` при failed quality gate items

### Описание

В `agent-state.json` проекта defaults обнаружены записи, где `coverage_status: "full"` но при этом **Q7 помечен как ✗ FAILED**:

**Пример 1** — `EwsReceivedEventHandlerImpl`:
```json
{
  "coverage_status": "full",
  "quality_gate": [
    "Q7: ✗ Error handling NOT covered",
    "Q8: ✓ Async behavior handled"
  ]
}
```

**Пример 2** — `EwsSendTaskCreatorProviderImpl`:
```json
{
  "coverage_status": "full",
  "quality_gate": [
    "Q7: ✗ Error handling NOT covered (no invalid type tests)"
  ]
}
```

### Root cause

Coverage Scoring Algorithm (test-audit/SKILL.md §2.4) требует:
```
failed_count == 0 → full
failed_count >= 1 → partial
```

Но аудитор-агент **неконсистентно** применяет этот алгоритм: часть файлов получила `full` несмотря на ✗ в Q7. Вероятная причина — субъективная оценка LLM: агент видит что happy path покрыт хорошо и ставит `full`, игнорируя формальный fail Q7.

### Влияние

Этот баг подрывает доверие ко всем `full` статусам. Если `full` может содержать failed items — значит scoring algorithm не исполняется строго.

### Рекомендуемое решение

1. **Scoring algorithm должен быть строгим** — failed_count >= 1 = автоматический `partial`, без исключений
2. **Перенести Q7/Q9 из `required` в `recommended`** — см. P2 ниже. Тогда их absence не блокирует `full`
3. Добавить **автовалидацию**: если в JSON `coverage_status == "full"` но есть `quality_gate` с `satisfied: false` → ошибка схемы

---

## P2. DESIGN: Q4/Q7/Q9 — слишком жёсткие блокирующие критерии для `full`

### Текущее состояние

Сейчас **все 9 пунктов** Quality Checklist (testing-standards.md §3) — блокирующие для статуса `full`. Один ✗ → `partial`.

| Критерий | Описание | Статус-кво | Рекомендация |
|----------|----------|------------|--------------|
| Q1 | No internal state assertions | ✓ OK | Оставить strict (security) |
| Q2 | Asserts check observable behavior | ✓ OK | Оставить strict (security) |
| Q3 | One test = one scenario | ✓ OK | Оставить strict |
| **Q4** | **Test names describe behavior** | ⚠️ Too strict | **↓ recommended** |
| Q5 | No excessive mocking | ✓ OK | Оставить strict |
| Q6 | Happy path covered | ✓ OK | Оставить strict |
| **Q7** | **Error handling covered** | ⚠️ Too strict | **↓ recommended (для сервисов)** |
| Q8 | Async behavior handled | ✓ OK (conditional) | Оставить |
| **Q9** | **Branch coverage (if/else)** | ⚠️ Too strict | **↓ recommended** |

### Q4: Test Naming

**Текущее требование:** Имя теста должно описывать поведение (`should_return_404_when_user_not_found`), а не действие (`test_get_user`).

**Проблема:** Именование — это **читаемость**, а не **корректность**. Тест с именем `test_get_user()` может полностью покрывать поведение. Неправильное имя не делает тест бесполезным.

**Данные из отчётов:**
- def-restr: "Test Naming: 70% — 30% use implementation-based names"
- Это значит 30% тестов снижены до `partial` только из-за имени

**Рекомендация:** Q4 → `recommended`. Его failure должен генерировать **warning** в findings, но **не снижать** `coverage_status`.

### Q7: Error Handling

**Текущее требование:** "Error handling/исключения покрыты (хотя бы базовый негативный сценарий)"

**Проблема 1:** "Базовый негативный сценарий" — субъективно. Один аудитор считает базовым один `assertThrows`, другой требует покрыть все исключения.

**Проблема 2 (критично для Spring):** Во многих Spring-приложениях обработка ошибок делегирована `@ControllerAdvice` или глобальным фильтрам. Unit-тест сервиса мокнет репозиторий и проверяет happy path — **это нормальный unit-тест**. Требовать error handling в каждом unit-тесте сервиса — дублирование.

**Данные из отчётов:**
- def-restr: "Error handling: 60% — 40% fail" — **самая частая причина partial**
- defaults: **17 из 24 partial** targets fail из-за Q7

**Рекомендация (tiered подход):**

| Тип кода | Q7 статус | Обоснование |
|----------|-----------|-------------|
| REST Controller | `required` | HTTP слой должен возвращать корректные error responses |
| Service | `recommended` | Сервис может выбрасывать exception — это нормально, caller обработает |
| Pure logic/Util | `optional` | Многие pure функции не имеют error paths |

### Q9: Branch Coverage

**Текущее требование:** "Для тестов с ветвлениями: покрыты основные if/else ветки"

**Проблема:** Аудитор — **LLM**, а не JaCoCo. Агент читает код и тесты и **субъективно** оценивает покрытие ветвей. Для файла с 10+ условных выражений — это неизбежно неточно.

**Данные из отчётов:**
- def-restr: "Branch coverage: 45%" — это **оценка LLM**, не инструментальная метрика
- defaults: `GroupingByKeyNewEventCreator` — Q9 failed → partial, но "null/empty scenarios" могут покрываться существующими тестами, которые LLM не заметил

**Рекомендация:**
1. Q9 → `recommended` без downgrade. Генерировать advisory: "Рекомендуем проверить JaCoCo-отчёт для точных метрик"
2. Для **чистой логики** (калькуляторы, утилиты) — Q9 можно оставить ближе к `required`, но с пометкой что оценка приблизительная

---

## P3. BUG: Дубликаты задач в audit plan

### Описание

В `test-plan.md` defaults проекта (run 1 и run 3 — идентичные отчёты):

| # | Задача | Статус |
|---|--------|--------|
| 1 | CrmOrEpkIdClientDefaultStatusChecker | `missing` |
| 7 | CrmOrEpkIdClientDefaultStatusChecker (Duplicate entry) | `missing` |
| 8 | CrmOrEpkIdClientDefaultStatusChecker (Duplicate entry) | `missing` |
| 9 | DefaultClientsServiceImpl | `missing` |

Один и тот же сервис продублирован **3 раза** с пометкой "Duplicate entry".

### Root cause

Аудитор сканирует files и может обнаруживать один target через несколько путей (напр. через controller + service + repository). Нет **dedup-этапа** в Phase 1 Discovery.

### Рекомендуемое решение

Добавить в test-audit/SKILL.md Phase 1 дедупликацию:
```
После сканирования: дедуплицировать targets по canonical file path.
Если один файл обнаружен через несколько ссылок → объединить в одну задачу с объединёнными quality gates.
Лог: "[AUDIT] deduplicated: N duplicate targets removed"
```

---

## P4. DESIGN: LLM-based branch coverage estimation — ненадёжно

### Проблема

Аудитор не запускает JaCoCo. LLM **читает** исходный код и тесты, и **оценивает** какие ветви покрыты.

| Сценарий | Что видит LLM | Реальность |
|----------|--------------|------------|
| Параметризованный тест с 10 кейсами | 1 test method | Все ветви покрыты |
| Assert в базовом тестовом классе | Test method без assert | Coverage есть, в другом файле |
| Интеграционный тест через MockMvc | "Service test not found" | Controller test покрывает service |
| AssertJ soft assertions | Не распознан как assert | coverage есть |

**В отчёте def-restr:** "Branch coverage: 45%" выглядит как точная метрика, но это **субъективная оценка LLM**.

### Рекомендуемое решение

1. **Краткосрочное:** Пометить branch coverage как приблизительные:
   ```
   [AUDIT] branch coverage: LLM-estimated (not instrumented).
           Run JaCoCo for precise metrics.
   ```
2. **Среднесрочное:** Если проект имеет JaCoCo/c8 report — загрузить и использовать реальные данные

---

## P5. UX: Aggregate-метрики создают ложное впечатление "0% full"

### Описание

В отчёте def-restr (839 файлов, 337 тестов) — **Full Coverage = 0**. Секция "Why Full Coverage = 0" показывает:

| Criterion | Percentage |
|-----------|------------|
| One test = one scenario | 75% |
| Test naming | 70% |
| Error handling | 60% |
| Branch coverage | 45% |

### Проблема

Проценты означают что **в среднем** X% тестов проходят критерий. Но аудит присваивает статус **per-file**: каждый файл где хоть один ✗ → `partial`.

**Результат:** 337 тестовых файлов. Ни одно не получает `full` потому что в каждом нашлось мелкое замечание (имя, одна ветвь). Проект выглядит как "не покрыт", хотя реальность — "очень хорошо покрыт с минимальными quality issues".

### Рекомендуемое решение

1. **Двухуровневый scoring:**
   - Per-file `coverage_status` (full/partial/invalid/missing) — для planning
   - Project-level `quality_score` (0-100%) — для дашбордов

2. В "Why Full Coverage = 0" — показывать **распределение причин**: сколько файлов partial из-за Q4, сколько из-за Q7

3. Добавить сводку: "N из 337 файлов получили бы `full` если бы Q4/Q7/Q9 были non-blocking"

---

## P6. DESIGN: "Error handling" не учитывает глобальные exception handlers

### Описание

В Spring-приложениях:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Error> handleNotFound(...) { ... }
}
```

Аудит требует от **каждого** сервиса/контроллера иметь собственный error handling test. Но если `GlobalExceptionHandler` уже протестирован — требовать от каждого контроллера тестировать 404/500 — дублирование.

### Влияние

Это объясняет почему "Error handling: 60%" в def-restr. Многие сервисы правильно делегируют обработку ошибок глобальному handler.

### Рекомендуемое решение

В java-testing.md R4.1 добавить conditional:
```
IF GlobalExceptionHandler/@RestControllerAdvice exists AND tested
  THEN per-service Q7 → recommended (not required)
  ELSE per-service Q7 → required
```

---

## Сводная таблица рекомендаций

| ID | Проблема | Изменение | Приоритет | Файлы |
|----|----------|-----------|-----------|-------|
| **P1** | Status inconsistency | Строгий scoring algorithm | P0 | `skills/test-audit/SKILL.md §2.4` |
| **P2-Q4** | Naming как blocker | Q4 → `recommended` | P0 | `context/testing-standards.md §3` |
| **P2-Q7** | Error handling tiered | Q7 → recommended для сервисов | P0 | `context/testing-standards.md`, `context/java-testing.md R4.1` |
| **P2-Q9** | Branch coverage | Q9 → `recommended` | P1 | `context/testing-standards.md §3` |
| **P3** | Дубликаты задач | Dedup by canonical path | P1 | `skills/test-audit/SKILL.md Phase 1` |
| **P4** | LLM branch coverage | Пометить как estimated | P1 | `skills/test-audit/SKILL.md §2.2` |
| **P5** | Aggregate metrics | Two-level scoring | P2 | `skills/test-plan-template/` |
| **P6** | Global exception handlers | Conditional Q7 | P2 | `context/java-testing.md R4.1` |

---

## Валидация пользовательских гипотез

| Гипотеза пользователя | Подтверждение | Детали |
|----------------------|--------------|--------|
| Полос считает coverage как 0 даже в покрытом проекте | ✅ Подтверждено (P1+P5) | `full`=0 потому что каждый из 337 файлов имеет ≥1 minor failure → partial. Кроме того, в defaults agent ставит `full` с ✗ inconsistently |
| Были дубли тестов | ✅ Подтверждено (P3) | CrmOrEpkIdClientDefaultStatusChecker продублирован 3 раза |
| Q4 (naming) — сделать не строгим | ✅ Подтверждено | 70% compliance, naming не влияет на корректность теста |
| Q7 (error handling) — сделать менее строгим | ✅ Подтверждено | 60-65% compliance, самая частая причина partial. В Spring многие сервисы делегируют обработку ошибок |
| Q9 (branch coverage) — сделать менее строгим | ✅ Подтверждено | 45% LLM-оценка, не инструментальная метрика |

---

## Рекомендуемая последовательность исправлений

### Sprint 1 (P0 — критические)
1. **P1**: Строгий scoring — `failed_count >= 1` → автоматически `partial`, запретить inconsistency
2. **P2-Q4**: Q4 переквалифицировать в `recommended` (warning без downgrade)
3. **P2-Q7**: Q7 → `recommended` для сервисов/утилит, оставить `required` для контроллеров

### Sprint 2 (P1 — улучшение качества)
4. **P2-Q9**: Q9 → `recommended` с advisory note про JaCoCo
5. **P3**: Dedup targets в Phase 1
6. **P4**: Пометить все LLM-оценки как estimated, не точные

### Sprint 3 (P2 — UX полировка)
7. **P5**: Two-level scoring (per-file + project quality score)
8. **P6**: GlobalExceptionHandler awareness в Java overlay

---

*Отчёт подготовлен для использования как основа SPEC.*
