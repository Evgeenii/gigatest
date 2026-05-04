---
name: agent-workflow-core
description: Core principles of planning, iterability, and state management for autonomous agent sessions using unified agent-state-schema.json
---

# Skill: agent-workflow-core
**Domain**: Core principles of planning, iterability, and context management for agents.
**Version**: 2.5

## W0. Базовые принципы

### W0.1 Принцип атомарности
**ДОЛЖНО**: Одна итерация = одна атомарная задача.
**ЗАПРЕЩЕНО**: Выполнять несколько задач параллельно в рамках одного цикла.

### W0.2 Принцип наблюдаемости
**ДОЛЖНО**: Каждая задача должна иметь наблюдаемый результат (файл, лог, статус).
**ЗАПРЕЩЕНО**: Выполнять действия, результат которых невозможно верифицировать.

### W0.3 Принцип явного контекста
**ДОЛЖНО**: Всё состояние агента хранится в `agent-state.json`, обновляется атомарно после каждой итерации.
**ЗАПРЕЩЕНО**: Полагаться на неявную память или историю диалога как на источник правды.

### W0.4 Принцип обратимости
**ДОЛЖНО**: Любое изменение должно быть обратимым и логироваться в истории.
**ЗАПРЕЩЕНО**: Изменять продакшн-код без явного разрешения пользователя.

### W0.5 Принцип двойной документации
**ДОЛЖНО**: Помимо `agent-state.json`, агент поддерживает `test-plan.md`, обновляемый синхронно с JSON.
**ЗАПРЕЩЕНО**: Обновлять JSON без обновления Markdown.

---

## W1. Единый файл состояния агента

### W1.1 Структура артефактов

```
.gigacode/plans/<task-type>-YYYY-MM-DD/
├── agent-state.json   ← машиночитаемый, валидируется по agent-state-schema.json
└── test-plan.md       ← человеко-читаемый, синхронно обновляется из JSON
```

`<task-type>` см. W6.1 | `YYYY-MM-DD` — дата начала (ISO)

### W1.2 JSON-схема

Схема: [agent-state-schema.json](./agent-state-schema.json) (основная), [test-plan-state-schema.json](./test-plan-state-schema.json) (тестовое расширение).

Корневые поля: `version`, `agent`, `project`, `session`, `plan`, `memory` — см. схему для типов и обязательных полей.

### W1.3 Инициализация

При первом запуске: создать директорию `.gigacode/plans/<task-type>-YYYY-MM-DD/` → создать `agent-state.json` (по схеме) → создать `test-plan.md` (W8). Согласно W0.3, JSON — источник истины.

### W1.4 Выбор задачи (pending → in_progress)

**Алгоритм:**
1. Фильтр: `assigned_agent == agent.type` AND `status == "pending"` AND все `dependencies` ∈ {done, skipped}
2. Если пусто → `[AGENT] no pending tasks found. Nothing to execute.` → остановиться
3. Сортировка: `priority` desc (critical → high → medium → low), затем `id` asc (лексикографически)
4. Выбрать первый → `status = "in_progress"`, `started_at = now`
5. `session.checkpoint` → `{iteration: prev+1, plan_item_id: <id>, description: "Выполнение: <name>"}`
6. `memory.history += {iteration, action: "started", timestamp: now}`
7. Сохранить JSON → регенерировать test-plan.md (W8)

---

## W2. Итеративный режим (STRICT)

### W2.1 Одна задача за итерацию

Алгоритм выбора → W1.4.

Цикл: load state.json → select (W1.4) → execute → update (W2.3) → save → regen test-plan.md (W8) → stop.

**⛔ STRICT: НЕ выполнять >1 задачи за итерацию.**

### W2.2 Логирование

```
[AGENT] iteration: <N> | selected: <id> | type: <subtype> | context_ref: <ref>
[AGENT] checkpoint saved | test-plan.md updated
```

### W2.3 Завершение итерации

