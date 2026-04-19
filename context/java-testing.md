# Java Testing Overlay

> Версия: 1.0 | Дата: 2026-04-18

Stack: Java + JUnit 5 + Mockito + Spring Boot Test

Use this overlay when the project uses Java/Spring Boot. Load it alongside `testing-standards.md`.

## R1. Code Classification

### R1.1 REST Controller
Spring `@RestController` или `@Controller`, обрабатывающий HTTP-запросы.

**Стратегия**: **Integration Test** (`@WebMvcTest`)
- Тестирование HTTP-слоя: запрос → ответ
- Моки сервисного слоя через `@MockBean`
- Проверка статус-кодов, response body, валидации

### R1.2 Service Layer
`@Service` или `@Component` с бизнес-логикой.

**Стратегия**: **Unit Test** (`@ExtendWith(MockitoExtension.class)`)
- Моки зависимостей (репозитории, внешние клиенты)
- Тестирование бизнес-логики, ветвлений, edge cases
- **НЕ** использовать `@SpringBootTest` если достаточно unit-теста

### R1.3 Repository / DAO
`@Repository`, `JpaRepository`, или кастомные SQL-запросы.

**Стратегия**: **Integration Test** (`@DataJpaTest`)
- In-memory БД (H2) для маппинга entity
- Проверка CRUD-операций, JPQL-запросов, каскадов

### R1.4 Pure Logic
Утилиты, мапперы, валидаторы без Spring-зависимостей.

**Стратегия**: **Unit Test** (чистый JUnit, без Spring context)
- Fast execution, no context loading
- Вход → Выход, ветвления

### R1.5 Integration (External Services)
HTTP-клиенты, message brokers, внешние API.

**Стратегия**: **Integration Test** (WireMock, Testcontainers)
- WireMock для HTTP-сервисов
- Testcontainers для БД, Kafka, Redis

## R2. Decision Algorithm

```
1. Это REST контроллер?
   ├─ ДА → @WebMvcTest + mock сервисов
   └─ НЕТ → Переход к п.2

2. Это @Service с бизнес-логикой?
   ├─ ДА → Есть ли Spring-зависимости?
   │      ├─ НЕТ → Чистый unit test (Mockito)
   │      └─ ДА → Unit test с @MockBean в узком @SpringBootTest
   └─ НЕТ → Переход к п.3

3. Это @Repository?
   ├─ ДА → @DataJpaTest
   └─ НЕТ → Переход к п.4

4. Это pure logic (утилита/маппер)?
   ├─ ДА → Чистый JUnit test (без Spring)
   └─ НЕТ → Переход к п.5

5. Уже покрыто существующими тестами?
   ├─ ДА → SKIP
   └─ НЕТ → Добавить в бэклог
```

## R3. Decision Log Format

```yaml
[AGENT] code type: controller | service | repository | logic | integration
[AGENT] complexity: low | medium | high
[AGENT] existing coverage: none | partial | full
[AGENT] desired strategy: WebMvcTest | unit test | DataJpaTest | integration test | skip
[AGENT] reason: <конкретное обоснование>
```

## R4. Test Quality Requirements

### R4.1 Full Coverage Criteria
Сервис/контроллер считается **полностью покрытым** при выполнении **всех** пунктов:

1. **Happy path** — основной сценарий успешного выполнения
2. **Error handling** — обработка исключений, `@ExceptionHandler`, статус-коды ошибок
3. **Validation** — проверка Bean Validation (`@Valid`, `@NotNull`, `@Size` и т.д.)
4. **Edge cases** — `null`/пустые коллекции, boundary values
5. **All branches** — все `if/else`, `switch`, conditional logic

### R4.2 Audit Checklist
При проверке тестового файла:
1. Подсчитать количество `@Test` методов
2. Проверить наличие `verify()` для моков (подтверждение взаимодействия)
3. Проверить обработку ошибок (`assertThrows`, `@ParameterizedTest`)
4. Оценить разнообразие сценариев
5. Для контроллеров: проверка разных HTTP-методов, статус-кодов, body
6. Для сервисов: тестирование исключений, граничных значений, пустых данных

Если менее 3-х `@Test` методов для сервиса с условной логикой → статус `partial`.

## R5. Test Structure

### R5.1 Unit Test (Service)
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldReturnUser_whenUserExists() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser()));

        // When
        User result = userService.findById(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(userRepository).findById(1L);
    }

    @Test
    void shouldThrowException_whenUserNotFound() {
        // Given
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.findById(99L))
                .isInstanceOf(UserNotFoundException.class);
    }
}
```

### R5.2 WebMvcTest (Controller)
```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnUser_whenGetById() throws Exception {
        // Given
        when(userService.findById(1L)).thenReturn(testUserDto());

        // When & Then
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test User"));
    }

    @Test
    void shouldReturn404_whenUserNotFound() throws Exception {
        // Given
        when(userService.findById(99L)).thenThrow(new UserNotFoundException());

        // When & Then
        mockMvc.perform(get("/api/users/99"))
                .andExpect(status().isNotFound());
    }
}
```

### R5.3 DataJpaTest (Repository)
```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndFindUser() {
        // Given
        User user = new User("test@example.com", "Test User");

        // When
        User saved = userRepository.save(user);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("test@example.com");
    }
}
```

## R6. Mocking

- **Repository** → `@Mock` (Mockito) в unit-тестах сервисов
- **Service** → `@MockBean` в `@WebMvcTest` контроллеров
- **HTTP external** → WireMock (`@AutoConfigureWireMock`)
- **Database** → Testcontainers (`@Container`), H2 для `@DataJpaTest`
- **Time/Clock** → `Clock.fixed()` injection, не `Mockito.mockStatic`
- **Security/Authentication** → `@WithMockUser` (spring-security-test)

## R7. File Organization

- Тесты: `src/test/java/.../ServiceNameTest.java` — структура пакетов совпадает с `src/main/java`
- Тестовые данные: `src/test/resources/` (JSON fixtures, SQL scripts)
- Test utilities: `src/test/java/.../test/` (builders, fixtures, helpers)
- Integration tests: `src/test/java/.../integration/`

## R8. Test Naming Convention

| Метод | Формат | Пример |
|-------|--------|--------|
| Unit test | `should[Result]_when[Condition]()` | `shouldReturnUser_whenUserExists()` |
| Error test | `shouldThrow[Exception]_when[Condition]()` | `shouldThrowValidationException_whenEmailInvalid()` |
| Integration | `should[Result]_for[Endpoint]()` | `shouldReturn200_forGetUserById()` |
