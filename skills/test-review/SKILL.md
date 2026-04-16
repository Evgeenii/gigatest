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

- [ ] **Behavior, not implementation**: Does the test check observable behavior rather than internal state (no `component.state`, no `instance().method`)?
- [ ] **Semantic queries**: Are queries using `getByRole`, `getByLabelText`, `getByText` (for UI) or meaningful assertions (for backend)?
- [ ] **Async correctness**: Are async operations properly handled (`await findBy*`, `waitFor`, not bare `setTimeout`)?
- [ ] **No excessive mocks**: Are only necessary dependencies mocked? No mocking of internal logic?
- [ ] **Single scenario per test**: Does each `it`/`test` block check one scenario?
- [ ] **Descriptive naming**: Does the test name describe the expected behavior (not implementation detail)?
- [ ] **Stable data**: For snapshots, are dates/UUIDs/random values mocked or fixed?
- [ ] **Edge case coverage**: Are null/undefined/empty/error states tested where applicable?
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

Flag if found in tests:

| Pattern | Why it's bad |
|---------|-------------|
| `expect(component.state).toBe(...)` | Testing internal state, not behavior |
| `jest.mock(module, () => fn: jest.fn())` on internal functions | Mocking implementation details |
| `expect(wrapper.instance().method).toHaveBeenCalled()` | Testing implementation, not behavior |
| `toMatchSnapshot()` as the only assertion | No behavioral verification |
| Direct `act(() => ...)` without `await` | Outdated pattern, potential race condition |

## Rules

- Review is read-only; do not modify test files during review.
- Present findings as actionable items with specific suggestions.
- Do not flag stylistic preferences that don't affect test quality.
- If a test uses a valid but unusual pattern, explain why it works rather than suggesting a change.
- For tests being reviewed after `test-implementation`, check that they match the `quality_gate` requirements from the audit plan in `agent-state.json`.
- After review, provide a summary and wait for user feedback before proceeding.
