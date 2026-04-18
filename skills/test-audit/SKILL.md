---
name: test-audit
description: Use when analyzing existing test coverage, identifying gaps, and building a prioritized test plan using agent-workflow-core state management.
---

# Test Audit

## Goal

Perform a comprehensive analysis of existing tests, identify coverage and quality gaps, and produce a prioritized, iterative work plan using the `agent-workflow-core` workflow with `agent-state.json` (validated against `agent-state-schema.json`) and `test-plan.md` (human-readable, git-trackable).

## Process

### Phase 1: Discovery

1. Scan the project for all test files (`*.test.*`, `*.spec.*`, `__tests__/`).
2. For each test file, identify its target (component, function, hook, selector, service).
3. Map testable targets to their coverage status by following the `@./skills/agent-workflow-core/SKILL.md`.

### Phase 2: Quality Analysis

For each test file, evaluate quality using the mandatory checklist:

#### Quality Checklist

- [ ] How many `it`/`test` blocks? (less than 3 → automatic downgrade)
- [ ] Are there user interaction calls? (`userEvent`, `fireEvent` for UI; for backend: integration setup)
- [ ] Are there async checks? (`await findBy*`, `waitFor`, or equivalent)
- [ ] Are different states tested? (loading, error, empty, success, edge cases)
- [ ] Is there null/undefined/empty array handling?
- [ ] Are errors tested? (try/catch, error boundaries, failed API responses)

#### Coverage Classification

| Status | Criteria |
|--------|----------|
| **full** | Quality checklist passes entirely; all branches, edge cases, and async behavior covered |
| **partial** | Tests exist but miss 2+ checklist items |
| **invalid** | Only snapshots without behavioral assertions, or tests that fail on execution |
| **missing** | No test file exists for this target |

### Phase 3: Prioritization

Classify each gap by priority:

| Priority | Criteria |
|----------|----------|
| **critical** | Entry points (App, main pages, public API) with no tests or invalid tests |
| **high** | Components with user interactions (forms, buttons) that have `partial` coverage |
| **medium** | Utilities, selectors, hooks with `partial` coverage |
| **low** | Static components or pure helpers with no complex logic |

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
- For targets with UI interactions (buttons, forms), if no `userEvent` is present → status is `partial`.
- For targets with async operations (API calls, timers), if no `await findBy*` or `waitFor` → status is `partial`.
- Mark blocked items (e.g., component can't be resolved) and continue; do not halt execution.
- Output the final report grouped by priority: critical → high → medium → low.
- After audit completion, present the plan summary and ask for user confirmation before proceeding to `test-implementation`.
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

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Модификация кода во время аудита | Audit — read-only фаза, изменение кода нарушает целостность анализа |
| Присвоение `partial` только по наличию тест-файла | Файл существует ≠ качество, нужна проверка по quality checklist |
| Пропуск `missing_requirements` | Пользователь не узнает что именно нужно добавить |
| Создание `agent-state.json` без `quality_gate` для каждой задачи | Plan.items без quality_gate бесполезен для имплементации |
| Абсолютные пути в артефактах | Не portable, ломается при перемещении проекта |
