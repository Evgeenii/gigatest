# BLOCK-2-GIGATEST-GROWTH.md — Стратегия развития GigaTest

> Версия: 2.3 | Дата: 2026-04-18
> Предыдущая версия: 2.2 (2026-04-18)
>
> **Изменения v2.3:** Phase 4 завершён. Созданы docs/DEMO.md, docs/COMPARISON.md, docs/METRICS.md.

---

## Текущее состояние

> **Обновлено: 2026-04-18 после Phase 0.** Полная матрица — [`READINESS-MATRIX.md`](READINESS-MATRIX.md) v2.0.

| Показатель | Значение |
|---|---|
| Зрелость (Readiness Score) | **4.0 / 5** (было 3.2) |
| Критических гэпов (C1–C5) | **0** (закрыты) ✅ |
| Высоких гэпов (H1–H5) | 5 (Phase 1) |
| Средних гэпов | **6** (M1–M4 существующие + **M2, M3 новые**) |
| Низких гэпов | 3 |
| Статус | 🟢 **Production-ready (core)** |

Полная матрица гэпов — [`READINESS-MATRIX.md`](READINESS-MATRIX.md).

---

## Anti-goal навсегда

> ❌ Слияние с GigaCraft.
> ❌ Мост до завершения Phase 0.
> ❌ CI/CD до завершения Phase 1.

---

## Обзор фаз

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
Production  Стабили-  Расшире-  CI/CD     Prezenta-  Принятие
ready        зация     ние       интегра-   ция        и growth
(~2 нед.)  (~2 нед.) (~4 нед.) ция        и demo
                                (~3 нед.)  (~2 нед.)
