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
2. **Детерминированный алгоритм выбора:**
   - Отфильтрованные элементы сортируются по `priority` по убыванию: `critical` → `high` → `medium` → `low`.
   - При равном приоритете — сортировка по `id` лексикографически по возрастанию (например, `T1` перед `T10`, `UI-001` перед `UI-002`).
   - Выбрать первый элемент после сортировки.
   - **Если список пуст** → `[AGENT] no pending tasks found. Nothing to execute.` → остановиться.
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
| convention-discoverer | `conventions` |

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

1. Загрузить `agent-state.json` и извлечь `session.content_hash` (SHA-256 хеш сохранённого содержимого).
2. Вычислить SHA-256 хеш текущего содержимого загруженного `agent-state.json` (без учёта поля `content_hash` — исключить его из хеша).
3. Проверить, существует ли `test-plan.md` в той же директории.
4. Если `test-plan.md` **отсутствует** → перейти к шагу 6.
5. Если `test-plan.md` **существует** — сравнить вычисленный хеш с `session.content_hash`:
   - Если computed hash ≠ `session.content_hash` → JSON был изменён после последней генерации markdown, нужна регенерация.
   - Если computed hash == `session.content_hash` → файлы синхронизированы, продолжить работу.
   - **Если обнаружены ручные правки:** Перед перезаписью проверить, отличается ли содержимое `test-plan.md` от последнего сохранённого хеша (если агент хранит `test_plan_md_hash` в `memory.context`). Если да → вывести предупреждение о возможных пользовательских правках.
6. Перегенерировать `test-plan.md` из `agent-state.json` по шаблону W8.1.
7. Вывести предупреждение:
   ```
   [AGENT] WARNING: test-plan.md was out of sync (or missing). Regenerated from agent-state.json.
   ```
   Если перед этим были обнаружены ручные правки:
   ```
   [AGENT] WARNING: test-plan.md had user modifications. They will be overwritten. To preserve edits, add them to plan items' result.message instead.
   ```
8. Продолжить работу.

**Когда регенерировать:**
- При каждом старте новой сессии (pre-flight check в W6).
- После каждого изменения `agent-state.json` (W8.3).
- После любой операции, которая изменила plan (выбор задачи, завершение, блокировка).

**После сохранения agent-state.json:**
1. Обновить `session.last_updated`.
2. Вычислить SHA-256 хеш содержимого (без поля `content_hash`) и записать в `session.content_hash`.
3. Сохранить файл.
4. Перегенерировать `test-plan.md`.

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
- `subtype` — подтип: `ui_test`, `unit_test`, `integration_test`, `hook_test` (React), `api_test` (backend)
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
2. Detect: Определить tech stack (см. W10.2, W10.6 для мультистек)
3. Load: Загрузить релевантный context overlay (см. W10.6 — file extension → overlay, или W10.4 для общего контекста)
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

1. Найти все директории, соответствующие шаблону `.gigacode/plans/<task-type>-*/`.
2. Загрузить `agent-state.json` из каждой директории.
3. **Сортировка планов:**
   - Сортировать по `session.last_updated` (ISO 8601 timestamp из JSON) по убыванию.
   - При одинаковых `last_updated` — сортировать по имени директории лексикографически по убыванию (более новая дата предпочтительнее).
   - **Не использовать `mtime` файловой системы** — оно не отражает семантику состояния.
4. **Выбор плана:**
   - Проверить `session.status` в отсортированном порядке:
     - Если найден план с `session.status == "paused"` → загрузить его (пользователь явно приостановил эту работу).
     - Если план с `session.status == "active"` → загрузить первый (самый свежий по `last_updated`).
     - Если все планы имеют `session.status == "done"` или `session.status == "cancelled"` → перейти к шагу 6 (создать новый план).
5. Загрузить выбранный `agent-state.json`, проверить валидацию по схеме.
6. Проверить checkpoint:
   - Если `checkpoint.plan_item_id != null` — есть незавершённая задача (см. EC-5: если задача `in_progress`, решить — продолжить её или пропустить).
   - Если `session.status == 'paused'` — сессия была приостановлена, логировать: `[AGENT] resuming paused session from checkpoint`.
7. Синхронизировать `test-plan.md` (W8.4).
8. Продолжить с checkpoint или выбрать следующую pending задачу (W1.4).

**Правило:** Если `agent-state.json` invalid — не продолжать, сообщить об ошибке.

**Правило:** Если все найденные планы завершены (`status: "done"`) — создать новый план, а не переиспользовать старый.

---

### W10.6 Multi-Stack Layer Model

**Назначение:** Определить порядок загрузки и разрешения конфликтов при наличии нескольких стеков в одном проекте (например, React frontend + Java backend).

**Стеко-детекция по тестируемому файлу:**

Когда агент пишет или запускает тест, он определяет overlay по **файловому расширению тестируемого исходника**:

| Расширение тестируемого файла | Stack | Context Overlay |
|-------------------------------|-------|-----------------|
| `.tsx`, `.jsx`, `.vue`, `.svelte` | React/Frontend | `react-testing.md` |
| `.java` | Java | `java-testing.md` |
| `.ts`, `.js` (без JSX/TSX) | JS/TS | `js-ts-testing.md` |
| `.py` | Python | `python-testing.md` |
| `.go` | Go | `go-testing.md` |
| `.rs` | Rust | (future) |
| `.rb` | Ruby | (future) |

