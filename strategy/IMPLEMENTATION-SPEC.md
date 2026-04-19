# IMPLEMENTATION-SPEC.md — Спецификация имплементации для агентов

> Версия: 1.4 | Дата: 2026-04-19
> Предыдущая версия: 1.3 (2026-04-19)
>
> **Изменения v1.4:** Внешний ревью подтвердил PQ-02/PQ-03/PQ-04 done.
> Обновлены §10 (Phase 6 таблица) и §11 (чек-листы). Добавлены PQ-11/PQ-13.
> Языковая миграция §10 заморожена.
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
> - [`GIGATEST-IMPROVEMENTS-ANALYSIS.md`](archive/ARCHIVE-GIGATEST-IMPROVEMENTS-ANALYSIS.md) — ПОЧЕМУ

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
12. [Конвенции Convention Discovery](#12-конвенции-convention-discovery)

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
│   ├── METRICS.md             ← Phase 4
│   └── TEMPLATE-SYNTAX.md     ← Спецификация Handlebars-like синтаксиса шаблонов
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

### Phase 5 — Convention Discovery

| Задача | Паттерн |
|--------|---------|
| P5-022: convention-discovery SKILL.md | Создать `skills/convention-discovery/SKILL.md` с 4 фазами: Scan → Analyze → Extract → Generate. Использовать конвенции из §12 для output format |
| P5-023: convention-overlay-schema.json | Создать JSON Schema в `skills/convention-discovery/`. Структура по §12.1, `additionalProperties: false` везде |
| P5-024: convention-discoverer agent | Скопировать структуру из test-auditor.md, заменить failure modes/rules. Output: `.gigacode/conventions/project-conventions.md` |
| P5-025: W11 Convention Loading | Добавить W11 в agent-workflow-core/SKILL.md. Алгоритм: check → load → fallback → log. Layer model по §6.2 |
| P5-026: convention-review SKILL.md | Создать `skills/convention-review/SKILL.md`. Human-in-the-loop: approve/reject/revise workflow. Checklist по §12.2 |
| P5-027: docs/CONVENTION-DISCOVERY.md | Quick start ≤ 5 шагов + 2 примера + FAQ 5+ вопросов. Edge cases: empty project, conflicts |

**Порядок выполнения:** P5-022 → P5-023 → P5-024 → одновременно P5-025 + P5-026 → P5-027.

> Зависимость: P5-023 требует P5-022 (schema следует за skill), P5-024 требует P5-023 (agent генерирует по schema).
> P5-025 (W11) требует стабильных W1-W10 и может идти параллельно с P5-024.

### Phase 6 — Architecture & Prompt Quality

**Статус:** ✅ P0-A1..P0-A5 + PQ-01..PQ-04 выполнены. Внешний ревью подтвердил. Остались: PQ-11 (P0), PQ-13 (P1).

| Задача | Паттерн | Статус |
|--------|---------|--------|
| P0-A1: W1.4 determinism | Заменить «или иную логику» → алгоритм: sort by priority desc, then id asc | ✅ done |
| P0-A5: State Discovery v2 | W10.5: сортировать по session.last_updated (JSON timestamp, не mtime) | ✅ done |
| P0-A3: test-plan.md content_hash | Добавить field в session, сравнивать hash при regenerate | ✅ done |
| P0-A4: Multi-stack overlay | W10.6: file extension → конкретный overlay, fallback на testing-standards | ✅ done |
| P0-A2: Semantic validation | tools/validate-state.js: meta.done == count(done), progress formula, history order, content_hash | ✅ done |
| PQ-01: W1.4 ambiguity fix | Пересекается с P0-A1 — выполнено вместе | ✅ done |
| PQ-02: audit downgrade clarity | «менее 3 → coverage_status: partial», ссылка на overlay R4 | ✅ done (подтверждено внешним ревью) |
| PQ-03: Stack Detection DRY | QWEN.md: заменить таблицу на ссылку → agent-workflow-core W10.2 | ✅ done (подтверждено внешним ревью) |
| PQ-04: Quality Checklist DRY | testing-standards.md §3 = source, test-audit/test-review → ссылка | ✅ done (подтверждено внешним ревью) |
| PQ-10: agent-workflow-core split | Вынести W10/W11 в отдельные skills | 🟡 **отложено** (делать только при 800+ строках или жалобах) |
| **PQ-11: W8 dedup** | **Заменить W8 ссылкой на test-plan-template** | 🟡 **рекомендовано** |
| PQ-12: QWEN.md sync | Синхронизировать импортированный W8.4 с content_hash | 🟡 deferred |
| **PQ-13: Subjective terms** | **Заменить narrow/unusual/narrowest на verifiable формулировки** | 🟡 **рекомендовано** |
| PQ-14: test-review Forbidden DRY | Ссылка на testing-standards §4 вместо дублирования | deferred |
| PQ-15: R2/R3/R4.1 overlays DRY | Вынести общие правила в testing-standards §6 | 🔴 deferred (большой рефакторинг) |
| PQ-16: W6 pre-flight DRY | agents/*.md → ссылка на agent-workflow-core W6 | deferred |
| PQ-17: R9 Common Pitfalls | Добавить к Java/JS overlays | 🔴 deferred |

**Рекомендация внешнего ревью:** вместо ручного исправления 20+ пунктов — написать `tools/validate-prompts.js` (статический линтер промтов). Это превратит значительную часть спеки в автоматическую проверку (§8 чек-лист, §9 конвенции).

### Phase 7 — Language Migration (LLM-prompts → English) — ЗАМОРОЖЕНА

> По конвенции PROMPT-QUALITY-SPEC §9.1: всё что читает LLM → английский, strategy/ → русский.
> Внешнее ревью рекомендовало **отложить без даты**. Аргументы:
> 1. Современные LLM обрабатывают русские промты эквивалентно английским
> 2. Объём 486 строк × тонкости терминологии, нужен билингвальный review
> 3. Ценность для пользователя = 0 (internal refactor без observable benefit)
> Полный план: PROMPT-QUALITY-SPEC.md §10

| Задача | Паттерн | Статус |
|--------|---------|--------|
| LANG-01: testing-standards.md EN | Перевести на английский (базовый файл) | pending |
| LANG-02: QWEN.md EN | Перевести на английский (root prompt) | pending |
| LANG-03: agents/*.md EN (6 файлов) | Перевести все agent-профили | pending |
| LANG-04: Glossary | Создать глоссарий терминов перед переводом | pending |

**Порядок:** LANG-04 → LANG-01 → LANG-02 → LANG-03

> Зависимость: LANG-01 должен идти первым — от него ссылаются agent-файлы.

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
- [ ] Ссылка на skill через `@./skills/...`.

### для schemas

- [ ] `additionalProperties: false` на всех уровнях
- [ ] `$ref` composition используется для общих полей
- [ ] Пример `plans/tests-audit-example/agent-state.json` валидируется
- [ ] Enum `agent.type` синхронизирован с `agents/`

### для Phase 6 (Architecture & Prompt Quality) — Раунд 1

- [x] Если изменён W1.4 — grep по всему проекту подтверждает удаление «или иную логику» **(PQ-01, выполнено)**
- [x] Если изменены JSON Schema — обе схемы обновлены консистентно **(P0-A3, content_hash добавлен)**
- [x] Если добавлен content_hash — примеры state файлов содержат новое поле **(выполнено)**
- [x] Если изменён QWEN.md — Stack Detection таблица заменена на ссылку **(PQ-03, выполнено)**
- [x] Если изменён testing-standards.md §3 — test-audit/test-review SKILL.md заменены на ссылку **(PQ-04, выполнено)**

### для Phase 6 — Раунд 2 (обновлено v5.1)

- [ ] Если изменён agent-workflow-core — W10/W11 вынесены в отдельные skills. Файл ≤ 400 строк **(PQ-10, отложено)**
- [ ] Если заменён W8 — ссылка на test-plan-template skill работает **(PQ-11, рекомендовано)**
- [ ] Если изменён QWEN.md — импортированный блок использует content_hash подход **(PQ-12, deferred)**
- [ ] Если grep по `narrow|unusual|narrowest` в SKILL.md и agents/ не находит вхождений **(PQ-13, рекомендовано)**

### для Phase 7 — Language Migration — ЗАМОРОЖЕНА

- [ ] Не начинать (см. §10, решение внешнего ревью)

---

## 12. Конвенции Convention Discovery

### 12.1 Convention Overlay Schema

JSON Schema `skills/convention-discovery/convention-overlay-schema.json` должна содержать:

```json
{
  "type": "object",
  "required": ["metadata", "conventions"],
  "additionalProperties": false,
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["generated_at", "scanned_files", "base_stack"],
      "additionalProperties": false,
      "properties": {
        "generated_at": {"type": "string", "format": "date-time"},
        "scanned_files": {"type": "integer"},
        "scanned_modules": {"type": "integer"},
        "base_stack": {"type": "string"},
        "version": {"type": "string"}
      }
    },
    "conventions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stack_and_tools": {"type": "array", "items": {"type": "string"}},
        "naming": {"type": "array", "items": {"type": "object",
          "required": ["target", "pattern"],
          "additionalProperties": false,
          "properties": {
            "target": {"type": "string"},
            "pattern": {"type": "string"},
            "source": {"type": "string"}
          }
        }},
        "test_structure": {"type": "array", "items": {"type": "string"}},
        "mocking_rules": {"type": "array", "items": {"type": "object",
          "required": ["target", "approach"],
          "additionalProperties": false,
          "properties": {
            "target": {"type": "string"},
            "approach": {"type": "string"}
          }
        }},
        "forbidden_patterns": {"type": "array", "items": {"type": "object",
          "required": ["pattern"],
          "additionalProperties": false,
          "properties": {
            "pattern": {"type": "string"},
            "reason": {"type": "string"},
            "alternative": {"type": "string"}
          }
        }},
        "team_notes": {"type": "array", "items": {"type": "object",
          "additionalProperties": false,
          "properties": {
            "note": {"type": "string"},
            "source": {"type": "string"}
          }
        }}
      }
    }
  }
}
```

### 12.2 Convention Discovery Agent Format

`agents/convention-discoverer.md` следует стандарту §4 с дополнениями:

**Primary Failure Modes (обязательные минимум 5):**
1. Генерация conventions без анализа существующих тестов (hallucinated conventions)
2. Пропуск config files → неверное определение фреймворка
3. Конфликт обнаруженных конвенций с базовыми testing-standards
4. Перегенерация без сохранения истории (lost previous conventions)
5. Сканирование всех файлов без лимита → timeout на большом проекте

**Required Output:**
- `.gigacode/conventions/project-conventions.md` (human-readable overlay)
- `.gigacode/conventions/project-conventions.json` (machine-readable, если нужна schema validation)

### 12.3 Project Conventions File Format

`.gigacode/conventions/project-conventions.md` — human-readable overlay:

```markdown
# Project Testing Conventions — <Project Name>

> Сгенерировано GigaTest Convention Discovery | Дата: YYYY-MM-DD
> Сканировано: N тестовых файлов, M модулей исходного кода
> Базовый стек: <reference к stack overlay>
> Версия: 1.0

---

## 1. Stack & Tools
## 2. Naming Conventions
## 3. Test Structure
## 4. Mocking Rules (Project-Specific)
## 5. Forbidden Patterns
## 6. Team Notes
## 7. Validation Checklist
```

### 12.4 Convention Review Checklist

Для `skills/convention-review/SKILL.md` — минимальная validation checklist:

- [ ] Все обнаруженные конвенции имеют источник (файл/паттерн)
- [ ] Нет конфликта с testing-standards.md (base principles)
- [ ] Forbidden patterns имеют альтернативы (не просто "нельзя делать X")
- [ ] Naming conventions покрывают файлы, describe-блоков, it-блоков
- [ ] Mocking rules покрывают: API, БД, внешние сервисы, redux/store
- [ ] Team notes имеют source_file ссылку (не голословные)

### 12.5 W11 Convention Loading Protocol (Proposed)

Расширение `agent-workflow-core/SKILL.md` — новый W-раздел:

```
W11. Convention Loading Protocol

При старте тестовой сессии каждый агент:

1. Проверяет: .gigacode/conventions/project-conventions.md существует?
   ├─ ДА → Загружает как priority overlay
   │        [AGENT] loaded conventions from .gigacode/conventions/project-conventions.md
   └─ НЕТ → Переход к шагу 2

2. Загружает stack overlay из context/ (W10.4)
   [AGENT] no project conventions found. Using <stack>-testing.md base conventions

3. Применяет layer model: custom > stack overlay > testing-standards
   Конвенции из project-conventions.md переопределяют stack overlay при конфликте.
```

**Правило:** W11 вызывается ПОСЛЕ W10 (stack detection) и ДО начала работы агента.

---

*Документ принадлежит: strategy/*
*Смежные документы: VISION.md, BLOCK-2-GIGATEST-GROWTH.md, backlog.yaml, READINESS-MATRIX.md, ARCHITECTURE-SPEC.md, PROMPT-QUALITY-SPEC.md*
