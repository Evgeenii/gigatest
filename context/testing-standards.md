# Testing Standards

> Версия: 2.0 | Дата: 2026-04-18
> Предыдущая версия: 1.0
>
> **Назначение:** Stack-agnostic базовые принципы тестирования, применяемые ко всем языкам и фреймворкам.
> Stack-специфичные правила находятся в `context/<stack>-testing.md` overlay.
>
> **Аудитория:** Все агенты GigaTest (auditor, implementer, reviewer, verifier).

---

## 1. Общие принципы

### 1.1 Behavior over Implementation
**ДОЛЖНО**: Тестировать наблюдаемое поведение (observable behavior) — то, что видит пользователь или внешняя система.
**ЗАПРЕЩЕНО**: Тестировать внутренние детали реализации (приватные методы, внутренние переменные, состояние объекта).

### 1.2 One Scenario Per Test
Каждый тест проверяет ОДНО поведение. Название теста описывает наблюдаемый результат.

### 1.3 No Duplication
Не дублировать тесты. Если интеграционный тест уже покрывает поведение, unit-тест на внутренние функции **не нужен**, кроме случаев:
- Функция содержит критичную бизнес-логику (расчёты, сложная валидация с ветвлениями)
- Функция используется в нескольких местах — для надёжности и скорости обратной связи

### 1.4 AAA Pattern
Все тесты следуют структуре:

1. **Arrange** — подготовка входных данных и зависимостей (моки, fixtures, тестовые данные)
2. **Act** — вызов тестируемого кода / симуляция действия пользователя или системы
3. **Assert** — проверка наблюдаемого результата (ответ, состояние, побочные эффекты)

### 1.5 Mocking Principles
- Мокать **только** внешние/граничные зависимости (API, БД, файловая система, очереди сообщений, внешние сервисы)
- **НЕ** мокать внутренние функции внутри тестируемого модуля
- Мокать **только** то, что мешает тесту, а не всё подряд
- Моки не должны делать тест непонятным — если мока больше чем теста, это сигнал

---

## 2. Классификация типов тестов

| Тип тестируемого | Тип теста | Что проверяет | Пример |
|------------------|-----------|---------------|--------|
| **User Interface** (UI компонент, экран, виджет) | Behavior / Integration | Пользовательские взаимодействия и видимый результат | Клик → появилось сообщение |
| **API Endpoint / HTTP Handler** | Integration | HTTP-запрос → статус-код + ответ | POST /users → 201 + body |
| **Service / Business Logic** | Unit | Ветвления, расчёты, исключения | Сервис с условной логикой |
| **Repository / DAO / Data Access** | Integration | CRUD, транзакции, маппинг entity | Save → findById возвращает |
| **External Service / HTTP Client** | Integration (mocked upstream) | Взаимодействие с внешними системами | HTTP-запрос к третьему сервису |
| **Middleware / Interceptor / Filter** | Integration | Request/response pipeline | Auth middleware → 401 без токена |
| **Pure Logic / Utility** | Unit | Вход → Выход, edge cases | `validateEmail("x")` → false |
| **Custom Function with Side Effects** | Unit / Integration | Возвращаемые значения + побочные эффекты | Функция с записью в лог/БД |

---

## 3. Quality Checklist — Three-Level System (FG-2)

Применяется к **каждому** тестовому файлу независимо от стека.

> **Source of truth:** Этот раздел — единый источник базового чеклиста.
> Skills и agents ссылаются на него, добавляя только delta (уникальные для своей роли вопросы).
>
> **Важно:** Не все пункты одинаково блокирующие. Система использует три уровня строгости.

### 3.1 Level 1: REQUIRED (блокирующие для `full`)

Эти критерии — security/correctness critical. Failure → `coverage_status = "partial"`.

| ID | Критерий | Пример violation |
|----|----------|-----------------|
| **Q1** | Тест не обращается к внутренностям реализации (приватные поля, состояние, внутренние вызовы) | `wrapper.instance().privateMethod()` |
| **Q2** | Ассерты проверяют наблюдаемое поведение (ответ, статус, результат) | Ассерты только на моки, без проверки ответа |
| **Q3** | Один тест — один сценарий (нет множественных assert на разные вещи) | Один тест проверяет и happy path, и error |
| **Q5** | Нет излишних моков (замокано только то, что необходимо) | Мок внутренней функции которую тестируем |
| **Q6** | Happy path покрыт | Нет теста на успешный сценарий |

### 3.2 Level 2: RECOMMENDED (warning, НЕ блокируют `full`)

Эти критерии — качество/читаемость. Failure → warning в findings. `coverage_status` может остаться `full` (с пометкой).

