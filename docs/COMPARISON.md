# COMPARISON.md — Сравнительный анализ GigaTest и альтернатив

> Версия: 1.0 | Дата: 2026-04-18
>
> **Назначение:** Объективное сравнение GigaTest с существующими альтернативами по ключевым параметрам.
> **Аудитория:** Техлиды, инженеры, принимающие решение о выборе инструмента тестирования.

---

## Содержание

1. [Сравнительная таблица](#1-сравнительная-таблица)
2. [Детальный разбор](#2-детальный-разбор)
3. [Killer Features — что есть только у GigaTest](#3-killer-features--что-есть-только-у-gigatest)
4. [Когда что выбирать](#4-когда-что-выбирать)

---

## 1. Сравнительная таблица

### 4 альтернативы

| Возможность | **GigaTest** | **superpowers-5.0.6** | **Raw AI** (ChatGPT, Claude, Qwen без workflow) | **Ничего** (ручное тестирование) |
|---|---|---|---|---|
| **Workflow** | 5 стадий: strategy → audit → impl → review → verify | Нет тестового workflow | Ad-hoc: «напиши тесты для X» | Ручной процесс |
| **Persistable state** | ✅ `agent-state.json` — checkpoint, resume | ❌ ❌ | ❌ Потеря контекста между сессиями | N/A |
| **Audit-first** | ✅ Сначала анализ покрытия, потом имплементация | ❌ | ❌ Сразу пишет код | Ручной анализ |
| **Quality gates** | ✅ Per-task, явные критерии | ❌ | ❌ Нет встроенной проверки | Code review человеком |
| **Double documentation** | ✅ JSON (machine) + Markdown (human) | ❌ | ❌ Только текст чата | Документируется вручную |
| **Stack-agnostic core** | ✅ React, Java, JS/TS, Python, Go — через оверлеи | ❌ Только frontend patterns | Зависит от промпта | Зависит от разработчика |
| **Iterative execution** | ✅ Одна задача/итерация, атомарные обновления | ❌ | ❌ «Сделай всё за раз» — теряет контекст | Итеративно, но вручную |
| **Review тестов** | ✅ Специализированный test-reviewer agent | Частично (code review) | ❌ Нет | Peer review |
| **Verification** | ✅ Тест-раннер + статус в state | ❌ | ❌ «Надеюсь что работает» | CI/CD pipeline |
| **Handoff between sessions** | ✅ Через state file | ❌ | ❌ | Ручной |
| **Multi-agent pipeline** | ✅ 5 специализированных агентов | ✅ 6 агентов (но без тестов) | ❌ Один AI | Команда людей |
| **Fallback commands** | ✅ `/audit-tests`, `/implement-tests` etc. | ✅ | ❌ | N/A |
| **Machine-readable progress** | ✅ JSON Schema + валидация | ❌ | ❌ | ❌ |
| **CI/CD integration ready** | ✅ Валидатор state CLI (Phase 3) | ❌ | ❌ | ✅ Традиционные tools |

---

### Сводный балл

| Параметр | GigaTest | superpowers | Raw AI | Ничего |
|---|---|---|---|---|
| Автоматизация тестирования | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | - |
| Качество тестов | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Воспроизводимость | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ |
| Скорость (от 0 до тестов) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| Масштабируемость | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Стек-агностицизм | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 2. Детальный разбор

### 2.1 GigaTest vs superpowers-5.0.6

**superpowers** — это workflow для создания кода (spec → plan → impl → review → verify).
GigaTest адаптирует эту модель специально для тестирования.

| Параметр | superpowers | GigaTest | Почему это важно |
|---|---|---|---|
| Фокус | Генерация кода | Верификация кода | Разные задачи, разные подходы |
| Тестовый audit | Нет | ✅ Обязательная стадия | Без аудита агент пишет «что попало» |
| Test state persistence | Нет | ✅ agent-state.json | Resume after interruption |
| Test quality gates | Нет | ✅ Per-task | Нет gate → нет done |
| Stack overlays | Нет | ✅ 5+ стеков | Один продукт для всей команды |
| Double documentation | Нет | ✅ JSON + Markdown | PR содержит diff плана |

**Когда superpowers лучше:** Когда нужно спроектировать и реализовать новую фичу.

**Когда GigaTest лучше:** Когда нужно верифицировать качество существующего кода.

---

### 2.2 GigaTest vs Raw AI (без workflow)

**Raw AI** — это ChatGPT/Claude/Qwen без структуры: промпт → ответ → забыл → снова промпт.

| Параметр | Raw AI | GigaTest | Почему это важно |
|---|---|---|---|
| Память между запросами | ❌ Нет | ✅ agent-state.json | Без памяти — каждая сессия начинается заново |
| Приоритизация | ❌ Ad-hoc | ✅ C/H/M/L | Без приоритетов — тестирует «что первое придёт в голову» |
| План тестирования | ❌ Нет структуры | ✅ Structured plan | Без плана — нет понимания что покрыто |
| Verifier | ❌ Нет | ✅ test-verifier | «Написал тесты» ≠ «тесты работают» |
| Качество тестов | ❌ Нет gate | ✅ test-reviewer + quality gates | AI-тесты часто тестируют implementation, не behavior |

**Когда Raw AI лучше:** Для быстрых, разовых вопросов. Не для системного тестирования.

**Когда GigaTest лучше:** Всегда, когда тестирование — это больше чем «напиши один test».

---

### 2.3 GigaTest vs Ручное тестирование

| Параметр | Ручное | GigaTest | Почему это важно |
|---|---|---|---|
| Скорость | Медленно | Быстро (1 сессия) | Разработчики не пишут тесты из-за времени |
| Consistency | Зависит от человека | Стандартизированный workflow | Без стандарта — каждый тестирует по-своему |
| Покрытие | Зависит от опыта | Audit-first → полное покрытие | Без аудита — пропускают критичные пути |
| Документация | Часто отсутствует | Автоматическая | Нет test-plan → непонятно что тестировали |
| Повторяемость | Требует effort каждый раз | Одна команда → полный цикл | Разработчики повторяют → нужен low-friction process |

---

## 3. Killer Features — что есть только у GigaTest

### 3.1 Persistable JSON State

> **Единственный** тестовый workflow с checkpoint-based execution.

```json
{
  "session": {
    "status": "in_progress",
    "checkpoint": {
      "iteration": 3,
      "plan_item_id": "IMPL-002",
      "description": "Hook tests done, continuing with formatCounter"
    }
  }
}
```

Агент прервался → открыл снова → продолжил с checkpoint. Ни superpowers, ни Raw AI этого не делают.

### 3.2 Double Documentation (W0.5)

> JSON для машины. Markdown для человека. Всегда синхронизированы.

- `agent-state.json` — source of truth, валидируется по схеме
- `test-plan.md` — regenerated, показывает прогресс в PR

Raw AI выдаёт текст chat. superpowers создаёт файлы но не синхронизирует state.

### 3.3 Audit-First Workflow

> Никогда не пишем тесты без анализа покрытия.

Raw AI сразу пишет код. GigaTest сначала находит что покрыто, что нет, приоритизирует, потом пишет.

**Результат:** Полное покрытие вместо «написал что было легко».

### 3.4 Quality Gate System

> Каждая задача имеет явные критерии. Нет gate → нет done.

```json
{
  "quality_gate": [
    "User interactions: userEvent.click",
    "Async behavior: counter updates after async API call",
    "Edge cases: negative values, max value limit"
  ]
}
```

test-reviewer проверяет каждый gate. Raw AI не проверяет качество своих тестов.

### 3.5 Stack-Agnostic с оверлеями

> Одно ядро — множество стеков.

| Ядро (shared) | Оверлеи (stack-specific) |
|---|---|
| agent-workflow-core | react-testing.md |
| testing-standards | java-testing.md |
| | js-ts-testing.md |
| | python-testing.md |
| | go-testing.md |

superpowers имеет только frontend patterns. GigaTest — все стеки.

---

## 4. Когда что выбирать

| Сценарий | Рекомендуемый инструмент |
|---|---|
| Написать новый API endpoint с нуля | **GigaCraft** (структурированный backend workflow) |
| Написать тесты к существующему коду | **GigaTest** |
| «Напиши мне unit test для этой функции» (разовый) | **Raw AI** |
| Код-ревью PR | **superpowers** или **GigaCraft** |
| Написать тесты для нового React компонента | **GigaTest** |
| Написать тесты для Java Spring Service | **GigaTest** (с java-testing overlay) |
| Полный цикл: feature → тесты → верификация | **GigaCraft** + **GigaTest** (через bridge) |
| «Просто проверить что функция работает» | **Raw AI** достаточно |
| Системное тестирование проекта без тестов | **GigaTest** (audit-first → полное покрытие) |
| Review качества существующих тестов | **GigaTest** (/review-tests) |

---

## Резюме

| | GigaTest | superpowers | Raw AI | Ничего |
|---|---|---|---|---|
| **Для тестирования** | ✅ Лучший | ❌ Не для тестов | ❌ Без структуры | ❌ Медленно |
| **Для создания фич** | ❌ Не для фич | ✅ Хорош | ⚠️ Для мелких | ❌ Медленно |
| **Универсальность** | ✅ 5+ стеков | ❌ Frontend only | ✅ Зависит от промпта | ✅ Не зависит от tools |
| **Автоматизация** | ✅ 5 стадий | ❌ | ❌ | ❌ |
| **Качество результата** | ✅ Quality gates + review | ✅ Multi-agent review | ❌ Без проверки | ⚠️ Зависит от человека |

> **GigaTest — лучший выбор для системного тестирования кода любой сложности.
> Для создания фич используйте GigaCraft или superpowers.
> Для разовых вопросов — Raw AI.**

---

*Документ принадлежит: docs/*
*Смежные документы: VISION.md, DEMO.md, METRICS.md, BLOCK-2-GIGATEST-GROWTH.md*
