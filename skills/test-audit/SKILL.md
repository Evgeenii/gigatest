---
name: test-audit
description: Use when analyzing existing test coverage, identifying gaps, and building a prioritized test plan using agent-workflow-core state management.
---

# Test Audit

## Goal

Perform a comprehensive analysis of existing tests, identify coverage and quality gaps, and produce a prioritized, iterative work plan using the `agent-workflow-core` workflow with `agent-state.json` (validated against `agent-state-schema.json`) and `test-plan.md` (human-readable, git-trackable).

## Process

### Phase 1: Discovery

1. Scan the project for all test files:
   - React: `*.test.*`, `*.spec.*`, `__tests__/`
   - Java: `*Test.java`, `*IntegrationTest.java`
2. For each test file, identify its target (component, function, controller, service, repository, etc.).
3. Map testable targets to their coverage status by following the `@./skills/agent-workflow-core/SKILL.md` and the corresponding `context/<stack>-testing.md` overlay.

**Canonical path resolution:**
- Использовать абсолютный путь к исходному файлу (source file, НЕ тестовому)
- Нормализовать: убрать `../`, `./`, привести к lowercase (для case-insensitive FS)

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

#### 2.2.1 Branch Coverage — LLM Estimation Disclaimer (FG-4)

**RULE:** Branch coverage data from audit are LLM-ESTIMATED, not instrumented.

Все audit output, содержащие branch coverage, ОБЯЗАНЫ включать disclaimer:

```
[ESTIMATED] Branch coverage is LLM-estimated from code/test analysis.
             Run JaCoCo (Java), c8 (JS), or coverage tool for precise metrics.
```

**Audit report summary MUST NOT** представлять branch coverage как точный процент.
Формат: `Branch coverage: ~45% (LLM-estimated)` — НЕ `Branch coverage: 45%`

**Q9 quality gate item** — добавить поле `"estimation_method": "llm"`:
```json
{"id": "Q9", "name": "Branch coverage", "level": "recommended",
 "satisfied": false, "estimation_method": "llm",
 "note": "LLM-estimated. Run JaCoCo/c8 for precise coverage."}
```

#### 2.3 Apply Downgrade Rules (BEFORE scoring)

Агент **обязан** применить downgrade **до** evaluation Coverage Scoring Algorithm. Downgrade overrides final status:

| Condition | Downgrade To |
|-----------|--------------|
| Только `toMatchSnapshot()` / `assert_eq!(output, snapshot)` без behavioral assertions | `invalid` |
| Тестовый файл существует, но содержит 0 test blocks (`it`/`test`/`@Test`) | `invalid` |
| Тесты fail on execution | `invalid` |
| Для UI-компонента (forms, buttons, views): нет user interaction test (`userEvent`, `fireEvent`, эквивалент) | `partial` |
| Для HTTP endpoint/handler: нет integration test (напр. @WebMvcTest, MockMvc, rest-assured) | `partial` |
| Для async операций (API calls, DB queries, timers): нет async/wait check (`await findBy*`, `waitFor`, `assertThrows`, эквивалент) | `partial` |
| Количество test blocks < R4.1 minimum для данного типа цели (напр. `< 3 it` для сервиса с ветвлениями) | `partial` |

**Правило:** Downgrade применяется **автоматически** при обнаружении conditions. Агент не может его переопределить субъективной оценкой.

#### 2.4 Coverage Scoring Algorithm — Strict (FG-1)

Если downgrade не применён на §2.3, агент вычисляет статус алгоритмически.

**CRITICAL INVARIANT:** `coverage_status = "full"` **ДОЛЖНО** означать что ВСЕ required quality gate items имеют `satisfied = true`. Любое нарушение = BUG в генерации agent-state.json.

##### 2.4.1 Quality Gate Structure

Каждый target в `agent-state.json` содержит структурированный `quality_gate`, определяемый схемой: `skills/agent-workflow-core/agent-state-schema.json#/definitions/quality_gate_item`.

Поля:
- `id` — идентификатор чеклист-пункта (Q1–Q9 + stack-specific)
- `name` — краткое описание
- `level` — уровень критичности (`required`, `recommended`, `optional`) — определяется по правилам из `context/testing-standards.md §3` и stack overlay
- `satisfied` — `true` если критерий выполнен, `false` если нет
- `note` — опциональное пояснение (например, почему не satisfied)
- `estimation_method` — для Q9: `llm` если LLM-estimated (FG-4)

##### 2.4.2 Scoring Algorithm

