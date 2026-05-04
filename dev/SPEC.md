# GigaTest — Техническая спецификация

> Версия: 2.0 | Дата: 2026-05-04
> Полная техническая спецификация для агентной разработки.
> Это источник правды для деталей реализации.

---

## §1 — Определение продукта

GigaTest — это **skills-first расширение для структурированного тестирования** в Qwen Code. Заменяет ad-hoc написание тестов структурированным процессом, управляемым конечным автоматом:

1. **Аудит** существующего покрытия тестами → генерация приоритизированного плана
2. **Реализация** тестов итеративно (одна задача за итерацию)
3. **Ревью** качества тестов по чеклисту
4. **Верификация** — тесты действительно проходят

**Ключевое отличие:** Планы состоят из двух файлов (`agent-state.json` + `test-plan.md`), коммитящихся в git. Diff виден в PR. Состояние сессии сохраняется между разговорами.

**Поддерживаемые стеки:** React + RTL, Java + Spring Boot. Фреймворк stack-agnostic по дизайну — при необходимости можно определить собственные конвенции через `convention-discovery`.

---

## §2 — Принципы архитектуры

### S1: Skills-first
Навыки — публичный интерфейс. Пользователи описывают задачи естественным языком → маршрутизатор определяет стадию процесса → навык ведёт агента. Профили агентов — деталь реализации, не точка входа.

### S2: Управляемость состоянием
Всё состояние агента хранится в `agent-state.json`, валидируется по JSON Schema. Конечный автомат обеспечивает атомарность (одна задача/итерация), наблюдаемость (верифицируемые результаты) и обратимость (без изменений продакшн-кода без разрешения).

### S3: Двойная документация
После каждого изменения JSON-состояния, `test-plan.md` перегенерируется из шаблона. JSON → машиночитаемый. MD → человеко-читаемый, git-diff friendly.

### S4: Стековые оверлеи
Базовый `testing-standards.md` применяется ко всем стекам. Стеко-специфичные оверлеи (структура R1-R9) накладываются сверху. Собственные конвенции проекта имеют приоритет над обоими.

---

## §3 — Спецификация навыков

### 3.1 Контракт навыка

Каждый навык ДОЛЖЕН реализовывать:
- `name` (front-matter)
- `description` (front-matter) — используется маршрутизатором для сопоставления интентов
- Методологию рабочего процесса (этапы процесса, правила, условия выхода)
- Условия выхода, валидирующие завершение

### 3.2 Инвентарь навыков

| Навык | Условие входа | Условие выхода | Побочные эффекты |
|-------|--------------|----------------|-----------------|
| `using-gigatest` | Пользователь описывает любую задачу тестирования | `[ROUTING] selected skill: <name>` + `[ROUTING] reason: <why>` | Нет — маршрутизирует в другие навыки |
| `test-audit` | «аудит», «проверить покрытие», «какие у нас тесты» | Сводка аудита с оценкой покрытия + предупреждения, создана директория плана | Создаёт `.gigacode/plans/tests-audit-<дата>/` |
| `test-implementation` | «написать тест», «реализовать», «следующая задача» | Файл теста создан, тест проходит (или падает с диагностикой), состояние обновлено | Пишет файл теста, обновляет JSON, перегенерирует MD |
| `test-review` | «ревью тестов», «проверить качество» | Отчёт находок с проблемами по строгости | Только чтение — без изменения файлов |
| `test-verification` | «запустить тесты», «проходят ли» | Таблица доказательств с реальным выводом тестов | Запускает команду тестов, читает вывод |
| `test-strategy` | Нет тестов, «как тестировать» | Документ стратегии с целями и подходом | Может создать начальный план |
| `convention-discovery` | «найти конвенции», «какой стиль» | Созданы `project-conventions.json` + `.md` | Создаёт `.gigacode/conventions/` |
| `convention-review` | «ревью конвенций» | Одобренные/отклонённые конвенции | Обновляет файлы конвенций |
| `test-plan-template` | (внутренний — перегенерирует MD из JSON) | Markdown-вывод, соответствующий шаблону | Генерирует `test-plan.md` |

### 3.3 Логика маршрутизатора (`using-gigatest`)

```
Вход: запрос пользователя на естественном языке

1. Анализ ключевых слов интента:
   - «аудит», «покрытие», «какие тесты» → test-audit
   - «написать тест», «реализовать», «следующая задача» →
     - Если план существует → test-implementation
     - Если плана нет → test-audit, ЗАТЕМ test-implementation
   - «ревью тестов», «качество» → test-review
   - «запустить тесты», «проходят», «верифицировать» → test-verification
   - «стратегия», «как тестировать» → test-strategy
   - «конвенции», «стиль» → convention-discovery

2. Вывод:
   [ROUTING] selected skill: <имя>
   [ROUTING] reason: <обоснование>

3. Вызов навыка через @./skills/<имя>/SKILL.md
```

