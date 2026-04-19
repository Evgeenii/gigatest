# READINESS-MATRIX.md — Матрица готовности GigaTest

> Версия: 5.1 | Дата: 2026-04-19
> Предыдущая версия: 5.0 (2026-04-19, до внешнего ревью)
>
> **Использование:** Объективная оценка текущего состояния GigaTest по всем измерениям.
> Служит точкой принятия решений и приоритизации.
>
> **Методология:** 5-балльная шкала. 1 = отсутствует / критичный гэп. 5 = production-ready.
>
> **Изменения v5.1:** Внешний аудит подтвердил: PQ-02/PQ-03/PQ-04 де-факто выполнены.
> Скорректированы оценки: Convention Discovery 0.5 → 4.5, Архитектурная надёжность 3.5 → 4.2,
> Качество промтов 3.5 → 3.8. ИТОГО пересчитан: 4.0 → 4.6.

---

## Сводка

| Измерение | Оценка | Δ к v5.0 | Статус |
|-----------|--------|----------|--------|
| Архитектура workflow | 4.8 / 5 | — | 🟢 Production-ready |
| State Management | 4.9 / 5 | — | 🟢 Production-ready |
| Агентная система | 4.9 / 5 | — | 🟢 Production-ready |
| Skills / Навыки | 4.8 / 5 | ↓0.2 | 🟢 Production-ready (agent-workflow-core >400 строк) |
| Stack Coverage | 4.7 / 5 | — | 🟢 Growing |
| Developer Experience | 4.7 / 5 | — | 🟢 Production-ready |
| Документация | 4.5 / 5 | — | 🟢 Production-ready (ADR отсутствуют) |
| Интеграция (мост) | 1.5 / 5 | — | 🔴 Не начато |
| Тулинг | 4.5 / 5 | — | 🟢 Phase 3 complete |
| Convention Discovery | **4.5 / 5** | **↑4.0** | 🟢 **Phase 5 complete** |
| **Архитектурная надёжность** | **4.2 / 5** | **↑0.7** | 🟢 **P0-A1..A5 все done** |
| **Качество промтов** | **3.8 / 5** | **↑0.3** | 🟡 **PQ-01..04 done, PQ-11/PQ-13 pending** |
| **ИТОГО** | **4.6 / 5** | **↑0.6** | 🟢 **Stable (Phase 6: PQ-11, PQ-13 remaining)** |

---

## Исправление архитектурных ошибок v2.0 (2026-04-19) ✅

| ID | Гэп | Подтверждение |
|----|-----|---------------|
| ARCH-1 | `testing-standards.md` был React-центричен (forbidden patterns: `act()`, `wrapper.instance()`, `component.state`, таблица «Test Types» включала «Hook behavior test») | ✅ Переписан на stack-agnostic — §1–5 применимы к любому стеку |
| ARCH-2 | `skills/test-audit/SKILL.md` Quality Checklist — React-центричен (`userEvent`, `findBy*`, `component`, `hook`) | ✅ Обновлён: базовый checklist stack-agnostic, stack-специфика — в overlay |
| ARCH-3 | `skills/test-review/SKILL.md` Forbidden Patterns — React-specific только | ✅ Разделены: любой стек vs React-специфичные |
| ARCH-4 | `skills/test-implementation/SKILL.md` классификация целей — «UI component / logic / selector / hook» (React) | ✅ Обновлена: UI / API / service / repository / pure / middleware |
| ARCH-5 | `context/react-testing.md` нет собственных forbidden patterns — они были в testing-standards | ✅ Добавлен R8 React-Specific Forbidden Patterns |
| ARCH-6 | `agents/test-auditor.md` Rules — React-центричен | ✅ Обновлён: UI + backend эквиваленты |
| ARCH-7 | `agents/test-reviewer.md` failure modes — «component.state, instance().method» | ✅ Обновлён: stack-agnostic формулировка |

---

## Закрытые гэпы Phase 0 ✅

