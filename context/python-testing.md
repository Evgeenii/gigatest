# Python Testing Overlay

> Версия: 1.0 | Дата: 2026-04-18
>
> **Назначение:** Описать стратегии тестирования для Python-проектов: классификация кода, decision algorithm, мокинг, примеры, типичные ошибки.
> **Аудитория:** Агенты-имплементеры (test-implementer, test-auditor) работающие с Python-проектами.

Stack: Python + pytest + unittest.mock + FastAPI/Django/Flask

Use this overlay when the project uses Python. Load it alongside `testing-standards.md`.

## R1. Code Classification

### R1.1 HTTP Controller/View/Endpoint
FastAPI route handler (`@router.get`, `@app.get`), Flask route (`@app.route`), Django view.

**Стратегия**: **Integration Test**
- FastAPI: `TestClient` из `fastapi.testclient`
- Flask: `app.test_client()`
- Django: `django.test.Client` или `pytest-django` клиент
- Моки сервисного слоя через `unittest.mock.patch` или `pytest-mock`
- Проверка статус-кодов, response body, заголовков

### R1.2 Service / Business Logic
Сервис с бизнес-логикой, зависящий от репозиториев/клиентов.

**Стратегия**: **Unit Test**
- Моки зависимостей через `unittest.mock.patch`, `pytest-mock` (`mocker`)
- Тестирование логики, ветвлений, edge cases
- Fast execution, без запуска HTTP-сервера

### R1.3 Repository / Data Access
SQLAlchemy repository, Django ORM, Peewee, raw SQL queries.

**Стратегия**: **Integration Test**
- In-memory SQLite для простых случаев
- Testcontainers для PostgreSQL/MySQL/MongoDB
- Проверка CRUD, запросов, отношений, migrations

### R1.4 Middleware / Dependency / Interceptor
FastAPI `Depends`, Flask/Django middleware, request/response hooks.

**Стратегия**: **Integration Test**
- Интеграция через TestClient с мокнутыми зависимостями
- Проверка request/response pipeline, authentication flow

### R1.5 Pure Logic
Утилиты, валидаторы, мапперы, форматировщики без побочных эффектов (pure functions).

**Стратегия**: **Unit Test**
- Вход → Выход, ветвления
- Простые функции без моков
- Parametrize через `@pytest.mark.parametrize`

## R2. Decision Algorithm

```
1. Это HTTP endpoint (route/view/handler)?
   ├─ ДА → Integration test (TestClient/test client)
   └─ НЕТ → Переход к п.2

2. Это сервис с зависимостями?
   ├─ ДА → Mock зависимости через patch/mocker, unit test
   └─ НЕТ → Переход к п.3

3. Это middleware/dependency?
   ├─ ДА → Integration test (TestClient с mock dependencies)
   └─ НЕТ → Переход к п.4

4. Это repository/DAO/ORM model?
   ├─ ДА → Integration test with in-memory DB или Testcontainers
   └─ НЕТ → Переход к п.5

5. Это pure logic (функция без side effects)?
   ├─ ДА → Unit test (pytest, parametrize если есть варианты)
   └─ НЕТ → Переход к п.6

6. Уже покрыто существующими тестами?
   ├─ ДА → SKIP
   └─ НЕТ → Добавить в бэклог
```

## R3. Decision Log Format

```yaml
[AGENT] code type: endpoint | service | middleware | repository | logic
[AGENT] complexity: low | medium | high
[AGENT] existing coverage: none | partial | full
[AGENT] desired_strategy: integration | unit | skip
[AGENT] reason: <конкретное обоснование>
```

## R4. Test Quality Requirements

### R4.1 Full Coverage Criteria
Сервис/endpoint считается **полностью покрытым** при выполнении **всех** пунктов:

1. **Happy path** — основной успешный сценарий
2. **Error handling** — обработка ошибок, HTTP error responses, exceptions
3. **Validation** — проверка входных данных (Pydantic, Marshmallow, django forms)
4. **Edge cases** — `None`/пустые коллекции, boundary values
5. **All branches** — все `if/else`, условная логика

### R4.2 Audit Checklist
При проверке тестового файла:
1. Подсчитать количество `def test_*` функций/методов
2. Проверить `mock.assert_called_*` для подтверждения взаимодействия
3. Проверить обработку ошибок (`pytest.raises`, `with pytest.raises`)
4. Оценить разнообразие сценариев
5. Для HTTP endpoints: разные методы, статус-коды, body, query params
6. Для сервисов: тестирование исключений, граничных значений, пустых данных

Если менее 3-х `test_*` функций для сервиса с ветвлениями → статус `partial`.

## R5. Test Structure

### R5.1 Unit Test (Service)
```python
from unittest.mock import patch
import pytest

class TestUserService:

    def test_should_return_user_when_user_exists(self, mocker):
        # Given
        mock_user = {"id": 1, "name": "Test User"}
        mocker.patch("app.repositories.user.find_by_id", return_value=mock_user)

        # When
        result = get_user_by_id(1)

        # Then
        assert result == mock_user
        from app.repositories import find_by_id
        find_by_id.assert_called_once_with(1)

    def test_should_raise_error_when_user_not_found(self, mocker):
        # Given
        mocker.patch("app.repositories.user.find_by_id", return_value=None)

        # When & Then
        with pytest.raises(UserNotFoundError):
            get_user_by_id(99)
```

