---
name: convention-discovery
description: Automatically discover and extract testing conventions from an existing project by scanning test files, config files, team docs, and source code patterns.
---

# Skill: Convention Discovery

## Purpose

Scan a project's existing codebase to detect testing conventions (naming, structure, mocking, forbidden patterns) and generate a machine-readable convention overlay that the test workflow agents will use instead of generic base conventions.

## Phase 1: Scan

Агент сканирует проект по следующим категориям:

### 1.1 Existing Test Files

Найти все тестовые файлы и проанализировать:

- **Пути**: `*.test.*`, `*.spec.*`, `__tests__/`, `*Test.java`, `test_*.py`, `*_test.go`
- **Naming patterns**: Как именуются `describe`/`context`/`it`/`test` блоки
  - `describe('ComponentName')` vs `describe('component-name')` vs `describe('component_name')`
  - `it('should do X')` vs `it('does X')` vs `it('X')`
  - `@DisplayName("...")` vs `testMethodName()` (Java)
  - `def test_function_name()` vs `TestFunctionName()` (Go/Python)
- **File organization**: Тесты рядом с исходниками (`src/foo.ts` + `src/foo.test.ts`) или отдельно (`tests/foo_test.py`)
- **AAA usage**: Есть ли явные `Arrange`/`Act`/`Assert` комментарии, `given/when/then` паттерн

### 1.2 Config Files

Найти конфигурационные файлы тестового фреймворка:

| Файл | Что извлечь |
|------|-------------|
| `jest.config.*` | testMatch, testEnvironment, globals, setupFiles |
| `vitest.config.*` | include, exclude, environment, globals |
| `pom.xml` (test scope) | surefire/failsafe plugins, test dependencies |
| `build.gradle` | testImplementation, testRuntimeOnly, test tasks |
| `pyproject.toml` | test dependencies, pytest config |
| `pytest.ini` / `conftest.py` | fixtures, markers, hooks |
| `{package}_test.go` | build tags, package naming |
| `.prettierrc*` / `.eslintrc*` | naming plugins, test-related rules |

### 1.3 Team Docs

Найти документацию команды (если доступна):

- `CONTRIBUTING.md` — секции про тестирование
- `CODE_STYLE.md` / `STYLEGUIDE.md` — секции про тесты
- `docs/testing.md` — если существует
- `wiki/` — pages про testing conventions
- `ARCHITECTURE.md` — секции про test strategy

### 1.4 Source Code Patterns

Анализировать исходный код на предмет:

- **Error handling**: `try/catch` в тестах, `assertThrows`, `expect().toThrow()`, `pytest.raises`
- **Mocking style**: `jest.mock()`, `@MockBean`, `unittest.mock.patch`, `gomock` / `testify`
- **Factory/fixtures**: Как создаются тестовые данные — factory functions, builders, fixtures files
- **Test helpers**: Shared utilities в `testUtils/`, `test/helpers/`, `conftest.py`, `internal/testutil/`

### 1.5 Forbidden Patterns Detection

Сканировать тестовые файлы на антипаттерны:

- `toMatchSnapshot()` как единственная проверка
- Доступ к `component.state()` / `wrapper.instance()` / reflection
- Мокание внутренних функций тестируемого модуля
- Тесты без ассертов (только выполнение кода)
- Order-dependent tests (тесты зависят от порядка запуска)
- Жестоко захардкоженные данные без контекста

## Phase 2: Analyze

Агент анализирует собранные данные и выявляет закономерности:

### 2.1 Aggregation

Сгруппировать обнаруженные паттерны по категориям:

```
Naming:        {describe_pattern, it_pattern, test_file_pattern}
Structure:     {file_location, aaa_usage, grouping_strategy}
Mocking:       {framework, scope, specific_rules}
Assertions:    {library, style, common_patterns}
Forbidden:     {detected_anti_patterns, frequency, locations}
```

### 2.2 Confidence Scoring

Каждой обнаруженной конвенции присваивается confidence:

| Confidence | Criteria |
|------------|----------|
| **high** | Паттерн найден в ≥ 70% проанализированных файлов |
| **medium** | Паттерн найден в 30–69% файлов ИЛИ задокументирован в team docs |
| **low** | Паттерн найден в < 30% файлов без документации |

**Правило:** В финальный overlay включаются только конвенции с confidence ≥ medium. Low-confidence паттерны записываются в `team_notes` как кандидаты.

### 2.3 Conflict Resolution

Если обнаружены конфликтующие конвенции:

1. Приоритет: код > документация (код отражает реальную практику)
2. Если код содержит оба паттерна → записать как `medium` confidence + добавить note
3. Если конфликт с базовыми `testing-standards.md` → конвенция отвергается, warning в log

## Phase 3: Extract

Агент формирует convention overlay по схеме `convention-overlay-schema.json`:

### 3.1 Metadata

```json
{
  "generated_at": "<ISO 8601>",
  "scanned_files": <count of test files>,
  "scanned_modules": <count of source code modules>,
  "base_stack": "<detected stack from W10.2>",
  "version": "1.0"
}
```

### 3.2 Conventions

