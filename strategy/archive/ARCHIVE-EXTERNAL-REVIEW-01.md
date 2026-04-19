# Внешний ревью готовности GigaTest

> Дата ревью: 2026-04-19
> Ревьюер: Qwen Code (внешний аудит на основе кодовой базы и strategy/)
> Базовые документы: `strategy/VISION.md` v3.1, `strategy/READINESS-MATRIX.md` v5.0,
> `strategy/backlog.yaml` v4.3, `strategy/PROMPT-QUALITY-SPEC.md` v2.0

---

## TL;DR

- **Проект фактически готов (prod-ready core).** Все Phase 0–5 закрыты, включая Convention Discovery. Readiness Score по матрице — 4.0/5 (занижен за счёт двух новых измерений, введённых самим аудитом v5.0; реально по core-измерениям 4.7–5.0).
- **PROMPT-QUALITY-SPEC частично уже применён.** PQ-01 завершён. PQ-02, PQ-03, PQ-04 по факту в коде **выполнены**, но не отмечены `done` в `backlog.yaml`. Это расхождение между фактом и трекером, а не реальные гэпы.
- **Реально нерешённых задач из PROMPT-QUALITY-SPEC — 2 группы (P1):** субъективные термины (`narrow`/`unusual`/`narrowest` — 5 вхождений в 3 файлах) и системный рефакторинг DRY (W10/W11 раздуты, R2/R3/R4.1 дублируются в 5 overlay × ~50 строк).
- **Мой вердикт:** реализовывать всю спеку в лоб сейчас — **не актуально**. Целесообразен **минимальный прагматичный срез PQ-13 + синхронизация backlog**. Большой рефакторинг (PQ-10, PQ-15, языковая миграция §10) — только если появится реальная потребность или второй автор.

---

## 1. Карта проекта vs стратегия

### 1.1 Фактическая структура (что есть на диске)

| Артефакт | Количество | Путь |
|---------|-----------|------|
| Skills | 9 | `skills/{agent-workflow-core,convention-discovery,convention-review,test-audit,test-implementation,test-plan-template,test-review,test-verification,using-gigatest}/SKILL.md` |
| Agents | 6 | `agents/{convention-discoverer,test-auditor,test-implementer,test-reviewer,test-strategist,test-verifier}.md` |
| Context overlays | 6 | `context/{testing-standards,react,java,js-ts,python,go}-testing.md` |
| Commands | 5 | `commands/{audit,implement,review,run,strategy}-tests.md` |
| Tools | 2 | `tools/{validate-state.js,generate-report.js}` |
| Plans examples | 2 | `plans/{tests-audit-example,tests-e2e-example}/` |
| Docs | 6 | `docs/{ONBOARDING,DEMO,COMPARISON,METRICS,TEMPLATE-SYNTAX,CONVENTION-DISCOVERY}.md` |

### 1.2 Покрытие стратегии фактом

| Phase / Block | Заявлено в стратегии | Фактически реализовано | Статус |
|---|---|---|---|
| Phase 0 (Production Ready, C1–C5) | 6 задач | Все 6 — файлы присутствуют, схемы с `$ref` + `additionalProperties: false`, e2e пример есть | ✅ done |
| Phase 1 (Стабилизация, H1–H5) | 5 задач | test-verifier.md, W8.4 regen, W6 pre-flight, ONBOARDING.md — всё на месте | ✅ done |
| Phase 2 (Расширение) | 6 задач | Python + Go overlay, Exit Conditions во всех SKILL.md, W10 State Discovery, Stack Detection в QWEN.md, TEMPLATE-SYNTAX.md | ✅ done |
| Phase 3 (Тулинг) | 2 задачи | `tools/validate-state.js`, `tools/generate-report.js` | ✅ done |
| Phase 4 (Demo) | 3 задачи | DEMO.md, COMPARISON.md, METRICS.md | ✅ done |
| Phase 5 (Convention Discovery) | 6 задач | skills/convention-discovery, schema, convention-discoverer agent, W11, convention-review skill, docs/CONVENTION-DISCOVERY.md | ✅ done |
| Phase 6 (Architecture & Prompt Quality) | 9 задач | P0-A1..A5, PQ-01 — done. PQ-02/03/04 — в backlog `pending`, в коде **де-факто сделаны** (см. §3) | 🟡 частично |
| Bridge (GigaCraft) | 3 задачи | Блокирован до stable GigaTest — корректно | ⏸️ deferred |