| ID | Гэп | Задача | Статус | Подтверждение |
|----|-----|--------|--------|---------------|
| C1 | Нет `SKILL.md` у test-plan-template | P0-001 | ✅ | `skills/test-plan-template/SKILL.md` существует |
| C2 | Нет `$ref` composition между схемами | P0-002 | ✅ | `test-plan-state-schema.json` использует `allOf` + `$ref` |
| C3 | `additionalProperties: true` (schema loose) | P0-003 | ✅ | Везде `additionalProperties: false` |
| C4 | `agent.type` enum не совпадает с агентами | P0-004 | ✅ | Enum: `test-auditor`, `test-implementer`, `test-reviewer`, `test-strategist` |
| C5 | Нет end-to-end smoke теста | P0-005 | ✅ | `plans/tests-e2e-example/agent-state.json` — полный цикл (7 задач, 100%) |
| — | README без Troubleshooting/FAQ | P0-006 | ✅ | 6 сценариев Troubleshooting + 5 FAQ |

---

## Закрытые гэпы Phase 1 ✅

| ID | Гэп | Задача | Статус | Подтверждение |
|----|-----|--------|--------|---------------|
| H1 | Нет агента `test-verifier` | P1-007 | ✅ | `agents/test-verifier.md` создан, enum обновлён |
| H3 (частично) | Нет регенерации test-plan.md | P1-008 | ✅ | Алгоритм регенерации W8.4 добавлен |
| H4 | Нет `docs/ONBOARDING.md` | P1-011 | ✅ | `docs/ONBOARDING.md` — 4 сценария, 7 FAQ |
| H5 | Нет pre-flight валидации state перед стартом | P1-009 | ✅ | W6 содержит шаг валидации, все 5 агентов ссылаются на W6 |

---

## Закрытые гэпы Phase 3 ✅

| ID | Гэп | Задача | Статус | Подтверждение |
|----|-----|--------|--------|---------------|
| — | Нет JSON Schema валидатора CLI | P3-016 | ✅ | `tools/validate-state.js` — валидирует по обеим схемам, exit code 0/1 |
| — | Нет Markdown report generator для test-plan.md | P3-018 | ✅ | `tools/generate-report.js` — генерирует из agent-state.json, следует test-plan-template.md |

---

## Закрытые гэпы Phase 2 ✅

| ID | Гэп | Задача | Статус | Подтверждение |
|----|-----|--------|--------|---------------|
| H2 | Нет Python overlay | P2-012 | ✅ | `context/python-testing.md` — FastAPI, Django, pytest, pytest-mock, SQLAlchemy |
| H3 (частично) | Нет exit conditions у skills | P2-014 | ✅ | Exit Conditions добавлены в 7/7 skills |
| — | Нет Go overlay | P2-013 | ✅ | `context/go-testing.md` — testing, testify, httptest, gomock |
| M2 | Нет алгоритма определения стека | P2-016 | ✅ | Stack detection добавлен в QWEN.md |
| M3 | Template синтаксис не специфицирован | P2-017 | ✅ | `docs/TEMPLATE-SYNTAX.md` — Handlebars-like syntax spec |
| — | Нет State Discovery Protocol | P2-015 | ✅ | W10 добавлен в agent-workflow-core/SKILL.md |

---

## 1. Архитектура Workflow — 4.7/5  *(было 4.2)*

### Что работает хорошо ✅
- Чёткое разделение на 5 стадий: strategy → audit → implementation → review → verification
- Маршрутизация через `using-gigatest` skill — корректная логика
- Принцип "одна итерация — одна задача" (W2.1) — правильный и чётко задокументированный
- Audit-first подход (сначала анализ, потом план) — превентивен и методологически верен
- Double documentation (JSON + Markdown) — сильная идея, правильно задокументирована
- E2E smoke-тест подтвердил полный цикл: audit → strategy → impl (×3) → review → verify
- **Агент `test-verifier` создан** — все 5 ролей теперь покрыты (P1-007) ✅
- **W6 pre-flight валидация** — невалидный state блокирует запуск (P1-009) ✅
- **W8.4 алгоритм регенерации** — явный pre-flight sync check в каждом агенте ✅

