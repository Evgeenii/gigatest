# Convention Discovery — Документация

> Версия: 1.0 | Дата: 2026-04-19
>
> **Назначение:** Как запустить автоматическое обнаружение конвенций проекта и использовать результаты при написании тестов.
>
> **Аудитория:** Разработчики, использующие GigaTest в проекте с существующими (но не задокументированными) конвенциями тестирования.

---

## Что такое Convention Discovery

Convention Discovery — это процесс **автоматического обнаружения** конвенций тестирования из существующего проекта:

- **Сканирует** тестовые файлы, конфиги, документацию команды, исходный код
- **Извлекает** закономерности: naming, structure, mocking, forbidden patterns
- **Создаёт** convention overlay — файл, который используют test-agent'ы при написании тестов

**Зачем:** Если в проекте уже есть тесты с принятыми стилями — нет смысла писать тесты «по-новому». Convention Discovery учит агента писать тесты в стиле проекта.

---

## Quick Start (5 шагов)

| Шаг | Действие |
|-----|----------|
| 1 | Откройте проект в Qwen Code |
| 2 | Напишите: **«найди конвенции тестирования в этом проекте»** |
| 3 | `convention-discoverer` сканирует тесты, конфиги, документацию, код |
| 4 | Получите `.gigacode/conventions/project-conventions.md` и `.gigacode/conventions/project-conventions.json` |
| 5 | Проверьте результат: **«проведи ревью обнаруженных конвенций»** — запустится validation |

После review и approve конвенции автоматически загружаются через W11 при начале работы любого test-агента.

---

## Как использовать discovered conventions

### Автоматически

Когда конвенции обнаружены и approved, они используются **автоматически** через W11 (Convention Loading Protocol):

```
[AGENT] conventions: loaded custom conventions from .gigacode/conventions/project-conventions.json
[AGENT] conventions: priority = custom > stack overlay > testing-standards
[AGENT] conventions: 3 naming, 4 mocking, 2 forbidden rules loaded
```

Теперь `test-auditor`, `test-implementer`, `test-reviewer` и `test-verifier` будут:

- Писать тесты в стиле, принятом в проекте (naming, structure)
- Соблюдать правила мокинга проекта
- Не использовать patterns, которые в проекте запрещены

### Вручную (проверка)

Вы можете проверить, что было обнаружено:

```
покажи обнаруженные конвенции
```

Агент выведет содержимое `.gigacode/conventions/project-conventions.md`.

---

## Примеры

### Пример 1: React-проект с существующими тестами

**Ситуация:** В React-проекте есть 50+ тестов. Все пишут `describe('ComponentName')`, `it('should ... when ...')`, мокают API через `jest.fn()`.

**Discovery результат:**

```yaml
naming:
  - target: "describe-блоки"
    pattern: "describe('ComponentName')"
    source: "92% тестов"
  - target: "it-блоки"
    pattern: "it('should ... when ...')"
    source: "78% тестов + CODE_STYLE.md"
  - target: "тестовые файлы"
    pattern: "__tests__/Component.test.tsx"
    source: "co-located"

mocking_rules:
  - target: "API-вызовы"
    approach: "jest.fn() в ручных моках __mocks__/api/"
  - target: "Redux store"
    approach: "configureStore с тестовыми reducers"

forbidden_patterns:
  - pattern: "toMatchSnapshot()"
    reason: "Нет проверки поведения, ложное чувство покрытия"
    alternative: "toHaveTextContent(), toBeInTheDocument()"
```

**Использование:** `test-implementer` при написании нового теста будет использовать `describe('ComponentName')` и `jest.fn()` — как принято в проекте.

### Пример 2: Java + Spring проект

**Ситуация:** В Java-проекте контроллеры тестируются через `@WebMvcTest`, сервисы через `@ExtendWith(MockitoExtension)`, репозитории через `@DataJpaTest`.

**Discovery результат:**

```yaml
naming:
  - target: "тестовые классы"
    pattern: "{ClassName}Test"
    source: "100% тестов"
  - target: "тестовые методы"
    pattern: "{methodName}_{scenario}"
    source: "CODE_STYLE.md + 85% тестов"

mocking_rules:
  - target: "API-вызовы"
    approach: "MockRestServiceServer для HTTP"
  - target: "Service-зависимости"
    approach: "@MockBean для @WebMvcTest, @Mock для сервиса"

test_structure:
  - "Тесты в src/test/java, mirroring src/main/java структуру"
  - "@WebMvcTest для контроллеров (integration lite)"
  - "@DataJpaTest для repository (H2 in-memory)"
```

---

## Обновление conventions

При изменении проекта (новые инструменты, изменение стиля) — перегенерируйте конвенции:

```
обнови конвенции тестирования
```

`convention-discoverer` запустит повторный scan → analyze → generate. Старые конвенции сохраняются с версионированием:

```
.gigacode/conventions/
├── project-conventions-v1.0.json
├── project-conventions-v1.0.md
├── project-conventions-v1.1.json  ← обновлённые
└── project-conventions.md          ← symlink к последней
```

---

## FAQ

### Q: Что если в проекте нет тестов вообще?

A: Convention Discovery создаст **минимальный overlay** только на основе определения стека (W10.2) и базовых конвенций из `context/<stack>-testing.md`. Вы получите warning:

```
[AGENT] WARNING: no test files found, using base stack conventions only
```

Используйте `/audit-tests` чтобы создать план написания тестов с нуля.

### Q: Что если обнаруженные конвенции конфликтуют между собой?

A: Часть Phase 2 (Analyze) в `@./skills/convention-discovery/SKILL.md`. Если код содержит оба паттерна — конвенция записывается с confidence `medium` + note. Если конфликт с `testing-standards.md` — конвенция отклоняется с warning в `team_notes`.

### Q: Что если обнаруженная конвенция нарушает базовые принципы?

A: Convention Review (Phase 2 conflict detection) выявит и отклонит. Например, если проект мок-ает внутренние функции — review не примет это правило. Вы получите:

```
[AGENT] WARNING: custom convention conflicts with testing-standards §1.4: mocking internal functions. Skipping.
```

### Q: Можно ли вручную редактировать `project-conventions.md`?

A: Формально можно, но **НЕ рекомендуется**. При повторном discovery файл будет перезаписан. Если нужно добавить кастомные правила — используйте раздел `team_notes` в JSON, они сохранятся при регенерации. Для permanent custom rules — создайте свой overlay в `context/custom-conventions.md`.

### Q: Что если проект пустой (нет кода)?

A: Convention Discovery создаст skeleton overlay без конвенций и warning. Когда добавите код — перезапустите discovery.

### Q: Как conventions влияют на аудит написанных тестов?

A: При W11 convention loading, тесты аудитор проверяет не только по `testing-standards.md`, но и по project conventions. Например, если в проекте принято `it('should ...')`, а тест использует `it('checks that ...')` — audit пометит naming violation как minor issue.

### Q: Может ли convention-discoverer анализировать несколько модулей (mono-repo)?

A: Текущая версия сканирует весь проект с лимитом 500 файлов. Для mono-repo — рекомендуется запускать отдельно для каждого модуля, указывая контекст:

```
найди конвенции тестирования в модуле services/
```

### Q: Где хранить conventions — в git?

A: Да, рекомендуем коммитить `.gigacode/conventions/` (или минимум `project-conventions.md`) — так конвенции видны в PR, а история изменений отслеживается через git diff. `project-conventions.json` тоже можно коммитить для CI validation. `
