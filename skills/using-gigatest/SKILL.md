---
name: using-gigatest
description: Use when starting testing work in a repository that follows the gigatest structured testing workflow; route to the right testing skill before writing tests.
---

# Using GigaTest

## Purpose

`gigatest` is a skills-first testing workflow for Qwen Code.

Your job at the start of testing work is to route into the correct workflow stage instead of immediately writing tests.

## Rules

- Prefer the skills-first path over slash commands.
- Use `test-audit` when the user wants to analyze existing test coverage, find gaps, or build a prioritized testing plan.
- Use `test-implementation` when there is an approved test plan (from audit or user-defined) and the next job is writing or improving tests.
- Use `test-review` when the user wants to review the quality, correctness, and maintainability of written tests.
- Use `test-verification` before declaring tests passing, fixed, or ready for merge.
- Keep commands available as recovery paths, not the primary workflow.

## Stage Map

1. Audit existing test coverage and quality → `test-audit`
2. Build a prioritized test plan → (part of `test-audit` output)
3. Execute the test plan iteratively → `test-implementation`
4. Review test quality → `test-review`
5. Verify tests before completion → `test-verification`

## Routing Guidance

- If the user asks to "check what tests we have" or "audit coverage" → `test-audit`
- If the user asks to "write tests for X" and no plan exists → start with `test-audit`, then `test-implementation`
- If the user asks to "write tests for X" and a plan already exists → `test-implementation`
- If the user asks to "review my tests" or "check test quality" → `test-review`
- If the user asks to "run the tests" or "check if tests pass" → `test-verification`
- If the next stage is ambiguous, ask one clarifying question limited to the specific ambiguity.
- If automatic routing is not enough, tell the user which slash command is the manual fallback.

## Exit Conditions

- [ ] Output содержит явную строку вида `[ROUTING] selected skill: <skill-name>`
- [ ] Output содержит обоснование: `[ROUTING] reason: <обоснование выбора>`
- [ ] Вызван релевантный skill через `@./skills/test-audit/SKILL.md`, `test-implementation`, `test-review`, или `test-verification`
- [ ] Если plan не существует — output содержит `[ROUTING] first step: audit (no plan found)`
- [ ] Если plan уже существует — output содержит `[ROUTING] plan found at: <path>, proceeding to implementation`