```

---

## Phase 0 — Production Ready

**Цель:** устранить все критические гэпы C1–C5. После этой фазы GigaTest можно
безопасно давать реальным пользователям.

**Exit condition фазы:** Все 5 acceptance criteria выполнены + end-to-end тест проходит.

### P0-001: Создать `skills/test-plan-template/SKILL.md`

**Гэп:** C1 — `test-plan-template.md` существует, но не оформлен как skill,
поэтому агенты не могут его загрузить через `@./skills/test-plan-template/SKILL.md`.

**Action:**
1. Создать файл `skills/test-plan-template/SKILL.md`
2. Файл должен содержать front-matter с `name` и `description`
3. Внутри — импортировать или инлайнить содержимое `test-plan-template.md`

**Acceptance criteria:**
- [ ] Файл `skills/test-plan-template/SKILL.md` существует
- [ ] Содержит валидный front-matter (`name`, `description`)
- [ ] Агент `test-auditor` может загрузить шаблон через `@./skills/test-plan-template/SKILL.md`
- [ ] Генерируемый `test-plan.md` соответствует шаблону

**Effort:** XS (1–2 часа)

---

### P0-002: Добавить `$ref` composition между JSON Schema файлами

**Гэп:** C2 — `test-plan-state-schema.json` дублирует поля из `agent-state-schema.json`
без использования `$ref`. При обновлении одной схемы другая может отстать.

**Action:**
1. Определить общие поля между схемами
2. В `test-plan-state-schema.json` добавить `$ref` на `agent-state-schema.json` для общих полей
3. Проверить что существующий `plans/tests-audit-example/agent-state.json` валидируется

**Acceptance criteria:**
- [ ] `test-plan-state-schema.json` содержит `$ref` на `agent-state-schema.json`
- [ ] Дублирующиеся поля удалены из `test-plan-state-schema.json`
- [ ] `plans/tests-audit-example/agent-state.json` валидируется по обеим схемам без ошибок
- [ ] Нет дублирования определений типов

**Effort:** S (2–4 часа)

---

### P0-003: Включить `additionalProperties: false` в test-plan-state-schema.json

**Гэп:** C3 — `additionalProperties: true` не отлавливает невалидные поля в state.
Агент может писать произвольные поля и никто не узнает.

**Action:**
1. Установить `additionalProperties: false` на уровне корня schema
2. Установить `additionalProperties: false` на всех вложенных объектах
3. Проверить что все существующие тесты (`tests-audit-example`) валидируются
4. Исправить если нужно

**Acceptance criteria:**
- [ ] `additionalProperties: false` на корне и всех вложенных объектах
- [ ] `plans/tests-audit-example/agent-state.json` валидируется без ошибок
- [ ] Невалидный JSON с лишними полями выдаёт ошибку валидации

**Effort:** S (2–3 часа)

---

### P0-004: Синхронизировать `agent.type` enum с реальными именами агентов

**Гэп:** C4 — enum `agent.type` в `agent-state-schema.json` не совпадает с реальными
именами агентов в `agents/` директории.

**Action:**
1. Прочитать все файлы в `agents/` и выписать реальные `name` из front-matter
2. Обновить enum в `agent-state-schema.json`: `test-auditor`, `test-implementer`,
   `test-reviewer`, `test-strategist`, добавить `test-verifier` (future)
3. Проверить все места где используется `agent.type`

**Acceptance criteria:**
- [ ] Enum содержит ровно: `test-auditor`, `test-implementer`, `test-reviewer`,
  `test-strategist`, `test-verifier`
- [ ] `plans/tests-audit-example/agent-state.json` использует валидное значение из enum
- [ ] Старые значения удалены

**Effort:** XS (1 час)

---

### P0-005: End-to-end smoke тест workflow

**Гэп:** C5 — нет проверки что весь workflow работает как единое целое.

**Action:**
1. Создать `plans/tests-e2e-example/` с минимальным но полным прогоном
2. Симулировать: audit → 1 задача impl → review → verify
3. Проверить что `agent-state.json` корректно переходит через все статусы
4. Проверить что `test-plan.md` регенерируется на каждом шаге

**Acceptance criteria:**
- [ ] `plans/tests-e2e-example/agent-state.json` существует
- [ ] Содержит минимум 4 задачи (по одной на стадию)
- [ ] `test-plan.md` отражает финальное состояние (все задачи done)
- [ ] Все статусы задач = `done`, `progress_percent = 100`
- [ ] `memory.history` содержит записи для всех итераций

**Effort:** M (4–6 часов)

---

### P0-006: Обновить README с актуальным quick start

**Гэп:** README не упоминает актуальные файлы и схемы.

**Action:**
1. Проверить каждый шаг quick start из README — работает ли он прямо сейчас
2. Обновить примеры команд
3. Добавить раздел Troubleshooting (топ-3 ошибки)

**Acceptance criteria:**
- [ ] Quick start работает без ошибок на свежей установке
- [ ] Все ссылки на файлы рабочие
- [ ] Раздел Troubleshooting присутствует

**Effort:** S (2–3 часа)

**Phase 0 Exit Metric:** Readiness Score ≥ 4.0/5

---

## Phase 1 — Стабилизация

**Цель:** устранить все высокие гэпы H1–H5. Надёжный, предсказуемый продукт.

**Зависимость:** Phase 0 завершена полностью.

**Exit condition фазы:** Все H-гэпы закрыты + первый реальный пользователь прошёл onboarding.

### P1-007: Создать агента `test-verifier`

**Гэп:** H1 — финальная стадия workflow (verification) не имеет агентного представления.
Есть skill `test-verification`, но нет `agents/test-verifier.md`.

**Action:**
1. Создать `agents/test-verifier.md` по шаблону других агентов
2. Определить failure modes специфичные для верификации
3. Указать rules и required output
4. Добавить в `agent.type` enum в схеме

**Acceptance criteria:**
- [ ] Файл `agents/test-verifier.md` существует с валидным front-matter
- [ ] Содержит: failure modes, rules, required output
- [ ] Использует `@./skills/test-verification/SKILL.md`
- [ ] `agent.type = "test-verifier"` добавлен в схему

**Effort:** S (3–4 часа)

---

### P1-008: Механизм регенерации `test-plan.md` при расхождении

**Гэп:** H3 — нет явного механизма обнаружения и исправления расхождения
между `agent-state.json` и `test-plan.md`.

**Action:**
1. Добавить в `agent-workflow-core/SKILL.md` раздел W8.4 (уже есть предупреждение,
   нужно расширить до алгоритма)
2. Добавить в каждый агент pre-flight check: сравнить `session.last_updated`
   в JSON с датой изменения `test-plan.md`
3. Если расхождение — регенерировать с предупреждением

**Acceptance criteria:**
- [ ] Pre-flight check описан в `agent-workflow-core/SKILL.md`
- [ ] Каждый агент содержит инструкцию по pre-flight проверке
- [ ] При расхождении выводится `[AGENT] WARNING: test-plan.md was out of sync`
- [ ] Регенерация происходит автоматически

**Effort:** S (2–4 часа)

---

### P1-009: Pre-flight валидация `agent-state.json` перед стартом

**Гэп:** H5 — агент стартует без проверки корректности state.
Повреждённый или невалидный state → непредсказуемое поведение.

**Action:**
1. Добавить в W6 (Чек-лист начала работы) явную валидацию JSON по схеме
2. Описать что делать если валидация не прошла (blocked state)
3. Обновить все агенты чтобы ссылались на W6

**Acceptance criteria:**
- [ ] W6 содержит шаг валидации по `agent-state-schema.json`
- [ ] Невалидный state → агент выводит ошибку и останавливается
- [ ] Все 4 агента ссылаются на W6 в своих rules

**Effort:** S (2–3 часа)

---

### P1-010: Path consistency (`.gigacode/plans/` everywhere)

**Гэп:** В документации смешиваются `.gigacode/plans/` и `.gigacraft/state/`.

**Action:**
1. Поиск всех упоминаний путей в `skills/`, `agents/`, `context/`
2. Стандартизировать на `.gigacode/plans/<task-type>-YYYY-MM-DD/`
3. Обновить `agent-workflow-core/SKILL.md` W1.1

**Acceptance criteria:**
- [ ] Нет упоминаний `.gigacraft/state/` в файлах GigaTest
- [ ] Все пути используют `.gigacode/plans/`
- [ ] `plans/tests-audit-example` находится на правильном пути

**Effort:** XS (1–2 часа)

---

### P1-011: Создать `docs/ONBOARDING.md`

**Гэп:** H4 — нет онбординг-гайда. Новый пользователь не понимает с чего начать.

**Action:**
1. Описать 4 сценария: (a) нет тестов совсем, (b) есть плохие тесты, (c) написать тесты для новой фичи, (d) review тестов перед PR
2. Для каждого сценария — пошаговый guide
3. Добавить раздел FAQ (5–7 типичных вопросов)

**Acceptance criteria:**
- [ ] `docs/ONBOARDING.md` существует
- [ ] Покрывает минимум 4 сценария
- [ ] Каждый сценарий: ≤ 10 шагов
- [ ] Содержит раздел FAQ

**Effort:** M (4–6 часов)

**Phase 1 Exit Metric:** Readiness Score ≥ 4.4/5

---

## Phase 2 — Расширение

**Цель:** расширить stack coverage. GigaTest работает для большинства проектов в банке.

**Зависимость:** Phase 1 завершена.

### P2-012: Python overlay (`context/python-testing.md`)

**Гэп:** нет overlay для Python (Django, FastAPI, pytest).

**Action:**
1. Создать `context/python-testing.md` по образцу `java-testing.md`
2. Покрыть: FastAPI/Django controllers, Service layer, Repository (SQLAlchemy), Pure logic
3. Включить: pytest fixtures, мокирование (unittest.mock, pytest-mock), структура файлов

**Acceptance criteria:**
- [ ] `context/python-testing.md` существует
- [ ] Структура совпадает с `java-testing.md` (R1–R7)
- [ ] Покрывает: FastAPI, Django, pytest, pytest-mock, SQLAlchemy
- [ ] Содержит примеры тестов (код)
- [ ] Содержит R2 Decision Algorithm

**Effort:** M (4–6 часов)

---

### P2-013: Go overlay (`context/go-testing.md`)

**Action:** по аналогии с Python overlay.

**Acceptance criteria:**
- [ ] `context/go-testing.md` существует
- [ ] Покрывает: HTTP handlers (net/http), Service layer, Repository, Pure logic
- [ ] Содержит примеры с `testing` package, `testify`, `httptest`

**Effort:** M (4–6 часов)

---

### P2-014: Explicit exit conditions для всех skills

**Гэп:** Skills не содержат явных условий завершения стадии.

**Action:**
1. Добавить раздел `## Exit Conditions` в каждый skill
2. Описать: что является сигналом к завершению, что передаётся следующему агенту,
   что блокирует переход