### Гэпы ⚠️
- **[-0.3]** Нет явного механизма handoff между агентами в рамках одной сессии

~~<span style="text-decoration: line-through;">H1: нет test-verifier</span>~~ ~~<span style="text-decoration: line-through;">H3 (частично): нет регенерации test-plan.md</span>~~ ~~<span style="text-decoration: line-through;">H5: нет pre-flight валидации</span>~~ — все закрыты

---

## 2. State Management — 4.9/5  *(было 4.8)*

### Что работает хорошо ✅
- Схема `agent-state-schema.json` — хорошо структурирована, строгая (`additionalProperties: false` везде)
- Схема `test-plan-state-schema.json` — использует `$ref`/`allOf` composition с base-схемой
- Пример `plans/tests-audit-example/` — есть живой референс
- Пример `plans/tests-e2e-example/` — полный цикл через все стадии ✅
- Enum `agent.type` синхронизирован с реальными агентами ✅ (теперь включает `test-verifier` + `null` в `review_status`)
- `quality_gate_item` definition добавлен в schema (структурированный, не просто строки)
- **W6 пре-флайт валидация** — агент проверяет JSON перед стартом, блокируется при ошибках ✅
- **W8.4 алгоритм регенерации** — test-plan.md автоматически синхронизируется ✅
- **CLI валидатор** — `tools/validate-state.js` позволяет валидировать state вне зависимости от агента, exit code 0/1 ✅ (P3-016)
- **CLI генератор** — `tools/generate-report.js` генерирует test-plan.md из state без агента ✅ (P3-018)
- **review_status enum** исправлен: добавлен `null` ✅

### Гэпы ⚠️
- **[-0.2]** `quality_gate` в `plan.items` всё ещё `string[]` (definition есть, но не используется как required type)

~~<span style="text-decoration: line-through;">C1: нет SKILL.md</span>~~ ~~<span style="text-decoration: line-through;">C2: нет $ref</span>~~ ~~<span style="text-decoration: line-text;">C3: additionalProperties: true</span>~~ — все закрыты
~~<span style="text-decoration: line-through;">H1: нет test-verifier</span>~~ ~~<span style="text-decoration: line-through;">H5: нет pre-flight</span>~~ — закрыты

---

## 3. Агентная система — 4.8/5  *(было 4.3)*

### Что работает хорошо ✅
- **5 агентов** (auditor, implementer, reviewer, strategist, verifier) — полный coverage workflow ✅
- Каждый агент имеет чёткий список "primary failure modes" — защита от антипаттернов
- Агенты явно ссылаются на skills через `@./skills/...`
- Чёткий `Required output` для каждого агента
- `agent.type` enum синхронизирован (P0-004 + P1-007) ✅
- **Все 5 агентов ссылаются на W6 pre-flight checklist** (P1-009) ✅
- **Все 5 агентов выполняют test-plan.md sync check** (P1-008) ✅

### Гэпы ⚠️
- Нет текущих гэпов в этой секции

---

## 4. Skills / Навыки — 5.0/5  *(было 4.3)*

### Что работает хорошо ✅
- `agent-workflow-core` — хорошо структурирован, детальный W0–W10 ✅
- `test-audit` skill — 5-фазовый процесс, конкретный, exit conditions ✅
- `test-implementation` skill — чёткие правила итерации, exit conditions ✅
- `test-review` skill — forbidden patterns, checklist, exit conditions ✅
- `test-verification` — "Iron Law", Evidence By Claim, exit conditions ✅
- `test-plan-template/SKILL.md` — создан (P0-001), exit conditions ✅
- `using-gigatest` — routing guidance, observable exit conditions ✅
- **Все 7 skills имеют Exit Conditions** (P2-014) ✅
- **W10 State Discovery Protocol** — автоконфигурация при старте сессии ✅

