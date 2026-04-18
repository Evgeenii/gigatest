# METRICS.md — Метрики успеха GigaTest

> Версия: 1.0 | Дата: 2026-04-18
>
> **Назначение:** Определить что измеряет успех GigaTest, какие метрики собираем, как считаем.
> **Аудитория:** Продуктовая команда, разработчики, стейкхолдеры.

---

## Содержание

1. [North Star Metric](#1-north-star-metric)
2. [Операционные метрики](#2-операционные-метрики)
3. [Метрики качества](#3-метрики-качества)
4. [Метрики принятия](#4-метрики-принятия)
5. [Источники данных](#5-источники-данных)
6. [Формулы](#6-формулы)
7. [Dashboard](#7-dashboard)

---

## 1. North Star Metric

### Процент автономных сессий без эскалации

> **Определение:** Доля тестовых сессий, в которых агент самостоятельно прошёл все стадии (strategy → audit → implement → review → verify) без вмешательства человека.

**Формула:**
```
автономные_сессии
────────────────────── × 100
  все_сессии
```

**Целевое значение:** ≥ 70% через 6 месяцев после production-ready.

**Почему это North Star:**
- Если агент не может завершить сам — workflow не работает
- Если человек вмешивается — ценность GigaTest снижается
- 70% — реалистичный порог: не все ситуации автоматизируемы, но большинство — да

**Как измеряем:**
- Считаем сессии в `agent-state.json` по полю `session.status`
- «Эскалация» = поле `memory.context.last_error != null` ИЛИ `session.status = blocked` с ручным resume
- «Автономная» = `session.status = completed` без ручного вмешательства

**Target по фазам:**

| Фаза | Целевое значение |
|------|-----------------|
| Phase 0 (baseline) | ~40% (ещё не стабилизировано) |
| Phase 1 | ≥ 50% (стабилизация workflow) |
| Phase 2 | ≥ 60% (stack overlays помогают) |
| Phase 3 | ≥ 65% (тулинг помогает debugging) |
| 6 месяцев | ≥ 70% (vision target) |

---

## 2. Операционные метрики

### 2.1 Сессий в день/неделю

**Определение:** Количество активных test-сессий за период.

**Формула:**
```
COUNT(agent-state.json) WHERE session.started_at IN [период]
```

**Зачем:** Adoption metric. Растёт → продукт нужен.

**Источники данных:**
- Сессии: `agent-state.json` файлы в `.gigacode/plans/*/`
- Период: анализ по `session.started_at`

---

### 2.2 Среднее время сессии (от audit до verify)

**Определение:** Сколько времени проходит от начала аудита до завершения верификации.

**Формула:**
```
AVG(session.last_updated - session.started_at)
WHERE session.status = completed
```

**Зачем:** UX metric. Сессии должны становится короче (эффективнее).

**Цель:** ≤ 1 сессия = от «нет тестов» до «первый PR с тестами».

---

### 2.3 Средний прогресс за сессию

**Определение:** Какой процент плана задач выполнен за одну сессию.

**Формула:**
```
AVG(plan.meta.progress_percent)
WHERE session.last_updated IN [период]
```

**Зачем:** Показывает completeness. Если сессия завершается на 60% — workflow прерывается.

**Target:** ≥ 85% за сессию.

---

### 2.4 Распределение задач по стадиям

**Определение:** Сколько задач в каждой стадии (strategy, audit, impl, review, verify).

**Формула:**
```
COUNT(plan.items) GROUP BY subtype
```

**Зачем:** Показывает баланс. Если impl >> review — bottleneck в review.

---

### 2.5 Повторные сессии (resumption rate)

**Определение:** Доля сессий, которые были возобновлены после прерывания (использовали checkpoint).

**Формула:**
```
сессии_с_resume
───────────────── × 100
   все_сессии
```

**Зачем:** Проверяет ценность persistable state. Если没人 resumе — persistable state не нужен.

**Target:** ≥ 20% повторных сессий (показывает что checkpoint используется).

---

## 3. Метрики качества

### 3.1 Test quality gate pass rate

**Определение:** Доля задач impl, которые прошли review с первого раза.

**Формула:**
```
IMPL_задачи_с_review_status=approved_с_первой_попытки
───────────────────────────────────────────────────────── × 100
              Все IMPL задачи, прошедшие review
```

**Зачем:** Показывает качество имплементации. Низкий rate → implementer пишет плохие тесты.

**Target:** ≥ 80% с первого раза.

---

### 3.2 Среднее покрытие тестами после сессии

**Определение:** Средний % code coverage по всем завершённым сессиям.

**Формула:**
```
AVG(coverage_percent из VERIFY-001 result)
WHERE session.status = completed
```

**Зачем:** Конечный результат работы GigaTest — покрытие кода тестами.

**Target:** ≥ 80% average coverage.

---

### 3.3 Количество invalid/missing coverage после audit

**Определение:** Сколько целевых файлов имели invalid или missing coverage до начала работы.

**Формула:**
```
COUNT(plan.items) WHERE coverage_status IN ['invalid', 'missing']
```

**Зачем:** Показывает исходное состояние проекта. Большие числа = большая ценность GigaTest.

---

### 3.4 Error rate (сессии с ошибками)

**Определение:** Доля сессий, где `memory.context.last_error != null`.

**Формула:**
```
сессии_с_ошибкой
───────────────── × 100
   все_сессии
```

**Зачем:** Показывает стабильность. Должен снижаться от фазы к фазе.

**Target:** ≤ 10%.

---

## 4. Метрики принятия

### 4.1 Активных extension-установок

**Определение:** Сколько раз GigaTest установлен и использован хотя бы раз.

**Формула:**
```
COUNT(уникальных пользователей) WHERE sessions.count >= 1
```

**Зачем:** Базовый adoption metric.

---

### 4.2 Retention (возвращаемость)

**Определение:** Доля пользователей, вернувшихся к GigaTest в течение 30 дней.

**Формула:**
```
пользователи_с_сессиями_в_[дней_0-30]_И_[дней_31-60]
────────────────────────────────────────────────────── × 100
          пользователи_с_сессиями_в_[дней_0-30]
```

**Зачем:** Если пользователи не возвращаются — продукт не решает задачу.

**Target:** ≥ 50% через 30 дней.

---

### 4.3 NPS / User satisfaction

**Определение:** Субъективная оценка полезности GigaTest (опрос пользователей).

**Шкала:** 1–10 (promoter vs detractor).

**Зачем:** Количественная оценка user experience.

**Target:** NPS ≥ 40.

---

### 4.4 Stack distribution

**Определение:** Распределение сессий по stack overlays.

**Формула:**
```
COUNT(plan.items) GROUP BY context_ref
```

**Зачем:** Показывает какие стеки наиболее популярны. Помогает приоритизировать оверлеи.

---

## 5. Источники данных

| Метрика | Источник | Формат | Частота обновления |
|---------|----------|--------|-------------------|
| Автономные сессии | `agent-state.json` | JSON | Real-time |
| Время сессии | `agent-state.json` `.session.*_at` | ISO8601 | Real-time |
| Прогресс сессии | `agent-state.json` `.plan.meta.progress_percent` | Integer | Real-time |
| Coverage status | `agent-state.json` `.plan.items[].coverage_status` | Enum | Real-time |
| Quality gate pass | `agent-state.json` `.plan.items[].review_status` | Enum | Real-time |
| Error rate | `agent-state.json` `.memory.context.last_error` | String/null | Real-time |
| Установка extension | Extension marketplace | Count | Weekly |
| Retention | Telemetry (analytics) | % | Monthly |
| NPS | User survey | Score | Quarterly |

### Структура данных для сбора

```jsonc
// Пример: что собираем из каждой сессии
{
  "session_id": "sess-20260418-001",
  "user_id": "anon-hash",
  "started_at": "2026-04-18T09:00:00Z",
  "completed_at": "2026-04-18T11:30:00Z",
  "status": "completed",
  "autonomous": true,
  "stages_completed": 5,
  "total_plan_items": 7,
  "completed_plan_items": 7,
  "progress_percent": 100,
  "final_coverage": 87,
  "error": null,
  "stack": "react",
  "resumed_from_checkpoint": false
}
```

---

## 6. Формулы

### Readiness Score

Составная метрика готовности продукта:

```
Readiness = (C_score + H_score + M_score + L_score) / 4

Где:
  C_score = (total_critical_gaps_closed / total_critical_gaps) × 5
  H_score = (total_high_gaps_closed / total_high_gaps) × 5
  M_score = (total_medium_gaps_closed / total_medium_gaps) × 5
  L_score = (total_low_gaps_closed / total_low_gaps) × 5
```

Цель: ≥ 5.0/5 при всех закрытых гэпах.

---

### Session Completion Rate

```
SCR = completed_sessions / all_sessions × 100
```

Где completed = `session.status = completed`.

---

### Autonomous Session Rate (North Star)

```
ASR = autonomous_completed_sessions / all_sessions × 100
```

Где autonomous_completed = `session.status = completed` AND `!human_intervention`.

---

### Time-to-First-Test (TTFT)

```
TTFT = AVG(IMPL-001.completed_at - session.started_at)
```

Время от начала сессии до первого готового теста.

Цель: ≤ 5 минут.

---

### Test Quality Index (TQI)

```
TQI = (behavior_first_tests + aaa_compliant_tests + no_excessive_mocks) / total_tests × 100
```

Процент тестов, соответствующих quality gates.

Цель: ≥ 90%.

---

## 7. Dashboard

### Минимальный dashboard (Phase 4)

| Метрика | Текущее | Target | Статус |
|---------|---------|--------|--------|
| Readiness Score | 4.9/5 | 5.0/5 | 🟡 |
| North Star (ASR) | TBD | ≥ 70% | ⚪ Нет данных |
| Sessions this week | TBD | — | ⚪ Нет данных |
| Avg coverage | TBD | ≥ 80% | ⚪ Нет данных |
| Quality gate pass rate | TBD | ≥ 80% | ⚪ Нет данных |
| Error rate | TBD | ≤ 10% | ⚪ Нет данных |

### Как начать собирать данные

1. **Phase 4–5:** Ручной сбор — анализ `agent-state.json` файлов из сессий
2. **Phase 5+:** Автоматический сбор — telemetry endpoint при каждом checkpoint
3. **Dashboard:** Simple markdown table (как выше) → затем Grafana/Datadog

### Минимальная аналитика (MVP)

```bash
# Посчитать автономные сессии
find .gigacode/plans/ -name agent-state.json | while read f; do
  jq -r '.session.status' "$f"
done | sort | uniq -c | sort -rn

# Посчитать avg coverage
find .gigacode/plans/ -name agent-state.json | while read f; do
  jq -r '.plan.items[] | select(.subtype != "") | .coverage_status' "$f"
done | sort | uniq -c
```

---

## Краткая справка метрик

| # | Метрика | Тип | Формула | Target |
|---|---------|-----|---------|--------|
| 1 | **Autonomous Session Rate** ⭐ | North Star | автономные / все × 100 | ≥ 70% |
| 2 | **Session Completion Rate** | Операционная | завершённые / все × 100 | ≥ 80% |
| 3 | **Average Coverage** | Качества | AVG(coverage%) | ≥ 80% |
| 4 | **Quality Gate Pass Rate** | Качества | approved с 1 раза / все × 100 | ≥ 80% |
| 5 | **Time-to-First-Test** | Операционная | AVG(IMPL-001 completion - start) | ≤ 5 min |
| 6 | **Error Rate** | Операционная | сессии с ошибкой / все × 100 | ≤ 10% |
| 7 | **Resumption Rate** | Операционная | повторные сессии / все × 100 | ≥ 20% |
| 8 | **Retention 30d** | Принятия | вернулись через 30d / все × 100 | ≥ 50% |

---

*Документ принадлежит: docs/*
*Смежные документы: VISION.md, DEMO.md, COMPARISON.md, BLOCK-2-GIGATEST-GROWTH.md*