1. `status → "done"` / `"blocked"`, `completed_at = now`, `result = {status, message}`
2. `memory.artifacts += новые файлы`; `memory.history += {action: "completed", result: "success"/"failure"}`
3. Пересчитать `plan.meta` (done/in_progress/pending/blocked/skipped, `progress_percent`)
4. `checkpoint.plan_item_id → null`; `session.last_updated → now` → сохранить JSON → регенерировать test-plan.md (W8)

### W2.4 Блокировки

`status = "blocked"` → `result.message / memory.context.last_error` с причиной →
`[AGENT] task blocked: <причина>` → сохранить JSON → регенерировать test-plan.md (W8) → остановиться.

---

## W3. Структура memory

### W3.1 Поля memory.context

| Поле | Тип | Описание |
|------|-----|----------|
| `knowledge` | `string[]` | Факты о проекте |
| `constraints` | `string[]` | Ограничения |
| `references` | `{file, checksum, last_checked}[]` | Контрольные суммы файлов |
| `rules` | `{version, content, updated_at}` | Правила агента |
| `last_error` | `{code, message, timestamp, resolved}?` | Последняя ошибка |

### W3.2 Обновление

После каждой итерации: `knowledge +=` новые факты; `references.checksum +=` изменённые файлы; решения → `memory.history[action="completed"].details`.

`context_ref` в задачах → быстрый поиск в `memory.context.rules.content`.

### W3.3 История (`memory.history`)

Запись: `{iteration, plan_item_id, action, timestamp, details, result?}`
`action` ∈ {started, completed, failed, skipped}; `result` ∈ {success, failure}

История обеспечивает полную прослеживаемость и восстановление контекста.

---

## W4. Синхронизация между агентами

### W4.1 Передача состояния

Передать `agent-state.json` + `test-plan.md` → новый агент:
- Загружает файлы → проверяет `agent.type` → продолжает с checkpoint или выбирает pending (W1.4)
- Синхронизирует test-plan.md с JSON при расхождениях (W8)

### W4.2 Конфликт разрешения

Приоритет — версия с последним `last_updated`. При конфликте: остановиться → сообщить → ждать ручного разрешения.

---

## W5. Формат логов (ОБЯЗАТЕЛЬНО)

### W5.1 Формат

Начало итерации:
```
[AGENT] iteration: <N> | selected: <id> | type: <subtype> | context_ref: <ref>
[AGENT] checkpoint saved | test-plan.md updated
```

Завершение итерации:
```
[AGENT] iteration: <N> completed | result: <done/blocked> | artifact: <path>
[AGENT] next_pending: <id> | state saved. test-plan.md updated. Awaiting next command.
```

Изменения состояния:
```
[STATE] <id>.status: <old> → <new> | <id>.started_at: <timestamp>
[STATE] session.checkpoint.iteration: <N>
```

---

## W6. Pre-flight (обязательно)

Перед стартом агент ОБЯЗАН:

- [ ] Директория `.gigacode/plans/<task-type>-YYYY-MM-DD/` существует
- [ ] `agent-state.json` валиден по agent-state-schema.json → иначе `[AGENT] PRE-FLIGHT FAILED: agent-state.json is invalid` → stop (blocked)
- [ ] Новый файл → инициализировать (W1.3) + запросить `mode` у пользователя
- [ ] `test-plan.md` существует → иначе создать (W8)
- [ ] `session.status` ∈ {active, paused}
- [ ] `checkpoint.plan_item_id != null` → решить: продолжить или начать новую

### W6.1 task-type по роли

| test-auditor | test-implementer | test-reviewer | test-strategist | test-verifier | convention-discoverer |
|:---|:---|:---|:---|:---|:---|
| `tests-audit` | `tests-impl` | `tests-review` | `tests-strategy` | `tests-verify` | `conventions` |

---

## W7. Шаблон завершения

```
✅ Итерация #{{iteration}} | 📋 {{task.id}}: {{task.name}}
📄 {{result.status}} — {{result.message}}
📁 Артефакты: {{artifacts}}
📊 Прогресс: {{plan.meta.done}}/{{plan.meta.total_items}} ({{plan.meta.progress_percent}}%)
📝 test-plan.md обновлён | 🛑 agent-state.json сохранён. Жду указаний.
```