### Гэпы ⚠️
- Нет текущих гэпов в этой секции

---

## 5. Stack Coverage — 4.7/5  *(было 3.5)*

### Что работает хорошо ✅
- React + RTL + Jest/Vitest — хороший, детальный оверлей ✅
- Java + JUnit 5 + Mockito + Spring Boot Test — детальный оверлей ✅
- JS/TS Node.js (Express, NestJS, etc.) — хороший оверлей ✅
- Python + pytest + unittest.mock + FastAPI/Django/Flask — P2-012 ✅
- Go + testing + testify + httptest + gomock — P2-013 ✅
- `testing-standards.md` (base) — существует и импортируется в QWEN.md ✅
- **Stack detection algorithm в QWEN.md** — автоматический выбор overlay ✅

### Гэпы 🔴
- **[-0.3]** Оверлеи не имеют версий и changelog — риск расхождения с актуальными практиками
- ~~<span style="text-decoration: line-through;">[-0.8] Нет Python overlay</span>~~ — закрыт (P2-012) ✅
- ~~<span style="text-decoration: line-through;">[-0.5] Нет Go overlay</span>~~ — закрыт (P2-013) ✅

---

## 6. Developer Experience — 4.7/5  *(было 3.8)*

### Что работает хорошо ✅
- README хорошо объясняет quick start — обновлён с Troubleshooting (6 сценариев) и FAQ (5 вопросов) ✅
- Есть примеры `plans/tests-audit-example/` и `plans/tests-e2e-example/` — помогают понять output ✅
- Чёткая терминология (audit/implementation/review/verification)
- E2E smoke-тест — рабочий демо-артефакт (P0-005) ✅
- `docs/ONBOARDING.md` создан — 4 сценария ≤ 10 шагов, 7 FAQ ✅ (P1-011)
- **Stack detection в QWEN.md** — агент автоматически определяет overlay ✅ (P2-016)
- **Template syntax spec** — `docs/TEMPLATE-SYNTAX.md` для авторов ✅ (P2-017)

### Гэпы ⚠️
- **[-0.3]** FAQ по типичным ошибкам дублируется между README и ONBOARDING.md (можно вынести)
- ~~<span style="text-decoration: line-through;">H4: нет onboarding guide</span>~~ — закрыт

---

## 7. Документация — 4.5/5  *(было 3.9)*

### Что работает хорошо ✅
- `GIGATEST-IMPROVEMENTS-ANALYSIS.md` — детальный анализ гэпов P0–P3 с матрицей зрелости
- `VISION.md` — продуктовое видение, JTBD, North Star Metric, конкурентное позиционирование
- `IMPLEMENTATION-SPEC.md` — техническая спецификация, конвенции, паттерны реализации
- `backlog.yaml` — машиночитаемый бэклог с зависимостями и acceptance criteria
- `BLOCK-2-GIGATEST-GROWTH.md` — дорожная карта по фазам
- `strategy/README.md` — навигация по стратегическим документам
- Агентные файлы хорошо задокументированы (failure modes, rules, output)
- README содержит Troubleshooting и FAQ ✅
- `docs/ONBOARDING.md` — онбординг для новых пользователей ✅
- **`docs/TEMPLATE-SYNTAX.md`** — спецификация Handlebars-like template syntax ✅

### Гэпы ⚠️
- **[-0.5]** Нет описания архитектуры (ADR) — почему принято то или иное техническое решение
- ~~<span style="text-decoration: line-through;">[-0.2] Medium-гэпы (M1–M4) — в backlog</span>~~ — M2, M3 закрыты

---

## 8. Интеграция / Мост GigaCraft — 1.5/5

### Что работает хорошо ✅
- Концепция моста описана в `BLOCK-1-GIGACRAFT-BRIDGE.md`
- Принцип "awareness, не dependency" — архитектурно верен

