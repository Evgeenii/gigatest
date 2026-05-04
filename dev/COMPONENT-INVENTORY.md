# GigaTest — Инвентаризация компонентов

> Версия: 2.0 | Дата: 2026-05-04
> **Полный каталог каждого файла в репозитории.**

---

## §1 — Корневые файлы

| Файл | Тип | Назначение |
|------|-----|-----------|
| `qwen-extension.json` | Конфиг | Манифест расширения |
| `QWEN.md` | Контекст | Точка входа: импортирует маршрутизатор, стандарты, ядро |
| `README.md` | Документация | Пользовательская документация |
| `package.json` | Конфиг | Node.js зависимости для CLI-утилит |
| `.gitignore` | Конфиг | Исключает `.gigacode/`, node_modules |

---

## §2 — Навыки (`skills/`)

### 2.1 Маршрутизатор

| Путь | Назначение |
|------|-----------|
| `skills/using-gigatest/SKILL.md` | Анализирует интент, направляет в правильный навык |

### 2.2 Рабочие навыки

| Путь | Назначение |
|------|-----------|
| `skills/test-audit/SKILL.md` | Аудит покрытия, генерация плана |
| `skills/test-implementation/SKILL.md` | Написание тестов итеративно |
| `skills/test-review/SKILL.md` | Ревью качества (readonly) |
| `skills/test-verification/SKILL.md` | Запуск тестов, сбор доказательств |
| `skills/test-strategy/SKILL.md` | Определение стратегии |
| `skills/test-plan-template/SKILL.md` | Генерация test-plan.md из JSON |

### 2.3 Навыки конвенций

| Путь | Назначение |
|------|-----------|
| `skills/convention-discovery/SKILL.md` | Сканирование конвенций проекта |
| `skills/convention-review/SKILL.md` | Валидация конвенций |

### 2.4 Ядро

| Путь | Назначение |
|------|-----------|
| `skills/agent-workflow-core/SKILL.md` | Конечный автомат W0-W11 |
| `skills/agent-workflow-core/agent-state-schema.json` | Схема agent-state.json |
| `skills/agent-workflow-core/test-plan-state-schema.json` | Схема test_plan расширения |
| `skills/convention-discovery/convention-overlay-schema.json` | Schema для конвенций |

---

## §3 — Агенты (`agents/`)

| Файл | Роль |
|------|------|
| `test-auditor.md` | Аудит, обнаружение пробелов |
| `test-implementer.md` | Написание тестов |
| `test-reviewer.md` | Ревью качества |
| `test-verifier.md` | Запуск тестов, доказательства |
| `test-strategist.md` | Стратегия тестирования |
| `convention-discoverer.md` | Сканирование конвенций |

---

## §4 — Контекстные оверлеи (`context/`)

| Файл | Стек | Статус |
|------|------|--------|
| `testing-standards.md` | (базовый, все) | ✅ |
| `react-testing.md` | React + RTL | ✅ |
| `java-testing.md` | Java + Spring Boot | ✅ |

---

## §5 — Утилиты (`tools/`)

| Файл | Назначение |
|------|-----------|
| `validate-state.js` | Валидация agent-state.json |
| `generate-report.js` | Генерация test-plan.md из JSON |

---

## §6 — Документация (`docs/`)

| Файл | Назначение |
|------|-----------|
| `docs/ONBOARDING.md` | Онбординг пользователей |

---

## §7 — Рабочая папка разработки (`dev/`)

| Файл | Назначение |
|------|-----------|
| `ARCHITECTURE.md` | Архитектура системы |
| `COMPONENT-INVENTORY.md` | Каталог файлов |
| `PRODUCT-VISION.md` | Позиционирование продукта |
| `SPEC.md` | Техническая спецификация |
| `PRODUCT-READINESS-MATRIX.md` | Готовность компонентов |
| `backlog.yaml` | Машиночитаемый бэклог |

---

## §8 — Подсчёт файлов

| Директория | Файлов |
|-----------|--------|
| `skills/` | 12 |
| `agents/` | 6 |
| `commands/` | 5 |
| `context/` | 3 |
| `tools/` | 2 |
| `plans/` | 1 |
| `docs/` | 1 |
| `dev/` | 7 |
| **Итого** | **37** |