---

## W8. test-plan.md

Шаблон формата → [test-plan-template/SKILL.md](../test-plan-template/SKILL.md) (единый источник).

**Обязательные элементы:** название проекта, прогресс, сводка по приоритетам (количество задач по статусам), задачи со статусами/покрытием/quality_gate, артефакты, текущий checkpoint.

**Группировка:** critical → high → medium → low. **Пути:** относительные от корня проекта.

### W8.1 Правила адаптации

1. **Читаемость превыше всего**: Markdown-форматирование
2. **Контекстная группировка**: по приоритетам
3. **Уместная детализация**: всегда показывать `coverage_status` и `quality_gate`
4. **Git-friendly**: относительные пути

### W8.2 Синхронизация

**test-plan.md регенерируется из agent-state.json после КАЖДОГО изменения JSON.** Без исключений.

**Pre-flight sync check** (каждый агент перед началом):
1. Вычислить SHA-256 текущего `agent-state.json` (без поля `content_hash`)
2. Сравнить с `session.content_hash`: hash ≠ saved → перегенерировать; hash == saved → синхронизированы
   - Если `session.content_hash` null/absent (первый запуск) → перегенерировать
3. Если `test-plan.md` отсутствует → перегенерировать
4. Если `test-plan.md` ментейнен вручную (проверка: файл новее чем `session.last_updated` по mtime) → warning: правки будут перезаписаны

**После сохранения JSON:** `session.last_updated → now` → SHA-256 → `session.content_hash` → сохранить → перегенерировать test-plan.md.

```
[AGENT] WARNING: test-plan.md was out of sync (or missing). Regenerated from agent-state.json.
[AGENT] WARNING: test-plan.md had user modifications. They will be overwritten.
```

---

## W9. Структура плана

Папки: `.gigacode/plans/<task-type>-YYYY-MM-DD/`

ID задач: `T1/T2/T3` (последовательные) | `UI-001/LOGIC-001/HOOK-001` (типизированные)

**Обязательные поля задачи:**
`id`, `type` (для тестов: всегда `"test"`), `subtype` (ui_test|unit_test|integration_test|hook_test|api_test|audit|strategy), `name`, `assigned_agent`, `status` (pending|in_progress|done|skipped|blocked), `priority` (low|medium|high|critical), `coverage_status` (full|partial|invalid|missing)

Артефакты → `memory.artifacts` (структура: agent-state-schema.json, `$.memory.artifacts.items`).

---

## W10. State Discovery Protocol

Автоконфигурация при старте: определение стека, skills, контекста, начального плана.

### W10.1 Steps

1. **Scan** → root project directory
2. **Detect** → tech stack (W10.2)
3. **Load** → context overlay (W10.4)
4. **Check** → `.gigacode/plans/` существуют? Да → загрузить последний (W10.5), Нет → шаг 5
5. **Audit** → планов нет → выполнить test-audit
6. **Plan** → создать `.gigacode/plans/<task-type>-YYYY-MM-DD/` с agent-state.json + test-plan.md

### W10.2 Stack Detection & Overlay Mapping

| Распознавание файла | Stack | Overlay |
|---------------------|-------|---------|
| `package.json` + react | React | react-testing.md |
| `pom.xml` / `build.gradle` / `*.java` | Java | java-testing.md |

**Fallback:** Ни один из файлов не найден → `testing-standards.md` (базовые стандарты).

Результат: `[AGENT] knowledge += "Detected stack: <stack>"`

### W10.3 Overlay при тестировании

Определить **расширение исходника** (не теста!) → таблица W10.2 → **один overlay**. Не сопоставлен → fallback `testing-standards.md`.

**Multi-stack (аудит):** agent собирает полный стек всех расширений, `test_plan.target_stack = "multi-stack"`, каждый файл тестируется с соответствующим overlay.

**Интеграция двух стеков:** overlay по точке входа (UI → React, API → Java).

**Приоритет слоёв:** project conventions (W11) > stack overlay > testing-standards.md (base)