**Вывод:** Из 49 задач backlog закрыто 46–47 (реально). Осталось 2–3 micro-правки + P1 из PROMPT-QUALITY-SPEC.

---

## 2. Готовность по измерениям (с моими корректировками)

Сравниваю с READINESS-MATRIX v5.0. В скобках — оценка автора, после `→` — моя после проверки кодовой базы.

| Измерение | Автор | Моя | Комментарий |
|---|---|---|---|
| Архитектура workflow | 4.8 → **4.8** | = | Полный 5-стадийный цикл, W6/W8.4/W10/W11 — всё реализовано |
| State Management | 4.9 → **4.9** | = | Схемы строгие, `content_hash` добавлен, CLI-валидатор работает |
| Агентная система | 4.9 → **4.9** | = | 6 агентов, все ссылаются на skills и W6 |
| Skills | 5.0 → **4.8** | ↓0.2 | Базово все 9 есть, но `agent-workflow-core/SKILL.md` раздут до 654 строк при цели ≤400 |
| Stack Coverage | 4.7 → **4.7** | = | 5 стеков + base standards |
| Developer Experience | 4.7 → **4.7** | = | README/ONBOARDING/DEMO — всё работает |
| Документация | 4.5 → **4.5** | = | ADR отсутствуют (минус), всё остальное зрело |
| Интеграция (мост) | 1.5 → **1.5** | = | Сознательно отложено |
| Тулинг | 4.5 → **4.5** | = | 2 CLI-утилиты, покрывают base cases |
| Convention Discovery | 0.5 → **4.5** | ↑4.0 | **Матрица не обновлена**: Phase 5 завершён, skill + agent + schema + docs присутствуют |
| Архитектурная надёжность | 3.5 → **4.2** | ↑0.7 | P0-A1..A5 закрыты (см. backlog `status: done`), матрица занижает |
| Качество промтов | 3.5 → **3.8** | ↑0.3 | P0-четвёрка PQ-01..04 де-факто выполнена в коде (см. §3) |

**Итоговая переоценка:** **4.5 / 5** (вместо 4.0 в матрице). READINESS-MATRIX.md v5.0 устарела относительно текущего состояния кодовой базы.

---

## 3. Аудит актуальности PROMPT-QUALITY-SPEC v2.0

Это — центральный вопрос. Прошёлся по §6–§7 спеки и сверил с реальными файлами.

### 3.1 Раунд 1 (PQ-01..PQ-04) — статус факта

| ID | Задача | Backlog | Факт в коде | Вердикт |
|----|---|---|---|---|
| PQ-01 | Убрать «или иную логику» в W1.4 | `done` | W1.4 содержит детерминированный алгоритм (`skills/agent-workflow-core/SKILL.md:137–165`). Фраза осталась только в `strategy/` и архивах (метаописания) | ✅ **фактически сделано** |
| PQ-02 | «менее 3 → `coverage_status: partial`» | `pending` | `skills/test-audit/SKILL.md` Phase 2: `менее 3 → coverage_status: "partial"` — явно в коде | ✅ **фактически сделано, статус в backlog отстал** |
| PQ-03 | QWEN.md Stack Detection → ссылка | `pending` | `QWEN.md:7–13` уже содержит **только ссылку** на W10.2, без таблицы | ✅ **фактически сделано, статус в backlog отстал** |
| PQ-04 | Quality Checklist единый source | `pending` | `testing-standards.md §3` помечен «Source of truth», test-audit и test-review используют `@context/testing-standards.md §3` + delta | ✅ **фактически сделано, статус в backlog отстал** |

**Рекомендация #1:** прогнать `backlog.yaml` — обновить PQ-02/PQ-03/PQ-04 в `done`. Это 5 минут работы, но устранит расхождение восприятия между стратегией и реальностью.

### 3.2 Раунд 2 — P0 (критично)