| Категория | Что включить |
|-----------|-------------|
| `stack_and_tools` | Массив: `["Jest", "React Testing Library", "MSW"]` |
| `naming` | Массив объектов: `{target, pattern, source}` |
| `test_structure` | Массив строк: описания структуры теста |
| `mocking_rules` | Массив объектов: `{target, approach}` |
| `forbidden_patterns` | Массив объектов: `{pattern, reason, alternative}` |
| `team_notes` | Массив объектов: `{note, source}` |

### 3.3 Output Format

Результат — два файла:

1. **Machine-readable**: `.gigacode/conventions/project-conventions.json` — валидируется по `convention-overlay-schema.json`
2. **Human-readable**: `.gigacode/conventions/project-conventions.md` — markdown overlay

## Phase 4: Generate

### 4.1 File Generation

**project-conventions.md format:**

```markdown
# Project Testing Conventions — <Project Name>

> Сгенерировано GigaTest Convention Discovery | Дата: YYYY-MM-DD
> Сканировано: N тестовых файлов, M модулей исходного кода
> Базовый стек: <stack>
> Версия: 1.0

---

## 1. Stack & Tools

**Фреймворки и инструменты:**
- Tool 1 — назначение
- Tool 2 — назначение

## 2. Naming Conventions

| Target | Pattern | Source |
|--------|---------|--------|
| describe-блоки | `describe('ComponentName')` | 85% тестов |
| it-блоки | `it('should ... when ...')` | team docs + 72% тестов |

## 3. Test Structure

- Тестовые файлы: `__tests__/*.test.tsx` рядом с исходниками
- Файловая организация: co-located tests
- AAA pattern: неявный (без комментариев)
- Grouping: по функции/фиче внутри `describe`

## 4. Mocking Rules (Project-Specific)

| Target | Approach |
|--------|----------|
| API-вызовы | `jest.mock('@api/client')` с manual mock |
| Redux store | `@reduxjs/toolkit` `configureStore` с тестовыми reducers |
| Внешние сервисы | `nock` для HTTP mocking |

## 5. Forbidden Patterns

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| `toMatchSnapshot()` без поведения | Нет проверки поведения | Использовать `toHaveTextContent()`, `toBeChecked()` |

## 6. Team Notes

- **Note**: ... (source: файл/конфиг)

## 7. Validation Checklist

- [ ] Naming conventions применяются к новым тестам
- [ ] Mocking rules соблюдаются
- [ ] Forbidden patterns отсутствуют
```

### 4.2 Self-Review

Перед финальным сохранением агент проверяет:

- [ ] Все `naming` записи имеют `target` и `pattern`
- [ ] Все `forbidden_patterns` записи имеют `alternative` (не просто «нельзя X»)
- [ ] `mocking_rules` покрывают минимум: API, БД (если применимо), внешние сервисы
- [ ] `metadata.scanned_files` > 0 (иначе — no test files found warning)
- [ ] JSON валидируется по `convention-overlay-schema.json`

### 4.3 Logging

```
[AGENT] convention-discovery: scanned N test files, M source modules
[AGENT] convention-discovery: base stack = <stack>
[AGENT] convention-discovery: conventions = <count> naming, <count> mocking, <count> forbidden
[AGENT] convention-discovery: output → .gigacode/conventions/project-conventions.json
[AGENT] convention-discovery: output → .gigacode/conventions/project-conventions.md
```

## Rules

- Do NOT modify source code or existing tests during discovery.
- Do NOT hallucinate conventions — every convention must have a source (file, pattern, or documentation).
- Do NOT include low-confidence (< medium) conventions in the main output — put them in `team_notes`.
- If no test files exist → generate a minimal overlay with `base_stack` conventions only + warning.
- If project is empty → generate a skeleton overlay with stack detection only + warning.
- Scan limit: не сканировать более 500 файлов за одну сессию. Если больше — логировать и сканировать критичные директории первыми.
- При конфликте конвенции проекта с `testing-standards.md` — предупредить пользователя, НЕ включать в overlay.

## Exit Conditions

- [ ] `.gigacode/conventions/project-conventions.json` создан и валидируется по `convention-overlay-schema.json`
- [ ] `.gigacode/conventions/project-conventions.md` создан, human-readable, sync с JSON
- [ ] `metadata.scanned_files` и `metadata.scanned_modules` содержат корректные count
- [ ] Каждая convention запись имеет источник (файл/паттерн/документация)
- [ ] `forbidden_patterns` записи содержат `alternative` (не только запрет)
- [ ] Self-review checklist пройден
- [ ] Logging output содержит `[AGENT] convention-discovery:` строки с итогами
- [ ] Если тестов не найдено — output содержит warning `[AGENT] WARNING: no test files found, using base stack conventions only`

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Генерация conventions без сканирования файлов | Hallucinated conventions — бесполезны и вредны |
| Пропуск config files при определении фреймворка | Неверный стек → неверные конвенции |
| Конфликт с testing-standards.md без warning | Базовые принципы нарушены |
| Перегенерация без сохранения истории | Потеря предыдущих конвенций при ре-генерации |
| Сканирование всех файлов без лимита | Timeout на больших проектах |
| Включение low-confidence conventions в main output | Ненадёжные правила портят качество тестов |
| Forbidden patterns без альтернатив | Разработчик не поймёт как делать правильно |
