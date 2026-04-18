# IMPLEMENTATION-SPEC.md — Спецификация имплементации для агентов

> Версия: 1.1 | Дата: 2026-04-18
> Предыдущая версия: 1.0 (2026-04-18)
>
> **Изменения v1.1:** Phase 3 переименована из «CI/CD» в «Тулинг», удалён P3-017 (pre-commit hook), обновлены конвенции тулинга §9.
>
> **Назначение:** Software Design Document (SDD) для агентной реализации задач GigaTest.
> Описывает «КАК» — технические решения, конвенции, паттерны имплементации.
>
> **Аудитория:** Агенты-имплементеры (test-implementer, code-ревьюеры).
>
> **Связанные документы:**
> - [`VISION.md`](VISION.md) — ЧТО и ЗАЧЕМ
> - [`backlog.yaml`](backlog.yaml) — КАКИЕ задачи
> - [`BLOCK-2-GIGATEST-GROWTH.md`](BLOCK-2-GIGATEST-GROWTH.md) — КОГДА
> - [`GIGATEST-IMPROVEMENTS-ANALYSIS.md`](GIGATEST-IMPROVEMENTS-ANALYSIS.md) — ПОЧЕМУ

---

## Содержание

1. [Архитектурные принципы](#1-архитектурные-принципы)
2. [Конвенции файлов и структуры](#2-конвенции-файлов-и-структуры)
3. [Конвенции JSON Schema](#3-конвенции-json-schema)
4. [Конвенции агентных файлов](#4-конвенции-агентных-файлов)
5. [Конвенции Skills](#5-конвенции-skills)
6. [Конвенции Context Overlays](#6-конвенции-context-overlays)
7. [Конвенции документирования](#7-конвенции-документирования)
8. [Конвенции тестирования workflow](#8-конвенции-тестирования-workflow)
9. [Конвенции тулинга](#9-конвенции-тулинга)
10. [Паттерны реализации по фазам](#10-паттерны-реализации-по-фазам)
11. [Чек-лист готовности задачи](#11-чек-лист-готовности-задачи)

---

## 1. Архитектурные принципы

### 1.1 Skills-first

Любая новая функциональность начинается с **skill** — не с агента, не с команды.
Skill — это загружаемый модуль с инструкцией. Агент — оболочка, которая его использует.

**Правило:** Если задача добавляет логику — сначала создай SKILL.md, потом агента.

### 1.2 Stack-agnostic core

Ядро (agent-workflow-core, using-gigatest, testing-standards) **не содержит** stack-специфики.
Stack-специфика — только в `context/` оверлеях.

**Правило:** Изменение ядра должно быть корректно для React, Java, JS/TS, Python одновременно.

### 1.3 Machine-readable ↔ Human-readable sync

Каждое состояние имеет два представления:
- `agent-state.json` — machine-readable (source of truth)
- `test-plan.md` — human-readable (regenerated из JSON)

**Правило:** Никогда не редактировать `test-plan.md` вручную. Всегда генерировать из JSON.

### 1.4 Strict validation

JSON Schema с `additionalProperties: false` везде. Нет неявных полей.

**Правило:** Если поле не описано в схеме — оно ошибочно. Валидация должна падать.

### 1.5 Explicit over implicit

Явные exit conditions, явные quality gates, явные зависимости.

**Правило:** Каждый skill должен явно описывать когда завершить стадию и что передать дальше.

---

## 2. Конвенции файлов и структуры

### 2.1 Именование директорий

```
.gigacode/plans/<task-type>-YYYY-MM-DD/
```

Где `<task-type>` определяется по роли агента:

| Роль | task-type |
|------|-----------|
| test-auditor | tests-audit |
| test-strategist | tests-strategy |
| test-implementer | tests-impl |
| test-reviewer | tests-review |
| test-verifier | tests-verify |

### 2.2 Обязательные файлы в директории плана

```
plans/tests-audit-2026-04-18/
├── agent-state.json      ← Машиночитаемый источник истины
└── test-plan.md          ← Человеко-читаемый отчёт
```

### 2.3 Структура репозитория (целевая)

```
gigatest-0.1.0/
├── QWEN.md                    ← Root prompt (imports только)
├── qwen-extension.json        ← Метаданные extension
├── README.md                  ← Пользовательская документация
│
├── agents/                    ← Агентные профили
│   ├── test-auditor.md
│   ├── test-strategist.md
│   ├── test-implementer.md
│   ├── test-reviewer.md
│   └── test-verifier.md       ← Phase 1
│
├── skills/                    ← Навыки
│   ├── using-gigatest/
│   │   └── SKILL.md
│   ├── test-audit/
│   │   └── SKILL.md
│   ├── test-implementation/
│   │   └── SKILL.md
│   ├── test-review/
│   │   └── SKILL.md
│   ├── test-verification/
│   │   └── SKILL.md
│   ├── test-plan-template/
│   │   ├── SKILL.md           ← Phase 0
│   │   └── test-plan-template.md
│   └── agent-workflow-core/
│       ├── SKILL.md
│       ├── agent-state-schema.json
│       └── test-plan-state-schema.json
│
├── context/                   ← Оверлеи и стандарты
│   ├── testing-standards.md   ← Shared с GigaCraft
│   ├── react-testing.md
│   ├── java-testing.md
│   ├── js-ts-testing.md
│   ├── python-testing.md      ← Phase 2
│   └── go-testing.md          ← Phase 2
│
├── commands/                  ← Fallback-команды
│   ├── audit-tests.md
│   ├── implement-tests.md
│   ├── review-tests.md
│   ├── run-tests.md
│   └── strategy-tests.md      ← Phase 1
│
├── tools/                     ← CLI-утилиты (Phase 3)
│   ├── validate-state.js
│   └── generate-report.js
│
├── docs/                      ← Документация
│   ├── ONBOARDING.md          ← Phase 1
│   ├── DEMO.md                ← Phase 4
│   ├── COMPARISON.md          ← Phase 4
│   └── METRICS.md             ← Phase 4
│
├── strategy/                  ← Стратегические документы
│   ├── README.md
│   ├── VISION.md
│   ├── IMPLEMENTATION-SPEC.md ← Этот файл
│   ├── BLOCK-1-GIGACRAFT-BRIDGE.md
│   ├── BLOCK-2-GIGATEST-GROWTH.md
│   ├── READINESS-MATRIX.md
│   └── backlog.yaml
│
└── .gigacode/plans/           ← Артефакты сессий (gitignore)
```

### 2.4 Gitignore

В `.gitignore` проекта (не extension) должны быть:
```
.gigacode/
*.tmp
```

Сами планы в `.gigacode/` — **не коммитятся** в extension. Коммитятся только примеры в `plans/`.

---

## 3. Конвенции JSON Schema

### 3.1 Composition между схемами

`test-plan-state-schema.json` **обязан** использовать `$ref` на `agent-state-schema.json`
для общих полей. Дублирование запрещено.

**Паттерн:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Test Plan State",
  "allOf": [
    { "$ref": "./agent-state-schema.json#" },
    {
      "type": "object",
      "properties": {
        "test_type": { "type": "string", "enum": ["audit", "implementation", "review", "verification"] },
        "coverage_status": { "type": "string", "enum": ["full", "partial", "invalid", "missing"] }
      }
    }
  ]
}
```

### 3.2 `additionalProperties: false` везде

На **каждом** уровне вложенности — `additionalProperties: false`.
Без этого валидация пропускает мусор.

**Правило:** Каждый объект в `properties`/`items`/`definitions` — с `additionalProperties: false`.

### 3.3 Enum `agent.type`

Enum должен содержать **только** реально существующих агентов:

```json
"agent": {
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "test-auditor",
        "test-strategist",
        "test-implementer",
        "test-reviewer",
        "test-verifier"
      ]
    }
  }
}
```

**Правило:** При добавлении нового агента — сначала создать файл в `agents/`, потом добавить в enum.

### 3.4 Required поля

Обязательные поля — в массив `required`. Если поле есть в `properties` но не в `required` — оно опционально.

**Правило:** `quality_gate` и `coverage_status` — required для `plan.items` в test-plan-state-schema.

---

## 4. Конвенции агентных файлов

### 4.1 Обязательная структура

```markdown
---
name: <agent-name>
description: <одно предложение о назначении>
---

# Agent: <agent-name>

## Role
<роль в workflow>

## Primary Failure Modes
1. <антипаттерн 1>
2. <антипаттерн 2>
...

## Rules
1. <правило 1>
2. <правило 2>
...

## Required Output
<что агент должен создать/обновить>

## Tools
- read_file
- write_file
- ...
```

### 4.2 Именование файлов

Файл агента = `agents/<agent-name>.md`
где `<agent-name>` **совпадает** с значением в `agent.type` enum.

### 4.3 Failure modes

Каждый агент обязан содержать 5–8 конкретных антипаттернов, специфичных для его роли.

**Пример для test-verifier:**
```markdown
## Primary Failure Modes
1. Declaring tests passing without running them
2. Ignoring failed assertions in test output
3. Accepting false-positive evidence (snapshots without behavior check)
4. Skipping test-plan.md verification (state says done but plan incomplete)
5. Verifying implementation instead of tests (wrong artifact)
6. Declaring success with partial coverage (not all plan items done)
```

### 4.4 Rules

Rules — это ограничения и обязательства агента. Минимум 4 правила.

**Обязательные правила для всех агентов:**
- Ссылка на `agent-workflow-core` W0–W9
- Ссылка на релевантный skill
- `agent-state.json` — source of truth
- `test-plan.md` — регенерировать синхронно

---

## 5. Конвенции Skills

### 5.1 Обязательная структура SKILL.md

```markdown
---
name: <skill-name>
description: <одно предложение>
---

# Skill: <skill-name>

## Purpose
<назначение>

## Phase 1: <имя>
...

## Phase 2: <имя>
...

## Exit Conditions
- [ ] <наблюдаемый результат 1>
- [ ] <наблюдаемый результат 2>
...

## Forbidden Patterns
| Паттерн | Почему |
|---------|--------|
| ... | ... |
```

### 5.2 Exit Conditions

Каждый skill обязан содержать раздел `## Exit Conditions`.

**Требования:**
- Каждый condition должен быть **наблюдаемым** (файл существует, статус = done, лог содержит X)
- Не должно быть условий типа «агент решил что готово»
- Exit conditions определяют когда передать управление следующему агенту

**Пример для test-audit:**
```markdown
## Exit Conditions
- [ ] agent-state.json создан и валидируется по схеме
- [ ] test-plan.md сгенерирован и синхронизирован с JSON
- [ ] plan.items содержит минимум 1 задачу со статусом pending
- [ ] plan.meta содержит корректные count_by_status и progress_percent
- [ ] memory.history содержит минимум 1 записи (started, completed)
```

### 5.3 Front-matter

Обязательные поля: `name`, `description`.

**Правило:** `name` должен совпадать с именем директории скилла.

---

## 6. Конвенции Context Overlays

### 6.1 Обязательная структура оверлея

Каждый `context/<stack>-testing.md` должен содержать как минимум эти разделы (R1–R7):

| Раздел | Содержание |
|--------|------------|
| R1 | Test Types Matrix — что тестировать и каким типом теста |
| R2 | Decision Algorithm — алгоритм выбора типа теста по пути/коду |
| R3 | Framework & Tooling — тестовые фреймворки, моки, assertions |
| R4 | File Structure Convention — как именовать и располагать тестовые файлы |
| R5 | Mocking Strategy — что мокать, как мокать, что НЕ мокать |
| R6 | Complete Example — полный пример теста с AAA |
| R7 | Common Pitfalls — типичные ошибки для этого стека |

### 6.2 Decision Algorithm

R2 должен содержать **конкретный алгоритм** вида:

```
IF file ends with Controller|Resource|Handler → integration_test
ELSE IF file contains "Service" → unit_test (with mocks)
ELSE IF file contains "Repository"|"DAO" → integration_test (with DB mock)
ELSE → unit_test (pure logic)
```

### 6.3 Версионирование оверлеев

В заголовок каждого оверлея добавить:
```markdown
> Версия: X.Y | Дата: YYYY-MM-DD
```

---

## 7. Конвенции документирования

### 7.1 Header каждого Markdown-файла

```markdown
# TITLE — Описание

> Версия: X.Y | Дата: YYYY-MM-DD
> Предыдущая версия: X.Y-1 (YYYY-MM-DD) — если применимо
>
> **Назначение:** Одно предложение.
> **Аудитория:** Для кого.
```

### 7.2 Ссылки между документами

Использовать **относительные пути** от корня extension:
```markdown
- [`VISION.md`](strategy/VISION.md)
- [`backlog.yaml`](strategy/backlog.yaml)
```

### 7.3 Связанные документы

В конце каждого файла — блок:
```markdown
---
*Смежные документы: VISION.md, BLOCK-2-GIGATEST-GROWTH.md, backlog.yaml*
```

---

## 8. Конвенции тестирования workflow

### 8.1 Smoke-тесты (Phase 0)

Smoke-тест — это **симулированный** прогон в `plans/tests-e2e-example/`.
Это не код. Это корректно заполненный `agent-state.json` + `test-plan.md`,
который демонстрирует полный цикл.

**Минимальная структура:**
```
plans/tests-e2e-example/
├── agent-state.json   ← 4 задачи (audit, impl, review, verify), все done
└── test-plan.md       ← итоговый отчёт, 100% прогресс
```

### 8.2 Что проверяет smoke-тест

| Проверка | Как |
|----------|-----|
| Schema validation | `agent-state.json` валидируется по обеим схемам |
| Status transitions | Все статусы = `done`, progress_percent = 100 |
| History completeness | `memory.history` содержит записи для всех стадий |
| Plan sync | `test-plan.md` отображает состояние всех задач |
| Artifacts | `memory.artifacts` содержит пути к созданным файлам |

---

## 9. Конвенции тулинга

### 9.1 validate-state.js (Phase 3)

```javascript
#!/usr/bin/env node
// Usage: node tools/validate-state.js <path-to-agent-state.json>
// Exit: 0 = valid, 1 = invalid + error details to stdout
```

**Требования:**
- Использует `ajv` для валидации JSON Schema draft-07
- Загружает обе схемы (base + test-plan)
- Выводит конкретные ошибки с путями к полям
- Exit code: 0 (valid), 1 (invalid)

### 9.2 generate-report.js (Phase 3)

```javascript
#!/usr/bin/env node
// Usage: node tools/generate-report.js <path-to-agent-state.json> [output-path]
// Exit: 0 = generated, 1 = error
```

**Требования:**
- Принимает `agent-state.json` → генерирует `test-plan.md`
- Output **идентичен** результату ручной генерации агентом
- Если `output-path` не указан — пишет рядом с JSON

---

## 10. Паттерны реализации по фазам

### Phase 0 — Production Ready

| Задача | Паттерн |
|--------|---------|
| P0-001: test-plan-template SKILL.md | Создать SKILL.md с front-matter, импортировать test-plan-template.md |
| P0-002: $ref composition | Рефакторинг test-plan-state-schema.json — вынести общие поля в allOf + $ref |
| P0-003: additionalProperties: false | Систематический проход по всем объектам schema, добавить false |
| P0-004: agent.type enum | Прочитать agents/*.md → выписать name → заменить enum |
| P0-005: e2e smoke test | Создать plans/tests-e2e-example/ с корректно заполненным state |
| P0-006: README | Проверить working quick start, добавить Troubleshooting |

**Порядок выполнения:** P0-002 → P0-003 → P0-004 → P0-001 → P0-005 → P0-006

> Зависимость: P0-005 требует P0-001–P0-004, P0-006 требует P0-005.

### Phase 1 — Стабилизация

| Задача | Паттерн |
|--------|---------|
| P1-007: test-verifier agent | Скопировать структуру из test-reviewer.md, заменить failure modes/rules |
| P1-008: test-plan.md sync | Расширить W8.4 до алгоритма, добавить pre-flight во все 5 агентов |
| P1-009: pre-flight validation | Добавить шаг валидации в W6, обновить all agents на ссылку W6 |
| P1-010: path consistency | grep по всему проекту → заменить все `.gigacraft/state/` на `.gigacode/plans/` |
| P1-011: ONBOARDING.md | 4 сценария × ≤10 шагов + FAQ 5–7 вопросов |

**Параллельно:** P1-007 и P1-010 можно делать одновременно.

### Phase 2 — Расширение

| Задача | Паттерн |
|--------|---------|
| P2-012: Python overlay | Копировать java-testing.md → заменить стеко-специфику на Python |
| P2-013: Go overlay | Копировать python-testing.md → заменить на Go |
| P2-014: exit conditions | Pass по всем skills/test-*/SKILL.md, добавить раздел |
| P2-015: state discovery | Добавить W10 в agent-workflow-core |

### Phase 3 — Тулинг

| Задача | Паттерн |
|--------|---------|
| P3-016: validate-state.js | Node.js скрипт + ajv + обе схемы |
| P3-018: generate-report.js | Node.js скрипт + Handlebars/Mustache template |

### Phase 4 — Презентация

| Задача | Паттерн |
|--------|---------|
| P4-019: DEMO.md | Step-by-step сценарий ≤ 15 мин, учебный проект |
| P4-020: COMPARISON.md | Таблица vs 3+ альтернатив, все killer features |
| P4-021: METRICS.md | 5+ метрик, источники данных, формулы |

### Bridge — Мост

| Задача | Паттерн |
|--------|---------|
| BRIDGE-001: Awareness | Добавить блок в GigaCraft verification skill |
| BRIDGE-002: Cross-workflow | Добавить GigaCraft Plan Discovery в test-audit SKILL.md |
| BRIDGE-003: Standards sync | Добавить версию/дату в testing-standards.md |

---

## 11. Чек-лист готовности задачи

Перед тем как пометить задачу `done` в `backlog.yaml`:

### Minimal definition of done

- [ ] Файл(ы) созданы/изменены по пути, указанному в `backlog.yaml`
- [ ] Все acceptance criteria из `backlog.yaml` выполнены
- [ ] Форматирование соответствует конвенциям из этого документа
- [ ] Header файла содержит версию, дату, назначение
- [ ] Ссылки между файлами рабочие (относительные пути)
- [ ] JSON Schema валидируется (если применимо)
- [ ] `backlog.yaml` обновлён: `status: done`
- [ ] `READINESS-MATRIX.md` обновлён (если задача влияет на оценку)
- [ ] `strategy/README.md` обновлён (если задача добавляет новый файл)

### Для skills

- [ ] SKILL.md содержит валидный front-matter (name, description)
- [ ] Раздел Exit Conditions присутствует
- [ ] Нет forbidden patterns

### для agents

- [ ] agent.md содержит валидный front-matter (name, description)
- [ ] Primary Failure Modes: 5–8 пунктов
- [ ] Rules: минимум 4 правила
- [ ] Required Output описан
- [ ] Ссылка на skill через `@./skills/...`

### для schemas

- [ ] `additionalProperties: false` на всех уровнях
- [ ] `$ref` composition используется для общих полей
- [ ] Пример `plans/tests-audit-example/agent-state.json` валидируется
- [ ] Enum `agent.type` синхронизирован с `agents/`

---

*Документ принадлежит: strategy/*
*Смежные документы: VISION.md, BLOCK-2-GIGATEST-GROWTH.md, backlog.yaml, READINESS-MATRIX.md*
