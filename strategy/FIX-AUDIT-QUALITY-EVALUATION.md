# Спецификация: Fix Audit Quality Evaluation

**Версия:** 1.0  
**Дата:** 2026-04-20  
**Приоритет:** P0 (критический баг — false positive `full` статус)

---

## 1. Обзор изменений

| # | Файл | Секция | Тип | Приоритет |
|---|------|--------|-----|-----------|
| 1 | `skills/test-audit/SKILL.md` | Phase 2: Quality Analysis | Полная замена секции | **P0** |
| 2 | `skills/test-audit/SKILL.md` | Rules | Добавление 2 правил | **P0** |
| 3 | `skills/test-audit/SKILL.md` | Exit Conditions | Уточнение 3 пунктов | **P1** |
| 4 | `context/testing-standards.md` | §3 title | Переименование + добавление note | **P1** |
| 5 | `agents/test-auditor.md` | Failure modes | Добавление 1 пункта | **P2** |
| 6 | `plans/tests-audit-example/agent-state.json` | LOW-001 | Исправление антипаттерна | **P2** |

---

## 2. Детальные правки

### 2.1. `skills/test-audit/SKILL.md` — Phase 2: Quality Analysis

**Текущее содержимое (заменяется полностью):**

```markdown
### Phase 2: Quality Analysis

For each test file, evaluate quality using the mandatory checklist:

#### Quality Checklist

Базовая checklist — `@context/testing-standards.md §3`. Применить ко **всем** тестам.

Ниже — **delta** (дополнительные вопросы аудита + классификация):

- [ ] Сколько `it`/`test`/`@Test`/`def test_`/`func Test*` блоков? (менее 3 → `coverage_status: "partial"`. Stack-специфичные уточнения — в `context/<stack>-testing.md` R4)
- [ ] Для UI-тестов: есть ли `userEvent`/`fireEvent`? Нет → `coverage_status: "partial"`
- [ ] Для backend/API тестов: есть ли интеграционный HTTP-вызов (supertest/TestClient/httptest)? Нет → `coverage_status: "partial"`
- [ ] Оценить по Coverage Classification таблице ниже

#### Coverage Classification

| Status | Criteria |
|--------|----------|
| **full** | Quality checklist passes entirely; all branches, edge cases, and async behavior covered |
| **partial** | Tests exist but miss 2+ checklist items |
| **invalid** | Only snapshots without behavioral assertions, or tests that fail on execution |
| **missing** | No test file exists for this target |
```

**Заменяется на:**

```markdown
### Phase 2: Quality Analysis

For each test file, evaluate quality using the **mandatory checklist** and the **Coverage Scoring Algorithm** below.

#### 2.1 Load Context

1. Загрузить `@context/testing-standards.md §3` (обязательная база — применяется ко **всем** тестам).
2. Загрузить `context/<stack>-testing.md` overlay по W10.2 (определяет стек).
3. Загрузить **R4.1 Full Coverage Criteria** из overlay — это **authoritative** определение "full" для данного стека. Если overlay не имеет R4.1 — использовать fallback из §2.4.

#### 2.2 Run Checklist (enforced output)

Для **каждого** тестового файла агент **обязан** вывести полный чеклист с отметками:

```yaml
[AUDIT CHECKLIST] <file_path>
  [✓|✗] Q1: No internal state assertions
  [✓|✗] Q2: Asserts check observable behavior
  [✓|✗] Q3: One test = one scenario
  [✓|✗] Q4: Test names describe behavior
  [✓|✗] Q5: No excessive mocking
  [✓|✗] Q6: Happy path covered
  [✓|✗] Q7: Error handling covered
  [✓|✗] Q8: Async behavior handled (if applicable)
  [✓|✗] Q9: Branch coverage (if/else, conditionals)
```

**Stack-specific checklist items** из `context/<stack>-testing.md` R4.2 добавляются к базовым Q1–Q9:

| Стек | Дополнительные пункты |
|------|----------------------|
| React | Q10: `userEvent`/`fireEvent` для компонентов с кнопками/инпутами |
| Java | Q10: `@WebMvcTest`/`@MockBean` для контроллеров, `verify()` для моков |
| JS/TS | Q10: HTTP integration test (supertest/TestClient) для endpoints |
| Python | Q10: `TestClient`/`pytest.raises` для endpoint'ов и сервисов |
| Go | Q10: `httptest.NewRecorder` для handlers, `mock.Assert*` для сервисов |

#### 2.3 Apply Downgrade Rules (BEFORE scoring)

Агент **обязан** применить downgrade **до** evaluation Coverage Scoring Algorithm. Downgrade overrides final status:

| Condition | Downgrade To |
|-----------|--------------|
| Только `toMatchSnapshot()` / `assert_eq!(output, snapshot)` без behavioral assertions | `invalid` |
| Тестовый файл существует, но содержит 0 test blocks (`it`/`test`/`@Test`/`def test_`/`func Test`) | `invalid` |
| Тесты fail on execution | `invalid` |
| Для UI-компонента (forms, buttons, views): нет user interaction test (`userEvent`, `fireEvent`, эквивалент) | `partial` |
| Для HTTP endpoint/handler: нет integration test (supertest, TestClient, httptest, эквивалент) | `partial` |
| Для async операций (API calls, DB queries, timers): нет async/wait check (`await findBy*`, `waitFor`, `assertThrows`, эквивалент) | `partial` |
| Количество test blocks < R4.1 minimum для данного типа цели (напр. `< 3 it` для сервиса с ветвлениями) | `partial` |

**Правило:** Downgrade применяется **автоматически** при обнаружении conditions. Агент не может его переопределить субъективной оценкой.

#### 2.4 Coverage Scoring Algorithm

Если downgrade не применён на §2.3, агент вычисляет статус алгоритмически:

```
Input: checklist_result = {passed_count, failed_count, failed_items[]}
       overlay_r4.1 = {criteria_met_count, criteria_total}  (если применим)

