---
name: agent-workflow-core
description: Core principles of planning, iterability, and state management for autonomous agent sessions using unified agent-state-schema.json
---

# Skill: agent-workflow-core
**Domain**: Core principles of planning, iterability, and context management for agents.
**Version**: 2.4

## W0. Базовые принципы

### W0.1 Принцип атомарности
**ДОЛЖНО**: Одна итерация = одна атомарная задача.
**ЗАПРЕЩЕНО**: Выполнять несколько задач параллельно в рамках одного цикла.

### W0.2 Принцип наблюдаемости
**ДОЛЖНО**: Каждая задача должна иметь наблюдаемый результат (файл, лог, статус).
**ЗАПРЕЩЕНО**: Выполнять действия, результат которых невозможно верифицировать.

### W0.3 Принцип явного контекста
**ДОЛЖНО**: Всё состояние агента (план, контекст, история, чекпоинты) хранится в едином JSON-файле (`agent-state.json`), который обновляется атомарно после каждой итерации.
**ЗАПРЕЩЕНО**: Полагаться на неявную память или историю диалога как на источник правды.

### W0.4 Принцип обратимости
**ДОЛЖНО**: Любое изменение кода/конфига должно быть обратимым и логироваться в истории итераций.
**ЗАПРЕЩЕНО**: Изменять продакшн-код без явного разрешения пользователя.

### W0.5 Принцип двойной документации
**ДОЛЖНО**: Помимо машиночитаемого `agent-state.json`, агент поддерживает человеко-читаемый Markdown-отчет (`test-plan.md`), который обновляется синхронно с состоянием.
**ЗАПРЕЩЕНО**: Обновлять JSON без обновления Markdown-отчета.

---

## W1. Единый файл состояния агента

Агент работает с одним файлом состояния, который хранится в структурированной директории артефактов.

### W1.1 Структура артефактов

Артефакты агентов хранятся в папке `.gigacode/plans/` по следующей схеме:

```
.gigacode/plans/<task-type>-YYYY-MM-DD/
├── agent-state.json          ← машиночитаемый, валидируется по agent-state-schema.json
└── test-plan.md              ← человеко-читаемый, синхронно обновляется из JSON
```

**Где:**
- `<task-type>` — тип задачи (например, `tests-audit`, `implementation`, `review`)
- `YYYY-MM-DD` — дата начала работы (ISO формат)

### W1.2 JSON-схема

Полная схема состояния доступна в файле: [agent-state-schema.json](./agent-state-schema.json)

Для тестовых планов используется расширение: [test-plan-state-schema.json](./test-plan-state-schema.json)

Этот файл содержит точную структуру всех полей, включая:
- `version`, `agent`, `project`, `session`, `plan`, `memory`
- Типы данных, перечисления, обязательные поля
- Тестово-специфичные поля: `test_type`, `coverage_status`, `quality_gate`

### W1.3 Инициализация состояния

При первом запуске агент **обязательно создаёт директорию `.gigacode/plans/<task-type>-YYYY-MM-DD/`** и **обязательно создаёт файл `agent-state.json`** с базовой структурой стейта (см. схему [agent-state-schema.json](./agent-state-schema.json)), а также **обязательно создаёт файл `test-plan.md`** (см. W8.1).

**Обратите внимание:** Согласно W0.3, `agent-state.json` является **ИСТОЧНИКОМ ИСТИНЫ** для текущего состояния агента. Все иные файлы (включая `test-plan.md`) являются производными и должны синхронизироваться с JSON.

### W1.4 Выбор задачи (pending → in_progress)

1. Найти в `plan.items` все элементы, где:
   - `assigned_agent` совпадает с `agent.type` (или `agent.role`).
   - `status == "pending"`.
   - Все `dependencies` имеют статус `done` или `skipped`.
2. Выбрать первую по приоритету (или иную логику).
3. Обновить `session.checkpoint`:
   ```json
   "checkpoint": {
     "iteration": <предыдущая_итерация + 1>,
     "plan_item_id": "<выбранный id>",
     "description": "Выполнение задачи: <name>"
   }
   ```
4. Изменить статус задачи на `in_progress`, записать `started_at`.
5. Добавить запись в `memory.history` с `action: "started"`.
6. Сохранить файл.
7. **Обновить `test-plan.md`** (см. W8.2).

