# PROMPT-QUALITY-SPEC.md — Спецификация качества промтов GigaTest

> Версия: 1.0 | Дата: 2026-04-19
>
> **Назначение:** Описать обнаруженные проблемы качества промтов (SKILL.md, agents/*.md, context/*.md, QWEN.md)
> и план их устранения. Содержит конкретные задачи с паттернами для агентов-имплементеров.
>
> **Аудитория:** Технические писатели, агенты-ревьюеры, архитекторы.
>
> **Источник:** Результаты лингвистического аудита промтов (2026-04-19).
>
> **Связанные документы:**
> - [`VISION.md`](VISION.md) — ЧТО и ЗАЧЕМ
> - [`IMPLEMENTATION-SPEC.md`](IMPLEMENTATION-SPEC.md) — КАК
> - [`ARCHITECTURE-SPEC.md`](ARCHITECTURE-SPEC.md) — Парный отчёт: архитектурные риски
> - [`context/testing-standards.md`](../context/testing-standards.md) — Базовые стандарты

---

## Содержание

1. [Общая оценка качества](#1-общая-оценка-качества)
2. [Единый стиль (Consistency)](#2-единый-стиль-consistency)
3. [Точность и ясность (Precision)](#3-точность-и-ясность-precision)
4. [Нарушения DRY (Don't Repeat Yourself)](#4-нарушения-dry-dont-repeat-yourself)
5. [Лаконичность (Conciseness)](#5-лаконичность-conciseness)
6. [Паттерны исправления по приоритетам](#6-паттерны-исправления-по-приоритетам)
7. [Чек-лист качества промта](#7-чек-лист-качества-промта)
8. [Конвенции промтов (новые правила)](#8-конвенции-промтов-новые-правила)

---

## 1. Общая оценка качества

Фреймворк GigaTest демонстрирует **7/10** по критериям технического письма. Ядро (5 SKILL.md + 4 agent-файла + testing-standards + 4 overlay) структурировано и следует единому паттерну: `цель → процесс → правила → exit conditions → forbidden patterns`. Архитектурная метафора skills-first отражается в организации файлов.

**Системные проблемы:** Значительное дублирование правил между `agent-workflow-core` и каждым skill/agent-файлом (~8 паттернов дублирования). Смешение русского и английского языков в одном файле. Избыточные failure modes (8 пунктов у verifier, 6 у strategist — при 3–4 рекомендуемых). Несколько амбигуитетов, открывающих non-deterministic интерпретацию агентом.

Недостатки не блокируют текущую работу, но создают когнитивную нагрузку и риск рассинхронизации при эволюции фреймворка.

---

## 2. Единый стиль (Consistency)

### 2.1 Что сделано хорошо

| Элемент | Пример |
|---------|--------|
| **Скелет SKILL.md** | Все 5 файлов: `---frontmatter--- / ## Purpose / ## Phase N / ## Exit Conditions / ## Forbidden Patterns` |
| **Скелет agents/*.md** | Все 5 файлов: `---frontmatter--- / ## Role / ## Primary Failure Modes / ## Rules / ## Required Output / ## Tools` |
| **Стабильная терминология** | `agent-state.json`, `test-plan.md`, `quality_gate`, `coverage_status`, `.gigacode/plans/` — единообразно |
| **Разделение ответственности** | Каждый skill — свой lifecycle stage, каждый agent — своя роль |

### 2.2 Расхождения в стиле и терминологии

| # | Расхождение | Файлы | Риск |
|---|------------|-------|------|
| I1 | Смешение RU/EN в таблицах: заголовки столбцов на английском, ячейки — на русском | `skills/test-audit/SKILL.md`, `skills/test-verification/SKILL.md` (полностью на английском), `context/testing-standards.md` (гибрид) | Читатель переключает контекст внутри раздела |
| I2 | Два формата итерационного лога: `[AGENT] iteration/selected/type` (W5.1) vs `[AGENT] target/code_type/strategy` (test-implementation) | `agent-workflow-core` W5.1, `skills/test-implementation/SKILL.md` | Ревьюер не видит единого паттерна |
| I3 | Версионирование: только agent-workflow-core имеет `Version: 2.4`, остальные SKILL.md — без версии | Все SKILL.md, context/*.md | Невозможно отследить, какая версия правила когда добавлена |
| I4 | Ссылки на схемы: `@./skills/agent-workflow-core/agent-state-schema.json` vs `agent-state-schema.json` (относительный без пути) | `skills/test-audit/SKILL.md`, `skills/test-plan-template/SKILL.md` | Когнитивный шум, агент может выбрать неверный файл |
| I5 | Раздел `## Forbidden Patterns`: в некоторых SKILL.md — таблица, в других — список | `skills/test-review/SKILL.md` (таблица), `skills/test-implementation/SKILL.md` (список в Rules) | Неоднозначность формата для новых SKILL.md |

---

## 3. Точность и ясность (Precision)

### 3.1 Примеры точных / удачных формулировок

| Файл | Цитата | Почему хорошо |
|------|--------|---------------|
| `skills/test-verification/SKILL.md` | «No completion claim without fresh verification evidence. If you did not run the test suite against the current workspace state, do not claim success.» | Абсолютно однозначный императив. Zero ambiguity. |
| `context/testing-standards.md §1.1` | «**ДОЛЖНО**: Тестировать наблюдаемое поведение... **ЗАПРЕЩЕНО**: Тестировать внутренние детали реализации» | Чёткие imperative модальности, одна интерпретация. |
| `agent-workflow-core` W0.1 | «**ДОЛЖНО**: Одна итерация = одна атомарная задача. **ЗАПРЕЩЕНО**: Выполнять несколько задач параллельно» | Точное, верифицируемое правило. |
| `context/react-testing.md` R4.3 | «Если менее 3-х `it` блоков и нет `userEvent` → статус автоматически `partial`.» | Конкретный порог. Никаких «возможно» или «обычно». |
| `agent-workflow-core` W8.4 | «Если `test-plan.md.mtime < agent-state.json.session.last_updated` → Markdown устарел» | Алгоритмическая точность. |

### 3.2 Двусмысленные или слишком общие инструкции

| # | Цитата | Файл | Риск интерпретации |
|---|--------|------|-------------------|
| P1 | «Сколько `it`/`test` блоков? (менее 3 → автоматический downgrade)» | `skills/test-audit/SKILL.md` Phase 2 | Downgrade к какому статусу? `partial`? `invalid`? Проясняется только в react-testing.md R4.3 |
| P2 | «Выбрать первую по приоритету **(или иную логику)**» | `agent-workflow-core` W1.4 | Открывает произвольный выбор. Нарушает W2.1 STRICT |
| P3 | «Если a specific file or module is specified, review only its tests» | `skills/test-review/SKILL.md` Phase 1 | Что если scope не указан — «все» или «recently changed»? |
| P4 | «If a test uses a valid but **unusual** pattern, explain why it works rather than suggesting a change» | `skills/test-review/SKILL.md` Rules | «Unusual» — субъективная категория |
| P5 | «**Заполнить** `result`» (без структуры) | `agent-workflow-core` W2.3 | Какова структура result? Обязательные поля? |
| P6 | «Keep scope **narrow and bounded** to the current task» | `skills/test-implementation/SKILL.md` Rules | «Narrow» — красивая формулировка, но non-verifiable |
| P7 | «После каждой итерации агент **может**» | `agent-workflow-core` W3.2 | «Может» = необязательно. Но knowledge/checksum важны. Без обновления — контекст деградирует |

---

## 4. Нарушения DRY (Don't Repeat Yourself)

### 4.1 Карта дублирования

| Дублируемое правило | Количество вхождений | Файлы |
|---------------------|---------------------|-------|
| **«Загрузить agent-state.json → W6 pre-flight → W8.4 sync»** | 5 | Каждый agent `.md` |
| **W0.5 Double Documentation (обязан поддерживать test-plan.md)** | 6 | `agent-workflow-core` + 4 SKILL.md + 1 agent |
| **«Не модифицировать бизнес-логику» (W0.4)** | 3 | `agent-workflow-core`, `skills/test-implementation/SKILL.md`, `agents/test-implementer.md` |
| **Quality Checklist** | 4 | `testing-standards.md §3`, `skills/test-audit/SKILL.md`, `skills/test-review/SKILL.md`, R4 каждого overlay |
| **Forbidden Patterns** | 3 | `testing-standards.md §4`, `skills/test-review/SKILL.md`, «implicit» в W0.4 |
| **Stack Detection таблица** | 2 | `QWEN.md`, `agent-workflow-core` W10.2 |
| **Log format** | 2 | `agent-workflow-core` W5.1, `skills/test-implementation/SKILL.md` |
| **W8.3/W8.4 (regen test-plan.md)** | ~8 | agent-workflow-core + 3 SKILL.md + 5 agent.md + exit conditions |
| **Schema validation упоминание** | 4 | `skills/test-audit`, `skills/test-implementation`, `skills/test-verification`, `skills/test-plan-template` |
| **Exit Conditions boilerplate** (state updated, test-plan regenerated) | 5+ | Каждый SKILL.md (одинаковые 3-4 пункта) |

### 4.2 Предложения по устранению

| Действие | Описание | Затронутые файлы |
|----------|----------|-------------------|
| D1 | **Создать `context/workflow-essentials.md`** — вынести W0.3, W0.4, W0.5, W2.1, W8.3, W8.4. Все agent-файлы и SKILL.md ссылаются `@context/workflow-essentials.md` | Новый файл + все SKILL.md + agents/*.md |
| D2 | **Единая Quality Checklist** — `testing-standards.md §3` = source. Остальные — ссылка + delta (stack-specific) | `context/testing-standards.md`, skills/test-audit, skills/test-review |
| D3 | **Единый Forbidden Patterns** — `testing-standards.md §4` = base. test-review добавляет только stack-specific | `context/testing-standards.md`, skills/test-review |
| D4 | **Stack Detection — один источник** — оставить в `agent-workflow-core W10.2`, из QWEN.md — ссылка | `QWEN.md` |
| D5 | **Common Exit Conditions** — вынести boilerplate в `agent-workflow-core` как shared block. SKILL.md только delta | `agent-workflow-core`, все test-*/SKILL.md |

---

## 5. Лаконичность (Conciseness)

### 5.1 Фрагменты, которые можно сократить

| Файл | Было | Стало |
|------|------|-------|
| `agent-workflow-core` W8.1 template | ~60 строк для markdown-template | Вынести в `skills/test-plan-template/test-plan-template.md`. В W8.1 — ссылка |
| `agents/test-strategist.md` failure modes | 6 пунктов, из них 2 дублируют testing-standards §1.3 | 3 уникальных + ссылка на §1.3 |
| `agents/test-verifier.md` failure modes | 8 пунктов, 3 покрываются «Iron Law» в test-verification/SKILL.md | 4 уникальных + ссылка на SKILL.md Iron Law |
| `context/testing-standards.md` §2 Classification Table | Полная таблица (7 строк) | Концепция + ссылка: «Детальная таблица — в каждом overlay» |
| Все SKILL.md Exit Conditions | 3-5 одинаковых пунктов (state updated, test-plan.md regenerated, history entries) | Ссылка на Common Exit Conditions (D5) + 1-2 специфичных |
| `context/java-testing.md` R1 | Дублирует testing-standards §2 (Java-специфичная таблица = ~10 строк) | Ссылка на §2 + Java delta |

### 5.2 Принцип минимальной достаточности

**Целевой объём файлов:**
| Тип файла | Целевой размер |
|-----------|----------------|
| SKILL.md | ≤ 120 строк (Phase инструкции + Exit Conditions + Forbidden Patterns) |
| agents/*.md | ≤ 60 строк (Role + Failure Modes + Rules + Output) |
| context/*-testing.md | ≤ 200 строк (R1–R7 компактно) |
| context/testing-standards.md | ≤ 150 строк (общие принципы, без stack-таблиц) |
| agent-workflow-core/SKILL.md | ≤ 400 строк (ядро W0–W11) |

---

## 6. Паттерны исправления по приоритетам

### P0 — Критично (влияют на детерминизм и корректность агента)

| ID | Задача | Паттерн | Файлы для изменения | Статус |
|----|--------|---------|---------------------|--------|
| PQ-01 | Устранить амбигуитет P2: «или иную логику» | Заменить: `if приоритеты равны → order by id ascending (лексикографически)` | `skills/agent-workflow-core/SKILL.md` W1.4 | ✅ done (executed together with P0-A1) |
| PQ-02 | Устранить амбигуитет P1: «менее 3 → downgrade» | Указать: `менее 3 → coverage_status: "partial"`. Ссылка на R4 overlay | `skills/test-audit/SKILL.md` Phase 2 | pending |
| PQ-03 | Устранить дублирование Stack Detection (D4) | В QWEN.md заменить таблицу на: `Stack detection алгоритг → см. agent-workflow-core W10.2` | `QWEN.md` | pending |
| PQ-04 | Устранить дублирование Quality Checklists (D2) | В testing-standards.md §3 — единый чеклист. В test-audit и test-review — ссылка `@context/testing-standards.md §3` | `context/testing-standards.md`, `skills/test-audit/SKILL.md`, `skills/test-review/SKILL.md` | pending |

**Порядок выполнения PQ:** PQ-02 → PQ-03 → PQ-04

> Зависимость: PQ-04 требует стабильной формулировки чеклиста в testing-standards.md. PQ-01 выполнен вместе с P0-A1.

---

### P1 — Желательно (улучшают читаемость и поддерживаемость)

| ID | Задача | Паттерн | Файлы для изменения |
|----|--------|---------|---------------------|
| PQ-11 | Создать `context/workflow-essentials.md` (D1) | Вынести W0.3, W0.4, W0.5, W2.1, W8.3, W8.4. Добавить `## Core Workflow Rules` раздел. Обновить все ссылки | Новый файл + agents/*.md + SKILL.md |
| PQ-12 | Унифицировать язык SKILL.md (I1) | Выбрать: SKILL.md = английский, agents/*.md = русский. Или наоборот. Привести таблицы к единому стилю | Все SKILL.md, agents/*.md |
| PQ-13 | Унифицировать log format (I2) | Оставить в agent-workflow-core W5.1. В test-implementation — ссылка + delta | `skills/test-implementation/SKILL.md` |
| PQ-14 | Сократить failure modes в agent-файлах | Consolidate до 3–4 уникальных. Дублирующие — заменить ссылкой на testing-standards или SKILL.md | agents/test-strategist.md, agents/test-verifier.md |
| PQ-15 | Добавить версионирование (I3) | Добавить `> Версия: X.Y | Дата: YYYY-MM-DD` в header каждого SKILL.md | Все SKILL.md |
| PQ-16 | Унифицировать формат Exit Conditions (I5) | Выбрать один формат (рекомендация: таблица). Обновить все SKILL.md | Все SKILL.md |
| PQ-17 | Определить структуру `result` (P5) | Добавить в обе схемы: `"result": {type: object, required: [status, message], properties: {...}}`. Обновить W2.3 | agent-state-schema.json, test-plan-state-schema.json, agent-workflow-core W2.3 |

**Параллельно:** PQ-12 + PQ-13 + PQ-14 + PQ-15 можно делать параллельно. PQ-11 требует PQ-04 (чтобы не выносить уже удалённый дубликат).

---

### P2 — Опционально (косметика и долгосрочная гигиена)

| ID | Задача | Паттерн | Файлы для изменения |
|----|--------|---------|---------------------|
| PQ-21 | Вынести Classification Table из testing-standards §2 | Оставить ссылку: «Детальная таблица — в stack overlay R1» | `context/testing-standards.md` |
| PQ-22 | Добавить версию в testing-standards.md | `> Версия: 2.1 | Дата: 2026-04-19` | `context/testing-standards.md` |
| PQ-23 | Заменить длинные ссылки на алиасы | `@./skills/agent-workflow-core/agent-state-schema.json` → `schema:agent-state` | Все SKILL.md (если поддерживается alias-механизм) |
| PQ-24 | Сократить Exit Conditions boilerplate | Common Exit Conditions в agent-workflow-core §W9 | `agent-workflow-core/SKILL.md` |
| PQ-25 | Добавить style guide для новых промтов | Создать `docs/PROMPT-STYLE-GUIDE.md` на основе этого документа §8 | Новый файл |

---

## 7. Чек-лист качества промта

Перед тем как пометить задачу улучшения промта `done`:

### Лингвистические проверки

- [ ] Нет фраз «по возможности», «как правило», «обычно», «может» (необязательные действия)
- [ ] Нет фраз «или иную логику», «narrow», «unusual» (субъективные категории)
- [ ] Каждая инструкция допускает ровно одну интерпретацию
- [ ] Терминология едина во всех файлах (напр., всегда `agent-state.json`, не `state file`)
- [ ] Нет смешения языков в пределах одного раздела/таблицы

### DRY проверки

- [ ] Ни одно правило не дублируется более чем в 2 файлах (исключение: ссылки на источник)
- [ ] Quality Checklist — единственный источник: `context/testing-standards.md §3`
- [ ] Forbidden Patterns базовые — единственный источник: `context/testing-standards.md §4`
- [ ] Stack Detection — единственный источник: `skills/agent-workflow-core W10.2`

### Структурные проверки

- [ ] SKILL.md содержит версию в заголовке
- [ ] SKILL.md: Exit Conditions — таблица или список с маркерами `[ ]`
- [ ] agents/*.md: Failure Modes — 3–4 пункта (макс. 8)
- [ ] agents/*.md: Rules — 4–6 правил (с ссылками на agent-workflow-core)
- [ ] Все ссылки `@./skills/...` — с полным относительным путём

---

## 8. Конвенции промтов (новые правила)

После исправления всех P0–P1, фреймворк обязан следовать этим конвенциям:

### 8.1 Единый язык

| Тип файла | Язык | Обоснование |
|-----------|------|-------------|
| `skills/*/SKILL.md` | Английский | Инструкции для LLM — английский предпочтительнее |
| `agents/*.md` | Русский | Агентные профили — для человеко-читаемого описания ролей |
| `context/testing-standards.md` | Русский | Shared с GigaCraft, исторически русский |
| `context/*-testing.md` overlays | Английский | Stack-специфика может использоваться в мультиязычных командах |
| `QWEN.md` | Русский | Root prompt — локализация |
| `strategy/*.md` | Русский | Стратегические документы — для команды |

**Правило:** В пределах одного файла — один язык. Таблицы: заголовки и ячейки на одном языке.

### 8.2 Лимиты размера

| Тип файла | Максимум строк |
|-----------|---------------|
| SKILL.md | 120 |
| agents/*.md | 60 |
| context/*-testing.md | 200 |
| context/testing-standards.md | 150 |
| agent-workflow-core/SKILL.md | 400 |

**Правило:** Если файл превышает лимит — вынести часть в отдельный файл или ссылку.

### 8.3 DRY-правило

**Правило:** Ни одно правило не должно встречаться более чем в **2** файлах. Если правило нужно в 3+ файлах — оно выносится в общий источник, и остальные файлы ссылаются на него.

### 8.4 Точность правил

**Правило:** Каждое правило должно быть verifiable — т.е. по нему можно однозначно сказать «выполнено» или «нарушено». Запрещены субъективные категории: «narrow», «good», «unusual», «reasonable».

### 8.5 Версионирование

**Правило:** Каждый SKILL.md и context overlay обязан содержать версию и дату в header. При изменении — инкрементировать минорную версию.

---

*Документ принадлежит: strategy/*
*Смежные документы: VISION.md, IMPLEMENTATION-SPEC.md, ARCHITECTURE-SPEC.md, backlog.yaml, BLOCK-2-GIGATEST-GROWTH.md, READINESS-MATRIX.md*