### R5.2 Integration Test (FastAPI Endpoint)
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestUserEndpoints:

    def test_should_return_200_with_user_body(self, mocker):
        # Given
        mocker.patch("app.services.get_user_by_id", return_value={"id": 1, "name": "Test User"})

        # When
        response = client.get("/api/users/1")

        # Then
        assert response.status_code == 200
        assert response.json() == {"id": 1, "name": "Test User"}

    def test_should_return_404_when_user_not_found(self, mocker):
        # Given
        mocker.patch("app.services.get_user_by_id", side_effect=UserNotFoundError())

        # When
        response = client.get("/api/users/99")

        # Then
        assert response.status_code == 404
```

### R5.3 Integration Test (Django)
```python
import pytest
from django.test import Client
from django.urls import reverse

@pytest.mark.django_db
class TestUserViews:

    def test_should_return_user_when_authenticated(self, client, django_user_model):
        # Given
        user = django_user_model.objects.create_user(username="test", password="pass")
        client.force_login(user)

        # When
        response = client.get(reverse("user-detail", args=[user.pk]))

        # Then
        assert response.status_code == 200
        assert response.json()["username"] == "test"
```

### R5.4 Parameterized Test (Pure Logic)
```python
import pytest

@pytest.mark.parametrize("input_value,expected", [
    ("test@example.com", True),
    ("invalid-email", False),
    ("", False),
    (None, False),
])
def test_should_validate_email(input_value, expected):
    assert validate_email(input_value) == expected
```

## R6. Mocking

- **Database** → SQLite in-memory, `pytest-django` с `--reuse-db`, Testcontainers (PostgreSQL/MySQL)
- **External HTTP** → `responses` library, `aioresponses` для async, `requests-mock`
- **Time/Date** → `freezegun` (`@freeze_time("2026-01-01")`)
- **File system** → `pyfakefs` или `unittest.mock.patch` для `open`
- **Logging** → `caplog` fixture из pytest
- **Environment variables** → `monkeypatch.setenv` или `mock.patch.dict(os.environ)`
- **Async code** → `pytest-asyncio`, `@pytest.mark.asyncio`, `AsyncMock`

## R7. File Organization

- Тесты: `tests/` директория на уровне проекта, структура повторяет `src/` или `app/`
- Именование: `test_<module_name>.py` файлы, `test_<function_name>` функции/методы
- Fixtures: `tests/conftest.py` — общие fixtures для всех тестов
- Test utilities: `tests/conftest.py` или `tests/helpers/` (factories, fixtures, helpers)
- Integration tests: `tests/integration/` поддиректория
- Test data: `tests/fixtures/` или `tests/data/` (JSON, CSV, SQL scripts)

**Пример структуры:**
```
project/
├── app/
│   ├── services/
│   │   └── user_service.py
│   └── api/
│       └── routes/
│           └── users.py
└── tests/
    ├── conftest.py
    ├── unit/
    │   └── test_user_service.py
    ├── integration/
    │   └── test_users_api.py
    └── fixtures/
        └── test_data.json
```

## R8. Test Naming Convention

| Тип | Формат | Пример |
|-----|--------|--------|
| Unit test | `test_should_<result>_when_<condition>` | `test_should_return_user_when_user_exists` |
| Error test | `test_should_raise_<exception>_when_<condition>` | `test_should_raise_validation_error_when_email_invalid` |
| Integration | `test_should_return_<status>_for_<endpoint>` | `test_should_return_200_for_get_user_by_id` |
| Parametrized | `test_should_<behavior>[<variant>]` | `test_should_validate_email[test@example.com-True]` |

## R9. Common Pitfalls

| Ошибка | Почему случается | Как избежать |
|--------|------------------|--------------|
| `pytest.raises` ловит слишком широкий exception | `with pytest.raises(Exception)` маскирует реальные баги | Указывать конкретный класс исключения: `pytest.raises(ValueError)` |
| Мутация state между тестами | Глобальные переменные/mocks сохраняются между тестами | Использовать `@pytest.fixture(autouse=True)` для сброса, или `scope="function"` |
| Забытый `await` в async тестах | Coroutine не выполняется, тест "проходит" без реальной проверки | Использовать `@pytest.mark.asyncio`, pytest предупредит если coroutine не awaited |
| Фикстуры с неправильным scope | `scope="session"` кеит моки между тестами, вызывает race conditions | По умолчанию `scope="function"`, явно менять только для expensive setup |
| `unittest.mock.patch` wrong target | Патчить по импорту, а не по определению: `@patch("module.Class")` vs `@patch("other_module.Class")` | Патчить там, где объект **используется**, не где определён |
| Mock объекта слишком строгий | `assert_called_once_with` падает когда порядок args изменён | Использовать `assert_called_once()` + проверку аргументов отдельно |
| `freezegun` не учитывает timezone | `@freeze_time` фиксирует UTC, но код работает с local timezone | Указывать timezone: `@freeze_time("2026-01-01 12:00:00", tz_offset=0)` |
| Pytest plugin conflict | `pytest-django` + `pytest-asyncio` конфликтуют в некоторых версиях | Lock версии в `pyproject.toml` / `requirements-dev.txt` |

---
*Смежные документы: testing-standards.md, js-ts-testing.md, java-testing.md*
