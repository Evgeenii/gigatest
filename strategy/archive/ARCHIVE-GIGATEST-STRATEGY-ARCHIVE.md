---
⚠️ **ARCHIVED — DO NOT USE**

Этот документ является историческим черновиком (2026-04-17).
Всё содержимое перенесено в актуальные файлы:

| Было в этом файле | Где сейчас |
|---|---|
| Видение продуктов, JTBD | [`strategy/VISION.md`](strategy/VISION.md) |
| Дорожная карта по фазам | [`strategy/BLOCK-2-GIGATEST-GROWTH.md`](strategy/BLOCK-2-GIGATEST-GROWTH.md) |
| Мост GigaCraft ↔ GigaTest | [`strategy/BLOCK-1-GIGACRAFT-BRIDGE.md`](strategy/BLOCK-1-GIGACRAFT-BRIDGE.md) |
| Бэклог задач | [`strategy/backlog.yaml`](strategy/backlog.yaml) |
| SDD для агентов | [`strategy/IMPLEMENTATION-SPEC.md`](strategy/IMPLEMENTATION-SPEC.md) |
| Матрица готовности | [`strategy/READINESS-MATRIX.md`](strategy/READINESS-MATRIX.md) |

---

# GIGATEST-STRATEGY.md — Продуктовая стратегия и позиционирование GigaTest

> Версия: 1.1 | Дата: 2026-04-17
>
> **Назначение:** Стратегический документ — зачем существует GigaTest, почему самостоятельный продукт, как связан с GigaCraft.
>
> **Для:** презентации руководству, принятия архитектурных решений, онбординга контрибьюторов.
>
> **Связанные документы:**
> - [`strategy/VISION.md`](strategy/VISION.md) — видение продуктов, JTBD, принципы
> - [`strategy/BLOCK-1-GIGACRAFT-BRIDGE.md`](strategy/BLOCK-1-GIGACRAFT-BRIDGE.md) — микро-доработки GigaCraft для моста
> - [`strategy/BLOCK-2-GIGATEST-GROWTH.md`](strategy/BLOCK-2-GIGATEST-GROWTH.md) — стратегия роста GigaTest (prod-ready → расширение)
> - [`strategy/backlog.yaml`](strategy/backlog.yaml) — machine-readable бэклог

---

## Содержание

