# BLOCK-1-GIGACRAFT-BRIDGE.md — Спецификация моста GigaCraft ↔ GigaTest

> Версия: 2.0 | Дата: 2026-04-18
> Предыдущая версия: 1.0 (2026-04-17)
>
> **Изменения v2.0:** Добавлены точные спецификации контракта для каждого уровня,
> acceptance criteria, формат данных, диаграммы взаимодействия, условия блокировки.

---

## Принцип: Awareness, не Dependency

> GigaTest не зависит от GigaCraft. GigaCraft не зависит от GigaTest.
> Мост — это опциональный слой удобства, который активируется только если оба продукта
> присутствуют в проекте.

**Без GigaCraft** → GigaTest работает полностью автономно. Нет деградации.
**Без GigaTest** → GigaCraft работает полностью автономно. Нет деградации.
**С обоими** → активируется один или несколько уровней моста.

---

## Приоритет реализации

> ⚠️ Мост реализуется **только после завершения Phase 0 GigaTest**.
> До этого момента — только документирование контракта.

---

## Уровень 1 — Awareness (Testing Reminder)

### Назначение

Добавить напоминание в GigaCraft о запуске `/audit-tests` после завершения имплементации.
Минимальная интеграция: только текстовое напоминание, без кода, без автоматизации.

### Где реализуется

**В GigaCraft** (не в GigaTest):
- Файл: `gigacraft-0.1.0/skills/verification-before-completion/SKILL.md`
- Место: в конце раздела «Финальная верификация»

### Спецификация изменения

Добавить блок:

```markdown
## Testing Reminder

If the completed plan touched any of the following:
- New API endpoints
- New business logic (service, handler, repository)
- New data models or schema changes
- Modified validation rules

→ Consider running `/audit-tests` (GigaTest) to verify test coverage
  before declaring the feature complete.

This is a reminder, not a blocker. GigaTest is optional.
```

### Условия триггера

| Условие | Показывать напоминание |
|---------|----------------------|
| Plan содержит новые endpoints | ✅ Да |
| Plan содержит новую бизнес-логику | ✅ Да |
| Plan содержит изменения данных | ✅ Да |
| Plan содержит только документацию | ❌ Нет |
| Plan содержит только config | ❌ Нет |

### Acceptance Criteria

- [ ] Блок добавлен в `gigacraft-0.1.0/skills/verification-before-completion/SKILL.md`
- [ ] Напоминание — в конце стадии verify, не блокирует completion
- [ ] Не упоминает `/audit-tests` как обязательный шаг
- [ ] GigaTest остаётся опциональным

### Зависимости

- GigaCraft `gigacraft-0.1.0` должен быть доступен
- GigaTest Phase 0 должен быть завершён (чтобы `/audit-tests` реально работал)

---

## Уровень 2 — Cross-workflow Trigger (GigaCraft Plan Discovery)

### Назначение

GigaTest умеет читать планы GigaCraft и использовать список затронутых файлов
(`touched_files[]`) как seed для аудита. Это ускоряет аудит: агент знает с чего начать.

### Где реализуется

**В GigaTest** (не в GigaCraft):
- Файл: `gigatest-0.1.0/skills/test-audit/SKILL.md`
- Место: в фазе Discovery (Phase 1 аудита)

### Контракт данных

#### GigaCraft Plan Format

GigaTest читает файлы из `.gigacraft/plans/*/` и извлекает:

```yaml
# Ожидаемая структура GigaCraft plan (минимальная):
plan:
  items:
    - id: string
      touched_files:        # ← ключевое поле
        - path: string      # относительный путь от корня проекта
          change_type: "added" | "modified" | "deleted"
```

#### Fallback при отсутствии GigaCraft

Если `.gigacraft/plans/` не существует:
```
[AGENT] GigaCraft plans not found at .gigacraft/plans/
[AGENT] Proceeding with standard discovery (no seed files)
```

Нет ошибки. Нет остановки. Стандартный аудит.

#### Алгоритм Discovery с seed

```
1. Проверить существование .gigacraft/plans/
2. Если существует:
   a. Найти самый последний план (по дате в имени директории)
   b. Извлечь все touched_files[] со status != "deleted"
   c. Использовать как приоритетный список для аудита
   d. Логировать: [AGENT] seed files loaded from GigaCraft: N files
3. Если не существует:
   d. Стандартный discovery по всему проекту
```

### Спецификация изменения в test-audit/SKILL.md

Добавить в Phase 1 (Discovery) подраздел:

```markdown
### GigaCraft Plan Discovery (optional)

If `.gigacraft/plans/` exists:
1. Find the most recent plan directory (by date in directory name)
2. Read plan files and extract `touched_files[]` where `change_type != "deleted"`
3. Use extracted paths as priority seed for audit scope
4. Log: `[AGENT] GigaCraft seed: N files loaded from .gigacraft/plans/<name>/`

If not found → proceed with standard project-wide discovery.
```