---

## §4 — Спецификация конечного автомата

### 4.1 Структура директории

```
.gigacode/plans/<тип-задачи>-<ГГГГ-ММ-ДД>/
├── agent-state.json    ← источник правды, валидируется по JSON Schema
└── test-plan.md        ← перегенерируется из JSON после каждого изменения
```

Маппинг типа задачи (W6.1):
- `test-auditor` → `tests-audit`
- `test-implementer` → `tests-impl`
- `test-reviewer` → `tests-review`
- `test-strategist` → `tests-strategy`
- `test-verifier` → `tests-verify`
- `convention-discoverer` → `conventions`

### 4.2 Алгоритм выбора задачи (W1.4)

```
1. Фильтр plan.items[]:
   assigned_agent == agent.type
   AND status == "pending"
   AND все зависимости ∈ {done, skipped}

2. Если пусто → [AGENT] no pending tasks found → стоп

3. Сортировка: priority desc (critical → high → medium → low), затем id asc (лексикографически)

4. Выбор первого → status = "in_progress", started_at = сейчас

5. Установка session.checkpoint → {iteration: prev+1, plan_item_id: <id>, description}

6. Добавление в memory.history → {iteration, action: "started", timestamp: сейчас}

7. Сохранить JSON → перегенерировать MD → начать выполнение
```

### 4.3 Состояния задач

| Состояние | Переход | Значение |
|-----------|---------|----------|
| `pending` | Начальное состояние | Задача не запущена |
| `in_progress` | Выбрана алгоритмом | Выполняется сейчас |
| `done` | Успешное выполнение | Задача завершена |
| `skipped` | Зависимость упала или неприменимо | Задача пропущена |
| `blocked` | Выполнение упало, нужно внешнее действие | Задача заблокирована |

### 4.4 Логика возобновления плана (W10.5)

```
1. Найти директории .gigacode/plans/<тип-задачи>-*/
2. Загрузить agent-state.json из каждой
3. Сортировка: session.last_updated DESC, затем имя директории DESC
4. Выбор: paused → active → если все done → создать новый

5. Если checkpoint.plan_item_id != null → возобновить in_progress задачу
6. Синхронизировать test-plan.md (сравнение хешей W8.2) → продолжить
```

---

## §5 — Контракты JSON-схем

### 5.1 Строгий режим

Все схемы используют `additionalProperties: false`. Это означает **любое поле, не определённое явно в схеме, будет отклонено**. Это предотвращает дрейф схемы и ловит опечатки на раннем этапе.

### 5.2 Ключевые типы

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `agent.type` | enum | "test-auditor", "test-implementer", "test-reviewer", "test-strategist", "test-verifier" |
| `session.status` | enum | "active", "paused", "completed", "blocked" |
| `session.mode` | enum | "audit", "implementation", "review", "verification", "strategy", "refactor", "maintenance", "research" |
| `session.content_hash` | строка\|null | SHA-256 содержимого JSON |
| `plan.items[].status` | enum | "pending", "in_progress", "done", "skipped", "blocked" |
| `plan.items[].priority` | enum | "low", "medium", "high", "critical" |
| `plan.items[].coverage_status` | enum | "full", "partial", "invalid", "missing" |
| `plan.items[].type` | enum | 12 типов включая "test", "design", "implementation" и т.д. |
| `plan.items[].subtype` | enum | "ui_test", "unit_test", "integration_test", "hook_test", "audit", "strategy", "" |
| `plan.meta.progress_percent` | число | 0–100 |
| `test_plan.target_stack` | enum | "react", "java", "multi-stack" |
| `test_plan.test_framework` | enum | "jest", "vitest", "junit", "testng", "unknown" |
| `test_plan.context_overlay` | enum | "react-testing.md", "java-testing.md", "" |

### 5.3 quality_gate_item

```json
{
  "id": "Q1",
  "name": "Нет ассертов на внутреннее состояние",
  "level": "required" | "recommended" | "optional",
  "satisfied": true | false,
  "note": "...",
  "estimation_method": "llm" | "instrumented"
}
```

---

## §6 — Спецификация контекстных оверлеев

### 6.1 Структура оверлея

Каждый оверлей ДОЛЖЕН реализовывать секции R1–R9:

| Секция | Содержание |
|--------|-----------|
| R1 | Классификация кода — какие типы кода есть в стеке |
| R2 | Алгоритм принятия решений — выбор типа теста |
| R3 | Формат журнала решений |
| R4 | Требования к качеству тестов |
| R5 | Структура тестов — примеры кода |
| R6 | Мокинг — что мокать, выбор библиотек |
| R7 | Организация файлов |
| R8+ | Стеко-специфичные конвенции |

