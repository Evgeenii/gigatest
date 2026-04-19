# Strategy — Навигация

> Версия: 1.6 | Дата: 2026-04-18
>
> **Изменения v1.6:** PHASE-5-CONVENTION-DISCOVERY.md удалён — весь контент интегрирован в BLOCK-2-GIGATEST-GROWTH.md Phase 5 секцию.
> Обновлены BLOCK-2 (v2.4) → полный контекст Phase 5: проблема, архитектура, workflow, риски, feasibility.
>
> **Назначение:** Индекс стратегических документов GigaCraft ↔ GigaTest.
> Все файлы — human-readable Markdown. Machine-readable бэклог — `backlog.yaml`.

---

### Файлы

| Файл | Для кого | Что внутри |
|------|----------|------------|
| [`VISION.md`](VISION.md) | Все | Видение продуктов, JTBD-разделение, why two products, principles |
| [`IMPLEMENTATION-SPEC.md`](IMPLEMENTATION-SPEC.md) | Агенты, Dev | **SDD**: технические конвенции, паттерны имплементации, чек-листы готовности |
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
2. **Агентам-имплементерам** — `IMPLEMENTATION-SPEC.md` → `backlog.yaml` → чек-лист готовности (§11)
3. **GigaCraft-разработчикам** — `BLOCK-1-GIGACRAFT-BRIDGE.md`
4. **Агентам/CI** — `backlog.yaml` (валидация статусов, зависимостей)
5. **Аналитика** — `VISION.md` + `READINESS-MATRIX.md` (актуальная)

---

### Рекомендованный порядок чтения

```
VISION.md        ← ЧТО и ЗАЧЕМ (видение, JTBD, killer features)
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
