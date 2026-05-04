# Архитектура GigaTest

> Версия: 2.0 | Дата: 2026-05-04
> Архитектура системы с зависимостями компонентов и потоками данных.

---

## 1. Обзор проектирования

GigaTest — это **skills-first** расширение для структурированного тестирования в Qwen Code. Пользователи описывают задачи естественным языком; навык-маршрутизатор направляет в нужную стадию процесса; автономные агенты выполняют работу через общий конечный автомат.

```
Пользователь (естественный язык)
        │
        ▼
    ┌────────────────────┐
    │  QWEN.md (вход)    │  ← Загружает: стандарты, маршрутизатор, ядро
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │  using-gigatest    │  ← Анализ интента → маршрутизация
    └────────┬───────────┘
             │
    ┌────────┼────────┬─────────┬──────────┬───────────┐
    ▼        ▼        ▼         ▼          ▼           ▼
 test-    test-     test-     test-     test-      convention-
 audit    impl      review    verify    strategy   discover/review
    │        │        │         │          │           │
    └───┬────┴────────┴────┬────┴──────────┴─────┬─────┘
        ▼                  ▼                     ▼
 ┌─────────────────────────────────────────────────────────┐
 │              agent-workflow-core (W0-W11)               │
 │  Конечный автомат · Выбор задач · Загрузка конвенций    │
 │  Определение стека · Двойная документация (JSON+MD)     │
 └────────────────────┬────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   test-plan-   context/       JSON-схемы
   template     оверлеи        (валидация)
```

---

## 2. Модели слоёв

Архитектура работает в 4 слоях:

| Слой | Компоненты | Назначение |
|------|-----------|-----------|
| **L0 — Вход** | `QWEN.md`, `qwen-extension.json` | Регистрация расширения, первоначальная загрузка контекста |
| **L1 — Маршрутизация** | `skills/using-gigatest/` | Анализ интента, диспетчеризация навыков |
| **L2 — Навыки** | 9 skills в `skills/` | Методология: процесс, правила, условия выхода для каждой стадии |
| **L3 — Инфраструктура** | `context/`, `skills/agent-workflow-core/`, схемы, `agents/` | Конечный автомат, стековые оверлеи, JSON Schema, профили агентов |

### Поток выполнения

```
L0: Запрос пользователя запускает загрузку контекста QWEN.md
  ↓
L1: using-gigatest анализирует интент, выбирает навык
  ↓
L2: Выбранный навык загружает свою методологию
  ↓
L3: agent-workflow-core предоставляет конечный автомат, выбирает задачу, выполняет
  ↓
L3: Контекстный оверлей предоставляет правила тестирования для данного стека
  ↓
L2: Навык выполняет работу, обновляет состояние, перегенерирует test-plan.md
  ↓
L2: Навык выводит результат, останавливается (или продолжает следующую итерацию)
```

---

## 3. Основные компоненты

### 3.1 Конечный автомат (`agent-workflow-core`)

Универсальный оркестратор. Все остальные навыки зависят от него. Предоставляет:

| Концепция | Раздел | Описание |
|-----------|-------|----------|
| **W0 — Принципы** | §W0.1-W0.5 | Атомарность, Наблюдаемость, Явный контекст, Обратимость, Двойная документация |
| **W1 — Структура состояния** | §W1 | `.gigacode/plans/<тип>-<дата>/` с `agent-state.json` + `test-plan.md` |
| **W2 — Итерация** | §W2 | Жёсткий жизненный цикл: одна задача за итерацию |
| **W3 — Память** | §W3 | Знания, ограничения, контрольные суммы файлов, правила, журнал истории |
| **W4 — Передача** | §W4 | Передача состояния между агентами/сессиями |
| **W5 — Логирование** | §W5 | Стандарт вывода `[AGENT]` |
| **W6 — Предполётная проверка** | §W6 | Валидация перед стартом |
| **W8 — Синхронизация** | §W8 | Перегенерация test-plan.md, SHA-256 |
| **W10 — Определение стека** | §W10 | Автоопределение стека, загрузка оверлея |
| **W11 — Загрузка конвенций** | §W11 | Приоритет: собственные > оверлей > базовые |

### 3.2 Инвентарь навыков

| Навык | Директория | Назначение |
|-------|-----------|-----------|
| `using-gigatest` | `skills/using-gigatest/` | Маршрутизатор |
| `test-audit` | `skills/test-audit/` | Аудит покрытия, генерация плана |
| `test-implementation` | `skills/test-implementation/` | Написание тестов итеративно |
| `test-review` | `skills/test-review/` | Ревью качества |
| `test-verification` | `skills/test-verification/` | Запуск тестов, сбор доказательств |
| `test-strategy` | `skills/test-strategy/` | Определение стратегии |
| `convention-discovery` | `skills/convention-discovery/` | Сканирование конвенций |
| `convention-review` | `skills/convention-review/` | Валидация конвенций |
| `test-plan-template` | `skills/test-plan-template/` | Генерация test-plan.md |

### 3.3 Профили агентов

| Агент | Роль | Основной навык |
|-------|------|---------------|
| test-auditor | Находит пробелы, оценивает качество | test-audit |
| test-implementer | Пишет тесты | test-implementation |
| test-reviewer | Проверяет качество | test-review |
| test-verifier | Запускает тесты | test-verification |
| test-strategist | Определяет стратегию | test-strategy |
| convention-discoverer | Извлекает конвенции | convention-discovery |

