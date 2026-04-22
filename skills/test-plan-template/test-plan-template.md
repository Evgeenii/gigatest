# Test Plan Template

This file documents the expected structure of `test-plan.md` — the human-readable report
that is regenerated from `agent-state.json` after every state change.

**Location**: `.gigacode/plans/<task-type>-YYYY-MM-DD/test-plan.md`

**Source of truth**: `agent-state.json` (validated against `agent-state-schema.json`)

---

## Template

```markdown
# Тестовый план: {{project.name}}

**Стек**: {{test_plan.target_stack}} | **Фреймворк**: {{test_plan.test_framework}}
**Прогресс**: {{plan.meta.progress_percent}}% ({{plan.meta.done}}/{{plan.meta.total_items}})

## 📊 Сводка покрытия

| Статус | Количество |
|--------|------------|
| ✅ Полное | {{test_plan.audit_summary.full_coverage}} |
| ⚠️ Частичное | {{test_plan.audit_summary.partial_coverage}} |
| 🚫 Недействительное | {{test_plan.audit_summary.invalid_coverage}} |
| ❌ Отсутствует | {{test_plan.audit_summary.no_coverage}} |

{{#if test_plan.quality_score_summary}}
## 📈 Quality Score Summary

- Strict Quality Score: **{{test_plan.quality_score_summary.strict_percent}}%** (required items only)
- Full Quality Score: **{{test_plan.quality_score_summary.full_percent}}%** (all items including recommended)
- Files with warnings: **{{test_plan.quality_score_summary.files_with_warnings}}** (have recommended items failures but may still be full)
{{/if}}

{{#if test_plan.quality_warnings}}
## ⚠️ Quality Warnings (non-blocking)

| Warning | Affected files | Description |
|---------|---------------|-------------|
{{#each test_plan.quality_warnings}}
| {{id}}: {{name}} | {{file_count}} files | {{description}} |
{{/each}}
{{/if}}

> ⚠️ Branch coverage percentages are **LLM-estimates**, not instrumented measurements.
> Run project coverage tools (JaCoCo, c8, etc.) for precise data.

## 📋 Сводка задач

| Приоритет | pending | in_progress | done | blocked |
|-----------|---------|-------------|------|---------|
| 🔴 Critical | — | — | — | — |
| 🟠 High | — | — | — | — |
| 🟡 Medium | — | — | — | — |
| 🟢 Low | — | — | — | — |

## 🗂️ Задачи

### 🔴 Critical

{{for each item with priority=critical}}
### {{id}}: {{name}} [{{status}}]
- **Тест**: {{subtype}} | **Покрытие**: {{coverage_status}}
- **Цель**: `{{source_file}}`
- **Quality gate**: {{#if quality_gate}}{{join quality_gate ", "}}{{else}}не указан{{/if}}
- **Тестовый файл**: {{#if artifact}}`{{artifact}}`{{else}}—{{/if}}
- **Результат**: {{#if result}}{{result.status}} – {{result.message}}{{else}}—{{/if}}
{{/each}}

### 🟠 High

{{for each item with priority=high}}
... (аналогично) ...
{{/each}}

### 🟡 Medium

{{for each item with priority=medium}}
... (аналогично) ...
{{/each}}

### 🟢 Low

{{for each item with priority=low}}
... (аналогично) ...
{{/each}}

## 📁 Созданные тестовые файлы

{{#each memory.artifacts}}
- `{{path}}` — {{description}} ({{related_plan_item}})
{{/each}}

## 🔍 Текущий чекпоинт

- **Итерация**: {{session.checkpoint.iteration}}
- **Задача**: {{#if session.checkpoint.plan_item_id}}{{session.checkpoint.plan_item_id}} — {{session.checkpoint.description}}{{else}}Ожидание{{/if}}

---

*ИСТОЧНИК ИСТИНЫ: `agent-state.json`*
*СХЕМА: `agent-state-schema.json`*
*Последнее обновление: {{session.last_updated}}*
```

---

## Generation Rules

When regenerating `test-plan.md` from `agent-state.json`:

1. **Re-render completely** — do not partially update; generate from scratch.
2. **Group by priority** — critical → high → medium → low sections.
3. **Use relative paths** for all file references (from project root).
4. **Show test-specific fields** — `coverage_status`, `quality_gate`, `source_file`.
5. **Mark empty sections** — if no items in a priority group, write `_Нет задач_`.
6. **Timestamp** — always include `session.last_updated` at the bottom.