- [GigaTest — самостоятельный продукт](#gigatest--самостоятельный-продукт)
- [Killer features без аналогов в банке](#killer-features-без-аналогов-в-банке)
- [Разделение Jobs-to-be-Done](#разделение-jobs-to-be-done)
- [GigaCraft ↔ GigaTest: два столпа, не слияние](#gigacraft--gigatest-два-столпа-не-слияние)
- [Мост: interoperability, не merge](#мост-interoperability-не-merge)
- [Как презентовать руководству](#как-презентовать-руководству)
- [Что это значит для разработки](#что-это-значит-для-разработки)
- [Дорожная карта](#дорожная-карта)

---

## GigaTest — самостоятельный продукт

### Контекст

В банк завезены три артефакта:

| Артефакт | Происхождение | Адаптация |
|---|---|---|
| `superpowers-5.0.6` | `obra/superpowers` (оригинал) | Внесён для фронтендеров, без форка |
| `gigacraft-0.1.0` | форк + адаптация superpowers | Калька с суперповерс для бэкендеров |
| `gigatest-0.1.0` | **самостоятельная разработка** | Авторский workflow, не форк |

GigaTest **не является** форком superpowers. Он использует те же паттерны (skills-first, agents, fallback commands), но добавляет то, чего нет ни в одном из них.

### Почему не часть GigaCraft

GigaCraft отпочковался как решение для **бэкендеров** — специализированный workflow: spec → plan → impl → review → verify.

GigaTest решает **другую задачу** — тестирование любого кода через аудит → план → итерации → ревью → верификацию.

| Параметр | GigaCraft | GigaTest |
|---|---|---|
| **Домен** | Backend: создание фич | Testing: верификация кода |
| **Стек** | Java + Go (оверлеи) | React + Java + JS/TS + расширяемый |
| **Аудитория** | Backend-разработчики | Все: фронт, бэк, QA, fullstack |
| **Идентичность** | «structured backend workflow» | «universal testing workflow» |

Слияние в `gigacraft-0.2.0` (12 агентов, 14 skills, 9 команд) размывает оба продукта и создаёт cognitive overload.

---

## Killer features без аналогов в банке

Следующие функции **не существуют** ни в SuperPowers, ни в GigaCraft, ни в других расширениях банка:

### 1. JSON Schema `agent-state.json` — persistable state

```
.gigacraft/state/tests-audit-2026-04-17/agent-state.json
```

- Валидируется по JSON Schema
- **Источник истины** для агента и сессии
- Handoff между сессиями: потерял контекст → загрузи JSON → продолжил с checkpoint
- Ни в SuperPowers, ни в GigaCraft этого нет

### 2. Double Documentation (JSON + Markdown синхронно)

| Файл | Для кого | Зачем |
|---|---|---|
| `agent-state.json` | Машина: валидация, CI, handoff | Source of truth |
| `test-plan.md` | Человек: читается в PR, git diff | Human-readable |

W0.5: агент **обязан** обновлять оба синхронно. Если рассинхрон — пересоздаёт из JSON.

В плане (`test-plan.md`) **виден diff** в PR — ревьюеры видят что планировалось, что сделано, что осталось.

### 3. Audit-first workflow

Никто не начинает с «напиши тесты». Сначала:

```
Аудит → Оценка покрытия → Приоритизация → План → Итеративное выполнение
```

Это отличает GigaTest от хаотичного «надо бы покрыть тестами» → дубли → падающие тесты → игнор.

### 4. Stack-agnostic ядро с оверлеями

Один workflow, любые технологии:

| Оверлей | Что добавляет |
|---|---|
| `react-testing.md` | RTL, Jest/Vitest, hooks, component classification |
| `java-testing.md` | JUnit 5, Mockito, @WebMvcTest, @DataJpaTest |
| `js-ts-testing.md` | Express, NestJS, Supertest, сервисы |
| _Новый оверлей_ | _Любой стек: Python, Go, C# — что угодно_ |

Расширяемость без изменения ядра — подключай новый `context/*.md` когда нужен новый стек.

### 5. Iterative execution — одна задача за итерацию

`test-implementer` выполняет **ровно одну задачу** из плана за вызов. После каждой итерации обновляет JSON + Markdown, обновляет checkpoint, останавливается.

Это решает проблему потери контекста в длинных сессиях.

---

## Разделение Jobs-to-be-Done

### GigaCraft: «Создать backend-сервис»

```
User: «Мне нужна новая REST-ручка для управления заказами»
  → brainstorming (design + spec)
  → writing-plans (implementation plan)
  → implementer (по задаче за раз)
  → code-reviewer (каждый таск)
  → verification-before-completion
```

**Job:** спроектировать, запланировать и реализовать backend-фичу.

### GigaTest: «Верифицировать качество кода»

```
User: «Какие у нас тесты? Где пробелы? Что приоритетно?»
  → test-audit (оценка покрытия + качества)
  → test-plan (приоритизированный план в JSON + MD)
  → test-implementer (один тест за итерацию)
  → test-reviewer (качество перед мержем)
  → verification (все тесты проходят + план выполнен)
```

**Job:** оценить текущее состояние тестирования, закрыть приоритетные пробелы, обеспечить качество.

### Это разные JTBD

| | Создание | Верификация |
|---|---|---|
| **Вопрос** | «Как спроектировать и реализовать?» | «Как проверить и убедиться?» |
| **Артефакт** | spec.md, plan.md, код сервиса | agent-state.json, test-plan.md, тестовые файлы |
| **Результат** | Работающая фича | Доказанное покрытие + качество |
| **Время** | В начале фичи | Во время/после реализации |

---

## GigaCraft ↔ GigaTest: два столпа, не слияние

### Концепция

```
       GIGACRAFT                        GIGATEST
  ┌───────────────────┐          ┌───────────────────┐
  │  Backend Workflow │          │  Testing Workflow │
  │                   │          │                   │
  │  spec → plan      │          │  audit → plan     │
  │  impl → review    │          │  impl → review    │
  │  verify           │          │  verify           │
  │                   │          │                   │
  │  8 agents         │          │  4 agents         │
  │  8 skills         │          │  4 skills + core  │
  │  5 commands       │          │  4 commands       │
  └────────┬──────────┘          └────────┬──────────┘
           │                              │
           │         ╱──── BRIDGE ────╲   │
           │◄──────────────────────────►│
           │    interoperability layer   │
           └─────────────────────────────┘
```

Вместо слияния в один раздутый продукт — **два самостоятельных продукта** с мостом между ними.

### Почему это правильно

| Преимущество | Описание |
|---|---|
| **Ясное позиционирование** | Каждый продукт решает свою задачу без когнитивной нагрузки |
| **Независимое развитие** | GigaCraft может эволюционировать без GigaTest и наоборот |
| **Разные аудитории** | Фронтендер ставит GigaTest, не ставит GigaCraft. Бэкендер — наоборот |
| **Меньше blast radius** | Изменение в GigaTest не ломает GigaCraft |
| **Два продукта в портфеле** | Для руководства — больше ценности, больше сценариев использования |

---

## Мост: interoperability, не merge

### Что такое «мост»

Мост — это **минимальная интеграция** между продуктами, при которой они работают лучше вместе, но остаются самостоятельными.

### Уровень 1: Awareness (GigaCraft знает про GigaTest)

В `verification-before-completion` GigaCraft добавить:

```markdown
## Testing Reminder

If this plan introduces new endpoints, business logic, or data models,
remind the user: "Consider running GigaTest audit to ensure test
coverage for the new functionality: /audit-tests"
```

Это не зависимость. Это **awareness** — GigaCraft подсказывает пользователю про тестирование.

### Уровень 2: Cross-workflow trigger (GigaTest читает GigaCraft-планы)

`test-auditor` может читать `plan.md` из GigaCraft-планов:

```
Если найден .gigacraft/state/backend-plan-*/plan.md:
  → Извлечь touched_files[] из GigaCraft плана
  → Использовать как seed для test-audit
  → Создать test-plan с приоритетом на новые/изменённые файлы
```

GigaTest не зависит от GigaCraft — он использует план как **контекст**, если он есть.

### Уровень 3: Shared standards (общий контекст)

`context/testing-standards.md` может быть зашарен как submodule или symlink между репозиториями, чтобы оба продукта следовали одинаковым тестовым принципам.

### Что НЕ входит в мост

| Не мост | Почему |
|---|---|
| Общие агенты | Разные задачи — разные промпты |
| Общие skills | Каждый skill специфичен для workflow |
| Общий root prompt | Каждый продукт имеет свой entry point |
| Общая версия | GigaCraft 0.1.0 ≠ GigaTest 0.1.0 — независимый релиз |

---

## Как презентовать руководству

### Elevator pitch

> «GigaCraft — это structured backend workflow для создания backend-сервисов. GigaTest — это universal testing workflow для верификации любого кода. Вместе они покрывают полный цикл: **specify → plan → implement → review → test → verify**. По отдельности — каждый силён в своём домене и может использоваться независимо.»

### Аргументы

| # | Аргумент | Детали |
|---|---|---|
| 1 | **JSON state — единственный в банке** | persistable state между сессиями, handoff, checkpoint — этого нет ни в одном агентном решении |
| 2 | **Audit-first — уникальная методология** | вместо хаотичного написания тестов — оценка → приоритизация → план → итерации |
| 3 | **Stack-agnostic — один workflow, любые технологии** | React, Java, JS/TS уже есть. Python, Go, C# — новые оверлеи без изменения ядра |
| 4 | **Git-трекаемость** | `agent-state.json` + `test-plan.md` в PR — ревьюеры видят diff плана, менеджеры — прогресс |
| 5 | **Два продукта > один раздутый** | 12 агентов в одном продукте = cognitive overload. 8 + 4 = фокус и ясность |
| 6 | **Не форк — авторская разработка** | SuperPowers → GigaCraft — форк. GigaTest — самостоятельная разработка с уникальными фичами |

### Демонстрационный сценарий

```
1. Показать GigaTest на React-компоненте (фронт)
   → Аудит → План в JSON + MD → Один тест → Ревью → Verification

2. Показать GigaTest на Java-сервисе (бэк)
   → Тот же workflow, другой стек (Java-оверлей)

3. Показать GigaCraft → GigaTest мост
   → Создать фичу через GigaCraft → Запустить audit-tests →
     GigaTest находит пробелы в новой фиче → Закрывает

4. Показать handoff
   → Начать сессию → Потерять контекст → Загрузить agent-state.json →
     Продолжить с checkpoint
```

---

## Что это значит для разработки

### GigaTest — приоритет №1

Фокус на развитии GigaTest как самостоятельного продукта:

| Приоритет | Задача |
|---|---|
| P0 | Довести до production-ready (валидация всех schema, plans, agents) |
| P1 | Добавить новые stack-оверлеи (Python, Go testing) |
| P1 | Улучшить memory state (JSON Schema evolution, validation utils) |
| P2 | Команды для CI/CD integration |
| P2 | Демо-материалы и onboarding guide |

### GigaCraft — мост (потом)

После того как GigaTest production-ready:

| Приоритет | Задача |
|---|---|
| P2 | Добавить awareness в GigaCraft `verification-before-completion` |
| P2 | Написать cross-workflow trigger в `test-auditor` |
| P3 | Создать shared `testing-standards.md` submodule |

### Запрещено (anti-goals)

| ❌ Не делаем | Почему |
|---|---|
| Слияние в `gigacraft-0.2.0` | Размывает оба продукта, cognitive overload |
| Копирование GigaTest-агентов в GigaCraft | Дублирование, рассинхронизация |
| Общий root prompt для обоих | Раздувание до 5K+ слов, модель хуже следует инструкциям |
| Зависимость GigaTest от GigaCraft | GigaTest должен работать без GigaCraft |

---

## Дорожная карта

### Фаза 1: GigaTest production-ready (сейчас)

- [ ] Валидировать все JSON Schema
- [ ] Валидировать все agent frontmatter
- [ ] Валидировать все skill frontmatter
- [ ] Проверить все `@./` ссылки
- [ ] Прогнать end-to-end сценарий (audit → impl → review → verify)
- [ ] Обновить README

### Фаза 2: GigaTest расширение

- [ ] Python testing overlay
- [ ] Go testing overlay
- [ ] CI/CD integration commands
- [ ] Demo materials

### Фаза 3: Мост (позже)

- [ ] GigaCraft awareness в verification gate
- [ ] GigaTest cross-workflow trigger (чтение GigaCraft планов)
- [ ] Shared testing-standards

### Фаза 4: Презентация

- [ ] Демонстрационный сценарий для руководства
- [ ] Сравнительная таблица (до/после GigaTest)
- [ ] Метрики: покрытие, качество, время на тестирование

---

## Структура файлов

```
extensions/gigatest-0.1.0/
│
├── GIGATEST-STRATEGY.md        ← Этот файл (продуктовая стратегия)
├── README.md                   ← Пользовская документация
├── DEV.md                      ← План объединения (исторический, не актуален)
├── GIGACRAFT-0.2.0-SPEC.md     ← Спецификация слияния (исторический, не актуален)
│
├── agents/                     ← 4 роли
│   ├── test-auditor.md
│   ├── test-implementer.md
│   ├── test-reviewer.md
│   └── test-strategist.md
│
├── skills/                     ← 4 workflow + 2 shared
│   ├── using-gigatest/
│   ├── test-audit/
│   ├── test-implementation/
│   ├── test-review/
│   ├── agent-workflow-core/    ← Shared core (JSON Schema)
│   └── test-plan-template/
│
├── commands/                   ← 4 fallback
│   ├── audit-tests.md
│   ├── implement-tests.md
│   ├── review-tests.md
│   └── run-tests.md
│
├── context/                    ← Standards + overlays
│   ├── testing-standards.md
│   ├── react-testing.md
│   ├── java-testing.md
│   └── js-ts-testing.md
│
└── plans/                      ← Примеры артефактов
    └── tests-audit-example/
```

---

> **Принцип:** GigaTest — самостоятельный продукт. GigaCraft — отдельный продукт. Мост — через interoperability, не через слияние. Два столпа полного цикла разработки.
