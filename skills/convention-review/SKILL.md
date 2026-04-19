---
name: convention-review
description: Review and validate discovered project testing conventions. Human-in-the-loop approve/reject/revise workflow with validation checklist.
---

# Skill: Convention Review

## Purpose

Provide a structured review process for project testing conventions discovered by `convention-discoverer`. Ensures conventions are accurate, non-conflicting, and actionable before they are used in test workflow.

## Phase 1: Load & Analyze

1. Загрузить `.gigacode/conventions/project-conventions.json` (если есть) или `.gigacode/conventions/project-conventions.md`.
2. Если JSON — валидировать по `convention-overlay-schema.json` (`@./skills/convention-discovery/convention-overlay-schema.json`).
3. Если валидация не прошла — остановить review, сообщить об ошибках.
4. Применить validation checklist (§Phase 2).

## Phase 2: Validation Checklist

### Mandatory Checklist

- [ ] Все `naming` записи имеют `target` и `pattern` (источник `source` опционален но рекомендован)
- [ ] Все `forbidden_patterns` записи имеют `reason` и `alternative` (не просто "нельзя делать X")
- [ ] `naming` conventions покрывают: файлы, describe-блоки, it-блоки (минимум 3 target)
- [ ] `mocking_rules` покрывают: API, БД (если применимо), внешние сервисы
- [ ] `team_notes` имеют `source` ссылку (не голословные заметки)
- [ ] Нет пустых массивов без причины (если `mocking_rules: []` — почему проект не использует моки?)
- [ ] `metadata.scanned_files` > 0 (иначе conventions не обнаружены, warning)
- [ ] `base_stack` совпадает с реальным стеком проекта (см. W10.2)
- [ ] Нет конвенций, конфликтующих с `testing-standards.md` §1 (общие принципы)

### Conflict Detection

Сравнить каждую convention запись с `testing-standards.md`:

| Проверка | Что искать |
|----------|------------|
| Behavior over Implementation | Custom convention требует тестирования реализации → reject |
| One Scenario Per Test | Custom convention позволяет multiple asserts в одном тесте → warning |
| No Duplication | Custom convention требует дублирования тестов для внутренних функций → warning |
| Mocking Principles | Custom convention mock-ет внутренние функции тестируемого модуля → reject |

## Phase 3: Human-in-the-Loop Review

### 3.1 Review Output

Агент генерирует review report:

```markdown
# Convention Review Report

> Project: <project name>
> Conventions: .gigacode/conventions/project-conventions.md
> Reviewed at: YYYY-MM-DD

## Status: APPROVED | CHANGES_REQUESTED | NEEDS_REVISION

## Checklist Results

| Check | Result |
|-------|--------|
| Naming completeness | ✅ passed (3 targets, sources verified) |
| Forbidden patterns alternatives | ⚠️ needs improvement (1 missing alternative) |
| ... | ... |

## Findings

### Issues (must fix)
1. [CRITICAL] `forbidden_patterns[3]` missing `alternative` field
2. [MEDIUM] `mocking_rules` does not cover database mocking

### Suggestions (optional)
1. Consider adding naming convention for test helper files
2. Consider documenting why project uses X instead of Y

## Required Changes
- [ ] Fix forbidden_patterns[3]: add alternative
- [ ] Add DB mocking rule if applicable

```

### 3.2 Human Review Workflow

```
[REVIEW] generated convention review report
[REVIEW] awaiting user decision: approve | revise | reject
```

**Пользователь может:**

- **approve** — conventions accepted → статус: `approved`, готовы к использованию
- **revise** — нужен пересмотр с конкретными правками → `convention-discoverer` перезапускает discovery с учётом правок
- **reject** — conventions неверны → `convention-discoverer` перезапускает с нуля

### 3.3 Versioning

При каждом approve:

```
.gigacode/conventions/
├── project-conventions-v1.0.json
├── project-conventions-v1.0.md
├── project-conventions-v1.1.json  ← если revise + re-approve
└── project-conventions.md          ← always latest approved (symlink or copy)
```

`metadata.version` увеличивается при каждом revise.

## Phase 4: Integration with Test Workflow

После `approve`:

1. Записать в `memory.context.knowledge`:
   ```json
   "Knowledge": [
     "Conventions approved: project-conventions v1.0",
     "Conventions path: .gigacode/conventions/project-conventions.json"
   ]
   ```
2. Конвенции станут доступны через W11 (Convention Loading Protocol).
3. Логировать: `[REVIEW] conventions approved. Available via W11 for test agents.`

## Rules

- Do NOT accept conventions without running the full validation checklist.
- Do NOT approve conventions that conflict with `testing-standards.md` §1 without resolving conflicts.
- Do NOT skip `forbidden_patterns` alternatives — разработчику нужно знать как правильно.
- If `project-conventions.json` validation fails — reject, don't try to fix silently.
- All suggestions during review should be marked as optional vs mandatory clearly.
- Version bump: increment patch for minor changes, minor for new conventions, major for breaking changes.

## Exit Conditions

- [ ] Review report generated with checklist results
- [ ] Status is one of: `APPROVED`, `CHANGES_REQUESTED`
- [ ] If APPROVED: `project-conventions.md` updated and versioned
- [ ] If CHANGES_REQUESTED: list of required changes documented with specific action items
- [ ] Output contains `[REVIEW] conventions review: <status>` log line
- [ ] Validation checklist completed (all mandatory checks executed, results recorded)

## Forbidden Patterns

| Паттерн | Почему |
|---------|--------|
| Acceptance без validation checklist | Невалидные конвенции ухудшат качество тестов |
| Принятие конвенций с конфликтами testing-standards | Базовые принципы имеют приоритет |
| Silent corrections (исправление без согласования) | Разработчик не будет знать что изменилось |
| Review только JSON без Markdown | Human-readable формат нужен для PR review |
| Отказ без объяснения причин | Разработчик не поймёт как исправить |
