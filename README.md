# GigaTest

`gigatest` — расширение Qwen Code для структурированного тестирования.
Предоставляет **skills-first** workflow: вы описываете задачу словами, расширение
маршрутизирует запрос в нужный skill, а skill ведёт агента от начала до конца.

> **Killer feature:** каждый план — два файла (`agent-state.json` + `test-plan.md`),
> которые коммитятся в репозиторий. Вы видите diff плана в PR, отслеживаете прогресс,
> передаёте работу между сессиями без потери контекста.

---

## Статус готовности

> **Readiness Score: 4.6/5** — Phase 0–5 завершены ✅
> 6 агентов, 9 skills, 5 stack overlays, CLI-утилиты, convention discovery.
> Подробности: [READINESS-MATRIX.md](strategy/READINESS-MATRIX.md)

---

## Содержание

- [Архитектура: skills-first](#архитектура-skills-first)
- [Зачем](#зачем)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Как это работает](#как-это-работает)
- [Skills — полный workflow](#skills--полный-workflow)
- [Convention Discovery](#convention-discovery)
- [Stack-оверлеи](#stack-оверлеи)
- [Как работают планы](#как-работают-планы)
- [CLI-утилиты](#cli-утилиты)
- [Правила и нюансы](#правила-и-нюансы)
- [Команды (fallback)](#команды-fallback)
- [Пример: React проект](#пример-react-проект)
- [Структура расширения](#структура-расширения)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Архитектура: skills-first

GigaTest построен по принципу **skills-first**: навыки (skills) — основной
интерфейс взаимодействия, а не агенты. Пользователь не вызывает агентов напрямую.

```
Вы описываете задачу словами
        │
        ▼
   QWEN.md (точка входа)
        │
        ├── context/testing-standards.md       ← базовые стандарты
        ├── skills/using-gigatest/SKILL.md     ← маршрутизатор
        └── skills/agent-workflow-core/        ← ядро workflow
                │
                ▼
        using-gigatest анализирует intent
        и направляет в нужный skill
                │
        ┌───────┼───────┬──────────┬──────────┬──────────────┐
        ▼       ▼       ▼          ▼          ▼              ▼
   test-    test-   test-      test-      test-    convention-
   audit    impl    review     verify     strategy discovery / review
   (skill)  (skill) (skill)    (skill)    (skill)    (skills)
        │       │       │          │          │              │
        └───┬───┴───┬───┴────┬─────┘          │              │
            ▼       ▼        ▼                ▼              ▼
         Агенты обеспечивают       Custom conventions
         ролевой контекст и        загружаются через W11
         failure modes
```

### Что это значит на практике

| Уровень | Роль | Файлы |
|---------|------|-------|
| **QWEN.md** | Точка входа — загружает router + standards + core | `QWEN.md` |
| **Router skill** | Анализирует ваш запрос, направляет в нужный skill | `skills/using-gigatest/SKILL.md` |
| **Workflow skills** | Методология: процесс, правила, exit conditions, forbidden patterns | `skills/test-{audit,implementation,review,verification}/SKILL.md` |
| **Convention skills** | Обнаружение и ревью конвенций проекта | `skills/convention-{discovery,review}/SKILL.md` |
| **Agent profiles** | Ролевой контекст: failure modes, выходной формат, правила поведения | `agents/test-{auditor,implementer,reviewer,verifier,strategist,convention-discoverer}.md` |
| **Core skill** | Итеративный цикл, двойная документация, JSON Schema, W11 conventions | `skills/agent-workflow-core/SKILL.md` + схемы |
| **Context overlays** | Стек-специфичные стратегии тестирования | `context/{react,java}-testing.md` |

> **Вы не работаете с агентами напрямую.** Вы описываете задачу, router выбирает
> подходящий skill, skill ведёт работу — агент предоставляется автоматически.

---

## Зачем

Обычно работа с тестами: «надо бы покрыть тестами» → хаотичное написание → дубли → падающие тесты → их игнорируют.

GigaTest решает это через 4 принципа:

1. **Аудит перед написанием** — сначала оценка покрытия, потом приоритизированный план, потом код
2. **Итеративное выполнение** — одна задача за итерацию, состояние в JSON, сессия не теряет контекст
3. **Контроль качества** — чек-листы поведения, async, edge cases встроены в каждый skill
4. **Git-трекаемость** — `agent-state.json` + `test-plan.md` коммитятся, diff виден в PR

---

## Установка

### Локально

```bash
qwen extensions link %{gigatest}
```

### Из git-репозитория

```bash
qwen extensions install git@github.com:Evgeenii/gigatest.git
```

### Проверить

```bash
qwen extensions list
```

---

## Быстрый старт

```
# 1. Аудит — «Что у нас с тестами?»
Вы: «проведи аудит тестов в этом проекте»
→ using-gigatest направит запрос в skill test-audit
→ Skill проведёт аудит, создаст план с приоритизированными задачами
→ Результат: .gigacode/plans/tests-audit-YYYY-MM-DD/

# 2. Проверьте план
# Откройте test-plan.md — увидите приоритизированные задачи

# 3. Выполнение — «Напиши следующий тест»
Вы: «выполни следующую задачу из плана»
→ using-gigatest направит в skill test-implementation
→ Skill выполнит ровно одну задачу, обновит план, остановится

# 4. Ревью — «Проверь качество тестов»
Вы: «проведи ревью написанных тестов»
→ using-gigatest направит в skill test-review

# 5. Верификация — «Проверь что всё работает»
Вы: «проверь что все тесты проходят»
→ using-gigatest направит в skill test-verification
```

> **Главное:** просто описывайте задачу словами. Router (`using-gigatest`) определит
> нужный этап и направит в правильный skill.

---

## Как это работает

### Цепочка загрузки

При старте сессии Qwen Code загружает расширение через `QWEN.md`:

```
QWEN.md
  ├── Подключает context/testing-standards.md (базовые стандарты)
  ├── Подключает skills/using-gigatest/SKILL.md (маршрутизатор)
  └── Подключает skills/agent-workflow-core/SKILL.md (ядро workflow)
```

### Маршрутизация (`using-gigatest`)

Router анализирует intent пользователя и направляет в нужный skill:

| Ваш запрос | Router выберет | Skill выполнит |
|-----------|----------------|----------------|
| «аудит тестов», «что с покрытием?» | `test-audit` | Сканирует проект, оценивает покрытие, создаёт план |
| «напиши тест», «выполни задачу» | `test-implementation` | Выполнит одну задачу из плана |
| «ревью тестов», «проверь качество» | `test-review` | Проверит тесты по чек-листу |
| «запусти тесты», «проверь что проходит» | `test-verification` | Запустит тесты, соберёт доказательства |
| «стратегия тестирования», «как тестировать?» | `test-strategy` | Определит цели и подход к тестированию |
| «найди конвенции», «какой стиль тестов?» | `convention-discovery` | Сканирует проект, извлекает конвенции |
| «проведи ревью конвенций» | `convention-review` | Проверит обнаруженные конвенции |

### State Discovery (W10)

При старте сессии skill автоматически ищет существующий `agent-state.json` в
`.gigacode/plans/`. Если находит — продолжает с последнего checkpoint.
Если нет — начинает новый. При конфликте нескольких планов — выбирает по `last_updated`.

---

## Skills — полный workflow

```
   Strategy              Нет тестов              Тесты есть
      │                      │                       │
      ▼                      ▼                       ▼
┌───────────┐         ┌───────────┐          ┌───────────┐
│ test-     │  цели   │ test-     │  план    │ test-     │
│ strategy  │────────▶│ audit     │─────────▶│ impl      │
│ (skill)   │         │ (skill)   │          │ (skill)   │
└─────┬─────┘         └───────────┘          └─────┬─────┘
      │                                            │
      └────────────────────────────────────────────┘
                          │
                          ▼
                   ┌───────────┐     ┌───────────┐
                   │test-      │◀────│test-      │
                   │verification│     │review     │
                   │(skill)     │     │(skill)    │
                   └───────────┘     └───────────┘

  Есть тесты → нужно узнать стиль проекта?
      │
      ▼
┌───────────────────┐     ┌───────────────────┐
│ convention-       │────▶│ convention-       │
│ discovery (skill) │     │ review (skill)    │
└───────────────────┘     └───────────────────┘
         │
         ▼
  .gigacode/conventions/
  (W11 Convention Loading)
```

| Этап | Skill | Что делает | Результат |
|------|-------|-----------|-----------|
| Strategy | `test-strategy` | Определяет стратегию и тестовые цели | `agent-state.json` с целями |
| Audit | `test-audit` | Сканирует проект, оценивает покрытие и качество | `agent-state.json` + `test-plan.md` |
| Implementation | `test-implementation` | Выполняет **одну** задачу из плана, пишет тесты, проверяет | Тестовый файл + обновлённый план |
| Review | `test-review` | Проверяет качество тестов против чек-листа и `quality_gate` | Список находок с severity |
| Verification | `test-verification` | Запускает тесты, проверяет что план выполнен | Отчёт с доказательством |
| Convention Discovery | `convention-discovery` | Сканирует тесты проекта, извлекает naming, mocking, structure конвенции | `project-conventions.json` + `.md` |
| Convention Review | `convention-review` | Human-in-the-loop валидация обнаруженных конвенций | Approved/rejected conventions |

> **Verification gate:** перед пометкой задачи как `done` любой skill автоматически
> запускает verification — это встроенная контрольная точка. Для отдельной комплексной
> проверки используйте skill `test-verification` напрямую.

---

## Convention Discovery

GigaTest умеет **автоматически обнаруживать** конвенции тестирования из вашего проекта.
Если в проекте уже есть тесты — нет смысла писать новые «по-новому». Агент научится
писать тесты в стиле, принятом в вашей команде.

```
# 1. Обнаружение конвенций
Вы: «найди конвенции тестирования в этом проекте»
→ convention-discovery сканирует тесты, конфиги, документацию, код
→ Извлекает: naming, structure, mocking, forbidden patterns
→ Результат: .gigacode/conventions/project-conventions.json + .md

# 2. Ревью (human-in-the-loop)
Вы: «проведи ревью обнаруженных конвенций»
→ convention-review проверяет полноту, конфликт с testing-standards
→ Approved → conventions загружаются через W11 автоматически

# 3. Использование
→ Все test-agенты пишут тесты в стиле проекта
→ Naming, mocking, structure — как принято в команде
```

**Приоритет:** `custom conventions > stack overlay > testing-standards.md`

Подробности: [docs/CONVENTION-DISCOVERY.md](docs/CONVENTION-DISCOVERY.md)

---

## Stack-оверлеи

Ядро stack-agnostic. Специфичные стратегии подключаются через `context/`:

| Оверлей | Когда | Что добавляет |
|---------|-------|--------------|
| `react-testing.md` | React проект | RTL, Jest/Vitest, hooks, component classification |
| `java-testing.md` | Java/Spring Boot | JUnit 5, Mockito, @WebMvcTest, @DataJpaTest |
| `testing-standards.md` | Всегда (base) | Behavior-first, AAA pattern, forbidden patterns |

Skill автоматически определяет стек по ключевым файлам (`package.json`, `pom.xml`, `build.gradle`) и подключает нужный оверлей.
Можно указать явно: «используй react-оверлей».

---

## Как работают планы

После аудита (или стратегии) создаётся директория:

```
.gigacode/plans/tests-audit-YYYY-MM-DD/
├── agent-state.json          ← JSON Schema, источник истины
└── test-plan.md              ← человекочитаемый, git-trackable
```

| Файл | Роль |
|------|------|
| `agent-state.json` | Валидируется по JSON Schema. Skills и агенты читают его как источник истины |
| `test-plan.md` | Регенерируется из JSON после каждого изменения. Коммитите в репо — в PR виден diff |

### Принцип двойной документации (W0.5)

Skill **обязан** обновлять оба файла синхронно. JSON — для машин (валидация, handoff,
CI-проверки). Markdown — для людей (читается в PR, видны изменения через git diff).
Если `test-plan.md` рассинхронизирован — skill пересоздаёт его из JSON с предупреждением.

---

## CLI-утилиты

GigaTest включает CLI-утилиты для валидации и генерации без участия skill:

| Утилита | Что делает | Пример |
|---------|-----------|--------|
| `tools/validate-state.js` | Валидация `agent-state.json` по JSON Schema | `node tools/validate-state.js plans/tests-audit-example/agent-state.json` |
| `tools/generate-report.js` | Генерация `test-plan.md` из `agent-state.json` | `node tools/generate-report.js plans/tests-audit-example/agent-state.json` |

Обе утилиты используют `ajv` для строгой валидации. Exit code: `0` = OK, `1` = ошибка.

---

## Правила и нюансы

### 1. Skills-first — не вызывайте агентов напрямую

Основной путь: описываете задачу словами → router (`using-gigatest`) направляет
в нужный skill → skill ведёт работу. Команды (`/audit-tests` и т.д.) — fallback
для явного контроля. Агенты — ролевые профили, а не точка входа.

### 2. Итеративность — одна задача за раз

Skill `test-implementation` выполняет **ровно одну задачу** из плана за вызов.
Не просите «напиши все тесты» — просите «выполни следующую задачу».
После каждой итерации skill обновляет `agent-state.json` и `test-plan.md`,
затем останавливается.

**Правильно:** «выполни следующую задачу из плана» → skill делает одну → «продолжай» → следующая.

### 3. Не меняйте бизнес-логику для прохождения тестов

Если тест падает из-за бага в продакшн-коде — skill **фиксирует проблему в логе**,
но не меняет код без разрешения. Тесты проверяют поведение, не подгоняют.

### 4. «Частичное покрытие» ≠ «файл существует»

Аудит оценивает **качество** теста, а не факт наличия файла. Тест с одним
`toMatchSnapshot()` и без взаимодействий получит статус `partial`, а не `full`.

### 5. Запрещённые паттерны в тестах

Skill будет флажить:
- `expect(component.state).toBe(...)` — тестирование internals
- `jest.mock(internalFn)` — мокание внутренней логики
- `toMatchSnapshot()` как единственная проверка — нет верификации поведения
- `act(() => ...)` без `await` — устаревший паттерн

### 6. `test-plan.md` — коммитьте в репозиторий

Оба файла из `.gigacode/plans/tests-audit-*/` предназначены для git.
`test-plan.md` даёт красивый diff в PR — ревьюеры видят что планировалось, что сделано,
что осталось.

### 7. Handoff между сессиями

Потеряли контекст сессии? Откройте `.gigacode/plans/tests-audit-YYYY-MM-DD/agent-state.json`
— там полная история, план, артефакты. Новый skill загрузит файл и продолжит
с последнего checkpoint (State Discovery, W10).

---

## Команды (fallback)

Для явного контроля вместо естественного языка можно использовать команды:

| Команда | Skill |
|---------|-------|
| `/audit-tests` | `test-audit` |
| `/implement-tests` | `test-implementation` |
| `/review-tests` | `test-review` |
| `/run-tests` | `test-verification` |
| `/strategy-tests` | `test-strategy` |

Команды — тонкие редиректы на соответствующие skills. Основной путь — описать
задачу словами, router определит нужный этап автоматически.

---

## Пример: React проект

```
# Сессия 1 — Аудит
Вы: «проведи аудит тестов в этом React проекте»
→ Router → skill test-audit
→ Сканирует компоненты, хуки, утилиты
→ Оценивает качество каждого тестового файла
→ Создаёт .gigacode/plans/tests-audit-2026-04-16/
→ В test-plan.md: 4 critical, 6 high, 3 medium задачи

# Сессия 2 — Выполнение
Вы: «выполни следующую задачу»
→ Router → skill test-implementation
→ Загружает plan, берёт critical-задачу
→ Подключает react-testing.md overlay
→ Классифицирует: UI компонент → UI Behavior test
→ Пишет тест, запускает, проверяет что проходит
→ Обновляет agent-state.json + test-plan.md
→ Останавливается (одна задача за итерацию)

Вы: «продолжай»
→ Следующая задача...

# Сессия 3 — Ревью
Вы: «проведи ревью написанных тестов»
→ Router → skill test-review
→ Загружает plan, проверяет quality_gate
→ Находит: отсутствуют async проверки в одном тесте
→ Рекомендует добавить await screen.findBy*

# Сессия 4 — Verification
Вы: «проверь что всё работает»
→ Router → skill test-verification
→ Запускает тест-сьют
→ Проверяет что все plan.items = done
→ Показывает вывод с доказательством
```

---

## Структура расширения

```
extensions/gigatest-0.1.0/
├── qwen-extension.json              # Манифест расширения
├── QWEN.md                          # Точка входа (загружает router + standards + core)
├── README.md                        # Эта документация
│
├── skills/                          # 9 skills — основной интерфейс
│   ├── using-gigatest/              # ─ Маршрутизатор (router)
│   │   └── SKILL.md
│   ├── test-audit/                  # ─ Аудит + генерация плана
│   │   └── SKILL.md
│   ├── test-implementation/         # ─ Итеративное выполнение (одна задача/итерация)
│   │   └── SKILL.md
│   ├── test-review/                 # ─ Ревью качества
│   │   └── SKILL.md
│   ├── test-verification/           # ─ Verification gate + независимая верификация
│   │   └── SKILL.md
│   ├── test-strategy/               # ─ Стратегия тестирования
│   │   └── SKILL.md
│   ├── agent-workflow-core/         # ─ Ядро: стейт, итерации, JSON Schema, W11
│   │   ├── SKILL.md
│   │   ├── agent-state-schema.json
│   │   └── test-plan-state-schema.json
│   ├── test-plan-template/          # ─ Шаблон test-plan.md
│   │   └── SKILL.md
│   ├── convention-discovery/        # ─ Обнаружение конвенций проекта
│   │   ├── SKILL.md
│   │   └── convention-overlay-schema.json
│   └── convention-review/           # ─ Ревью обнаруженных конвенций
│       └── SKILL.md
│
├── agents/                          # 6 агентов — ролевые профили (не точка входа)
│   ├── test-auditor.md
│   ├── test-implementer.md
│   ├── test-reviewer.md
│   ├── test-strategist.md
│   ├── test-verifier.md
│   └── convention-discoverer.md
│
├── commands/                        # Fallback команды (тонкие редиректы на skills)
│   ├── audit-tests.md
│   ├── implement-tests.md
│   ├── review-tests.md
│   ├── run-tests.md
│   └── strategy-tests.md
│
├── context/                         # Стандарты + оверлеи (подключаются skills)
│   ├── testing-standards.md         # Base (всегда)
│   ├── react-testing.md
│   └── java-testing.md
│
├── plans/                           # Примеры артефактов
│   ├── tests-audit-example/
│   │   ├── agent-state.json
│   │   ├── test-plan.md
│   │   └── README.md
│   └── tests-e2e-example/
│       ├── agent-state.json
│       └── test-plan.md
│
├── tools/                           # CLI-утилиты
│   ├── validate-state.js
│   └── generate-report.js
│
├── docs/                            # Документация
│   ├── ONBOARDING.md
│   ├── DEMO.md
│   ├── COMPARISON.md
│   ├── METRICS.md
│   ├── TEMPLATE-SYNTAX.md
│   └── CONVENTION-DISCOVERY.md
│
└── strategy/                        # Стратегические документы
    ├── README.md
    ├── VISION.md
    ├── IMPLEMENTATION-SPEC.md
    ├── BLOCK-1-GIGACRAFT-BRIDGE.md
    ├── BLOCK-2-GIGATEST-GROWTH.md
    ├── READINESS-MATRIX.md
    └── backlog.yaml
```

---

## Troubleshooting

### Skill не загружается

**Симптом:** расширение игнорирует `test-verification` или другой skill.

**Решение:** Qwen Code ожидает `SKILL.md` в папке skill'а. Проверьте что
`skills/<название>/SKILL.md` существует и имеет валидный front-matter (`name`, `description`).

### `test-plan.md` рассинхронизирован с `agent-state.json`

**Симптом:** Markdown показывает один план, JSON — другой.

**Решение:** Напишите «обнови test-plan.md из agent-state.json» — skill перегенерирует
файл из JSON (W8.4).

### Выполняется сразу несколько задач

**Симптом:** skill пишет все тесты за раз, вместо одного.

**Решение:** Напомните: «выполняй только одну задачу за раз, обновляй состояние и останавливайся»
(правило W2.1).

### Контекст теряется между сессиями

**Симптом:** новый skill начинает с нуля, игнорируя предыдущую работу.

**Решение:** Откройте `test-plan.md` из нужной папки — skill автоматически распознает
его как продолжение существующего плана (State Discovery, W10).

### `additionalProperties: false` блокирует валидацию

**Симптом:** JSON не проходит валидацию, хотя кажется корректным.

**Решение:** В JSON Schema включён строгий режим — любые поля сверх схемы запрещены.
Проверьте что все поля соответствуют `agent-state-schema.json`.

### Аудит нашёл слишком много/мало задач

**Решение:** Напишите «пересмотри стратегию тестирования» — router направит в skill
`test-strategy`, который перебалансирует приоритеты и объединит мелкие задачи.

---

## FAQ

**Q: В чём разница между skills и agents?**

A: **Skills** — методология: процесс, правила, exit conditions, forbidden patterns.
Это то, с чем взаимодействует пользователь. **Agents** — ролевые профили, которые
определяют failure modes, выходной формат и правила поведения. Skills используют
агентов автоматически. Пользователю не нужно вызывать агентов напрямую.

**Q: Зачем нужен verification skill если есть встроенный gate?**

A: Verification gate — встроенная контрольная точка, которую любой skill запускает
при завершении задачи. Skill `test-verification` — для полной независимой верификации:
запуск тест-сьюта, проверка плана, сбор доказательств. Используйте его для комплексной
проверки перед мержем.

**Q: Можно писать тесты без аудита?**

A: Да. Но тогда нет плана — skill будет писать вслепую, рискуя дублировать или
пропустить критичные сценарии. Рекомендуется хотя бы минимальный аудит.

**Q: Как коммитить только изменения тестов без `.gigacode/`?**

A: `.gigacode/` не должен коммититься (добавлен в `.gitignore`). Коммитятся: тестовые
файлы (`__tests__/`) и `test-plan.md` из `plans/` для фиксации прогресса.

**Q: GigaTest vs GigaCraft?**

A: GigaCraft — основной workflow. GigaTest — специализированный extension для тестирования.
Они используют общий стандарт (`testing-standards.md`) и могут работать вместе.

**Q: Как добавить overlay для нового стека?**

A: Создайте `context/<stack>-testing.md` с разделами R1–R7 (см. IMPLEMENTATION-SPEC.md §6.1).
Skill подключит его автоматически при определении стека.

**Q: Какой стек поддерживается?**

A: React и Java/Spring Boot. Если стек не определён — используется `testing-standards.md` как fallback.

**Q: GigaTest production-ready?**

A: Да. Readiness Score: 4.6/5. Все 9 skills, 6 агентов, 2 стековых оверлея, CLI-утилиты, convention discovery — работают.
Подробности: [strategy/READINESS-MATRIX.md](strategy/READINESS-MATRIX.md).

**Q: Что такое Convention Discovery?**

A: Автоматическое обнаружение конвенций тестирования из вашего проекта. Сканирует существующие тесты, конфиги, документацию и код, извлекает закономерности (naming, mocking, structure) и создаёт convention overlay. После review и approve все test-agенты пишут тесты в стиле вашей команды. Подробности: [docs/CONVENTION-DISCOVERY.md](docs/CONVENTION-DISCOVERY.md).