### 3.4 Контекстные оверлеи

Расположение: `context/`

| Оверлей | Файл | Стек | Ключевые инструменты |
|---------|------|------|---------------------|
| **Базовый** | `testing-standards.md` | (все) | Q1-Q9, AAA, запрещённые паттерны |
| **React** | `react-testing.md` | React + RTL | Testing Library, Jest/Vitest, MSW, userEvent |
| **Java** | `java-testing.md` | Java + Spring Boot | JUnit 5, Mockito, @WebMvcTest, @DataJpaTest, WireMock |

---

## 4. Поток данных

### 4.1 Жизненный цикл плана

```
1. audit/strategy сканирует → определяет пробелы
2. Создаёт agent-state.json + test-plan.md
3. implementation выбирает pending задачу → пишет тест → обновляет JSON → перегенерирует MD
4. review (опционально) проверяет качество
5. verification запускает тесты → done/skipped
6. Цикл пока progress_percent != 100
```

### 4.2 Поток определения стека

```
1. Сканирование файлов проекта (package.json, pom.xml, build.gradle)
2. Сопоставление с таблицей W10.2
3. Загрузка соответствующего оверлея
4. Fallback: testing-standards.md если стек не определён
```

---

## 5. Архитектура JSON-схем

### 5.1 Базовая схема (`agent-state-schema.json`)

Корневые поля: `version`, `agent`, `project`, `session`, `plan`, `memory`

### 5.2 Тестовое расширение (`test-plan-state-schema.json`)

- `target_stack` — enum: react, java, multi-stack
- `test_framework` — enum: jest, vitest, junit, testng, unknown
- `context_overlay` — enum: react-testing.md, java-testing.md, ""
- `audit_summary` — {total_targets, full_coverage, partial_coverage, invalid_coverage, no_coverage}

---

## 6. Определение стека (W10)

| Присутствует файл | Определён стек | Загружен оверлей |
|-------------------|---------------|------------------|
| `package.json` + react | React | react-testing.md |
| `pom.xml` / `build.gradle` / `*.java` | Java | java-testing.md |
| Ничего | Неизвестен | testing-standards.md (fallback) |

**Мультистек:** agent собирает расширения, `target_stack = "multi-stack"`.

---

## 7. Система ворот качества (Q1-Q9)

### Уровень 1 — REQUIRED (блокирующие)

| ID | Критерий |
|----|----------|
| Q1 | Нет ассертов на внутреннее состояние |
| Q2 | Ассерты проверяют наблюдаемое поведение |
| Q3 | Один тест = один сценарий |
| Q5 | Нет излишних моков |
| Q6 | Happy path покрыт |

### Уровень 2 — RECOMMENDED

| ID | Критерий |
|----|----------|
| Q4 | Названия тестов описывают поведение |
| Q7 | Покрытие обработки ошибок |
| Q9 | Покрытие веток |

### Уровень 3 — OPTIONAL

| ID | Критерий |
|----|----------|
| Q8 | Async обработано корректно |

---

## 8. Структура директории (полная)

```
gigatest/
├── qwen-extension.json
├── QWEN.md
├── README.md
├── package.json
│
├── skills/                          # 9 навыков (9 директорий, 12 файлов)
│   ├── using-gigatest/SKILL.md
│   ├── test-audit/SKILL.md
│   ├── test-implementation/SKILL.md
│   ├── test-review/SKILL.md
│   ├── test-verification/SKILL.md
│   ├── test-strategy/SKILL.md
│   ├── agent-workflow-core/
│   │   ├── SKILL.md
│   │   ├── agent-state-schema.json
│   │   └── test-plan-state-schema.json
│   ├── test-plan-template/
│   │   ├── SKILL.md
│   │   └── test-plan-template.md
│   ├── convention-discovery/
│   │   ├── SKILL.md
│   │   └── convention-overlay-schema.json
│   └── convention-review/
│       └── SKILL.md
│
├── agents/                          # 6 профилей агентов
│   ├── test-auditor.md
│   ├── test-implementer.md
│   ├── test-reviewer.md
│   ├── test-verifier.md
│   ├── test-strategist.md
│   └── convention-discoverer.md
│
├── commands/                        # 5 fallback-команд
│   ├── audit-tests.md
│   ├── implement-tests.md
│   ├── review-tests.md
│   ├── run-tests.md
│   └── strategy-tests.md
│
├── context/                         # 3 файла: базовый + 2 оверлея
│   ├── testing-standards.md
│   ├── react-testing.md
│   └── java-testing.md
│
├── plans/
│   └── tests-audit-example/
│       └── README.md
│
├── tools/
│   ├── validate-state.js
│   └── generate-report.js
│
├── docs/
│   └── ONBOARDING.md
│
└── dev/
    ├── README.md
    ├── ARCHITECTURE.md
    ├── PRODUCT-VISION.md
    ├── SPEC.md
    ├── PRODUCT-READINESS-MATRIX.md
    ├── COMPONENT-INVENTORY.md
    └── backlog.yaml
```

---

## 9. Критические инварианты

1. `agent-state.json` — единый источник правды
2. Одна задача за итерацию (W2.1)
3. Навыки — публичный API
4. Приоритет конвенций: собственные > оверлей > базовые
5. `.gigacode/` НЕ коммитится
6. Определение стека по расширению исходного файла
7. test-plan.md перегенерируется после КАЖДОГО изменения JSON (W8.2)