| ID | Задача | Статус в коде | Моя оценка актуальности |
|----|---|---|---|
| **PQ-10** | Вынести W10/W11 из agent-workflow-core в отдельные skills | Не сделано. `agent-workflow-core/SKILL.md` = 654 строки (цель ≤400) | 🟡 **Умеренно актуально.** Болит при чтении, но не блокирует функциональность. Риск декомпозиции — сломать импорт в QWEN.md. Делать только если готовы к smoke-прогону |
| **PQ-11** | Убрать дубликат W8 (шаблон test-plan.md) | Не сделано | 🟢 **Актуально, дёшево.** Один файл, одна ссылка — 20 минут |
| **PQ-12** | Синхронизация импортированного W8.4 в QWEN.md | Не требуется (QWEN.md импортирует skills через `@./`) | ✅ not applicable |

### 3.3 Раунд 2 — P1 (желательно)

| ID | Задача | Статус в коде | Моя оценка актуальности |
|----|---|---|---|
| **PQ-13** | Заменить субъективные термины `narrow`/`unusual`/`narrowest` | **Не сделано.** 5 вхождений в 3 файлах (см. grep ниже) | 🟢 **Рекомендую сделать.** Дёшево (20–30 минут), прямо повышает предсказуемость агентов |
| **PQ-14** | test-review Forbidden Patterns → ссылка на §4 testing-standards | Частично. В `test-review/SKILL.md` уже отделены React-specific, но базовая таблица дублирует `testing-standards §4` | 🟡 Косметика |
| **PQ-15** | R2/R3/R4.1 overlays → единый источник | Не сделано. 5 overlays × ~50 строк = ~250 строк дублирования | 🔴 **Большой рефакторинг.** Риск сломать stack-specific R2/R3, которые могут различаться тонкостями. **Отложить** |
| **PQ-16** | W6 pre-flight в agents → ссылка | Не проверял построчно, но вероятно уже есть через общий шаблон. Дёшево если реально дублируется | 🟡 Косметика |

### 3.4 Локализация субъективных терминов (PQ-13 grep result)

```
skills/test-review/SKILL.md:87          "valid but unusual pattern"
skills/test-implementation/SKILL.md:42  "Keep scope narrow and bounded"
skills/using-gigatest/SKILL.md:38       "ask one narrow clarifying question"
skills/test-verification/SKILL.md:29    "the narrowest command that can prove"
skills/test-verification/SKILL.md:60    "Prefer the narrowest useful verification"
```

Все 5 мест можно заменить конкретными verifiable формулировками за один присест.

### 3.5 P2 (опционально) — моё мнение: не делать сейчас

- **PQ-17** (R9 для Java/JS) — полезно, но аддитивно, не блокирует. После первого реального пользователя
- **PQ-21** (Classification Table вынести) — даёт минус ~20 строк ценой разрыва читаемости `testing-standards.md`. Не стоит
- **PQ-22** (версия в testing-standards) — уже есть: `> Версия: 2.0 | Дата: 2026-04-18` (`testing-standards.md:3`). ✅
- **PQ-23** (алиасы для путей) — зависит от поддержки со стороны runtime расширения. Не трогать
- **PQ-24** (Common Exit Conditions) — теряется локальность, каждый skill становится зависим от core
- **PQ-25** (docs/PROMPT-STYLE-GUIDE.md) — документация ради документации, у вас уже есть PROMPT-QUALITY-SPEC
- **PQ-26** (W3.2 «может» → «должен») — микро
- **Языковая миграция §10** (8 файлов, 486 строк, RU→EN) — 🔴 **не трогать**. Аргументы ниже

### 3.6 Про языковую миграцию §10 отдельно

Спека аргументирует: «всё что читает LLM → английский». Но:

1. Современные LLM обрабатывают русские промты эквивалентно английским; потеря качества ≤ noise
2. Ваш output-language правило явно требует отвечать на русском, а вся strategy/ на русском
3. Миграция на EN создаёт риск расхождения формулировок (русский `ДОЛЖНО` vs английский `MUST` — не 1:1 mapping для «not MUST» категорий типа «ДОЛЖНО рассмотреть»)
4. Объём работы: 486 строк × тонкости терминологии, нужен билингвальный review (риск указан в самой спеке §10.5)
5. **Ценность для пользователя = 0.** Это internal refactor без observable benefit

