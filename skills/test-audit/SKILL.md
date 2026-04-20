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
   - React/JS/TS: `*.test.*`, `*.spec.*`, `__tests__/`
   - Java: `*Test.java`, `*IntegrationTest.java`
   - Python: `test_*.py`, `*_test.py`
   - Go: `*_test.go`
2. For each test file, identify its target (component, function, controller, service, repository, etc.).
3. Map testable targets to their coverage status by following the `@./skills/agent-workflow-core/SKILL.md` and the corresponding `context/<stack>-testing.md` overlay.

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

### Phase 3: Prioritization

Classify each gap by priority:

| Priority | Criteria | Примеры |
|----------|----------|---------|
| **critical** | Entry points (App/Main, public API, key controllers/routes/handlers) with no tests or invalid tests | React `App.tsx` без тестов; Java `UserController` без тестов; Python `/api/users` без тестов |
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
- For targets with UI interactions (forms, buttons, views), if no user interaction test (`userEvent`, `fireEvent`) is present → status is `partial`. **(React-проект)**
- For targets with HTTP endpoint exposure, if no integration test (`supertest`, `TestClient`, `httptest`) is present → status is `partial`. **(Backend-проект)**
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
- [ ] Для каждого partial/invalid файла выведен `[AUDIT SCORE]` с failed_items (Phase 2 §2.4)
- [ ] Downgrade rules применены где применимы (Phase 2 §2.3)

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Модификация кода во время аудита | Audit — read-only фаза, изменение кода нарушает целостность анализа |
| Присвоение `partial` только по наличию тест-файла | Файл существует ≠ качество, нужна проверка по quality checklist |
| Пропуск `missing_requirements` | Пользователь не узнает что именно нужно добавить |
| Создание `agent-state.json` без `quality_gate` для каждой задачи | Plan.items без quality_gate бесполезен для имплементации |
| Абсолютные пути в артефактах | Не portable, ломается при перемещении проекта |
