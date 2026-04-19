---
name: test-verification
description: Use before claiming tests are passing, fixed, or ready for merge; requires fresh execution evidence and agent-state.json plan consistency check.
---

# Test Verification Before Completion

## Goal

Prevent false completion claims by requiring fresh test execution evidence and verifying that `agent-state.json` plan is fully completed before saying tests are ready for merge.

## Workflow Context

All verification follows the `@./skills/agent-workflow-core/SKILL.md` workflow. The `agent-state.json` file is the source of truth for plan status. `test-plan.md` is the human-readable mirror.

## Iron Law

No completion claim without fresh verification evidence.
If you did not run the test suite against the current workspace state, do not claim success.

## Verification Gate

Before any success claim:

1. Load `agent-state.json` from the current plan directory.
2. Check that all `plan.items` have `status` of `done` or `skipped` (no `pending`, `in_progress`, or `blocked`).
3. Verify `plan.meta.progress_percent == 100`.
4. Identify the exact claim you are about to make (e.g., "all tests pass", "login tests pass", "coverage increased").
5. Identify the single most specific command that can verify that claim.
6. Run that command now against the current workspace.
7. Read the actual output and exit status instead of assuming the result.
8. Report the result with evidence.
9. If the check could not run, say that explicitly and report the remaining risk.

## Evidence By Claim

| Claim | Required evidence | Not sufficient |
|-------|-------------------|----------------|
| Tests pass | Exact test command with passing result and no relevant failures | Older run, partial subset, "should pass" |
| Coverage improved | Coverage report showing delta | "I wrote more tests" without coverage output |
| Build succeeds with tests | Build/typecheck + test command exits cleanly | Lint passing |
| Bug regression test added | Reproduce the original failing path, verify new test catches it | Test file creation only |
| Test refactoring preserves behavior | Run full test suite before and after, compare results | Manual inspection |
| Subagent test work is done | Inspect the produced tests and run them independently | Trusting the subagent report |
| Plan is complete | `agent-state.json` shows all tasks as `done` or `skipped` | Verbal confirmation only |

## Red Flags

- "should", "probably", "seems", or similar hedging used as a substitute for verification
- Partial verification presented as full verification
- Relying on stale output from before the latest changes
- Moving to commit, PR, or handoff without rerunning relevant checks
- Trusting agent success reports without independent validation
- Declaring completion when `agent-state.json` still has pending or blocked tasks

## Rules

- Always load `agent-state.json` first to verify plan completeness before running tests.
- If `agent-state.json` shows incomplete tasks, report: `[VERIFY] plan incomplete: {{N}} tasks still pending/blocked`.
- Start with the most specific verification for the claimed requirement, then expand only if task risk justifies it.
- When you make a success claim, include the exact command you ran and the key result.
- If verification fails, report the failure plainly and stop claiming completion.
- If verification cannot run, say what blocked it and what risk remains.
- Missing verification means incomplete work, not implied success.
- For delegated work, verify independently before reporting status upward.
- Check `test-plan.md` sync status — if out of sync with `agent-state.json`, regenerate it (W8.3).

## Exit Conditions

- [ ] `agent-state.json` загружен и проверен: все `plan.items` имеют статус `done` или `skipped`
- [ ] `plan.meta.progress_percent == 100` подтверждено
- [ ] Test command запущен и результат прочитан (не предполагается)
- [ ] Evidence по каждому claim собрано и задокументировано (Evidence By Claim таблица)
- [ ] Если verification прошло успешно — output содержит exact command + key result
- [ ] Если verification failed — failure reported plainly, no completion claimed
- [ ] `test-plan.md` синхронизирован с `agent-state.json` (W8.3)
- [ ] `memory.history` содержит записи `started` и `completed` (verification stage)

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Заявление об успехе без запуска тестов | Нарушает Iron Law — нет evidence, нет completion |
| Использование старого вывода тестов как evidence | Изменения могли сломать тесты, нужен свежий запуск |
| Принятие "should pass" / "probably works" как результата | Hedging = отсутствие реальной проверки |
| Пропуск проверки `agent-state.json` перед верификацией | Неполный plan = неполная верификация |
| Доверие отчёту суб-агента без независимой проверки | Суб-агент может ошибаться, нужна независимая валидация |
