# TEMPLATE-SYNTAX.md — Спецификация синтаксиса шаблонов тестовых планов

> Версия: 1.0 | Дата: 2026-04-18
>
> **Назначение:** Описать Handlebars-подобный синтаксис шаблонов, используемый для генерации `test-plan.md` из `agent-state.json`.
> **Аудитория:** Агенты-имплементеры, авцы новых шаблонов.

---

## 1. Общее назначение

`test-plan.md` генерируется **полностью** из `agent-state.json` с использованием шаблона ([test-plan-template.md](../skills/test-plan-template/test-plan-template.md)).

**Правило:** `test-plan.md` никогда не редактируется вручную. Всегда генерировать заново после каждого изменения `agent-state.json`.

## 2. Синтаксис шаблона

Шаблон использует **Handlebars-подобный синтаксис**. Ниже описаны все доступные конструкции.

### 2.1 Подстановка переменной

```
{{path.to.value}}
```

- Разрешает путь через точки в JSON-объекте `agent-state.json`
- Если значение `null`, `undefined`, или пусто — рендерится как пустая строка

**Пример:**
```
Проект: {{project.name}}
Стадия: {{session.stage}}
```

### 2.2 Условный блок (`{{#if}}`)

```
{{#if path.to.value}}
Значение: {{path.to.value}}
{{/if}}
```

- Рендерит содержимое блока **только** если значение truthy (не `null`, `undefined`, `false`, `""`, `[]`)
- Может быть вложенным

**Пример:**
```
{{#if plan.items}}
Найдено задач: {{plan.items.length}}
{{/if}}

{{#if task.result}}
Результат: {{task.result.status}}
{{/if}}
```

### 2.3 Итерация по массиву (`{{#each}}`)

```
{{#each array.path}}
- {{this.field}}
{{/each}}
```

- Перебирает элементы массива
- `{{this}}` — текущий элемент
- `{{this.field}}` — поле текущего элемента

**Пример:**
```
{{#each plan.items}}
### {{this.id}}: {{this.name}} [{{this.status}}]
- **Тип**: {{this.subtype}}
- **Исполнитель**: {{this.assigned_agent}}
- **Покрытие**: {{this.coverage_status}}
{{/each}}
```

### 2.4 Объединение массива в строку (`{{#join}}`)

```
{{#join array.path ", "}}
```

- Объединяет элементы массива в строку с указанным разделителем

**Пример:**
```
{{#if quality_gate}}
{{#join quality_gate ", "}}
{{/if}}
```

Рендерит: `happy path, error handling, validation`

### 2.5 Мета-переменные

Доступные meta-переменные в `plan.meta`:

| Переменная | Тип | Описание |
|------------|-----|----------|
| `{{plan.meta.total_items}}` | number | Общее количество задач |
| `{{plan.meta.done}}` | number | Количество завершённых задач |
| `{{plan.meta.in_progress}}` | number | Количество задач в работе |
| `{{plan.meta.blocked}}` | number | Количество заблокированных задач |
| `{{plan.meta.skipped}}` | number | Количество пропущенных задач |
| `{{plan.meta.progress_percent}}` | number | Процент выполнения (0–100) |
| `{{plan.meta.count_by_status}}` | object | Объект со счетами по аудит-статусам |

## 3. Полный шаблон

Основной шаблон для генерации `test-plan.md`:
- [test-plan-template.md](../skills/test-plan-template/test-plan-template.md)

## 4. Алгоритм генерации

```
1. Загрузить agent-state.json
2. Валидировать по agent-state-schema.json + test-plan-state-schema.json
3. Загрузить test-plan-template.md
4. Применить переменные из JSON к шаблону
5. Записать результат в test-plan.md (в ту же директорию)
6. Вывести: test-plan.md regenerated from agent-state.json
```

## 5. Группировка задач

Задачи (`plan.items`) группируются по `priority`:

1. `critical` → 🔴 Критичные
2. `high` → 🟡 Высокие
3. `medium` → 🟢 Средние
4. `low` → ⚪ Низкие

Если для секции нет задач — выводить `_Нет задач_`.

## 6. Пример рендеринга

**Вход (`agent-state.json` snippet):**
```json
{
  "project": {"name": "MyApp"},
  "plan": {
    "meta": {
      "total_items": 2,
      "done": 1,
      "progress_percent": 50
    },
    "items": [
      {"id": "T1", "name": "Audit Auth", "status": "done", "priority": "critical", "subtype": "integration_test", "assigned_agent": "test-implementer", "coverage_status": "full", "quality_gate": ["happy path"]},
      {"id": "T2", "name": "Audit Profile", "status": "pending", "priority": "high", "subtype": "unit_test", "assigned_agent": "test-auditor", "coverage_status": "missing", "quality_gate": []}
    ]
  },
  "memory": {"artifacts": [{"type": "test_file", "path": "tests/test_auth.py", "related_plan_item": "T1"}]}
}
```

**Выход (`test-plan.md`):**
```markdown
# Тестовый план: MyApp

**Прогресс**: 50% (1/2)

## 📋 Сводка статусов
| Статус | Количество |
|--------|------------|
| done | 1 |
| pending | 1 |

## 🗂️ Задачи по приоритетам

### 🔴 Критичные

### T1: Audit Auth [done]
- **Тип**: integration_test | **Исполнитель**: test-implementer
- **Покрытие**: full
- **Quality gate**: happy path
- **Результат**: done

### 🟡 Высокие

### T2: Audit Profile [pending]
- **Тип**: unit_test | **Исполнитель**: test-auditor
- **Покрытие**: missing
- **Quality gate**: _not set_

## 📁 Созданные тестовые файлы
- `tests/test_auth.py` (T1)

---
*ИСТОЧНИК ИСТИНЫ: agent-state.json | СХЕМА: agent-state-schema.json*
```

## 7. Расширение шаблона

Для добавления новых секций:

1. Обновить шаблон в `skills/test-plan-template/test-plan-template.md`
2. Убедиться что новые поля есть в JSON Schema (`test-plan-state-schema.json`)
3. Если поле добавлено на уровне `plan.items` — оно автоматически доступно в `{{#each plan.items}}`
4. Регенерировать `test-plan.md`

## 8. Ограничения

| Ограничение | Значение |
|-------------|----------|
| Тип шаблона | Handlebars-подобный (не настоящий Handlebars.js, агентная эмуляция) |
| Вложенность | Не более 3 уровней (`{{#each}}{{#if}}{{variable}}{{/if}}{{/each}}`) |
| Фильтры | Только `{{#if}}` — нет `{{#unless}}`, `{{#unless-equal}}` и т.д. |
| Форматирование дат | ISO 8601, без трансформации |
| Арифметика | Не поддерживается в шаблоне |

---

*Смежные документы: test-plan-template/SKILL.md, agent-workflow-core/SKILL.md §W8, test-plan-state-schema.json*
