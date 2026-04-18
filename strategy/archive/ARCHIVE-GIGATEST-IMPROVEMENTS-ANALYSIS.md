# 🗃️ ARCHIVED — GIGATEST-IMPROVEMENTS-ANALYSIS.md

> **⚠️ АРХИВ:** Этот документ — историческое исследовательское ревью.
> Все гэпы мигрированы в `backlog.yaml`, `READINESS-MATRIX.md`, `BLOCK-2-GIGATEST-GROWTH.md`.
> **Не используйте для принятия решений** — обращайтесь к актуальным файлам.
>
> **Дата оригинала:** 2026-04-17
> **Архивирован:** 2026-04-18
> **Тип:** Исследовательское ревью (не реализация)
> **Исходная цель:** Оценить качество промптов, выявить гэпы, составить матрицу зрелости
>
> **Миграция:** C1–C5 → backlog Phase 0 (done), H1–H5 → backlog Phase 1, M1–M4 → backlog Phase 2.
> **См. также:** `READINESS-MATRIX.md` (v2.0), `backlog.yaml` (v2.2), `BLOCK-2-GIGATEST-GROWTH.md`

---

## Общее заключение

**Годится? — ДА, но с оговорками.** Это зрелый, хорошо спроектированный extension. Сильных сторон значительно больше, чем слабых, но есть конкретные гэпы, которые необходимо закрыть перед production-ready.

---

## 1. Что сделано ОТЛИЧНО

| Аспект | Оценка | Детали |
|--------|--------|--------|
| **Skills-first архитектура** | ⭐⭐⭐⭐⭐ | `using-gigatest` как тонкий маршрутизатор с чётким Stage Map и Routing Guidance. Нет монолитного root prompt — контекст оптимизирован |
| **JSON Schema** | ⭐⭐⭐⭐⭐ | Draft-07, строгая (кроме test-plan-schema), валидируемые enums. 6 required секций корневого уровня. Расширения для тестового workflow через `additionalProperties: true` |
| **Двойная документация** | ⭐⭐⭐⭐⭐ | JSON → Markdown с синхронизацией — killer feature для git-трекаемости. W0.5 — принцип, не украшение |
| **Iron Law в verification** | ⭐⭐⭐⭐⭐ | Evidence table с 7 типами claims и «что НЕ достаточно». Red flags — конкретные паттерны ложных завершений |
| **Агентские профили** | ⭐⭐⭐⭐⭐ | Каждый — с explicit failure modes (6-8 анти-паттернов), tools, color. Чёткое разделение: auditor=read-only, implementer=write+run, reviewer=read-only, strategist=plan-only |
| **Итеративный режим** | ⭐⭐⭐⭐⭐ | W2.1 — одна задача за итерацию. W2.3 — атомарное обновление. W1.4 — выбор задачи по приоритету и зависимостям |
| **Контекстные оверлеи** | ⭐⭐⭐⭐⭐ | 3 стека (React/Java/JS-TS) с decision algorithms, полными примерами тестов, mocking strategies |
| **Testing standards** | ⭐⭐⭐⭐⭐ | Behavior-first, AAA, forbidden patterns — это золотой стандарт |
| **Пример плана** | ⭐⭐⭐⭐ | Рабочий `agent-state.json` + `test-plan.md` — можно открыть и понять что получится |

---

## 2. Гэпы — что сломается в реальной работе

### 🔴 CRITICAL (сломается или создаёт хаос)

| # | Гэп | Где | Последствие |
|---|-----|-----|-------------|
| C1 | **Нет `SKILL.md` в `test-plan-template/`** | `skills/test-plan-template/test-plan-template.md` | Qwen Code ожидает `SKILL.md` в папке скилла. Файл переименован в `test-plan-template.md` — скилл может не резолвиться. Это баг, а не дизайн |
| C2 | **Нет composition `$ref` между схемами** | `test-plan-state-schema.json` → `agent-state-schema.json` | Схема test-extension НЕ ссылается на base через `$ref`/`allOf`. Они не связаны. Валидация против test-схемы НЕ валидирует обязательные поля base-схемы |
| C3 | **`additionalProperties: true` на test-plan-schema** | Корень `test-plan-state-schema.json` | Любые произвольные поля проходят валидацию. Это делает схему НЕ строгой — JSON может содержать мусор и всё равно валидироваться |
| C4 | **Нет `test-verifier` агента** | README говорит «нет верифицирующего агента», но в `agent-state-schema.json` enum есть `test-verifier` | Атрибут `agent.type` enum содержит `test-verifier`, но он не нужен — inconsistency с README. Agent не резолвится ни в один из 4 файлов в `agents/` |
| C5 | **`test-verification` skill НЕ загружается в QWEN.md** | Root prompt грузит: `using-gigatest`, `testing-standards`, `agent-workflow-core`. `test-verification` НЕ загружается нигде. Skills-first workflow предполагает маршрутизацию — и router перенаправит, так что загружается динамически. Это НЕ баг, а потенциальный риск на контекст |

