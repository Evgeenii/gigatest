# JS/TS Testing Overlay

> Версия: 1.0 | Дата: 2026-04-18

Stack: Node.js + TypeScript (Express, NestJS, Fastify, vanilla)

Use this overlay when the project uses JavaScript/TypeScript on сервере. Load it alongside `testing-standards.md`.

## R1. Code Classification

### R1.1 HTTP Controller/Router
Express router, NestJS controller, Fastify route handler.

**Стратегия**: **Integration Test**
- Supertest для HTTP-эндпоинтов
- Моки сервисного слоя
- Проверка статус-кодов, response body, заголовков

### R1.2 Service / Business Logic
Сервис с бизнес-логикой, зависящий от репозиториев/клиентов.

**Стратегия**: **Unit Test**
- Моки зависимостей (jest.fn, sinon, vitest.mock)
- Тестирование логики, ветвлений, edge cases
- Fast execution, без запуска HTTP-сервера

### R1.3 Repository / Data Access
TypeORM repository, Prisma client, Mongoose model, SQL queries.

**Стратегия**: **Integration Test**
- In-memory БД или Testcontainers (PostgreSQL, MongoDB)
- Проверка CRUD, запросов, отношений

### R1.4 Middleware / Interceptor
Auth middleware, logging, error handling, request validation.

**Стратегия**: **Integration Test**
- Интеграция через Supertest с мокнутым следующим handler
- Проверка request/response pipeline

### R1.5 Pure Logic
Утилиты, валидаторы, мапперы, форматировщики без побочных эффектов.

**Стратегия**: **Unit Test**
- Вход → Выход, ветвления
- Простые функции без моков

## R2. Decision Algorithm

```
1. Это HTTP endpoint (controller/route)?
   ├─ ДА → Integration test (supertest)
   └─ НЕТ → Переход к п.2

2. Это сервис с зависимостями?
   ├─ ДА → Mock зависимости, unit test
   └─ НЕТ → Переход к п.3

3. Это middleware/interceptor?
   ├─ ДА → Integration test (express/fake req,res,next)
   └─ НЕТ → Переход к п.4

4. Это repository/DAO?
   ├─ ДА → Integration test with in-memory DB
   └─ НЕТ → Переход к п.5

5. Это pure logic?
   ├─ ДА → Unit test
   └─ НЕТ → Переход к п.6

6. Уже покрыто существующими тестами?
   ├─ ДА → SKIP
   └─ НЕТ → Добавить в бэклог
```

## R3. Decision Log Format

```yaml
[AGENT] code type: controller | service | middleware | repository | logic
[AGENT] complexity: low | medium | high
[AGENT] existing coverage: none | partial | full
[AGENT] desired strategy: integration | unit | skip
[AGENT] reason: <конкретное обоснование>
```

## R4. Test Quality Requirements

### R4.1 Full Coverage Criteria
Сервис/контроллер считается **полностью покрытым** при выполнении **всех** пунктов:

1. **Happy path** — основной успешный сценарий
2. **Error handling** — обработка ошибок, HTTP error responses
3. **Validation** — проверка входных данных (class-validator, Joi, zod)
4. **Edge cases** — `null`/`undefined`, пустые массивы, boundary values
5. **All branches** — все `if/else`, `switch`, conditional logic

### R4.2 Audit Checklist
При проверке тестового файла:
1. Подсчитать количество `it`/`test` блоков
2. Проверить `mockFn.mock.calls` или `spyOn` для подтверждения взаимодействия
3. Проверить обработку ошибок (`rejects.toThrow`, `toThrow`)
4. Оценить разнообразие сценариев
5. Для HTTP endpoints: разные методы, статус-коды, body, query params

Если менее 3-х `it` блоков для сервиса с ветвлениями → статус `partial`.

## R5. Test Structure

### R5.1 Unit Test (Service)
```typescript
describe('UserService', () => {
  it('should return user when user exists', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    userRepository.findById.mockResolvedValue(mockUser);

    const result = await userService.findById(1);

    expect(result).toEqual(mockUser);
    expect(userRepository.findById).toHaveBeenCalledWith(1);
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(userService.findById(99))
      .rejects.toThrow(UserNotFoundError);
  });
});
```

### R5.2 Integration Test (HTTP Endpoint)
```typescript
describe('GET /api/users/:id', () => {
  it('should return 200 with user body', async () => {
    userService.findById.mockResolvedValue(userDto);

    const response = await request(app).get('/api/users/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 1, name: 'Test User' });
  });

  it('should return 404 when user not found', async () => {
    userService.findById.mockRejectedValue(new UserNotFoundError());

    const response = await request(app).get('/api/users/99');

    expect(response.status).toBe(404);
  });
});
```

### R5.3 Middleware Test
```typescript
describe('authMiddleware', () => {
  it('should call next when token is valid', async () => {
    jwt.verify.mockReturnValue({ userId: 1 });
    const req = { headers: { authorization: 'Bearer valid' } } as Request;
    const next = jest.fn();

    authMiddleware(req, {} as Response, next);

    expect((req as any).userId).toBe(1);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    authMiddleware({} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

## R6. Mocking

- **Database** → In-memory (SQLite for testing, `mocked` type from `ts-jest`)
- **External HTTP** → `nock` or `msw` for Node.js
- **File system** → `memfs` or `jest.mock('fs')`
- **Crypto/JWT** → Mock implementations
- **Date/Time** → `jest.useFakeTimers()`, `sinon.useFakeTimers()`
- **Logger** → Mock/silent logger in tests

## R7. File Organization

- Тесты: `src/**/*.spec.ts` или `src/**/__tests__/*.test.ts`
- Test utilities: `src/test/` (fixtures, builders, helpers)
- Mocks: `__mocks__/` рядом с модулем или в корне
- Integration tests: `src/**/*.e2e-spec.ts`

## R8. Test Naming Convention

| Метод | Формат | Пример |
|-------|--------|--------|
| Unit test | `should [result] when [condition]` | `should return user when user exists` |
| Error test | `should throw [error] when [condition]` | `should throw ValidationError when email is invalid` |
| Integration | `should return [status] for [endpoint]` | `should return 404 for GET /api/users/99` |