**Алгоритм выбора overlay при тестировании:**

```
1. Определить расширение тестируемого исходного файла (не теста, а исходника).
2. Сопоставить с таблицей W10.6 → выбрать ONE overlay.
3. Если файл не сопоставлен → fallback на `testing-standards.md`.
4. Применить правила выбранного overlay к текущему тесту.
```

**Приоритет слоёв (Layer Model):**

```
project conventions (W11) > stack overlay (W10.6) > testing-standards.md (base)
```

**Мультистек-проекты:**

- При **написании/запуске одного теста** — применяется **один** overlay (по расширению файла), а не все сразу.
- При **аудите** (test-audit) — агент собирает полный стек по всем расширениям из проекта, записывает в `test_plan.target_stack: "multi-stack"` и тестирует файлы из каждого стека с соответствующим overlay.
- **Нет конфликтов правил**, потому что каждый тест привязан к одному исходнику → одному overlay.

**Логирование:**

```
[AGENT] stack detection: testing <file.tsx> → React overlay (react-testing.md)
```

Или:

```
[AGENT] stack detection: testing <service.go> → Go overlay (go-testing.md)
```

**Правило:** Если один тест проверяет интеграцию двух стеков (напр. e2-тест React → Java API) — применять overlay **по типу точки входа** (если тест начинается с UI → React overlay, если с API → Java overlay).

---

## W11. Convention Loading Protocol

### W11.1 Назначение

Convention Loading — это процесс загрузки кастомных конвенций проекта, обнаруженных агентом `convention-discoverer`.
Конвенции проекта имеют приоритет над базовыми stack overlays и `testing-standards.md`.

### W11.2 Когда вызывается

W11 вызывается **ПОСЛЕ** W10 (stack detection) и **ДО** начала работы агента.

### W11.3 Algorithm

При подготовке к тестовой сессии каждый агент выполняет:

```
1. Check: .gigacode/conventions/project-conventions.json существует?
   ├─ ДА → Загрузить, валидировать по convention-overlay-schema.json
   │        Если валидация не прошла → warning, fallback к шагу 2
   │        Если валидация прошла → [AGENT] loaded conventions from .gigacode/conventions/project-conventions.json
   │                                [AGENT] applying custom conventions (priority: custom > stack > base)
   │        Перейти к началу работы.
   └─ НЕТ → Перейти к шагу 2

2. Check: .gigacode/conventions/project-conventions.md существует?
   ├─ ДА → Загрузить как human-readable overlay
   │        [AGENT] loaded conventions from .gigacode/conventions/project-conventions.md
   │        Перейти к началу работы.
   └─ НЕТ → Перейти к шагу 3

3. Загрузить stack overlay из context/ (W10.4)
   [AGENT] no project conventions found. Using <stack>-testing.md base conventions
   Перейти к началу работы.
```

### W11.4 Layer Model

При наложении конвенций применяется модель приоритетов:

```
custom (project-conventions) > stack overlay (context/<stack>-testing.md) > testing-standards.md
```

**Правила разрешения конфликтов:**

1. Конвенции из `project-conventions.json` **переопределяют** stack overlay при конфликте.
2. Stack overlay **переопределяет** `testing-standards.md` при конфликте.
3. Если кастомная конвенция нарушает базовые принципы `testing-standards.md` §1 (общие принципы) — агент **предупреждает**, но **НЕ** применяет нарушение. Это логируется:
   ```
   [AGENT] WARNING: custom convention conflicts with testing-standards §<section>: <brief description>. Skipping.
   ```

### W11.5 Logging

Каждый агент логирует применение конвенций:

```
[AGENT] conventions: loaded custom conventions from .gigacode/conventions/project-conventions.json
[AGENT] conventions: priority = custom > stack overlay > testing-standards
[AGENT] conventions: <N> naming, <M> mocking, <K> forbidden rules loaded
```

Или при fallback:

```
[AGENT] conventions: no project conventions found. Using context/<stack>-testing.md base conventions
```

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

**Skill Version**: 2.9 (gigatest)
**Domain**: Agent orchestration & workflow management
**Last Updated**: 2026-04-19

**История изменений для gigatest**:
- v2.9 (gigatest): P0-A4 — Добавлен W10.6 Multi-Stack Layer Model. File extension → один конкретный overlay. Мультистек аудит через target_stack: multi-stack.
- v2.8 (gigatest): P0-A3 — Добавлено `session.content_hash` (SHA-256). W8.4 переписан: сравнение по hash вместо mtime. Предупреждение о user modifications. agent-state-schema.json обновлена.
- v2.7 (gigatest): P0-A5 — W10.5 переписан: сортировка по JSON `session.last_updated` (не mtime), выбор по priority (paused > active > done), same-timestamp fallback по имени директории.
- v2.6 (gigatest): P0-A1 — W1.4 заменён «или иную логику» на детерминированный алгоритм (priority desc → id asc). Добавлен empty-list check.
- v2.5 (gigatest): Добавлен W11 — Convention Loading Protocol. Layer model (custom > stack > base), conflict resolution, logging.
- v2.4 (gigatest): Адаптация для тестового workflow. Имена файлов: `agent-state.json` + `test-plan.md`. Тестово-специфичные поля в схеме. Типы агентов заменены на тестовые. Режимы сессии: `audit`, `implementation`, `review`, `verification`. Валидация по `agent-state-schema.json` и `test-plan-state-schema.json`.
