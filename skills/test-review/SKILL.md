---
name: test-review
description: Use when reviewing the quality, correctness, maintainability, and design of existing tests before merge or after test-implementation.
---

# Test Review

## Goal

Review existing or newly-written tests for correctness, quality, and adherence to testing standards. Produce actionable findings that the implementer can address. Cross-reference findings with the `agent-state.json` plan to verify `quality_gate` requirements are met.

## Process

### Phase 1: Scope Identification

1. Identify the tests to review:
   - If a specific file or module is specified, review only its tests.
   - If reviewing recent changes in a PR/branch, identify all modified test files.
   - If reviewing a plan output (from `test-implementation`), review all artifacts produced.
2. If an `agent-state.json` plan exists, load it to check which `quality_gate` items were required for each task.
3. Load the relevant testing strategy overlay for context (React, Java, etc.).

### Phase 2: Quality Review Checklist

For each test file, evaluate against the mandatory quality checklist:

#### Test Quality Checklist

Базовый checklist stack-agnostic. Stack-специфичные детали см. в `context/<stack>-testing.md`.

- [ ] **Behavior, not implementation**: Does the test check observable behavior rather than internal state (no private fields, no internal methods, no reflection)?
- [ ] **Meaningful assertions**: Are assertions checking observable outcomes (response body, status code, DOM content, returned value) rather than internal state?
- [ ] **Async/Interaction correctness**: Are async operations properly handled (`await`/`waitFor`/`async/await`/`assertThrows`), not bare `setTimeout`/synchronous calls? For UI: interaction events properly simulated?
- [ ] **No excessive mocks**: Are only necessary dependencies mocked? No mocking of internal logic within the tested module?
- [ ] **Single scenario per test**: Does each test block check exactly one scenario?
- [ ] **Descriptive naming**: Does the test name describe the expected behavior (e.g. `should_return_404_when_not_found`), not implementation (`test_get_user`)?
- [ ] **Stable data**: Are dates/UUIDs/random values mocked or fixed for deterministic tests?
- [ ] **Edge case coverage**: Are null/undefined/empty/error/boundary states tested where applicable?
- [ ] **No duplication**: Is there no duplication with other existing tests for the same behavior?
- [ ] **Testability**: Can this test be simplified (fewer mocks, simpler setup, less indirection)?

### Phase 3: Findings Report

For each file reviewed, output findings in standard format:

```yaml
[REVIEW] test_file: <path>
[REVIEW] issues_found: <N>
[REVIEW] issue_1: type=<critical | major | minor> desc="<specific issue>"
[REVIEW] suggestion: "<actionable recommendation>"
```

### Phase 4: Summary

Output a summary table:

```yaml
[REVIEW] total_files_reviewed: <N>
[REVIEW] files_passing: <N>
[REVIEW] files_with_findings: <N>
[REVIEW] total_findings: <N>
[REVIEW] critical: <N>
[REVIEW] major: <N>
[REVIEW] minor: <N>
```

## Forbidden Patterns

Эти паттерны запрещены для **любого** стека. React-специфичные см. в `context/react-testing.md`.

| Pattern | Why it's bad | Stack |
|---------|-------------|-------|
| Asserting on internal state (e.g. `component.state`, private fields, internal variables) | Testing internals, not observable behavior | Any |
| Mocking internal functions of the tested module | Hides real dependencies, makes test meaningless | Any |
| `toMatchSnapshot()` as the only assertion | No behavioral verification | Any |
| Test assertions without any assertion | Test passes without verifying anything | Any |
| Order-dependent tests (tests pass only in a specific sequence) | Unpredictable CI behavior | Any |

**React-специфичные** (apply только к React-проектам):

| Pattern | Why it's bad |
|---------|-------------|
| `expect(component.state).toBe(...)` | Testing internal component state |
| `jest.mock()` on internal React functions | Mocking implementation details |
| `expect(wrapper.instance().method).toHaveBeenCalled()` | Testing implementation, not behavior |
| Direct `act(() => ...)` without `await` | Outdated pattern, potential race condition |

## Rules

- Review is read-only; do not modify test files during review.
- Present findings as actionable items with specific suggestions.
- Do not flag stylistic preferences that don't affect test quality.
- If a test uses a valid but unusual pattern, explain why it works rather than suggesting a change.
- For tests being reviewed after `test-implementation`, check that they match the `quality_gate` requirements from the audit plan in `agent-state.json`.
- After review, provide a summary and wait for user feedback before proceeding.

## Exit Conditions

- [ ] Все файлы из `agent-state.json::memory.artifacts` (или scope) прошли review
- [ ] Phase 3 Findings Report сформирован для каждого файла с `issues_found`
- [ ] Phase 4 Summary (`[REVIEW] total_files_reviewed/files_passing/files_with_findings/total_findings`) выведен
- [ ] Если есть critical findings — явно помечены и требуют подтверждения пользователя
- [ ] `agent-state.json` обновлён с результатами review (artifacts, history запись `completed`)
- [ ] `memory.history` содержит записи `started` и `completed` (review stage)
