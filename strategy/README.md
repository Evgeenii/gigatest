# Strategy — Навигация

> Версия: 1.7 | Дата: 2026-04-19
>
> **Изменения v1.7:** Добавлены два новых спецификационных документа:
> `ARCHITECTURE-SPEC.md` (архитектурный аудит: структурные риски, edge cases, 6 противоречий, P0–P2 задачи)
> и `PROMPT-QUALITY-SPEC.md` (линвистический аудит промтов: consistency, DRY-volations, precision, conciseness, P0–P2 задачи).
> Обновлена таблица файлов и порядок чтения.
>
> **Назначение:** Индекс стратегических документов GigaCraft ↔ GigaTest.
> Все файлы — human-readable Markdown. Machine-readable бэклог — `backlog.yaml`.

---

### Файлы

| Файл | Для кого | Что внутри |
|------|----------|------------|
| [`VISION.md`](VISION.md) | Все | Видение продуктов, JTBD-разделение, why two products, principles |
| [`IMPLEMENTATION-SPEC.md`](IMPLEMENTATION-SPEC.md) | Агенты, Dev | **SDD**: технические конвенции, паттерны имплементации, чек-листы готовности |
| [`ARCHITECTURE-SPEC.md`](ARCHITECTURE-SPEC.md) | Архитекторы, Dev | **Аудит**: структурные риски, edge cases, логические противоречия |
| [`PROMPT-QUALITY-SPEC.md`](PROMPT-QUALITY-SPEC.md) | Техписатели, Ревьюеры | **Аудит промтов**: consistency, DRY, precision, conciseness |
| [`BLOCK-1-GIGACRAFT-BRIDGE.md`](BLOCK-1-GIGACRAFT-BRIDGE.md) | GigaCraft dev | Микро-доработки в GigaCraft для моста (awareness + cross-workflow trigger) |
| [`BLOCK-2-GIGATEST-GROWTH.md`](BLOCK-2-GIGATEST-GROWTH.md) | GigaTest dev | Стратегия развития GigaTest: prod-ready → overlays → тулинг → презентация → convention discovery |
| [`READINESS-MATRIX.md`](READINESS-MATRIX.md) | Все | Матрица готовности GigaTest — оценки по 10 измерениям, гэпы, дорожная карта |
| [backlog.yaml](backlog.yaml) | Agents, CI | Machine-readable бэклог с приоритетами, статусами, зависимостями |
| 📦 [`archive/`](archive/) | Все | Исторические документы (аналитика до Phase 0, старые черновики) |

### Документация (docs/)

| Файл | Для кого | Что внутри |
|------|----------|------------|
| [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) | Новые пользователи | 4 сценария, ≤ 10 шагов, FAQ |
| [`docs/DEMO.md`](../docs/DEMO.md) | Презентация | Сценарий демо за 15 минут |
| [`docs/COMPARISON.md`](../docs/COMPARISON.md) | Принятие решения | Сравнение GigaTest с альтернативами |
| [`docs/METRICS.md`](../docs/METRICS.md) | Продукт, аналитика | Метрики успеха: North Star, формулы |
| [`docs/TEMPLATE-SYNTAX.md`](../docs/TEMPLATE-SYNTAX.md) | Авторы шаблонов | Спецификация Handlebars-like синтаксиса |
| [`docs/CONVENTION-DISCOVERY.md`](../docs/CONVENTION-DISCOVERY.md) | Новые пользователи Phase 5 | Convention Discovery: как сканировать, использовать, обновлять |

---

## Как пользоваться

1. **Новым контрибьюторам** — начать с `VISION.md`, потом `BLOCK-2-GIGATEST-GROWTH.md`
2. **Агентам-имплементерам (архитектура)** — `ARCHITECTURE-SPEC.md` → `IMPLEMENTATION-SPEC.md` → `backlog.yaml`
3. **Агентам-имплементерам (prompt quality)** — `PROMPT-QUALITY-SPEC.md` → `IMPLEMENTATION-SPEC.md` → `backlog.yaml`
4. **Агентам-имплементерам (Phase 0–5)** — `IMPLEMENTATION-SPEC.md` → `backlog.yaml` → чек-лист готовности (§11)
5. **GigaCraft-разработчикам** — `BLOCK-1-GIGACRAFT-BRIDGE.md`
6. **Агентам/CI** — `backlog.yaml` (валидация статусов, зависимостей)
7. **Аналитика** — `VISION.md` + `READINESS-MATRIX.md` (актуальная)

---

### Рекомендованный порядок чтения

```
VISION.md        ← ЧТО и ЗАЧЕМ (видение, JTBD, killer features)
     ↓
ARCHITECTURE-SPEC.md  ← СТРУКТУРНЫЕ РИСКИ (архитектурный аудит)
     ↓
PROMPT-QUALITY-SPEC.md ← КАЧЕСТВО ПРОМТОВ (лингвистический аудит)
     ↓
BLOCK-2-...      ← КОГДА (фазы, дорожная карта, включая Phase 5)
     ↓
backlog.yaml     ← КАКИЕ задачи (machine-readable бэклог)
     ↓
IMPLEMENTATION-SPEC.md  ← КАК (конвенции, паттерны, чек-листы)
```

---

## Принципы версионирования

- Изменения в strategy — через diff. Не перезатирать целиком.
- Каждый файл содержит header с версией и датой последнего изменения.
- Статус задач ведётся в `backlog.yaml` (единый source of truth).