**Acceptance criteria:**
- [ ] Раздел `Exit Conditions` добавлен в: test-audit, test-implementation, test-review, test-verification
- [ ] Каждый exit condition — наблюдаем (файл, статус, лог)

**Effort:** S (3–4 часа)

---

### P2-015: State Discovery Protocol

**Гэп:** Нет стандартного способа для нового агента найти существующий state.

**Action:**
1. Добавить в `agent-workflow-core/SKILL.md` раздел W10: State Discovery
2. Алгоритм: поиск `agent-state.json` в `.gigacode/plans/*/`
3. Если несколько — выбор по `last_updated`

**Acceptance criteria:**
- [ ] W10 добавлен в SKILL.md
- [ ] Алгоритм описывает поиск, выбор при конфликте, создание нового

**Effort:** XS (1–2 часа)

---

### P2-016: Явные инструкции загрузки stack-оверлеев (M2)

**Гэп:** QWEN.md говорит «when repository or task clearly calls for them» — агент решает сам, что размыто. Иногда пишет тесты без stack-контекста. Качество тестов снижается на 10–15%.

**Action:**
1. Добавить в QWEN.md или `using-gigatest/SKILL.md` конкретный алгоритм определения стека
2. Правила: по `package.json` → React, по `pom.xml`/`build.gradle` → Java, по `package.json` (Node) → JS/TS
3. Если не определён — fallback на `testing-standards.md`