```
Input: quality_gate = [ {id, level, satisfied, note} ]

Algorithm:
  required_items = filter(quality_gate, level="required")
  failed_required = count(required_items where satisfied=false)

  IF failed_required == 0:
    coverage_status = "full"
  ELSE IF failed_required > 0:
    coverage_status = "partial"

  // NOTE: coverage_status="invalid" или "missing" назначаются ДО этого алгоритма
  // (downgrade rules §2.3 или отсутствие тестов)

  ⚠️ INVARIANT: coverage_status = "full" IMPLIES ∀ qg ∈ required_items: qg.satisfied = true
  Это инвариант. Любое нарушение = BUG.
```

##### 2.4.3 Validation Rule

Перед сохранением `agent-state.json` аудитор ОБЯЗАН выполнить валидацию:

```
VALIDATE(target):
  IF target.coverage_status == "full":
    failed = filter(target.quality_gate, level="required" AND satisfied=false)
    IF failed is not empty:
      // AUTO-CORRECT: переквалифицировать в partial
      target.coverage_status = "partial"
      log("[AUDIT] scoring correction: '{target.id}' had full with {length(failed)} failed required → corrected to partial")
```

##### 2.4.4 Output Format

**Результат всегда сопровождается:**
```yaml
[AUDIT SCORE] <file_path>
  quality_gate:
    - {id: Q1, level: required, satisfied: true}
    - {id: Q4, level: recommended, satisfied: false, note: "..."}
    - {id: Q7, level: required, satisfied: false, note: "..."}
  required_total: <N>
  failed_required: <M>
  → coverage_status: <full | partial>
[AUDIT] scoring applied: target=<file_path>, failed_required=<M> → status=<full|partial>
```

#### Coverage Status Reference

| Status | Определение |
|--------|-------------|
| **full** | Quality gate: 0 failed `required` items. Overlay R4.1: все criteria met. Downgrade rules: none triggered. Recommended items may have failures (warnings only). |
| **partial** | Quality gate: 1+ failed `required` items. Testable gaps exist. `missing_requirements` must be populated. |
| **invalid** | Tests exist but are meaningless (snapshot-only, no assertions, or fail on execution). |
| **missing** | No test file exists for this target. |

### Phase 3: Prioritization

Classify each gap by priority:

| Priority | Criteria | Примеры |
|----------|----------|---------|
| **critical** | Entry points (App/Main, public API, key controllers/handlers) with no tests or invalid tests | React `App.tsx` без тестов; Java `UserController` без тестов |
| **high** | Components with user interactions (forms, buttons, views) OR critical services with `partial` coverage | Форма авторизации; `UserService` с бизнес-логикой |
| **medium** | Utilities, selectors, hooks, helpers, non-critical services with `partial` coverage | `validateEmail`; мапперы; хуки данных |
| **low** | Static components, pure helpers, simple getters with no complex logic | Конфигурационные файлы; UI-элементы без логики |

### Phase 4: Plan Generation

1. Create `.gigacode/plans/tests-audit-YYYY-MM-DD/` directory following W1.1 of `@./skills/agent-workflow-core/SKILL.md`.
2. Initialize `agent-state.json` according to `@./skills/agent-workflow-core/agent-state-schema.json` and `@./skills/agent-workflow-core/test-plan-state-schema.json` (W1.3).
3. Populate `agent-state.json` with:
   - Full audit results per target (path, status, reason, missing requirements, priority).
   - Prioritized `plan.items` with actionable tasks.
   - Each task must include `quality_gate` — the specific requirements from the quality checklist that need to be met.
   - Populate `test_plan` section per `test-plan-state-schema.json` (stack, framework, audit_summary).
4. Generate `test-plan.md` from the JSON following W8 and `@./skills/test-plan-template/test-plan-template.md` (W0.5 — double documentation).

### Phase 5: Report

Output the audit summary in the standard format:

```yaml
[AUDIT] component: <path>
[AUDIT] test_file: <test path or "none">
[AUDIT] status: full | partial | invalid | missing
[AUDIT] reason: <specific reason>
[AUDIT] missing_requirements: <list of unmet quality checklist items>
[AUDIT] priority: critical | high | medium | low
```

## Rules