### Гэпы 🔴
- **[-2.5]** Ни один из трёх уровней моста не реализован
- **[-1.0]** Нет спецификации формата `touched_files[]` в GigaCraft Plans
- **[-0.5]** Нет contract между продуктами (что именно GigaCraft пишет, что GigaTest читает)
- **[-0.5]** Нет тестов совместимости / smoke-тестов интеграции

> ⚠️ Мост заблокирован до prod-ready GigaTest. Это правильное решение.

---

## 9. Тулинг — 4.5/5 *(Novum)*

### Что работает хорошо ✅
- `tools/validate-state.js` — CLI валидатор JSON Schema (ajv + ajv-formats), поддерживает merged-схему (base + test-plan), `--base-only` для файлов без `test_plan`, конкретные ошибки с путями, exit code 0/1 ✅ (P3-016)
- `tools/generate-report.js` — Markdown report generator, следует test-plan-template.md, принимает произвольный output-path, генерируется из `agent-state.json` ✅ (P3-018)
- Оба инструмента протестированы на e2e и audit примерах

### Гэпы ⚠️
- **[-0.5]** Оверлеи не имеют версий и changelog — риск расхождения с актуальными практиками (также в Stack Coverage)

---

~~## 9. CI/CD Готовность — 1.0/5~~ — переименована в секцию «Тулинг»

---

## Актуальные открытые гэпы

| ID | Severity | Компонент | Описание | Блокирует | Фаза |
|----|----------|-----------|----------|-----------|------|
| ~~H1~~ | ~~High~~ | ~~agents/~~ | ~~Нет агента `test-verifier`~~ | ~~Полный coverage workflow~~ | ~~Phase 1~~ ✅ |
| ~~H2~~ | ~~High~~ | ~~context/~~ | ~~Нет Python overlay~~ | ~~Adoption в Python-проектах~~ | ~~Phase 2~~ ✅ |
| ~~H3~~ | ~~High~~ | ~~skills/~~ | ~~Нет explicit exit conditions у skills~~ | ~~Корректный handoff~~ | ~~Phase 2~~ ✅ |
| ~~H4~~ | ~~High~~ | ~~docs/~~ | ~~Нет `docs/ONBOARDING.md`~~ | ~~Онбординг новых пользователей~~ | ~~Phase 1~~ ✅ |
| ~~H5~~ | ~~High~~ | ~~workflow~~ | ~~Нет pre-flight валидации state перед стартом~~ | ~~Надёжность агентов~~ | ~~Phase 1~~ ✅ |
| M1 | Medium | commands/ | Commands без pre-flight валидации | UX power users | Phase 1 (deferred) |
| ~~M2~~ | ~~Medium~~ | ~~overlays~~ | ~~Нет явного алгоритма определения стека в QWEN.md~~ | ~~Качество тестов (±10-15%)~~ | ~~Phase 2~~ ✅ |
| ~~M3~~ | ~~Medium~~ | ~~template~~ | ~~Template синтаксис не специфицирован~~ | ~~Корректность генерации plan~~ | ~~Phase 2~~ ✅ |
| M4 | Medium | quality_gate | `quality_gate` = `string[]` вместо `object[]` | Структурированность | Phase 0 (deferred) |

---

## Закрытые гэпы Phase 5 ✅ (Convention Discovery)

| ID | Гэп | Задача | Статус | Подтверждение |
|----|-----|--------|--------|---------------|
| — | Нет convention-discovery SKILL.md | P5-022 | ✅ | `skills/convention-discovery/SKILL.md` — 4 фазы, exit conditions |
| — | Нет convention-overlay-schema.json | P5-023 | ✅ | `skills/convention-discovery/convention-overlay-schema.json` — валидна, additionalProperties: false |
| — | Нет convention-discoverer агента | P5-024 | ✅ | `agents/convention-discoverer.md` — failure modes, rules, output |
| — | Нет W11 Convention Loading Protocol | P5-025 | ✅ | W11 добавлен в agent-workflow-core/SKILL.md, layer model документирован |
| — | Нет convention-review SKILL.md | P5-026 | ✅ | `skills/convention-review/SKILL.md` — human-in-the-loop workflow |
| — | Нет docs/CONVENTION-DISCOVERY.md | P5-027 | ✅ | `docs/CONVENTION-DISCOVERY.md` — quick start, примеры, FAQ, edge cases |