---

## W2. Итеративный режим (STRICT)

### W2.1 Одна задача за итерацию
```
[Итерация N]
1. Загрузить agent-state.json
2. Выбрать первую pending-задачу (W1.4)
3. Выполнить ТОЛЬКО её
4. Обновить статус задачи и зафиксировать результат (W2.3)
5. Сохранить файл
6. Обновить test-plan.md (W8.3)
7. Остановиться
```

### W2.2 Логирование выбора задачи
Перед выполнением агент выводит:
```
[AGENT] iteration: 5
[AGENT] selected: T3
[AGENT] type: ui_test
[AGENT] context_ref: ctx:checkform:v1
[AGENT] checkpoint saved to agent-state.json
[AGENT] test-plan.md updated
```

### W2.3 Завершение итерации (обновление состояния)

1. Установить `status = "done"` (или `blocked`), `completed_at = <сейчас>`, заполнить `result`.
2. Добавить созданные артефакты в `memory.artifacts`.
3. Добавить запись в `memory.history` с `action: "completed"`.
4. Пересчитать `plan.meta` (количество по статусам, `progress_percent`).
5. Очистить `checkpoint.plan_item_id` (установить `null`), описание: "Ожидание следующей задачи".
6. Обновить `session.last_updated`.
7. Сохранить файл.
8. **Обновить `test-plan.md`** (W8.3).

### W2.4 Обработка блокировок
Если задача требует внешнего ввода:
- Установить `status = "blocked"`.
- Записать причину в `result.message` и/или `memory.context.last_error`.
- Логировать: `[AGENT] task blocked: <причина>`.
- Сохранить состояние и **обновить `test-plan.md`**.
- Остановиться.

---

## W3. Управление контекстом и памятью через agent-state.json

### W3.1 Контекст в `memory.context`

В разделе `memory.context` агент хранит:
- `knowledge` – массив фактов о проекте.
- `constraints` – массив ограничений.
- `references` – массив объектов с путями к файлам и контрольными суммами.
- `rules` – объект с версией и содержимым правил агента (опционально).
- `last_error` – информация о последней ошибке.

### W3.2 Обновление контекста
После каждой итерации агент может:
- Добавить новые строки в `knowledge`.
- Обновить `checksum` для изменённых файлов.
- Записать принятые решения в `history` (поле `details`).

### W3.3 Ссылки на контекст в плане (`context_ref`)
Задача может иметь поле `context_ref` – строковый идентификатор (например, `"ctx:api_errors:v2"`). Это позволяет агенту быстро находить релевантные знания в `memory.context` (например, по ключу в `rules.content`).

### W3.4 История итераций (`memory.history`)
Каждая запись содержит:
- `iteration` – номер.
- `plan_item_id` – ID задачи.
- `action` – `started`, `completed`, `failed`, `skipped`.
- `timestamp` – ISO 8601.
- `details` – описание.
- `result` – `success` или `failure` (для завершённых).

История обеспечивает полную прослеживаемость и возможность восстановления контекста.

---

## W4. Синхронизация между агентами

### W4.1 Передача состояния
При передаче работы другому агенту достаточно передать файл `agent-state.json` (или его копию) и **файл `test-plan.md`**. Новый агент:
- Загружает файл.
- Проверяет, что `agent.type` соответствует его роли (или игнорирует, если координирует).
- Продолжает выполнение с текущего `checkpoint` или выбирает следующую pending-задачу.
- Перед началом работы синхронизирует `test-plan.md` с JSON (если расхождения).

### W4.2 Конфликт разрешения
Если разные агенты модифицируют один файл (например, в общем репозитории), приоритет имеет версия, сохранённая последней (по `last_updated`). При конфликте агент должен:
- Остановиться.
- Сообщить о конфликте.
- Дождаться ручного разрешения.

---

## W5. Формат логов (ОБЯЗАТЕЛЬНО)

### W5.1 Структура лога итерации
```
[AGENT] iteration: 5
[AGENT] selected: T3
[AGENT] type: ui_test
[AGENT] context_ref: ctx:checkform:v1
[AGENT] checkpoint saved to agent-state.json
[AGENT] test-plan.md updated

... (выполнение) ...

[AGENT] iteration: 5 completed
[AGENT] result: done
[AGENT] artifact: src/CheckForm.test.tsx
[AGENT] next_pending: T4
[AGENT] state saved. test-plan.md updated. Awaiting next command.
```

