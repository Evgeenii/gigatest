---
name: test-implementation
description: Use when executing an approved test plan iteratively using agent-workflow-core: one test task at a time with agent-state.json synchronization.
---

# Test Implementation

## Goal

Execute an approved test plan task by task using the `agent-workflow-core` workflow principles: one task per iteration, state synchronization via `agent-state.json`, human-readable `test-plan.md` updated after each change.

## Process

Following `@./skills/agent-workflow-core/SKILL.md` (W2.1 — one task per iteration):

1. Load `agent-state.json` from the current plan directory.
2. Calculate progress (done/pending/in_progress/blocked).
3. Identify the NEXT pending task using priority and dependencies (W1.4).
4. Execute exactly ONE task. Do not batch unrelated work.
5. Before writing tests:
   - Classify the target (UI component / logic / selector / hook / integration) using the testing strategy.
   - Check existing coverage — avoid duplicating tested behavior.
   - Log the decision using the R3 format from the appropriate testing overlay.
6. Write or improve the test following the appropriate testing strategy (R5).
7. Run the test to verify it passes.
8. Update `agent-state.json`: mark task as `done`, record artifacts, update progress (W2.3).
9. Regenerate `test-plan.md` from the updated JSON (W8.3).
10. Stop and report.

## Rules

- Do not start without a plan (`agent-state.json` exists and is valid per `agent-state-schema.json`).
- Do not execute more than one task per iteration (W2.1).
- Do not modify business logic to make tests pass; report the issue instead (W0.4).
- Always run the test after writing it to verify it passes.
- Keep scope narrow and bounded to the current task.
- Use the appropriate testing strategy overlay (react-testing, java-testing, etc.) based on the target type.
- Log decisions and artifacts in the standard iteration format (W5.1).
- After completion, update `test-plan.md` to reflect the current state (W0.5, W8.3).
- For test tasks, populate `coverage_status` and `quality_gate` fields per `test-plan-state-schema.json`.

## Iteration Log Format

```
[AGENT] iteration: {{N}}
[AGENT] selected: {{task_id}}
[AGENT] target: {{component_or_function_path}}
[AGENT] code_type: UI | logic | selector | hook | integration
[AGENT] existing_coverage: missing | partial | full
[AGENT] strategy: {{chosen_test_type}}
[AGENT] artifact: {{test_file_path}}
[AGENT] result: {{pass/fail}}
[AGENT] checkpoint saved
[AGENT] test-plan.md updated
```