| ID | Критерий | Контекстная зависимость |
|----|----------|------------------------|
| **Q4** | Название теста описывает поведение, а не действие (`should_return_404_when_user_not_found`, а не `test_get_user`) | Всегда recommended |
| **Q7** | Error handling/исключения покрыты | **REST/HTTP контроллеры** → `required`<br>**Сервисы/business logic** → `recommended`<br>**Pure logic/util** → `optional` |
| **Q9** | Branch coverage (if/else ветки) | Всегда recommended (LLM-оценка, не инструментальная метрика) |

### 3.3 Level 3: OPTIONAL (informational)

| ID | Критерий | Условие |
|----|----------|---------|
| **Q8** | Асинхронное поведение обрабатывается корректно (`await`, `waitFor`, `timeout`) | **REQUIRED** только для async/конкурентного кода. ИНАЧЕ — `N/A` |

### 3.4 Scoring Logic

```
quality_gate scoring:
  required_items = filter(Q-items, level="required")
  recommended_items = filter(Q-items, level="recommended")

  failed_required = count(required_items where satisfied=false)
  failed_recommended = count(recommended_items where satisfied=false)

  IF failed_required > 0:
    coverage_status = "partial"
  ELSE IF failed_required == 0:
    coverage_status = "full"
    IF failed_recommended > 0:
      // Не снижает статус, но добавляет warnings
      findings += "warning: {failed_recommended} recommended items not satisfied"
```

### 3.5 Quality Gate JSON Structure

Структура quality_gate в `agent-state.json` определяется схемой: `skills/agent-workflow-core/agent-state-schema.json#/definitions/quality_gate_item`.

Каждый Q-item содержит:
- `id` (required) — идентификатор чеклист-пункта (Q1–Q9 + stack-specific)
- `level` (required) — уровень критичности: `required`, `recommended`, `optional`
- `satisfied` (required) — `true` если критерий выполнен
- `name` (optional) — краткое описание
- `note` (optional) — пояснение почему не satisfied
- `estimation_method` (optional) — для Q9: `llm` если LLM-estimated

Пример:
```json
{
  "quality_gate": [
    {"id": "Q1", "name": "No internal state assertions", "level": "required", "satisfied": true},
    {"id": "Q4", "name": "Test names describe behavior", "level": "recommended", "satisfied": false, "note": "15% tests use implementation-based names"},
    {"id": "Q9", "name": "Branch coverage", "level": "recommended", "satisfied": false, "estimation_method": "llm", "note": "LLM-estimated, ~60% branches covered"}
  ]
}
```

> **Note:** Уровень (`level`) каждого Q-item определяется правилами из данного раздела И stack-specific overlay (напр. `java-testing.md R4.1` для Q7). Аудитор проверяет overlay ПЕРЕД назначением уровня.

---

## 4. Forbidden Patterns

Следующие антипаттерны запрещены для **любого** стека:

| Паттерн | Почему плох | Для какого стека специфичен |
|---------|-------------|-----------------------------|
| Ассерты на внутреннее состояние/приватные поля | Тестирование реализации, ломается при рефакторинге | Любой |
| Мокание внутренних функций тестируемого модуля | Скрывает реальные зависимости, делает тест бессмысленным | Любой |
| Тестирование через доступ к реализации (`wrapper.instance()`, `component.state`, reflection) | Тест не проверяет поведение | Любой |
| `toMatchSnapshot()` / `assert_eq!(output, snapshot)` как единственная проверка | Нет проверки поведения, ложное чувство покрытия | Любой |
| Тест без ассертов (только выполнение кода) | Не проверяет ничего наблюдаемого | Любой |
| Лишние моки (мокать то, что уже протестировано отдельно) | Тест становится fragile и непонятным | Любой |
| Жёстко захардкоженные данные без контекста | Тест непонятен, сложно ревьюить | Любой |
| Зависимость тестов друг от друга (order-dependent tests) | Непредсказуемое поведение при запуске | Любой |

---

## 5. Stack-Specific Rules

Для специфичных правил тестирования по стеку — загружайте соответствующий `context/<stack>-testing.md` overlay:

| Стек | Файл |
|------|------|
| React + RTL | `context/react-testing.md` |
| Java + Spring | `context/java-testing.md` |

Каждый overlay содержит:
- R1: Code Classification
- R2: Decision Algorithm
- R3: Decision Log Format
- R4: Test Quality Requirements
- R5: Test Structure / Examples
- R6: Mocking
- R7: File Organization
- R8+: Stack-специфичные конвенции

---

*Смежные документы: react-testing.md, java-testing.md*