### W5.2 Лог изменений состояния
```
[STATE] T3.status: pending → in_progress
[STATE] T3.started_at: 2026-04-16T10:15:00Z
[STATE] session.checkpoint.iteration: 5
```

---

## W6. Чек-лист начала работы

Перед стартом агент ОБЯЗАН:

- [ ] Найти или создать директорию `.gigacode/plans/<task-type>-YYYY-MM-DD/` для артефактов.
- [ ] **Если файл `agent-state.json` существует — валидировать его по `agent-state-schema.json`.** Если валидация не прошла — **агент выводит ошибку `[AGENT] PRE-FLIGHT FAILED: agent-state.json is invalid` и останавливается** (blocked state).
- [ ] Если файл `agent-state.json` новый – инициализировать его согласно W1.3 и запросить у пользователя подтверждение `mode`.
- [ ] **Проверить наличие `test-plan.md`. Если отсутствует – создать из текущего состояния (W8.1).**
- [ ] Проверить, что `session.status` позволяет работу (`active` или `paused`).
- [ ] Если есть незавершённая задача (`checkpoint.plan_item_id != null`), решить, продолжать её или начать новую (в зависимости от `status` задачи).

### W6.1 Определение <task-type> по роли агента (для gigatest)

| Роль агента | Значение `<task-type>` |
|-------------|------------------------|
| test-auditor | `tests-audit` |
| test-implementer | `tests-impl` |
| test-reviewer | `tests-review` |
| test-strategist | `tests-strategy` |
| test-verifier | `tests-verify` |

---

## W7. Шаблон ответа агента (завершение итерации)

```
✅ Итерация #{{iteration}} завершена

📋 Задача: {{task.name}} ({{task.id}})
📄 Результат: {{task.result.status}} – {{task.result.message}}
📁 Артефакты: {{list of memory.artifacts paths}}

📊 Прогресс плана: {{plan.meta.done}}/{{plan.meta.total_items}} ({{plan.meta.progress_percent}}%)

📝 Человеко-читаемый план обновлён: test-plan.md

🛑 Состояние сохранено в agent-state.json. Жду дальнейших указаний.
```

---

## W8. Человеко-читаемый отчет (test-plan.md)

Агент **обязан** поддерживать Markdown-файл `test-plan.md`, который представляет состояние плана в удобном для человека виде. Этот файл обновляется **синхронно** с каждым изменением `agent-state.json`. Оба файла можно коммитить в репозиторий — `test-plan.md` даёт diff-видимость изменений плана в PR.

### W8.1 Гибкая структура `test-plan.md`

Файл должен быть **человеко-читаемым** и соответствовать **предметной области** тестирования.

**Обязательные элементы для отображения:**
- Название проекта/плана и общий прогресс.
- Сводка по статусам задач (количество по приоритетам).
- Список задач с их статусами, типами тестов, покрытиями, исполнителями и результатами.
- Список ключевых артефактов (созданных тестовых файлов).
- Текущий чекпоинт (какая задача выполняется/выполнена последней).

**Рекомендуемый шаблон:**

```markdown
# Тестовый план: {{project.name}}

**Прогресс**: {{plan.meta.progress_percent}}% ({{plan.meta.done}}/{{plan.meta.total_items}})

## 📋 Сводка статусов
| Статус | Количество |
|--------|------------|
| critical | {{critical_count}} |
| high | {{high_count}} |
| medium | {{medium_count}} |
| low | {{low_count}} |

## 🗂️ Задачи по приоритетам

### 🔴 Критичные

{{#each critical_items}}
### {{id}}: {{name}} [{{status}}]
- **Тип**: {{subtype}} | **Исполнитель**: {{assigned_agent}}
- **Покрытие**: {{coverage_status}}
- **Quality gate**: {{#if quality_gate}}{{join quality_gate ", "}}{{/if}}
- **Результат**: {{#if result}}{{result.status}} – {{result.message}}{{/if}}
- **Артефакты**: {{#if artifact}}`{{artifact}}`{{/if}}
{{/each}}

... (аналогично для high, medium, low) ...

## 📁 Созданные тестовые файлы

{{#each memory.artifacts}}
- **{{type}}**: `{{path}}` ({{related_plan_item}})
{{/each}}

## 🔍 Текущий чекпоинт
- **Итерация**: {{session.checkpoint.iteration}}
- **Задача**: {{session.checkpoint.plan_item_id}} – {{session.checkpoint.description}}

---
*ИСТОЧНИК ИСТИНЫ: agent-state.json | СХЕМА: agent-state-schema.json*
```