### 🟠 HIGH (сломается при определённых сценариях)

| # | Гэп | Где | Последствие |
|---|-----|-----|-------------|
| H1 | **Нет discovery протокола для mixed workflow** | Все скиллы | Если у пользователя backend + тесты в одном проекте, нет правила для нахождения ВСЕХ active state файлов. DEV_V2 это исправляет (State Discovery Protocol), но в текущем gigatest этого нет |
| H2 | **Регенерация `test-plan.md` — нет механизма** | W8.3 говорит «перегенерировать полностью», но HOW — нет tool, шаблона или команды. Это обязанность агента, но как — имплицитно полагается на LLM. Шаблон существует как `test-plan-template.md`, но нет инструкции «возьми JSON и template → сгенерируй Markdown» |
| H3 | **`agent.type` enum содержит типы НЕ существующих агентов** | `agent-state-schema.json` | Enum: `["test-auditor", "test-implementer", "test-reviewer", "test-strategist", "test-verifier", "architect", "code-reviewer"]` — `architect` и `code-reviewer` НЕ имеют файлов в `agents/`. Схема разрешает агентов, которые не могут загрузиться. Это из задуманного слияния с GigaCraft, но в standalone gigatest — это гэп |
| H4 | **Нет `backend-plan-state-schema.json`** | Планируется в DEV_V2, отсутствует | Для standalone gigatest — OK. Но если схема должна быть универсальной (v2.4), то она невалидна без backend-композиции |
| H5 | **Путь `.gigacode/plans/` vs `.gigacraft/state/`** | W1.1, все скиллы | В текущем — `.gigacode/plans/`. В DEV_V2 — `.gigacraft/state/`. Миграция потребует изменить все пути |

### 🟡 MEDIUM (неудобства, но не поломка)

| # | Гэп | Где | Последствие |
|---|-----|-----|-------------|
| M1 | **Commands — тонкие, без валидации** | 4 command-файла | Каждый — 1 строка: «invoke the skill and follow it exactly». Нет pre-flight проверки (plan exists? schema valid?). Это работает, но если пользователь запустит `/implement-tests` без аудита — агент упадёт, а не скажет «сначала аудит» |
| M2 | **Нет оверлеев в QWEN.md import** | QWEN.md грузит 3 файла, но не импортирует `react-testing.md` или `js-ts-testing.md` напрямую. Это intentional (динамический load), но root prompt не инструктирует агента КОГДА загружать оверлеи. README говорит «автоматически определяет стек», а в QWEN.md — «when repository or task clearly calls for them» — это размыто |
| M3 | **Template синтаксис не специфицирован** | `test-plan-template.md` использует `{{#each}}`, `{{#if}}` (Handlebars-like), но не указано что это Handlebars, mustache, или custom. Агенту полагается «понять» что это template variables. Если LLM не знает Handlebars — может сгенерировать wrong Markdown |
| M4 | **`quality_gate` — массив строк, без структуры** | `test-plan-state-schema.json`: `quality_gate: string[]` | Нет типов требований. Строка «Must have userEvent» и строка «Must have async» — indistinguishable. Нужен object: `{type, description, priority}` |

### 🟢 LOW (косметика и best practices)

