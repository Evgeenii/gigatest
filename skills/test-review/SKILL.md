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

Базовая checklist — `@context/testing-standards.md §3`. Применить к каждому файлу.

Ниже — **delta** (уникальные вопросы review, не входящие в базовый чеклист):

- [ ] **Stable data**: Are dates/UUIDs/random values mocked or fixed for deterministic tests?
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

Эти паттерны запрещены для **любого** стека.

| Pattern | Why it's bad | Stack |
|---------|-------------|-------|
| Asserting on internal state (e.g. `component.state`, private fields, internal variables) | Testing internals, not observable behavior | Any |
| Mocking internal functions of the tested module | Hides real dependencies, makes test meaningless | Any |
| `toMatchSnapshot()` as the only assertion | No behavioral verification | Any |
| Test assertions without any assertion | Test passes without verifying anything | Any |
| Order-dependent tests (tests pass only in a specific sequence) | Unpredictable CI behavior | Any |

## Rules

- Review is read-only; do not modify test files during review.
- Present findings as actionable items with specific suggestions.
- Do not flag stylistic preferences that don't affect test quality.
- If a test uses a pattern not listed in Forbidden Patterns (testing-standards §4), explain why it works rather than suggesting a change.
- For tests being reviewed after `test-implementation`, check that they match the `quality_gate` requirements from the audit plan in `agent-state.json`.
- After review, provide a summary and wait for user feedback before proceeding.

## Exit Conditions

- [ ] Все файлы из `agent-state.json::memory.artifacts` (или scope) прошли review
- [ ] Phase 3 Findings Report сформирован для каждого файла с `issues_found`
- [ ] Phase 4 Summary (`[REVIEW] total_files_reviewed/files_passing/files_with_findings/total_findings`) выведен
- [ ] Если есть critical findings — явно помечены и требуют подтверждения пользователя
- [ ] `agent-state.json` обновлён с результатами review (artifacts, history запись `completed`)
- [ ] `memory.history` содержит записи `started` и `completed` (review stage)
