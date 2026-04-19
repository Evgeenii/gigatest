# PROMPT-QUALITY-SPEC.md — Спецификация качества промтов GigaTest

> Версия: 2.1 | Дата: 2026-04-19
> Предыдущая версия: 2.0 (2026-04-19)
>
> **Изменения v2.1:** Внешний ревью: PQ-02/PQ-03/PQ-04 подтверждены как де-факто выполненные (§6 → все done). Раздел §7 дополнен PQ-11/PQ-13 (рекомендованные к выполнению). §10 языковая миграция — статус «заморожена».
>
> **Назначение:** Описать обнаруженные проблемы качества промтов (SKILL.md, agents/*.md, context/*.md, QWEN.md)
> и план их устранения. Содержит конкретные задачи с паттернами для агентов-имплементеров.
>
> **Аудитория:** Технические писатели, агенты-ревьюеры, архитекторы.
>
> **Источники:** Два раунда лингвистического аудита промтов (2026-04-19).
>
> **Связанные документы:**
> - [`VISION.md`](VISION.md) — ЧТО и ЗАЧЕМ
> - [`IMPLEMENTATION-SPEC.md`](IMPLEMENTATION-SPEC.md) — КАК
> - [`context/testing-standards.md`](../context/testing-standards.md) — Базовые стандарты

---

## Содержание

1. [Общая оценка качества (раунд 2)](#1-общая-оценка-качества-раунд-2)
2. [Единый стиль (Consistency) — обновлено](#2-единый-стиль-consistency--обновлено)
3. [Точность и ясность (Precision) — обновлено](#3-точность-и-ясность-precision--обновлено)
4. [Нарушения DRY — обновлено](#4-нарушения-dry--обновлено)
5. [Лаконичность (Conciseness) — обновлено](#5-лаконичность-conciseness--обновлено)
6. [Паттерны исправления: Раунд 1 (PQ-01..PQ-04)](#6-паттерны-исправления-раунд-1-pq-01pq-04)
7. [Паттерны исправления: Раунд 2 (PQ-10..PQ-17)](#7-паттерны-исправления-раунд-2-pq-10pq-17)
8. [Чек-лист качества промта](#8-чек-лист-качества-промта)
9. [Конвенции промтов](#9-конвенции-промтов)

---

## 1. Общая оценка качества (раунд 2)

**Общий балл: 7.5 / 10** (улучшение с 7/10 после раунда 1)

Фреймворк демонстрирует зрелую структуру: skills-first архитектура, единый скелет файлов, stack-agnostic ядро с overlay-моделью. Критичные амбигуитеты раунда 1 (`или иную логику`, `менее 3 без статуса`, дублирование Stack Detection и Quality Checklist) устранены через PQ-01..PQ-04.

**Оставшиеся системные проблемы:**
- `agent-workflow-core/SKILL.md` — **654 строки** при цели ≤400. Секции W10/W11/W8 дублируют отдельные skills
- Forbidden Patterns в test-review дублирует testing-standards §4
- Субъективные термины `narrow`, `unusual`, `narrowest` в 3 core skills
- R2/R3/R4.1 идентичны во всех 5 context overlays (~250 строк суммарно)
- W6 pre-flight дословно повторяется в 6 agent-файлах

---

## 2. Единый стиль (Consistency) — обновлено

### 2.1 Что сделано хорошо

| Элемент | Пример |
|---------|--------|
| **Скелет SKILL.md** | Все 9 файлов: `frontmatter → Goal → Process → Rules → Exit Conditions → Forbidden Patterns` |
| **Скелет agents/*.md** | Все 6 файлов: `frontmatter → Role → Failure Modes → Rules → Required Output → Tools` |
| **Стабильная терминология** | `agent-state.json`, `test-plan.md`, `quality_gate`, `coverage_status`, `.gigacode/plans/` — единообразно |
| **R1–R7 структура overlays** | Все 5 context overlays следуют единому формату |

### 2.2 Расхождения (обновлено после раунда 2)

| # | Расхождение | Файлы | Статус |
|---|------------|-------|--------|
| I1 | Смешение RU/EN: agents/*.md, context/testing-standards.md, QWEN.md на русском — по конвенции §9.1 должны быть на английском | agents/*.md (6), testing-standards.md, QWEN.md | P1 (языковая миграция) |
| I2 | Два формата лога: `[AGENT] iteration/selected/type` vs `[AGENT] target/code_type/strategy` | agent-workflow-core W5.1, test-implementation | P1 (I2) |
| I3 | Версионирование: только agent-workflow-core имеет версию | Все SKILL.md | P1 (I3) |
| I4 | Ссылки на схемы: `@./skills/...` vs bare filename | test-audit, test-plan-template | P2 (I4) |
| I5 | Forbidden Patterns: таблица vs список | test-review (таблица), test-implementation (список) | P2 (I5) |
| I6 | W6 pre-flight дословно в 6 agent-файлах | agents/*.md | P1 (A7) |
| I7 | R9 Common Pitfalls: есть в Python/Go, нет в Java/JS/React | context/*.md | P2 (A8) |

### 2.3 Исправлено в раунде 1

| Было | Исправлено в | Статус |
|------|-------------|--------|
| Таблица Stack Detection дублировалась в QWEN.md и W10.2 | PQ-03: QWEN.md → ссылка на W10.2 | ✅ done |

---

## 3. Точность и ясность (Precision) — обновлено

### 3.1 Примеры точных / удачных формулировок

| Файл | Цитата | Почему хорошо |
|------|--------|---------------|
| `test-verification/SKILL.md` | «No completion claim without fresh verification evidence.» | Zero ambiguity. Абсолютный императив. |
| `testing-standards.md §1.1` | «**ДОЛЖНО**: Тестировать наблюдаемое поведение... **ЗАПРЕЩЕНО**: Тестировать внутренние детали» | Чёткие модальности, одна интерпретация. |
| `agent-workflow-core` W0.1 | «Одна итерация = одна атомарная задача» | Точное, верифицируемое правило. |
| `agent-workflow-core` W1.4 | `sort by priority desc → then by id ascending lexicographically` | Детерминированный алгоритм (PQ-01/P0-A1). |
| `test-audit/SKILL.md` Phase 2 | `менее 3 → coverage_status: "partial"` | Конкретный результат (PQ-02). |

### 3.2 Двусмысленные инструкции (обновлено после раунда 2)

| ID | Цитата | Файл | Риск | Приоритет |
|----|--------|------|------|-----------|
| P4 | «If a test uses a valid but **unusual** pattern, explain why it works» | `test-review/SKILL.md` Rules:87 | «Unusual» — субъективная оценка | P1 (PQ-13) |
| P6 | «Keep scope **narrow and bounded** to the current task» | `test-implementation/SKILL.md` Rules:42 | «Narrow» — non-verifiable | P1 (PQ-13) |
| P8 | «Identify the **narrowest** command that can prove that claim» | `test-verification/SKILL.md` Verification Gate:29 | «Narrowest» — нет критерия | P1 (PQ-13) |
| P9 | «Prefer the **narrowest useful** verification first» | `test-verification/SKILL.md` Rules:60 | То же | P1 (PQ-13) |
| P10 | «После каждой итерации агент **может**» | `agent-workflow-core` W3.2 | «Может» = необязательно, но knowledge важен | P2 |

### 3.3 Исправлено в раунде 1

| Было | Исправлено в | Статус |
|------|-------------|--------|
| «менее 3 → автоматический downgrade» | PQ-02: `coverage_status: "partial"` | ✅ done |
| «или иную логику» в W1.4 | P0-A1: детерминированный алгоритм | ✅ done |

---

## 4. Нарушения DRY — обновлено

### 4.1 Карта дублирования (актуальная)

| Правило | Вхождений | Файлы | Приоритет |
|---------|-----------|-------|-----------|
| **W6 pre-flight** (дословно) | 6 | Все agent-файлы | P1 (A7) |
| **W0.5 Double Documentation** | 5 | agent-workflow-core + 4 SKILL.md | P2 |
| **W8.3/W8.4 (regen test-plan.md)** | 6 | agent-workflow-core + 4 SKILL.md + agents | P2 |
| **Forbidden Patterns** (testing-standards §4) | 2 | testing-standards.md §4, test-review §Forbidden | P1 (A5) |
| **R2 Decision Algorithm** (одинаковый, 50 строк × 5) | 5 | Все context overlays | P1 (A6) |
| **R3 Decision Log Format** (8 строк × 5) | 5 | Все context overlays | P1 (A6) |
| **R4.1 Full Coverage Criteria** (5 items × 4 backend) | 4 | js-ts, java, python, go overlays | P1 (A6) |
| **«Не модифицировать бизнес-логику»** | 3 | agent-workflow-core, test-implementation SKILL.md, test-implementer agent | P2 |

### 4.2 Исправлено в раунде 1

| Дублирование | Исправлено в | Статус |
|-------------|-------------|--------|
| Stack Detection таблица (QWEN.md + W10.2) | PQ-03: ссылка из QWEN.md | ✅ done |
| Quality Checklist (4 вхождения) | PQ-04: testing-standards §3 = source + delta | ✅ done |

### 4.3 Предложения по устранению (новые)

| ID | Действие | Затронутые файлы | Экономия |
|----|----------|-------------------|----------|
| D6 | W6 pre-flight → ссылка на W6 в agent-workflow-core | agents/*.md (6 файлов) | ~30 строк |
| D7 | test-review Forbidden Patterns → ссылка на testing-standards §4 | test-review/SKILL.md | ~15 строк |
| D8 | R2/R3/R4.1 overlays → testing-standards §6 (stack-parametric) | context/*.md (5 файлов) | ~250 строк суммарно |
| D9 | W8 (test-plan.md template) → ссылка на test-plan-template skill | agent-workflow-core | ~80 строк |

---

## 5. Лаконичность (Conciseness) — обновлено

### 5.1 Размеры файлов (факт vs цель)

| Файл | Строк | Цель | Превышение | Примечание |
|------|-------|------|------------|------------|
| `agent-workflow-core/SKILL.md` | **654** | ≤400 | +254 | W10/W11/W8 дублируют отдельные skills |
| `convention-discovery/SKILL.md` | **256** | ≤120 | +136 | Phase 4.1 output template = 40 строк |
| `convention-review/SKILL.md` | **150** | ≤120 | +30 | Phase 2 Conflict Table дублирует §1 |
| `test-audit/SKILL.md` | 133 | ≤120 | +13 | Delta список компактен |
| `test-review/SKILL.md` | 98 | ≤120 | 0 | В норме |
| `test-verification/SKILL.md` | 87 | ≤120 | 0 | В норме |
| `test-implementation/SKILL.md` | 81 | ≤120 | 0 | В норме |
| `test-plan-template/SKILL.md` | 54 | ≤120 | 0 | В норме |
| `using-gigatest/SKILL.md` | 47 | ≤120 | 0 | В норме |
| `agents/convention-discoverer.md` | 64 | ≤60 | +4 | Незначительно |
| `agents/test-verifier.md` | 61 | ≤60 | +1 | Незначительно |
| Остальные agents | 51–58 | ≤60 | 0 | В норме |

### 5.2 Что сократить

| Файл | Было | Стало (паттерн) |
|------|------|-----------------|
| `agent-workflow-core` W8 (60 строк) | Полный шаблон test-plan.md | Ссылка на test-plan-template skill |
| `agent-workflow-core` W10 (100 строк) | Полная State Discovery | Вынести в `state-discovery/SKILL.md` |
| `agent-workflow-core` W11 (80 строк) | Полная Convention Loading | Вынести в `convention-loading/SKILL.md` |
| `test-review` Forbidden Patterns (15 строк) | Дублирует testing-standards §4 | Ссылка + только React-specific delta |
| `convention-discovery` Phase 4.1 (40 строк) | Полный output template | Ссылка на отдельный template файл |

---

## 6. Паттерны исправления: Раунд 1 (PQ-01..PQ-04)

### P0 — Выполнено (подтверждено внешним ревью)

| ID | Задача | Файлы | Статус |
|----|--------|-------|--------|
| PQ-01 | Устранить «или иную логику» в W1.4 | agent-workflow-core W1.4 | ✅ done |
| PQ-02 | Устранить «менее 3 → downgrade» → `coverage_status: "partial"` | test-audit Phase 2 | ✅ done (внешний ревью подтвердил: правило в Quality Checklist, ссылка на R4) |
| PQ-03 | Stack Detection DRY: QWEN.md → ссылка на W10.2 | QWEN.md | ✅ done (внешний ревью подтвердил: таблица заменена ссылкой) |
| PQ-04 | Quality Checklist DRY: testing-standards §3 = source + delta | testing-standards, test-audit, test-review | ✅ done (внешний ревью подтвердил: Source of truth помечен, оба skills ссылаются) |

---

## 7. Паттерны исправления: Раунд 2 (PQ-10..PQ-17)

### P0 — Критично (влияют на читаемость и консистентность ядра)

| ID | Задача | Паттерн | Файлы | Оценка эффекта |
|----|--------|---------|-------|----------------|
| PQ-10 | Вынести W10/W11 из agent-workflow-core | W10 → `state-discovery/SKILL.md`, W11 → `convention-loading/SKILL.md` | agent-workflow-core | 654 → ~400 строк | **Отложено** (делать при 800+ строках) |
| PQ-11 | Удалить дубликат W8 из agent-workflow-core | Заменить тело W8 ссылкой на test-plan-template skill | agent-workflow-core | -80 строк | **Рекомендовано** |
| PQ-12 | Синхронизировать импортированный W8.4 в QWEN.md | QWEN.md импортирует agent-workflow-core целиком — убедиться что импортируется версия с content_hash (не mtime) | QWEN.md (через импорт) | Консистентность |

### P1 — Желательно (улучшают читаемость и DRY)

| ID | Задача | Паттерн | Файлы |
|----|--------|---------|-------|
| PQ-13 | Заменить субъективные термины | `narrow` → `Do not modify files outside current task's artifact path`; `unusual` → `pattern not listed in Forbidden Patterns`; `narrowest` → `single most specific command` | test-implementation:42, test-review:87, test-verification:29,60 |
| PQ-14 | test-review Forbidden Patterns → ссылка | Заменить дублирующие паттерны ссылкой на testing-standards §4, оставить только React-specific | test-review/SKILL.md |
| PQ-15 | R2/R3/R4.1 overlays → testing-standards §6 | Вынести общий Decision Algorithm, Decision Log Format, Full Coverage Criteria. Overlays подставляют stack-specific значения | context/*.md (5 файлов) + testing-standards.md |
| PQ-16 | W6 pre-flight в agent-файлах → ссылка | Заменить дословный текст ссылкой на agent-workflow-core §W6 | agents/*.md (6 файлов) |

### P2 — Опционально

| ID | Задача | Паттерн | Файлы |
|----|--------|---------|-------|
| PQ-17 | Добавить R9 Common Pitfalls к Java/JS | Создать таблицы типичных ошибок по аналогии с Python/Go | java-testing.md, js-ts-testing.md |
| PQ-21 | Вынести Classification Table из testing-standards §2 | Ссылка: «Детальная таблица — в stack overlay R1» | testing-standards.md |
| PQ-22 | Добавить версию в testing-standards.md | `> Версия: 2.1 \| Дата: 2026-04-19` | testing-standards.md |
| PQ-23 | Заменить длинные ссылки на алиасы | `@./skills/agent-workflow-core/agent-state-schema.json` → алиас | Все SKILL.md (если механизм поддерживается) |
| PQ-24 | Сократить Exit Conditions boilerplate | Common Exit Conditions в agent-workflow-core | Все SKILL.md |
| PQ-25 | Создать docs/PROMPT-STYLE-GUIDE.md | На основе этого документа §9 | Новый файл |
| PQ-26 | W3.2 «может» → «должен» | Если knowledge важен → императив, если нет → убрать из списка | agent-workflow-core W3.2 |

---

## 8. Чек-лист качества промта

Перед тем как пометить задачу улучшения промта `done`:

### Лингвистические проверки

- [ ] Нет фраз «по возможности», «как правило», «обычно», «может» (необязательные действия)
- [ ] Нет фраз «или иную логику», «narrow», «unusual», «narrowest», «reasonable» (субъективные категории)
- [ ] Каждая инструкция допускает ровно одну интерпретацию
- [ ] Терминология едина во всех файлах (напр., всегда `agent-state.json`, не `state file`)
- [ ] Нет смешения языков в пределах одного раздела/таблицы

### DRY проверки

- [ ] Ни одно правило не дублируется более чем в 2 файлах (исключение: ссылки на источник)
- [ ] Quality Checklist — единственный источник: `context/testing-standards.md §3`
- [ ] Forbidden Patterns базовые — единственный источник: `context/testing-standards.md §4`
- [ ] Stack Detection — единственный источник: `skills/agent-workflow-core W10.2`
- [ ] Decision Algorithm — единственный источник (будущий §6 testing-standards)

### Структурные проверки

- [ ] SKILL.md содержит версию в заголовке
- [ ] SKILL.md: Exit Conditions — таблица или список с маркерами `[ ]`
- [ ] agents/*.md: Failure Modes — 3–4 пункта (макс. 8)
- [ ] agents/*.md: Rules — 4–6 правил (с ссылками на agent-workflow-core)
- [ ] Все ссылки `@./skills/...` — с полным относительным путём
- [ ] `agent-workflow-core/SKILL.md` ≤ 400 строк

---

## 9. Конвенции промтов

### 9.1 Единый язык

| Тип файла | Язык | Обоснование |
|-----------|------|-------------|
| `skills/*/SKILL.md` | Английский | Промт для LLM |
| `agents/*.md` | Английский | Промт для LLM (профиль роли) |
| `context/testing-standards.md` | Английский | Промт для LLM (базовые стандарты) |
| `context/*-testing.md` overlays | Английский | Промт для LLM (stack-специфика) |
| `QWEN.md` | Английский | Root prompt для LLM |
| `strategy/*.md` | Русский | Документация для команды |

**Правило:** Всё что читает LLM — английский. Всё что читает человек (strategy/) — русский. В пределах одного файла — один язык.

### 9.2 Лимиты размера

| Тип файла | Максимум строк |
|-----------|---------------|
| SKILL.md | 120 |
| agents/*.md | 60 |
| context/*-testing.md | 200 |
| context/testing-standards.md | 150 |
| agent-workflow-core/SKILL.md | 400 |

### 9.3 DRY-правило

Ни одно правило не должно встречаться более чем в **2** файлах. Если правило нужно в 3+ файлах — оно выносится в общий источник, и остальные файлы ссылаются на него.

### 9.4 Точность правил

Каждое правило должно быть verifiable — по нему можно однозначно сказать «выполнено» или «нарушено». Запрещены субъективные категории: `narrow`, `good`, `unusual`, `reasonable`, `narrowest`.

### 9.5 Версионирование

Каждый SKILL.md и context overlay обязан содержать версию и дату в header. При изменении — инкрементировать минорную версию.

---

## 10. Масштабная задача: Языковая миграция на английский (LLM-промты) — ЗАМОРОЖЕНА

> По конвенции §9.1: всё что читает LLM → английский. strategy/ → русский.
> Ниже — полный план миграции. Выполнять после PQ-10..PQ-16 (когда структура стабилизируется).

### 10.1 Скоуп файлов

| Файл | Текущий язык | Целевой язык | Строк |
|------|-------------|-------------|-------|
| `QWEN.md` | Русский | Английский | ~19 |
| `context/testing-standards.md` | Русский | Английский | ~118 |
| `agents/test-auditor.md` | Русский | Английский | 58 |
| `agents/test-implementer.md` | Русский | Английский | 57 |
| `agents/test-reviewer.md` | Русский | Английский | 51 |
| `agents/test-strategist.md` | Русский | Английский | 58 |
| `agents/test-verifier.md` | Русский | Английский | 61 |
| `agents/convention-discoverer.md` | Русский | Английский | 64 |

**Итого:** 8 файлов, ~486 строк.

### 10.2 Порядок выполнения

| Шаг | Файл | Зависит от |
|-----|------|-----------|
| 1 | `context/testing-standards.md` | — (базовый, от него ссылаются остальные) |
| 2 | `agent-workflow-core/SKILL.md` (если содержит русский контент) | PQ-10/PQ-11 |
| 3 | `QWEN.md` | testing-standards.md (ссылки) |
| 4 | `agents/test-auditor.md` | testing-standards.md, test-audit SKILL.md |
| 5 | `agents/test-implementer.md` | test-implementation SKILL.md |
| 6 | `agents/test-reviewer.md` | test-review SKILL.md, testing-standards.md |
| 7 | `agents/test-strategist.md` | — |
| 8 | `agents/test-verifier.md` | test-verification SKILL.md |
| 9 | `agents/convention-discoverer.md` | convention-discovery SKILL.md |

### 10.3 Правила перевода

- **Не переводить:** кодовые примеры, JSON-схемы, пути файлов, `agent-state.json`, `test-plan.md`, `.gigacode/plans/`
- **Не переводить:** log format маркеры `[AGENT]`, `[AUDIT]`, `[REVIEW]` и т.д.
- **Перевести:** описания, правила, инструкции, таблицы
- **Сохранить:** `ДОЛЖНО`/`ЗАПРЕЩЕНО` → `MUST`/`MUST NOT` (RFC 2119 style)
- **Сохранить:** структуру файла (front-matter, секции, заголовки)

### 10.4 Чек-лист валидации после перевода

- [ ] Все `@context/testing-standards.md` ссылки всё ещё резолвятся
- [ ] Терминология едина (напр., везде `agent-state.json`, не `state file`)
- [ ] Нет mix языков внутри одного файла
- [ ] Формат логов `[AGENT]` остался без изменений
- [ ] QWEN.md `@./skills/...` импорты работают
- [ ] Все SKILL.md остаются на английском (не затронуты миграцией)
- [ ] strategy/*.md остались на русском (не затронуты миграцией)

### 10.5 Оценка рисков

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Сломанные ссылки после перевода | Низкая | Пути файлов не меняются |
| Потеря смысла при переводе инструкций Средняя | Ревью билингвальным техническим писателем |  |
| Рассинхрон терминов между files | Средняя | Создать глоссарий перед началом |
| Регрессия после future changes | Средняя | Добавить rule в PROMPT-QUALITY-SPEC §9.1: «новые agent/context файлы — сразу на английском» |

---

*Документ принадлежит: strategy/*
*Смежные документы: VISION.md, IMPLEMENTATION-SPEC.md, backlog.yaml, BLOCK-2-GIGATEST-GROWTH.md, READINESS-MATRIX.md*
