# Go Testing Overlay

> Версия: 1.0 | Дата: 2026-04-18
>
> **Назначение:** Описать стратегии тестирования для Go-проектов: классификация кода, decision algorithm, мокинг, примеры, типичные ошибки.
> **Аудитория:** Агенты-имплементеры (test-implementer, test-auditor) работающие с Go-проектами.

Stack: Go + testing + testify + httptest + gomock/mockgen

Use this overlay when the project uses Go/Golang. Load it alongside `testing-standards.md`.

## R1. Code Classification

### R1.1 HTTP Handler/Router
`http.Handler`, `http.HandlerFunc`, Gin/Igor-Fiber/Mux route handler.

**Стратегия**: **Integration Test**
- `httptest.NewRecorder` + `httptest.NewRequest` для вызова handler
- Моки сервисного слоя через интерфейсы (mockgen/testify)
- Проверка статус-кодов, response body, заголовков

### R1.2 Service / Business Logic
Сервис с бизнес-логикой, зависящий от репозиториев/клиентов (интерфейсы).

**Стратегия**: **Unit Test**
- Моки зависимостей через интерфейсы (gomock/testify/mock)
- Тестирование логики, ветвлений, edge cases
- Fast execution, без запуска HTTP-сервера

### R1.3 Repository / Data Access
GORM repository, sqlx, database/sql, raw SQL queries.

**Стратегия**: **Integration Test**
- In-memory SQLite (sqlite3 driver) для простых случаев
- Testcontainers для PostgreSQL/MySQL
- Проверка CRUD, запросов, отношений, migrations

### R1.4 Middleware / Interceptor
HTTP middleware, gRPC interceptor, logging, authentication.

**Стратегия**: **Integration Test**
- Интеграция через `httptest` с мокнутым следующим handler
- Проверка request/response pipeline, authentication flow

### R1.5 Pure Logic
Утилиты, валидаторы, мапперы, форматировщики без побочных эффектов.

**Стратегия**: **Unit Test**
- Вход → Выход, ветвления
- Простые функции без моков
- Table-driven tests через `t.Run`

## R2. Decision Algorithm

```
1. Это HTTP handler/endpoint?
   ├─ ДА → Integration test (httptest.NewRecorder + NewRequest)
   └─ НЕТ → Переход к п.2

2. Это сервис с зависимостями (интерфейсы)?
   ├─ ДА → Mock через интерфейс, unit test
   └─ НЕТ → Переход к п.3

3. Это middleware/interceptor?
   ├─ ДА → Integration test (httptest с mock next handler)
   └─ НЕТ → Переход к п.4

4. Это repository/DAO?
   ├─ ДА → Integration test с in-memory DB или Testcontainers
   └─ НЕТ → Переход к п.5

5. Это pure logic (функция без side effects)?
   ├─ ДА → Unit test (table-driven, t.Run)
   └─ НЕТ → Переход к п.6

6. Уже покрыто существующими тестами?
   ├─ ДА → SKIP
   └─ НЕТ → Добавить в бэклог
```

## R3. Decision Log Format

```yaml
[AGENT] code type: handler | service | middleware | repository | logic
[AGENT] complexity: low | medium | high
[AGENT] existing coverage: none | partial | full
[AGENT] desired_strategy: integration | unit | skip
[AGENT] reason: <конкретное обоснование>
```

## R4. Test Quality Requirements

### R4.1 Full Coverage Criteria
Сервис/handler считается **полностью покрытым** при выполнении **всех** пунктов:

1. **Happy path** — основной успешный сценарий
2. **Error handling** — обработка ошибок, HTTP error responses, error wrapping
3. **Validation** — проверка входных данных (структуры, теги валидации)
4. **Edge cases** — `nil`/пустые срезы, boundary values
5. **All branches** — все `if/else`, `switch`, conditional logic

### R4.2 Audit Checklist
При проверке тестового файла:
1. Подсчитать количество `func Test*` функций
2. Проверить вызовы `mock.Assert*` или `ctrl.Finish()` для подтверждения взаимодействия
3. Проверить обработку ошибок (`assert.Error`, `require.Error`)
4. Оценить разнообразие сценариев (table-driven subtests)
5. Для HTTP handlers: разные методы, статус-коды, body, query params
6. Для сервисов: тестирование ошибок, граничных значений, пустых данных

Если менее 3-х `func Test*` для сервиса с ветвлениями → статус `partial`.

## R5. Test Structure

### R5.1 Unit Test (Service)
```go
func TestUserService_GetUser(t *testing.T) {
    tests := []struct {
        name        string
        userID      int64
        mockReturn  *User
        mockErr     error
        wantErr     bool
    }{
        {
            name:       "should return user when user exists",
            userID:     1,
            mockReturn: &User{ID: 1, Name: "Test User"},
            wantErr:    false,
        },
        {
            name:       "should return error when user not found",
            userID:     99,
            mockReturn: nil,
            mockErr:    ErrUserNotFound,
            wantErr:    true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Given
            mockRepo := NewMockUserRepository(t)
            mockRepo.EXPECT().FindByID(tt.userID).Return(tt.mockReturn, tt.mockErr)

            svc := NewUserService(mockRepo)

            // When
            result, err := svc.GetByID(tt.userID)

            // Then
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.mockReturn, result)
            }
        })
    }
}
```