**Моя рекомендация по §10: отказаться или отложить на неопределённый срок.** Зафиксировать в спеке статус «не приоритет». Для новых файлов — можно принять rule «пишем на английском», не переписывая существующие.

---

## 4. Итоговая оценка актуальности PROMPT-QUALITY-SPEC

### 4.1 Что делать сейчас (минимальный срез, 1–2 часа работы)

Делаю этот кластер, **если хотите добить Phase 6 до конца**:

1. **Обновить `backlog.yaml`:** PQ-02, PQ-03, PQ-04 → `status: done` + `completed_at` (факты давно в коде)
2. **PQ-13** (20–30 мин): заменить `narrow`/`unusual`/`narrowest` в 3 файлах на verifiable формулировки. Примеры:
   - `narrow scope` → `do not modify files outside the current task's artifact path`
   - `valid but unusual pattern` → `pattern not listed in Forbidden Patterns`
   - `narrowest command` → `single most specific command for the claimed coverage area`
3. **PQ-11** (15 мин): заменить тело W8 шаблона test-plan.md в `agent-workflow-core/SKILL.md` ссылкой на `test-plan-template/SKILL.md`
4. **Обновить `READINESS-MATRIX.md`:** скорректировать Convention Discovery (0.5 → 4.5) и Архитектурная надёжность (3.5 → 4.2). Матрица отстаёт от реальности

**Эффект:** Readiness Score по матрице = **4.6 / 5** (реальный), Phase 6 — 100% done по факту.

### 4.2 Что НЕ делать сейчас

- **PQ-10** (выделение state-discovery/convention-loading skills) — архитектурный рефактор, требует smoke-тест, риск сломать импорты. **Отложить** до момента, когда `agent-workflow-core/SKILL.md` реально начнёт мешать
- **PQ-15** (вынос R2/R3/R4.1 в testing-standards §6) — 250 строк dedup ценой введения параметрического шаблонизатора в базовый документ. **Отложить** до появления 6+ стеков
- **§10 Языковая миграция** — отменить или отложить без даты (см. §3.6)
- **PQ-17/PQ-21/PQ-24/PQ-25** — низкая ценность, не трогать

### 4.3 Общий вердикт по актуальности PROMPT-QUALITY-SPEC

- **Спека полезна как карта качества**, но из 25+ пунктов реально **стоит делать только ~5** (из них 3 уже по факту в коде)
- **Риск over-engineering высок:** спека сама диагностирует `agent-workflow-core` раздутым, но предлагает создать ещё 2 skill-файла. Это не уменьшает когнитивную нагрузку, а перераспределяет её
- **Priority-ordered рекомендация:**
  1. ✅ Sync `backlog.yaml` ← критически (честность состояния)
  2. ✅ PQ-13 ← дёшево, полезно
  3. 🟡 PQ-11 ← если заскучали
  4. 🔴 PQ-10, PQ-15, §10 ← только под конкретный триггер (жалобы пользователей, второй автор)

### 4.4 Приоритет текущего этапа

**Что сейчас ценнее чем добивать PROMPT-QUALITY-SPEC:**

1. **Первый реальный пользователь** (Phase 1 exit metric). Онбординг-гайд есть, e2e пример есть — нужен dogfooding, чтобы найти реальные гэпы промтов, а не лингвистические
2. **Bridge Level 1** (awareness в GigaCraft) — 1 блок текста в чужом репозитории, открывает interop story для демо
3. **ADR**: `[-0.5]` в документации из-за отсутствия ADR. Для prod-grade важнее чем cosmetic prompt polishing

---

## 5. Риски и наблюдения

### 5.1 Расхождение backlog vs факт

**Severity: Medium.** `backlog.yaml v4.3` в `meta` пишет `readiness_score: "5.0/5"`, но статусы PQ-02/03/04 = `pending`. Это внутреннее противоречие: либо матрица врёт, либо статусы не обновлены. По факту — статусы отстают. Синхронизация — 5 минут.

### 5.2 Архитектурный долг: agent-workflow-core = 654 строки