- Do not modify code during audit. This is a read-only analysis phase.
- Do not assign `partial` status based solely on test file existence; evaluate quality.
- Do not skip the quality checklist for any target with tests.
- Do not skip `missing_requirements` — the user must know exactly what needs to be added.
- For targets with HTTP endpoint exposure, if no integration test (напр. `@WebMvcTest`, `MockMvc`) is present → status is `partial`. **(Backend-проект)**
- For targets with UI interactions (forms, buttons, views), if no user interaction test (`userEvent`, `fireEvent`) is present → status is `partial`. **(React-проект)**
- For targets with async operations (API calls, DB queries, timers), if no async/wait behavior check → status is `partial`.
- Mark blocked items (e.g., component can't be resolved) and continue; do not halt execution.
- Output the final report grouped by priority: critical → high → medium → low.
- After audit completion, present the plan summary and ask for user confirmation before proceeding to `test-implementation`.
- For targets with existing tests, always output the full checklist with ✓/✗ marks (Phase 2 §2.2) before assigning coverage_status.
- Apply downgrade rules (Phase 2 §2.3) automatically before Coverage Scoring Algorithm. Do not override downgrade with subjective evaluation.
- Both `agent-state.json` and `test-plan.md` can be committed to git — `test-plan.md` gives human-readable diff in PRs.

## Output Format

Final report must include:

```yaml
[AUDIT] total targets: <N>
[AUDIT] full: <N>
[AUDIT] partial: <N>
[AUDIT] invalid: <N>
[AUDIT] missing: <N>
[AUDIT] critical_priority_tasks: <N>
[AUDIT] high_priority_tasks: <N>
[AUDIT] plan_location: .gigacode/plans/tests-audit-YYYY-MM-DD/
```

### Phase 5.1: Coverage Summary (FG-5)

Audit report ОБЯЗАН содержать двухуровневый quality scoring:

```markdown
## Coverage Summary

| Metric | Value |
|--------|-------|
| Source files | <total_targets> |
| Files with tests | <targets_with_tests> |
| Full coverage (strict*) | <full_strict_count> (<percent>%) |
| Partial coverage | <partial_count> (<percent>%) |
| Missing | <missing_count> |

> * Full (strict) = all REQUIRED quality gates satisfied.
>   Recommended items failures (Q4, Q7-service, Q9) generate warnings but do not reduce status.
>   Strict Quality Score: <strict_percent>%
>   Full Quality Score: <full_percent>%
```

**Формулы:**
```
strict_quality_score = (targets_with_all_required_satisfied / total_targets_with_tests) × 100
full_quality_score = (targets_with_all_items_satisfied / total_targets_with_tests) × 100
```

### Phase 5.2: Quality Warnings (FG-5)

Audit report ОБЯЗАН содержать секцию warnings для recommended items failures:

```markdown
## Quality Warnings (non-blocking)

| Warning | Affected files | Description |
|---------|---------------|-------------|
| Q4: Test naming | <N> files | <X>% use implementation-based names |
| Q7: Error handling (service) | <N> files | Services delegate error handling |
| Q9: Branch coverage (estimated) | <N> files | LLM-estimated branch gaps |
```

**Правила:**
- Группировать warnings по Q-item id
- Показывать количество затронутых файлов
- Добавлять краткое описание причины

And a `test-plan.md` with grouped tasks by priority, ready for iterative execution via `test-implementation`.

## Exit Conditions

- [ ] `agent-state.json` создан и валидируется по `agent-state-schema.json` и `test-plan-state-schema.json`
- [ ] `test-plan.md` сгенерирован из JSON (W8.3)
- [ ] `plan.items` содержит минимум 1 задачу со статусом `pending`
- [ ] Каждая задача в `plan.items` имеет `priority`, `quality_gate`, `coverage_status`
- [ ] `plan.meta.count_by_status` корректно считает audit результаты (full/partial/invalid/missing)
- [ ] `plan.meta.progress_percent` отражает что audit завершён (может быть 0% если нет выполненных задач, но count_by_status заполнен)
- [ ] `memory.history` содержит минимум записи `started` и `completed` (audit stages)
- [ ] Audit summary output содержит `[AUDIT] total/targets/full/partial/invalid/missing`
- [ ] Для каждого audited файла выведен `[AUDIT CHECKLIST]` с ✓/✗ отметками по всем пунктам (Phase 2 §2.2)
- [ ] Для каждого partial/invalid файла выведен `[AUDIT SCORE]` с quality_gate структурой (Phase 2 §2.4)
- [ ] Downgrade rules применены где применимы (Phase 2 §2.3)
- [ ] Validation rule §2.4.3 выполнена: нет `coverage_status: "full"` с failed required items
- [ ] Каждый quality_gate item имеет поля: `id`, `level`, `satisfied` (и опционально `name`, `note`)
- [ ] Audit summary содержит Coverage Summary с strict_quality_score и full_quality_score
- [ ] Audit summary содержит Quality Warnings секцию с распределением recommended failures по типам

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Модификация кода во время аудита | Audit — read-only фаза, изменение кода нарушает целостность анализа |
| Присвоение `partial` только по наличию тест-файла | Файл существует ≠ качество, нужна проверка по quality checklist |
| Пропуск `missing_requirements` | Пользователь не узнает что именно нужно добавить |
| Создание `agent-state.json` без `quality_gate` для каждой задачи | Plan.items без quality_gate бесполезен для имплементации |
| `coverage_status: "full"` при наличии failed required quality gate items | Нарушение инварианта FG-1 — приводит к inconsistency (баг) |
| Quality gate item без поля `level` | Невозможно применить strict scoring algorithm |
| Абсолютные пути в артефактах | Не portable, ломается при перемещении проекта |