### W8.2 Правила адаптации шаблона

1. **Читаемость превыше всего**: Использовать Markdown-форматирование.
2. **Контекстная группировка**: Группировать задачи по приоритетам (critical → high → medium → low).
3. **Уместная детализация**: Для тестов — всегда показывать `coverage_status` и `quality_gate`.
4. **Git-friendly**: Относительные пути для ссылок на артефакты, чтобы diff был осмысленным.

### W8.3 Обновление `test-plan.md`

После **каждого** сохранения `agent-state.json` агент должен перегенерировать `test-plan.md` полностью на основе актуального JSON-содержимого.

### W8.4 Синхронизация при конфликтах (алгоритм регенерации)

Если `test-plan.md` отсутствует или не соответствует `agent-state.json`, агент выполняет следующий алгоритм:

**Pre-flight sync check (выполняется каждым агентом перед началом работы):**

1. Загрузить `agent-state.json` и проверить `session.last_updated`.
2. Проверить, существует ли `test-plan.md` в той же директории.
3. Если `test-plan.md` **отсутствует** → перейти к шагу 5.
4. Если `test-plan.md` **существует** — сравнить его `mtime` (время модификации файла) с `session.last_updated` из JSON:
   - Если `test-plan.md.mtime < agent-state.json.session.last_updated` → Markdown устарел, нужен регенерация.
   - Если `test-plan.md.mtime >= agent-state.json.session.last_updated` → файлы синхронизированы, продолжить работу.
5. Перегенерировать `test-plan.md` из `agent-state.json` по шаблону W8.1.
6. Вывести предупреждение:
   ```
   [AGENT] WARNING: test-plan.md was out of sync (or missing). Regenerated from agent-state.json.
   ```
7. Продолжить работу.

**Когда регенерировать:**
- При каждом старте новой сессии (pre-flight check в W6).
- После каждого изменения `agent-state.json` (W8.3).
- После любой операции, которая изменила plan (выбор задачи, завершение, блокировка).

```
[AGENT] WARNING: test-plan.md was out of sync. Regenerated from agent-state.json.
```

### W8.5 Относительные пути

В `test-plan.md` использовать **относительные пути от корня проекта** для ссылок на артефакты.

---

## W9. Структура планов и именование задач

### W9.1 Именование папок планов

Папки планов используют формат: `<task-type>-YYYY-MM-DD`

### W9.2 Именование задач в плане

**Рекомендуемый формат `id`:**
- `T1`, `T2`, `T3`... — для простых последовательных задач
- `UI-001`, `LOGIC-001`, `HOOK-001` — для типизированных задач

**Обязательные поля задачи:**
- `id` — уникальный идентификатор
- `type` — тип задачи (для тестов: всегда `test`)
- `subtype` — подтип: `ui_test`, `unit_test`, `integration_test`, `hook_test`
- `name` — человеко-читаемое название
- `assigned_agent` — тип агента-исполнителя
- `status` — `pending`, `in_progress`, `done`, `skipped`, `blocked`
- `coverage_status` — `full`, `partial`, `invalid`, `missing` (для test-задач)

### W9.3 Артефакты задач

Каждая выполненная задача записывает свои артефакты в `memory.artifacts`:

```json
{
  "id": "art-001",
  "type": "test_file",
  "path": "src/components/UserForm/__tests__/UserForm.test.tsx",
  "created_at": "2026-04-16T10:00:00Z",
  "description": "UI тест для UserForm — happy path + валидация",
  "related_plan_item": "UI-001"
}
```

---

## W10. State Discovery Protocol

### W10.1 Назначение

State Discovery — это процесс автоконфигурации агента при первом подключении к проекту.
Агент определяет состояние проекта, доступные skills, контекст и формирует начальный план.

### W10.1 Discovery Steps

При старте сессии агент выполняет следующий протокол:

```
1. Scan: Найти root project directory
2. Detect: Определить tech stack (см. W10.2)
3. Load: Загрузить релевантный context overlay (context/<stack>-testing.md)
4. Check: Найти .gigacode/plans/ — есть ли существующие планы?
   ├─ ДА → Загрузить последний agent-state.json, определить текущий checkpoint
   └─ НЕТ → Перейти к шагу 5
5. Audit: Если планов нет — выполнить начальный аудит (test-audit)
6. Plan: Создать .gigacode/plans/<task-type>-YYYY-MM-DD/ с agent-state.json + test-plan.md
```

### W10.2 Stack Detection Algorithm

Агент определяет стек по наличию ключевых файлов:

| Файл/Паттерн | Stack | Context Overlay |
|-------------|-------|-----------------|
| `package.json` + `react` в зависимостях | React | `react-testing.md` |
| `package.json` без `react` | JS/TS | `js-ts-testing.md` |
| `go.mod` или `*.go` файлы | Go | `go-testing.md` |
| `requirements.txt` или `pyproject.toml` или `poetry.lock` | Python | `python-testing.md` |
| `pom.xml` или `build.gradle` или `*.java` | Java | `java-testing.md` |
| `Cargo.toml` или `*.rs` | Rust | (future) |
| `Gemfile` или `*.rb` | Ruby | (future) |

**Результат:** Stack detection записывается в `memory.context.knowledge`:
```json
"knowledge": [
  "Detected stack: React + TypeScript (package.json, react, jest, @testing-library/react)"
]
```

### W10.3 Skill Discovery

Агент сканирует доступные skills:

1. Найти `skills/` директорию в extension
2. Для каждого `skills/<name>/SKILL.md`:
   - Прочитать front-matter (`name`, `description`)
   - Записать в `memory.context.knowledge` как доступный скилл
3. Если нужен специфичный skill и его нет — сообщить пользователю

### W10.4 Context Initialization

После stack detection:

1. Загрузить `context/testing-standards.md` (shared, всегда)
2. Загрузить `context/<stack>-testing.md` (специфичный оверлей)
3. Записать в `memory.context.knowledge`:
   ```json
   "knowledge": [
     "Loaded context: testing-standards.md, react-testing.md",
     "Stack: React + TypeScript"
   ]
   ```

### W10.5 Plan Resumption

Если сессия возобновляется (не первый запуск):

1. Найти последний `.gigacode/plans/<task-type>-*/` по дате модификации
2. Загрузить `agent-state.json`
3. Проверить валидацию по схеме
4. Проверить checkpoint:
   - Если `checkpoint.plan_item_id != null` — есть незавершённая задача
   - Если `session.status == 'paused'` — сессия была приостановлена
5. Синхронизировать `test-plan.md` (W8.4)
6. Продолжить с checkpoint или выбрать следующую pending задачу (W1.4)

**Правило:** Если `agent-state.json` invalid -- не продолжать, сообщить об ошибке.

## Exit Conditions

- [ ] `agent-state.json` сохранён и валидируется по `agent-state-schema.json`
- [ ] `test-plan.md` синхронизирован с JSON (`mtime >= session.last_updated`)
- [ ] Итерация логирована в формате W5.1 (output содержит `[AGENT]` строки с iteration/selected/result)
- [ ] `memory.history` содержит минимум одну запись с `action: "completed"` за текущую итерацию
- [ ] Текущая задача (`checkpoint.plan_item_id` или выбранная pending) имеет `status` = `done` или `blocked` с заполненным `completed_at`
- [ ] `session.last_updated` обновлён и содержит актуальный timestamp
- [ ] Выбран следующий шаг: next pending задача ИЛИ остановка (если все задачи done/skipped)

---

## 🔄 Версионирование

**Skill Version**: 2.4 (gigatest)
**Domain**: Agent orchestration & workflow management
**Last Updated**: 2026-04-16

**История изменений для gigatest**:
- v2.4 (gigatest): Адаптация для тестового workflow. Имена файлов: `agent-state.json` + `test-plan.md`. Тестово-специфичные поля в схеме. Типы агентов заменены на тестовые. Режимы сессии: `audit`, `implementation`, `review`, `verification`. Валидация по `agent-state-schema.json` и `test-plan-state-schema.json`.
