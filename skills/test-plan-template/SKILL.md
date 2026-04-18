---
name: test-plan-template
description: Generate human-readable test-plan.md from agent-state.json using Handlebars-like template syntax.
---

# Skill: test-plan-template

## Purpose
Предоставляет шаблон для генерации человеко-читаемого Markdown-отчёта (`test-plan.md`)
из машиночитаемого состояния (`agent-state.json`). Регенерируется полностью после каждого
изменения состояния агента (agent-workflow-core W8.3).

## Template Syntax

Шаблон использует **Handlebars-подобный синтаксис**:
- `{{variable}}` — подстановка значения из JSON
- `{{#if condition}}...{{/if}}` — условное отображение
- `{{#each array}}...{{/each}}` — итерация по массиву
- `{{#join array ", "}}` — объединение массива в строку

Полный шаблон: [`test-plan-template.md`](./test-plan-template.md)

## Phase 1: Load

1. Загрузить `agent-state.json` (source of truth).
2. Убедиться что файл валидируется по `agent-state-schema.json`.

## Phase 2: Render

1. Загрузить [`test-plan-template.md`](./test-plan-template.md).
2. Применить переменные из JSON к шаблону:
   - `{{project.name}}`, `{{test_plan.target_stack}}`, `{{plan.meta.*}}`
   - Группировка `plan.items` по `priority` (critical → high → medium → low)
   - `memory.artifacts` — список созданных файлов
3. Если для секции нет задач — написать `_Нет задач_`.

## Phase 3: Write

1. Записать результат в `test-plan.md` в той же директории, что и `agent-state.json`.
2. Относительные пути в output — от корня проекта (не абсолютные).

## Exit Conditions
- [ ] `test-plan.md` существует и является валидным Markdown
- [ ] Все priority-секции присутствуют (critical, high, medium, low), даже если пустые
- [ ] Относительные пути используются для всех file references
- [ ] Footer содержит `ИСТОЧНИК ИСТИНЫ: agent-state.json` и timestamp

## Forbidden Patterns
| Паттерн | Почему |
|---------|--------|
| Ручное редактирование `test-plan.md` | Рассинхронизация с JSON-источником |
| Абсолютные пути в output | Не portable, ломается при перемещении проекта |
| Частичное обновление (diff) | Может пропустить удалённые/изменённые задачи |
| Использование template без загрузки agent-state.json | Нет данных для рендера |