Логирование: `[AGENT] stack detection: testing <file.tsx> → React overlay (react-testing.md)`

### W10.4 Context Initialization

1. Загрузить `context/testing-standards.md` (всегда)
2. Загрузить `context/<stack>-testing.md` (overlay)
3. `[AGENT] knowledge += "Loaded context: testing-standards.md, <stack>-testing.md"`

### W10.5 Plan Resumption

1. Найти `.gigacode/plans/<task-type>-*/` → загрузить agent-state.json из каждой
2. Сортировка: `session.last_updated` desc → имя директории desc (при equal timestamp)
   → **НЕ использовать `mtime` файловой системы**
3. Выбор: `paused` → `active` → если все done/cancelled → создать новый план
4. `checkpoint.plan_item_id != null` → есть in_progress задача; `session.status == "paused"` → `[AGENT] resuming paused session from checkpoint`
5. Синхронизировать test-plan.md (W8.2) → продолжить с checkpoint или выбрать pending (W1.4)

**Правило:** invalid JSON → stop, сообщить об ошибке. Все планы done → создать новый.

---

## W11. Convention Loading Protocol

Вызывается **ПОСЛЕ W10 (stack detection), ДО** начала работы агента.

### W11.1 Алгоритм

1. `.gigacode/conventions/project-conventions.json` существует? → загрузить, валидировать по convention-overlay-schema.json → применить (priority: custom > stack > base) → done
2. JSON нет? → `.gigacode/conventions/project-conventions.md` существует? → загрузить как overlay → done
3. Ничего нет? → загрузить stack overlay (W10.4)

### W11.2 Layer Model

`custom (project-conventions) > stack overlay (context/<stack>-testing.md) > testing-standards.md`

**Конфликт:** custom vs testing-standards §1 (общие принципы) → warning, НЕ применять:
```
[AGENT] WARNING: custom convention conflicts with testing-standards §<N>: <desc>. Skipping.
```

### W11.3 Логирование

```
[AGENT] conventions: loaded from .gigacode/conventions/project-conventions.json
[AGENT] conventions: priority = custom > stack > base
[AGENT] conventions: <N> naming, <M> mocking, <K> forbidden rules loaded
```
Fallback: `[AGENT] conventions: no custom found. Using <stack>-testing.md base conventions`

---

## Exit Conditions

- [ ] `agent-state.json` сохранён и валидируется по `agent-state-schema.json`
- [ ] `test-plan.md` синхронизирован с JSON
- [ ] Итерация логирована в формате W5.1 (output содержит `[AGENT]` строки с iteration/selected/result)
- [ ] `memory.history` содержит минимум одну запись с `action: "completed"` за текущую итерацию
- [ ] Текущая задача (`checkpoint.plan_item_id` или выбранная pending) имеет `status` = `done` или `blocked` с заполненным `completed_at`
- [ ] `session.last_updated` обновлён и содержит актуальный timestamp
- [ ] Выбран следующий шаг: next pending задача ИЛИ остановка (если все задачи done/skipped)

---

## 🔄 Версионирование

**Version**: 2.9

| Version | Date | Changes |
|---------|------|---------|
| 2.9 | 2026-04-19 | Fix W10.1 broken refs (W10.3→W10.4, W10.4→W10.5). Fix W8.2 null content_hash + user-mod detection. Changelog reordered |
| 2.8 | 2026-04-19 | P0-A3 — `session.content_hash` (SHA-256). W8.4 hash-compare sync |
| 2.7 | 2026-04-19 | P0-A5 — W10.5 сортировка по JSON `session.last_updated` |
| 2.6 | 2026-04-19 | P0-A1 — W1.4 детерминированный алгоритм |
| 2.5 | 2026-04-19 | Compact rewrite: 572→351 lines. D1-D6 dedup. W8→link to test-plan-template. W10 merged tables. Algorithms → compact notation |
| 2.4 | 2026-04-19 | Адаптация для тестового workflow. Типы агентов заменены на тестовые. Валидация по `agent-state-schema.json` и `test-plan-state-schema.json` |