### Acceptance Criteria

- [ ] Раздел добавлен в `skills/test-audit/SKILL.md`
- [ ] Алгоритм корректно обрабатывает отсутствие `.gigacraft/plans/`
- [ ] Формат `touched_files[]` задокументирован
- [ ] Логирование: `[AGENT] GigaCraft seed: N files` при наличии планов
- [ ] Логирование: `[AGENT] GigaCraft plans not found, using standard discovery` при отсутствии
- [ ] GigaTest работает идентично без GigaCraft

### Зависимости

- GigaTest Phase 0 завершён
- GigaCraft должен сохранять `touched_files[]` в своих планах (или это нужно добавить в GigaCraft)
- Контракт формата `touched_files[]` согласован с командой GigaCraft

---

## Уровень 3 — Shared Standards (постоянный, без фазы)

### Назначение

`context/testing-standards.md` — единственный артефакт, разделяемый между продуктами.
Это базовые принципы тестирования (behavior over implementation, AAA, no duplication),
которые должны быть идентичны в обоих продуктах.

### Стратегия синхронизации

**Рекомендуемый подход:** Git subtree или manual copy с явной версией.

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| Git symlink | Автоматическая синхронизация | Работает только в одном репозитории |
| Manual copy + version | Простота, независимость | Нужна дисциплина при обновлениях |
| Git subtree | Отдельный репозиторий стандартов | Сложность инфраструктуры |

**Выбор:** Manual copy с явной версией в заголовке файла.

### Спецификация версионирования

Каждый файл `testing-standards.md` должен содержать:

```markdown
> Версия: X.Y | Синхронизирован: YYYY-MM-DD
> Мастер-копия: gigacraft-0.1.0/context/testing-standards.md
> (или: gigatest-0.1.0/context/testing-standards.md)
```

### Процедура обновления

1. Изменение в одном продукте → PR с обновлением версии и даты
2. PR description содержит: "Требует синхронизации в [другой продукт]"
3. Второй PR в другой продукт с идентичным содержимым
4. Оба PR указывают на общий issue/задачу

### Acceptance Criteria

- [ ] `context/testing-standards.md` содержит версию и дату синхронизации
- [ ] Содержимое идентично в обоих продуктах
- [ ] Процедура обновления задокументирована

### Зависимости

- Нет технических зависимостей
- Требует договорённости с командой GigaCraft

---

## Что НЕ входит в мост — никогда

| Запрещено | Причина |
|-----------|---------|
| Общие агенты | Разные JTBD, разный контекст |
| Общие skills | Разные workflow, разные правила |
| Общий root prompt | Cognitive overload, blast radius |
| Общая версия | Независимые релизные циклы |
| Зависимости в коде | Blast radius при обновлениях |
| Автоматический запуск тестов | Только явный запрос пользователя |
| Shared agent-state.json | Разные жизненные циклы сессий |
| Общий `.gigacode/` и `.gigacraft/` | Конфликт namespace |

---

## Диаграмма взаимодействия

```
┌──────────────────────┐         ┌──────────────────────┐
│      GigaCraft        │         │       GigaTest        │
│                      │         │                       │
│  verification skill  │         │  test-audit skill     │
│  ┌────────────────┐  │         │  ┌─────────────────┐  │
│  │ Testing        │  │  Level  │  │ GigaCraft Plan  │  │
│  │ Reminder       │  │   1     │  │ Discovery       │  │
│  │ (awareness)    │  │ ──────→ │  │ (optional seed) │  │
│  └────────────────┘  │         │  └─────────────────┘  │
│                      │         │                       │
│  context/            │  Level  │  context/             │
│  testing-standards   │   3     │  testing-standards    │
│  .md (v2.0)         │◄──────── │  .md (v2.0)          │
│                      │  sync   │                       │
└──────────────────────┘         └──────────────────────┘
          │                                 │
          └──────────────┬──────────────────┘
                         │
              .gigacraft/plans/        ← Level 2 data flow
              *.md (touched_files[])
```

---

## Roadmap реализации моста

| Уровень | После чего реализовывать | Effort |
|---------|--------------------------|--------|
| Уровень 3 (Shared Standards) | Сразу (нет блокеров) | XS |
| Уровень 1 (Awareness) | После GigaTest Phase 0 | XS |
| Уровень 2 (Cross-workflow) | После GigaTest Phase 1 + согласование контракта с GigaCraft | S |

---

## Open Questions

1. **Формат touched_files в GigaCraft** — GigaCraft сейчас сохраняет `touched_files[]`?
   Если нет — нужно договориться о добавлении этого поля в GigaCraft plan schema.

2. **Мастер-копия testing-standards** — в каком продукте хранится мастер?
   Предложение: GigaTest (как более широкий по охвату).

3. **Версионирование контракта** — если GigaCraft меняет формат планов,
   как GigaTest узнаёт об этом? Нужен changelog контракта.