### 6.2 Модель приоритетов

```
собственные конвенции проекта  >  оверлей стека  >  testing-standards.md
```

### 6.3 Определение стека (W10)

| Совпадение файла | Определён стек | Загружен оверлей |
|-----------------|---------------|------------------|
| `package.json` + `react` | React | react-testing.md |
| `pom.xml` / `build.gradle` / `*.java` | Java | java-testing.md |
| Ничего | Неизвестен | testing-standards.md (fallback) |

---

## §7 — Система ворот качества

### 7.1 Универсальный чеклист (Q1–Q9)

| ID | Название | Уровень | Всегда применяется |
|----|----------|---------|-------------------|
| Q1 | Нет ассертов на внутреннее состояние | required | ✅ |
| Q2 | Ассерты проверяют наблюдаемое поведение | required | ✅ |
| Q3 | Один тест = один сценарий | required | ✅ |
| Q4 | Названия тестов описывают поведение | recommended | ✅ |
| Q5 | Нет излишних моков | required | ✅ |
| Q6 | Happy path покрыт | required | ✅ |
| Q7 | Покрытие обработки ошибок | recommended | контекстно |
| Q8 | Асинхронное поведение обработано корректно | optional | только для async |
| Q9 | Покрытие веток | recommended | всегда |

### 7.2 Скоринг

```
IF любой required НЕ выполнен → coverage_status = "partial"
ELSE → coverage_status = "full" (с warnings за невыполненные recommended)
```

### 7.3 Правила авто-понижения

| Условие | Действие |
|---------|----------|
| Тест только `toMatchSnapshot()` без behavioral assertions | `coverage_status = "invalid"` |
| UI-компонент без `userEvent` | `coverage_status = "partial"` |
| Сервис с ветвлением и < 3 тестовых блоков | `coverage_status = "partial"` |
| HTTP-эндпоинт без интеграционного теста | `coverage_status = "partial"` |

---

## §8 — Обнаружение конвенций

### 8.1 Цели сканирования

| Цель | Оценка уверенности |
|------|-------------------|
| Тестовые файлы (70%+) | High |
| Тестовые файлы (30–69%) | Medium |
| Тестовые файлы (<30%) | Low |
| Файлы конфигурации (jest.config.*, pom.xml, build.gradle) | High если документировано |
| Документация команды (CONTRIBUTING.md, CODE_STYLE.md) | High если документировано |

### 8.2 Вывод

Два файла в `.gigacode/conventions/`:
1. `project-conventions.json` — машиночитаемый
2. `project-conventions.md` — человеко-читаемое зеркало

### 8.3 Процесс ревью

`convention-review` проверяет:
1. Нет противоречий с testing-standards §1
2. Нет правил «тестировать внутренности»
3. Полнота (именование, структура, мокинг, запрещённые паттерны)

Вывод: `APPROVED` | `CHANGES_REQUESTED` | `NEEDS_REVISION`

---

## §9 — CLI-утилиты

| Утилита | Назначение |
|---------|-----------|
| `validate-state.js` | Валидирует agent-state.json по JSON Schema |
| `generate-report.js` | Генерирует test-plan.md из agent-state.json |

Обе используют `ajv` + `ajv-formats`.

---

## §10 — Версионирование

| Компонент | Текущая версия |
|-----------|---------------|
| agent-workflow-core (SKILL.md) | 2.9 |
| testing-standards.md | 2.0 |
| agent-state-schema.json | 2.8 |
| Расширение GigaTest | 0.1.0 |

---

## Приложение A — Подсчёт файлов

| Директория | Файлов | Типы |
|-----------|--------|------|
| `skills/` | 12 | SKILL.md (9), JSON Schema (3) |
| `agents/` | 6 | MD файлы |
| `commands/` | 5 | MD файлы |
| `context/` | 3 | testing-standards.md + 2 оверлея |
| `tools/` | 2 | JS файлы |
| `plans/` | 1 | пример MD |
| `docs/` | 1 | MD файл |
| `dev/` | 7 | MD + YAML |
| **Корень** | 4 | json, json, md, md |
| **Итого** | **41+** |

---

## Приложение B — Маппинг Агент-Навык

| Профиль агента | Назначенный навык |
|---------------|-------------------|
| test-auditor | test-audit |
| test-implementer | test-implementation |
| test-reviewer | test-review |
| test-verifier | test-verification |
| test-strategist | test-strategy |
| convention-discoverer | convention-discovery |

Примечание: `convention-discoverer` НЕ указан в enum `agent.type` в `agent-state-schema.json`. Это известное упущение.