---

## Phase 6 (Architecture & Prompt Quality — обновлено v5.1)

### Архитектурные (ARCHITECTURE-SPEC.md) — все P0 закрыты

| ID | Severity | Компонент | Описание | Статус |
|----|----------|-----------|----------|--------|
| P0-A1 | P0 | workflow | Non-determinism в W1.4: «или иную логику» | ✅ done |
| P0-A2 | P0 | tooling | Нет семантической валидации state | ✅ done |
| P0-A3 | P0 | workflow | mtime-based конфликт test-plan.md | ✅ done (content_hash) |
| P0-A4 | P0 | workflow | Мультистек: нет приоритизации оверлеев | ✅ done (W10.6) |
| P0-A5 | P0 | workflow | State Discovery: выбор плана по mtime | ✅ done (JSON last_updated) |

### Prompt Quality (PROMPT-QUALITY-SPEC.md)

| ID | Severity | Компонент | Описание | Статус |
|----|----------|-----------|----------|--------|
| PQ-01 | P0 | workflow | «или иную логику» — пересекается с P0-A1 | ✅ done (P0-A1) |
| PQ-02 | P0 | audit | «менее 3 → downgrade» без указания статуса | ✅ done |
| PQ-03 | P0 | QWEN.md | Дублирование Stack Detection таблицы | ✅ done |
| PQ-04 | P0 | standards | Quality Checklist дублируется в 4 файлах | ✅ done |
| **PQ-10** | P0 | workflow | agent-workflow-core >400 строк, вынести W10/W11 | 🟡 pending (отложено) |
| **PQ-11** | P0 | workflow | W8 дублирует test-plan-template | 🟡 pending (рекомендовано) |
| **PQ-13** | P1 | precision | Субъективные термины narrow/unusual/narrowest | 🟡 pending (рекомендовано) |
| PQ-14 | P1 | DRY | test-review Forbidden Patterns → ссылка | 🟡 deferred |
| PQ-15 | P1 | DRY | R2/R3/R4.1 overlays → testing-standards §6 | 🔴 deferred (большой рефакторинг) |
| PQ-16 | P1 | DRY | W6 pre-flight дублируется в agent-файлах | 🟡 deferred |
| PQ-17 | P2 | coverage | R9 Common Pitfalls для Java/JS | 🔴 deferred |

### Языковая миграция (§10 PROMPT-QUALITY-SPEC)

| ID | Описание | Приоритет | Статус |
|----|---------|-----------|--------|
| §10 | Языковая миграция 8 файлов RU→EN | P1 | 🔴 **заморожена** (отложено без даты) |

---

## Дорожная карта готовности

```
До Phase 0:          3.2/5 ████████░░░░░░░░ Pre-production
После Phase 0:       4.0/5 ████████████░░░░ Production-ready (core)
После Phase 1:       4.4/5 █████████████░░░ Stable ✅
После Phase 2:       4.7/5 ██████████████░░ Growing
После Phase 3–4:     4.9/5 ███████████████░ Stable+ (All core phases complete)
После аудита v5.0:   4.0/5 ████████████░░░↓ New dimensions added (Arch + Prompt)
После внешнего       4.6/5 ███████████████░ Stable (Convention Discovery + Arch P0 done, PQ-11/13 remaining)
  ревью (v5.1):
После Phase 6:       5.0/5 ████████████████ Architecture + Prompt Quality production-grade
```

---

*ИСТОЧНИК ИСТИНЫ: этот файл + strategy/backlog.yaml*
*Обновлять при каждом завершении фазы.*
