# React Testing Overlay

> Версия: 1.0 | Дата: 2026-04-18

Stack: React + React Testing Library + Jest/Vitest

Use this overlay when the project uses React. Load it alongside `testing-standards.md`.

## R1. Code Classification

### R1.1 UI Component
React компонент, который отображает UI, использует библиотеку компонентов, имеет пользовательские взаимодействия.

**Стратегия**: **UI Behavior Test**
- Проверка через `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`
- Симуляция user events через `userEvent`
- Проверка видимых результатов (текст, состояние, визуальные изменения)

### R1.2 Pure Logic
Функции без побочных эффектов в `*.ts`: преобразования данных, условная логика, сортировка, форматирование.

**Стратегия**: **Unit test** (если есть ветвления/условия). Простые функции (без условий) — **SKIP**.

### R1.3 Custom Hooks (файлы `use*.ts`)
Кастомные React-хуки, инкапсулирующие логику состояния и побочных эффектов.

**Стратегия**: **Hook Behavior Test**
- Использовать `renderHook` из `@testing-library/react`
- Проверять возвращаемые значения и побочные эффекты
- **ЗАПРЕЩЕНО**: Проверять внутренние `useState` напрямую

### R1.4 Integration (API, Store)
Компоненты/код, взаимодействующий с внешними системами.

**Стратегия**: **Integration Test**
- API вызовы → MSW моки
- Redux store → `renderWithProviders` с `preloadedState`

## R2. Decision Algorithm

```
1. Это UI компонент?
   ├─ ДА → Behavior test (userEvent)
   └─ НЕТ → Переход к п.2

2. Это кастомный хук (use*.ts)?
   ├─ ДА → Hook behavior test (renderHook)
   └─ НЕТ → Переход к п.3

3. Это pure logic (функция/маппер)?
   ├─ ДА → Есть ли условная логика?
   │      ├─ ДА → Unit test
   │      └─ НЕТ → SKIP
   └─ НЕТ → Переход к п.4

4. Уже покрыто существующими тестами?
   ├─ ДА → SKIP
   └─ НЕТ → Добавить в бэклог
```

## R3. Decision Log Format

```yaml
[AGENT] code type: UI | logic | hook | integration
[AGENT] complexity: low | medium | high
[AGENT] existing coverage: none | partial | full
[AGENT] desired strategy: UI | unit | hook | skip
[AGENT] reason: <конкретное обоснование>
```

## R4. Test Quality Requirements

### R4.1 Full Coverage Criteria
Компонент считается **полностью покрытым** только при одновременном выполнении **всех** пунктов:

1. **Рендеринг всех значимых состояний** — loading, error, empty, success, разные варианты пропсов
2. **Пользовательские взаимодействия** — хотя бы один `userEvent` (клик, ввод, выбор) с проверкой изменения UI
3. **Асинхронное поведение** — `await screen.findBy*`, `waitFor` или `waitForElementToBeRemoved`
4. **Edge-cases и обработка ошибок** — `null`/`undefined` в пропсах, пустые массивы, ошибки

### R4.2 Invalid Tests
Тест считается **НЕДОСТАТОЧНЫМ**, если:
- Только `toMatchSnapshot()` без дополнительных ассертов
- Нет `userEvent`/`fireEvent` для компонентов с кнопками/инпутами
- Нет проверки разных состояний
- Нет обработки ошибок или пустых данных

### R4.3 Audit Checklist
При проверке тестового файла:
1. Подсчитать количество `it()`/`test()` блоков
2. Проверить наличие импорта `userEvent` и его вызовов
3. Проверить наличие `await` с `findBy*` или `waitFor`
4. Оценить разнообразие сценариев
5. Для компонентов с кнопками/инпутами: `userEvent.click()` или `userEvent.type()` обязательны
6. Для компонентов с API: `await screen.findBy*` или `waitFor` обязательны

Если менее 3-х `it` блоков и нет `userEvent` → статус автоматически `partial`.

## R5. Test Structure

### R5.1 UI Test
```typescript
describe('ComponentName', () => {
  it('должен отображать [элемент] при [условии]', async () => {
    // 1. Подготовка: renderWithProviders(...)
    // 2. Действие: await userEvent.click/type
    // 3. Ожидание: await screen.findBy*
    // 4. Assert: только observable (текст, элементы, disabled/visible)
  });
});
```

### R5.2 Hook Test
```typescript
import { renderHook, act } from '@testing-library/react';

describe('useCustomHook', () => {
  it('должен вернуть [значение] после [действия]', () => {
    const { result } = renderHook(() => useHook(initial));
    act(() => result.current.someAction());
    expect(result.current.value).toBe(expected);
  });
});
```

## R6. Mocking

- **API calls** → MSW (`msw` + `@mswjs/http-mocks`)
- **Redux store** → `renderWithProviders` с `preloadedState`
- **Context providers** → обернуть компонент в provider с тестовыми данными
- **localStorage/sessionStorage** → `jest-localstorage-mock`
- **window.matchMedia** → `jest-matchmedia-mock`
- **Dates** → `jest.setSystemTime(new Date('2025-01-01'))`
- **UUIDs** → `jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }))`

## R7. File Organization

- Тесты: `ComponentName.test.tsx` рядом с компонентом ИЛИ в `__tests__/`
- Утилиты (`test-utils.tsx`, `renderWithProviders`): `src/test/`
- MSW handlers: `src/test/mocks/`

## R8. React-Specific Forbidden Patterns

Эти паттерны запрещены **только** для React-проектов. Они являются конкретизацией
общих принципов из `testing-standards.md §4` применительно к React экосистеме.

| Паттерн | Почему плох | Альтернатива |
|---------|-------------|--------------|
| `expect(component.state).toBe(...)` | Тестирование внутреннего состояния компонента. Ломается при рефакторинге | Проверять DOM через `getByRole`, `getByText` |
| `expect(wrapper.instance().method)` (Enzyme) | Тестирование реализации, а не наблюдаемого поведения | Использовать RTL `fireEvent`/`userEvent` |
| `jest.mock(internalFn)` внутри тестируемого компонента | Мокание внутренней логики скрывает реальные зависимости | Тестировать компонент целиком, мокать только API-вызовы |
| `act(() => ...)` без `await` | Устаревший паттерн, приводит к race condition | `await act(async () => ...)` или `waitFor` |
| `wrapper.find('SomeComponent').length` | Тестирование структуры/implementation details | `screen.getByRole` — проверка видимого результата |
| `componentDidMount` spy | Тестирование lifecycle вместо поведения | Проверять что компонент отрендерил ожидаемый результат |
| Direct DOM manipulation (`element.style`, `element.value`) | Манипуляция DOM вместо пользовательского действия | `userEvent.type`, `userEvent.selectOptions` |
| `shallow()` render (Enzyme) | shallow не рендерит дочерние компоненты, скрывает реальные баги | `render()` (full DOM) из RTL |

### R8.1 Deprecated Tools

**Enzyme** — считается deprecated. Если проект использует Enzyme, пометить в audit как `partial`
coverage и рекомендовать миграцию на React Testing Library + `@testing-library/user-event`.

---

*Смежные документы: testing-standards.md, js-ts-testing.md*