Algorithm:
1. failed_count == 0 AND (overlay_r4.1 отсутствует OR criteria_met_count == criteria_total)
   → return status="full"

2. failed_count >= 1 OR (overlay_r4.1 присутствует AND criteria_met_count < criteria_total)
   → return status="partial"

3. Fallback: status="partial"
```

**Результат всегда сопровождается:**
```yaml
[AUDIT SCORE] <file_path>
  passed: <N>
  failed: <M>
  failed_items: [<item1>, <item2>]
  overlay_full_criteria: <X>/<Y> met
  → coverage_status: <full | partial>
```

#### Coverage Status Reference

| Status | Определение |
|--------|-------------|
| **full** | Checklist: 0 failed items. Overlay R4.1: все criteria met. Downgrade rules: none triggered. |
| **partial** | Checklist: 1+ failed items. Testable gaps exist. `missing_requirements` must be populated. |
| **invalid** | Tests exist but are meaningless (snapshot-only, no assertions, or fail on execution). |
| **missing** | No test file exists for this target. |
```

---

### 2.2. `skills/test-audit/SKILL.md` — Rules

**Добавить в конец секции Rules (после существующих):**

```markdown
- For targets with existing tests, always output the full checklist with ✓/✗ marks (Phase 2 §2.2) before assigning coverage_status.
- Apply downgrade rules (Phase 2 §2.3) automatically before Coverage Scoring Algorithm. Do not override downgrade with subjective evaluation.
```

---

### 2.3. `skills/test-audit/SKILL.md` — Exit Conditions

**Заменить:**
```markdown
- [ ] Audit summary output содержит `[AUDIT] total/targets/full/partial/invalid/missing`
```

**На:**
```markdown
- [ ] Audit summary output содержит `[AUDIT] total/targets/full/partial/invalid/missing`
- [ ] Для каждого audited файла выведен `[AUDIT CHECKLIST]` с ✓/✗ отметками по всем пунктам (Phase 2 §2.2)
- [ ] Для каждого partial/invalid файла выведен `[AUDIT SCORE]` с failed_items (Phase 2 §2.4)
- [ ] Downgrade rules применены где применимы (Phase 2 §2.3)
```

---

### 2.4. `context/testing-standards.md` — §3

**Заменить заголовок:**

```markdown
## 3. Quality Checklist (минимальный)
```

**На:**

```markdown
## 3. Quality Checklist (обязательный для full coverage)
```

**Добавить после описания чеклиста (перед разделом "Смежные документы"):**

```markdown
> **Note:** Этот чеклист — **обязательный минимум для статуса `full`**. Если хотя бы один пункт чеклиста не выполнен → статус `partial`. Это не «пол» (minimum acceptable), а «потолок» (must pass all for full).
```

---

### 2.5. `agents/test-auditor.md` — Failure modes

**Добавить в список Primary failure modes:**

```markdown
- subjectively evaluating the checklist ("in general ok") instead of algorithmically counting failed items
```

---

### 2.6. `plans/tests-audit-example/agent-state.json` — LOW-001

**Текущий `quality_gate` для LOW-001:**
```json
"quality_gate": ["Snapshot renders correctly"]
```

**Заменить на:**
```json
"quality_gate": [
  "Snapshot renders correctly with at least one behavioral assertion",
  "Component has no user interactions to test (static header)"
]
```

---

## 3. Валидация после изменений

После внесения правок:

1. `test-audit/SKILL.md` — проверить что секции 2.1–2.4 линкуются друг на друга без битых ссылок
2. `test-audit/SKILL.md` Exit Conditions — проверить что все новые пункты достижимы
3. `testing-standards.md` §3 — проверить что note не конфликтует с остальным текстом
4. Прогнать валидацию через `node tools/validate-state.js plans/tests-audit-example/agent-state.json` — должен пройти

---

## 4. Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Алгоритм слишком строгий → всё partial | Средняя | Это лучше чем false-positive "Full ✅". Пользователь увидит реальный gap |
| Stack-overlays без R4.1 | Низкая | Fallback на testing-standards §3 как baseline в §2.1 алгоритма |
| Agent всё равно проигнорирует ✓/✗ | Низкая | Exit condition требует explicit `[AUDIT CHECKLIST]` output — будет видно в логе |
| Конфликт downgrade с overlay R4 | Низкая | Downgrade применяется ДО scoring — override не нужен, downgrade final |

---

## 5. Не затронутые файлы (явно)

| Файл | Не меняется | Почему |
|------|-------------|--------|
| `context/react-testing.md` R4 | Нет | Уже строгие и правильные |
| `context/java-testing.md` R4 | Нет | Уже строгие и правильные |
| `context/js-ts-testing.md` R4 | Нет | Уже строгие и правильные |
| `context/python-testing.md` R4 | Нет | Уже строгие и правильные |
| `context/go-testing.md` R4 | Нет | Уже строгие и правильные |
| `skills/agent-workflow-core/SKILL.md` | Нет | Не связано с audit логикой |
| `skills/test-review/SKILL.md` | Нет | Review работает поверх audit output |
| `skills/test-verification/SKILL.md` | Нет | Не связано с quality scoring |
| JSON-схемы | Нет | Структура достаточна, меняется заполнение |

---

## 6. Отдельный баг (не часть данной спеки)

`skills/test-strategy/SKILL.md` физически отсутствует (директория `skills/test-strategy/` не существует). Требует отдельной спеки для создания.