### R5.2 Integration Test (HTTP Handler)
```go
func TestUserHandler_GetUser(t *testing.T) {
    tests := []struct {
        name           string
        userID         string
        mockReturn     *User
        mockErr        error
        expectedStatus int
    }{
        {
            name:           "should return 200 with user body",
            userID:         "1",
            mockReturn:     &User{ID: 1, Name: "Test User"},
            expectedStatus: http.StatusOK,
        },
        {
            name:           "should return 404 when user not found",
            userID:         "99",
            mockErr:        ErrUserNotFound,
            expectedStatus: http.StatusNotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Given
            mockService := NewMockUserService(t)
            mockService.EXPECT().GetByID(int64(1)).Return(tt.mockReturn, tt.mockErr)

            handler := NewUserHandler(mockService)

            req := httptest.NewRequest(http.MethodGet, "/api/users/"+tt.userID, nil)
            rr := httptest.NewRecorder()

            // When
            handler.GetUser(rr, req)

            // Then
            assert.Equal(t, tt.expectedStatus, rr.Code)
        })
    }
}
```

### R5.3 Table-Driven Test (Pure Logic)
```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        input string
        want  bool
    }{
        {"test@example.com", true},
        {"invalid-email", false},
        {"", false},
    }

    for _, tt := range tests {
        t.Run(tt.input, func(t *testing.T) {
            got := ValidateEmail(tt.input)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

## R6. Mocking

- **Database** → `testdatabase` helper, SQLite in-memory, Testcontainers (PostgreSQL)
- **External HTTP** → `httptest.NewServer` с mock handler, `gock` library
- **Interfaces** → `gomock` (mockgen) или `testify/mock`
- **Time/Date** → `clockwork` library для injectable clock
- **File system** → `afero` library для in-memory filesystem
- **Logging** → `zaptest.NewLogger(t)` или `logrus/test`
- **Context cancellation** → `context.WithCancel` или `context.WithTimeout` в тестах

## R7. File Organization

- Тесты: `*_test.go` файлы рядом с тестируемым кодом (idiomatic Go)
- Integration tests: `*_integration_test.go` или `tests/` поддиректория
- Test utilities: `internal/testutil/` или `testhelper/` (factories, fixtures, helpers)
- Mocks: `mocks/` директория, генерируемые через `mockgen`
- Test data: `testdata/` директория (JSON fixtures, SQL scripts)

**Пример структуры:**
```
project/
├── internal/
│   ├── service/
│   │   ├── user_service.go
│   │   └── user_service_test.go
│   ├── handler/
│   │   ├── user_handler.go
│   │   └── user_handler_test.go
│   └── repository/
│       ├── user_repository.go
│       └── user_repository_test.go
├── mocks/
│   └── mock_user_repository.go
└── testdata/
    └── test_user.json
```

## R8. Test Naming Convention

| Тип | Формат | Пример |
|-----|--------|--------|
| Unit test | `Test<ServiceName>_<Behavior>` | `TestUserService_GetUser` |
| Error test | Sub-test в table-driven | `should return error when user not found` |
| Integration | `Test<HandlerName>_<Scenario>` | `TestUserHandler_GetUser` |
| Table-driven subtest | Описательная строка `name` в struct | `"should return 200 for valid request"` |

## R9. Common Pitfalls

| Ошибка | Почему случается | Как избежать |
|--------|------------------|--------------|
| Data race в `t.Parallel()` тестах | Shared state между параллельными subtests | Клонировать переменные или избегать `t.Parallel()` с shared state |
| `defer` внутри `t.Run` накапливается | Каждый subtest добавляет defer, ресурсы не освобождаются до конца родительского теста | Использовать inline subtest или `t.Cleanup()` вместо `defer` |
| Сравнение структур через `==` вместо `reflect.DeepEqual` | `==` работает только для примитивов в Go | Использовать `assert.Equal` (testify) или `cmp.Diff` |
| Забытый `ctrl.Finish()` в gomock | Mock assertions не проверяются, тест проходит без валидации | Использовать `gomock.NewTester(t)` — Finish вызовется автоматически, или `defer ctrl.Finish()` |
| `httptest.NewRecorder` без проверки response body | Тест проходит checking только status code, но body пустой/неправильный | Всегда парсить body: `json.Unmarshal(rr.Body.Bytes(), &result)` |
| Table-driven test без sub-test | Один fail останавливает весь тест, нет изоляции | Всегда использовать `t.Run(tt.name, func(t *testing.T) { ... })` |
| Mock interface с неправильным import path | mockgen генерирует для `pkg.Foo` а код импортирует `v2/pkg.Foo` | Запускать mockgen с правильным `-package` и import path, проверить скомпилируется ли тест |
| Забытое замыкание переменных в `t.Run` | Переменная `tt` захватывается по ссылке, не по значению (Go < 1.22) | Declaring `tt := tt` внутри subtest или upgrading Go ≥ 1.22 |

---
*Смежные документы: [testing-standards.md](context/testing-standards.md), [python-testing.md](context/python-testing.md), [java-testing.md](context/java-testing.md)*