Сам документ признаёт эту проблему. Пока не критично (читается через импорты, LLM справляется), но при росте фреймворка это будет точкой сопротивления. Мониторить; если превысит 800 — PQ-10 становится обязательным.

### 5.3 Слабая верификация prompt changes

Нет автоматической проверки, что `[AGENT]` логи реально выводятся, что импорты `@./skills/...` резолвятся. Все проверки — ручные через e2e example. Это масштабируемо только до ~10 skills.

**Идея (не из спеки):** `tools/validate-prompts.js` — статический линтер: форбиддены субъективные термины (из §9.4), проверка front-matter, длины файлов (§9.2), валидация `@./`-ссылок. Это заменит половину PROMPT-QUALITY-SPEC автоматикой и будет ценнее, чем точечная ручная правка 5 мест.

### 5.4 Anti-goal «не сливать GigaCraft и GigaTest» — устойчив

По факту архитектуры: разные директории артефактов (`.gigacode/plans/` vs `.gigacraft/plans/`), разные agent sets, разный root prompt. Никаких перекрёстных импортов нет. ✅ Принцип соблюдён.

---

## 6. Финальные рекомендации (action list)

### Must-do (≤ 2 часа суммарно)

- [ ] **Синхронизировать `backlog.yaml`**: PQ-02, PQ-03, PQ-04 → `done` + `completed_at: 2026-04-19`
- [ ] **PQ-13**: заменить `narrow`/`unusual`/`narrowest` в 5 местах на verifiable формулировки
- [ ] **Обновить `READINESS-MATRIX.md`**: Convention Discovery 0.5 → 4.5, Архитектурная надёжность 3.5 → 4.2, пересчитать ИТОГО

### Should-do (если добивать Phase 6)

- [ ] **PQ-11**: W8 шаблон в `agent-workflow-core` → ссылка на `test-plan-template`
- [ ] **PQ-14/PQ-16**: точечная дедупликация, если построчная проверка покажет дублирование

### Nice-to-have (стратегический вектор)

- [ ] **Onboarding первого реального пользователя** (Phase 1 exit metric, сейчас фикция)
- [ ] **tools/validate-prompts.js**: статический линтер промтов (заменит половину PROMPT-QUALITY-SPEC автоматикой)
- [ ] **ADR (docs/adr/*)**: хотя бы 3 ключевых архитектурных решения (почему double documentation, почему skills-first, почему не сливаемся с GigaCraft)

### Don't-do (не начинать сейчас)

- ❌ PQ-10 (выделение W10/W11 в отдельные skills) — отложить
- ❌ PQ-15 (R2/R3/R4.1 унификация в testing-standards §6) — отложить
- ❌ §10 Языковая миграция на английский — отменить или заморозить
- ❌ PQ-17, PQ-21, PQ-24, PQ-25 — low value

---

## 7. Ответ на исходный вопрос

> «Оцени проект, степень готовности и насколько актуально реализовывать спеку в промт импруву.»

1. **Степень готовности:** **4.5 / 5 по факту** (матрица 4.0 отстаёт). Это production-ready core: 5-стадийный workflow работает end-to-end, есть CLI-тулинг, 5 stack overlays, Convention Discovery. Заблокирован только Bridge к GigaCraft (и это сознательно).

2. **Актуальность PROMPT-QUALITY-SPEC:** **частично актуальна.** Из ~25 пунктов реально стоит делать 3–4 (PQ-13 + sync backlog + опционально PQ-11). Остальное — либо уже сделано де-факто (PQ-02/03/04), либо имеет плохое соотношение эффекта к риску (PQ-10, PQ-15, языковая миграция).

3. **Приоритет:** **сейчас важнее dogfooding с реальным пользователем**, чем полировка промтов. PROMPT-QUALITY-SPEC стоит закрыть минимальным срезом (~2 часа) и не тратить на неё больше.

4. **Метод закрытия оставшегося:** вместо ручной правки 20+ пунктов — написать `tools/validate-prompts.js`. Это превратит значительную часть спеки (§8 чек-лист, §9 конвенции) в автоматическую проверку, и будет приносить пользу на каждом PR, а не разово.

---

*Документ подготовлен для владельца проекта. Не предполагает немедленных действий — это внешнее ревью, не приказ к исполнению.*