**Acceptance criteria:**
- [ ] QWEN.md или using-gigatest содержит алгоритм определения стека
- [ ] Агент загружает react-testing.md для React-проектов, java-testing.md для Java и т.д.
- [ ] Если стек не определён — используется testing-standards.md как fallback
- [ ] Нет ситуации когда агент пишет тесты без stack-контекста

**Effort:** XS (1 час)

---

### P2-017: Специфицировать template синтаксис test-plan-template.md (M3)

**Гэп:** `test-plan-template.md` использует `{{#each}}`, `{{#if}}` (Handlebars-like), но не указано что это. LLM может неправильно интерпретировать template variables.

**Action:**
1. Добавить комментарий в начало `test-plan-template.md` с описанием синтаксиса
2. Указать что это Handlebars-like template
3. Обновить `test-plan-template/SKILL.md` (Phase Render) с инструкцией

**Acceptance criteria:**
- [ ] `test-plan-template.md` содержит комментарий с описанием синтаксиса в начале
- [ ] SKILL.md описывает Phase Render с примерами template syntax
- [ ] Smoke-тест подтверждает корректную генерацию из template

**Effort:** XS (1 час)

---

**Phase 2 Exit Metric:** Readiness Score ≥ 4.7/5, 4+ оверлея

---

## Phase 3 — Тулинг

**Цель:** Локальные утилиты для валидации state и генерации отчётов.

**Зависимость:** Phase 2 завершена.

### P3-016: Node.js валидатор JSON Schema

**Action:**
1. Создать `tools/validate-state.js` — CLI скрипт
2. Принимает путь к `agent-state.json`, валидирует по схемам
3. Возвращает exit code 0 (valid) / 1 (invalid)

**Acceptance criteria:**
- [ ] `tools/validate-state.js` существует
- [ ] `node tools/validate-state.js plans/tests-audit-example/agent-state.json` → exit 0
- [ ] При невалидном JSON → exit 1 + описание ошибок

**Effort:** S (3–4 часа)

---

### P3-018: Markdown report generator

**Action:**
1. Создать `tools/generate-report.js`
2. Принимает `agent-state.json` → генерирует `test-plan.md`
3. Идентичен результату ручной регенерации агентом

**Acceptance criteria:**
- [ ] `tools/generate-report.js` существует
- [ ] Output идентичен шаблону из `test-plan-template.md`
- [ ] Работает на `plans/tests-audit-example/agent-state.json`

**Effort:** M (4–6 часов)

**Phase 3 Exit Metric:** CLI-утилиты работают локально

---

## Phase 4 — Презентация и Demo

**Цель:** GigaTest можно показать и объяснить за 15 минут.

**Зависимость:** Phase 1 завершена (презентацию можно готовить параллельно с Phase 2–3).

### P4-019: Demo script

**Action:**
1. Создать `docs/DEMO.md` — пошаговый сценарий демонстрации
2. Реальный проект (можно учебный) → полный цикл audit → verify
3. Время демо: ≤ 15 минут