| # | Гэп | Где | Последствие |
|---|-----|-----|-------------|
| L1 | **`test-plan-state-schema.json` не использует `required` на уровне plan.items extensions** | Schema добавляет поля в план, но НЕ требует их | Поля `coverage_status`, `quality_gate` — не required для items. Агент может не заполнить. Schema не защитит |
| L2 | **Версионирование: v2.4 но extension = 0.1.0** | `agent-workflow-core` v2.4 vs `qwen-extension.json` 0.1.0 | Это нормально (skill отдельно от extension), но может путать при миграции |
| L3 | **`README.md` — пример React, но нет Java/TS example** | README | Один example plan (Login form) — хорошо, но не показывает multi-stack capability |

---

## 3. Матрица зрелости

Оценка: 1 = ad-hoc, 3 = professional, 5 = best-in-class

| Dimension | Score | Обоснование |
|-----------|-------|-------------|
| **Архитектура workflow** | **5** | Skills-first, итеративность, double-doc (JSON+Markdown), clear stages — production-grade |
| **JSON Schema Design** | **4** | Строгая base schema, но test-plan-schema loose (`additionalProperties: true`), нет `$ref` composition между схемами |
| **Агентские профили** | **5** | 4 роли, чёткие failure modes, explicit tools/read-only constraints, color coding — exemplary |
| **Skills — маршрутизация** | **4** | `using-gigatest` тонкий и ясный. `test-verification` загружается динамически — корректно, но не explicit в QWEN.md |
| **Skills — бизнес-логика** | **5** | Audit (5 фаз, quality checklist, prioritization), Implementation (R3 format, W2.1 strict), Review (10 point checklist), Verification (Iron Law + Evidence table) — thorough |
| **Context overlays** | **5** | 3 стека + base — каждый с algorithms, examples, mocking strategies. Качество контента — высокое |
| **Документация** | **4** | README comprehensive, но один example. Quick start works. Нет troubleshooting/FAQ секции |
| **Test Plan Template** | **3** | Handlebars-like syntax without spec. Not a SKILL.md (C1). Generation rules есть, но mechanism implicit |
| **Error handling** | **4** | W2.4 (blocking), unresolvable targets → continue, out-of-sync detection. Но нет explicit fallback если schema validation fails |
| **Cross-workflow support** | **2** | Mixed workflow (backend + testing) — НЕ поддерживается. Нужно расширение в v2 |
| **JSON Schema Validation** | **3** | Base strict, test-extension loose. No composition pipeline. No validation tool/script — only LLM-level |
| **Git integration** | **5** | Double-artifact (JSON+MD), relative paths, PR-friendly diffs — killer design |
| **Commands (fallback)** | **3** | Работают, но thin. No pre-flight, no validation. Fine для recovery path, но не для power users |
| **Extensibility** | **4** | Stack overlays через `context/`, schema через extensions. Но new workflow (non-testing) потребует rewrite agent-workflow-core |

---

## 4. Сводная оценка

| Параметр | Значение |
|----------|----------|
| **Средний балл зрелости** | **3.9 / 5** (Professional) |
| **Critical гэпов** | 5 |
| **High гэпов** | 5 |
| **Medium гэпов** | 4 |
| **Low гэпов** | 3 |
| **Production ready?** | **Близко, но не совсем.** C1 + C2 + C3 нужно закрыть |

---

## 5. Приоритизированный Backlog

| Priority | What | Why |
|----------|------|-----|
| **P0** | Переименовать `test-plan-template.md` → `SKILL.md` | Скилл не резолвится без этого (C1) |
| **P0** | Добавить `$ref` composition между схемами | Валидация test-plan НЕ проверяет base schema (C2) |
| **P1** | Убрать `additionalProperties: true` или добавить `strict` mode в test-plan-schema | Схема пропускает мусор (C3) |
| **P1** | Синхронизировать `agent.type` enum с реальными агентами | Enum содержит `architect`, `code-reviewer`, `test-verifier` — которых нет (C4, H3) |
| **P2** | Explicit mechanism для regeneration test-plan.md | W8.3 имплицитен — агент должен «понять» как (H2) |
| **P2** | Добавить pre-flight в commands | `/implement-tests` без плана → ошибка вместо graceful fallback (M1) |
| **P3** | Структурировать `quality_gate` из `string[]` в `object[]` (M4) |

---

## Итог

Это **хороший** extension (~4/5). Архитектура (skills-first, JSON+MD, iterative) — правильная. Гэпы — имплементационные, не концептуальные: schema composition, naming convention, enum consistency. Закройте P0-P1 — и это будет production-grade extension.