**Acceptance criteria:**
- [ ] `docs/DEMO.md` существует
- [ ] Сценарий проходит за ≤ 15 минут
- [ ] Демонстрирует все 5 стадий
- [ ] Показывает `agent-state.json` и `test-plan.md` в действии

**Effort:** M (4–6 часов)

---

### P4-020: Сравнительная таблица (vs alternatives)

**Action:**
1. Создать `docs/COMPARISON.md`
2. GigaTest vs superpowers vs raw AI vs ничего
3. По ключевым dimensions из VISION.md

**Effort:** S (2–3 часа)

---

### P4-021: Метрики adoption

**Action:**
1. Определить какие метрики собираем (сессии, стадии, завершения)
2. Описать в `docs/METRICS.md`

**Effort:** XS (1–2 часа)

---

## Phase 5 — Верификация и принятие

**Цель:** GigaTest принят реальными пользователями. Итеративное улучшение по обратной связи.

**Зависимость:** Phase 0–1 завершены.

### Активности

1. **Первый пилотный пользователь** — onboarding одного разработчика, наблюдение за процессом
2. **Сбор feedback** — что непонятно, где блокировки, что лишнее
3. **Итерация backlog** — обновление `backlog.yaml` по результатам пилота
4. **Повтор** — второй пользователь

**Exit condition:** North Star Metric ≥ 70% автономных сессий

---

## Сводная таблица задач

| ID | Задача | Фаза | Приоритет | Effort | Гэп |
|----|--------|------|-----------|--------|-----|
| P0-001 | Создать SKILL.md для test-plan-template | 0 | P0 | XS | C1 |
| P0-002 | $ref composition между схемами | 0 | P0 | S | C2 |
| P0-003 | additionalProperties: false | 0 | P0 | S | C3 |
| P0-004 | Синхронизировать agent.type enum | 0 | P0 | XS | C4 |
| P0-005 | End-to-end smoke тест | 0 | P0 | M | C5 |
| P0-006 | Обновить README | 0 | P1 | S | — |
| P1-007 | Создать test-verifier агента | 1 | P1 | S | H1 |
| P1-008 | Механизм регенерации test-plan.md | 1 | P1 | S | H3 |
| P1-009 | Pre-flight валидация state | 1 | P1 | S | H5 |
| P1-010 | Path consistency | 1 | P1 | XS | — |
| P1-011 | docs/ONBOARDING.md | 1 | P1 | M | H4 |
| P2-012 | Python overlay | 2 | P1 | M | H2 |
| P2-013 | Go overlay | 2 | P2 | M | — |
| P2-014 | Exit conditions для skills | 2 | P2 | S | H3 |
| P2-015 | State Discovery Protocol | 2 | P2 | XS | — |
| **P2-016** | **Явные инструкции загрузки оверлеев** | **2** | **P2** | **XS** | **M2** |
| **P2-017** | **Специфицировать template синтаксис** | **2** | **P3** | **XS** | **M3** |
| P3-016 | Node.js валидатор | 3 | P2 | S | — |
| P3-018 | Markdown report generator | 3 | P2 | M | — |
| P4-019 | Demo script | 4 | P2 | M | — |
| P4-020 | Comparison doc | 4 | P2 | S | — |
| P4-021 | Метрики adoption | 4 | P2 | XS | — |
| BRIDGE-001 | Уровень 1: Testing Reminder | Bridge | P2 | XS | — |
| BRIDGE-002 | Уровень 2: Cross-workflow Trigger | Bridge | P2 | S | — |
| BRIDGE-003 | Уровень 3: Standards sync | Bridge | P2 | XS | — |
| **Итого:** | **25 задач** | | | | |

**Effort:** XS = 1–2ч, S = 2–4ч, M = 4–6ч, L = 6–10ч

---

## Метрики успеха по фазам

| Фаза | Readiness Score | Ключевой индикатор |
|------|----------------|-------------------|
| До Phase 0 | 3.2/5 | 5 Critical гэпов |
| После Phase 0 | ≥ 4.0/5 | 0 Critical гэпов ✅ |
| После Phase 1 | ≥ 4.4/5 | Первый onboarded пользователь |
| После Phase 2 | ≥ 4.7/5 | 4+ стека + overlay discovery + template spec |
| После Phase 3 | 4.9/5 | CI интеграция работает |
| После Phase 4–5 | 5.0/5 | North Star Metric ≥ 70% |
