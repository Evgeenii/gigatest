# SPEC: Quality Gates Fix — Implementation Plan

**Версия:** 1.0 | **Дата:** 2026-04-22
**Основание:** `strategy/ANALYSIS-QUALITY-GATES-ISSUES.md` (6 системных проблем)
**Тип задачи:** bugfix + redesign
**Ожидаемые агенты:** test-audit (для scoring logic), test-strategist (документация)

---

## 1. Цель

Исправить 6 системных проблем quality gates в GigaTest audit pipeline, от критичных багов (status inconsistency) до UX-улучшений (project-level quality score).

---

## 2. Scope: что меняется и какие файлы затронуты

| # | Задача | Severity | Файл(ы) для изменения |
|---|--------|----------|-----------------------|
| **FG-1** | Строгий scoring algorithm, запрет inconsistency | **P0-BUG** | `skills/test-audit/SKILL.md §2.4` |
| **FG-2** | Q4/Q7/Q9 → non-blocking (recommended) | **P0-DESIGN** | `context/testing-standards.md §3` |
| **FG-3** | Dedup targets в Phase 1 | **P1-BUG** | `skills/test-audit/SKILL.md Phase 1` |
| **FG-4** | LLM branch coverage → estimated disclaimer | **P1-DESIGN** | `skills/test-audit/SKILL.md §2.2`, test-plan-template |
| **FG-5** | Project-level quality score (0-100%) | **P2-UX** | `skills/test-plan-template/SKILL.md`, `skills/test-audit/SKILL.md` report section |
| **FG-6** | GlobalExceptionHandler awareness | **P2-DESIGN** | `context/java-testing.md R4.1` |

---

## 3. Детальные требования (Acceptance Criteria)

### FG-1: Строгий Coverage Scoring — запрет inconsistency

**Проблема:** `coverage_status: "full"` при наличии `quality_gate` с `satisfied: false`.

**Требования:**
1. Coverage Scoring Algorithm в `skills/test-audit/SKILL.md` должен содержать **строгое правило**:
   ```
   scoring_algorithm(target):
     required_items = filter(quality_gate, type="required")
     failed_required = count(required_items where satisfied=false)
     
     IF failed_required == 0:
       coverage_status = "full"
     ELSE IF failed_required > 0:
       coverage_status = "partial"
     ELSE IF invalid_type_tests_detected:
       coverage_status = "invalid"
     ELSE:
       coverage_status = "missing"
     
     ⚠️ CRITICAL: coverage_status = "full" IMPLIES ∀ qg ∈ required: qg.satisfied = true
     Это инвариант. Любое нарушение = BUG в генерации agent-state.json
   ```

2. Добавить **валидационное правило**: если в `agent-state.json` задача имеет `coverage_status: "full"` но при этом содержит `quality_gate` элемент с `satisfied: false` → auditor должен **автоматически** переквалифицировать в `partial` перед сохранением.

3. Quality gate items теперь имеют **явные поля** вместо текстовых строк:
   ```json
   "quality_gate": [
     {
       "id": "Q7",
       "description": "Error handling/исключения покрыты",
       "type": "required | recommended | optional",
       "satisfied": true | false,
       "note": "optional explanatory text"
     }
   ]
   ```

**Acceptance:**
- [ ] Для любого файла с failed required item → `coverage_status` = `partial` (не full)
- [ ] agent-state.json валидируется: `coverage_status == "full"` → все required satisfied
- [ ] В выводе audit лог содержит: `[AUDIT] scoring applied: target=X, failed_required=N → status=partial`

---

### FG-2: Quality Checklist — трёхуровневая система strictness

**Проблема:** Все 9 пунктов — одинаково блокирующие. Q4 (имена), Q7 (error handling), Q9 (branch coverage) снижают статус без реальной необходимости.

**Требования:** Рефакторинг `context/testing-standards.md §3` Quality Checklist в трёхуровневую систему:

#### Level 1: REQUIRED (блокирующие для `full`)

Эти критерии — security/correctness critical. Failure → `partial`.

- [ ] **Q1:** Тест не обращается к внутренностям реализации
- [ ] **Q2:** Ассерты проверяют наблюдаемое поведение
- [ ] **Q3:** Один тест — один сценарий
- [ ] **Q5:** Нет излишних моков
- [ ] **Q6:** Happy path покрыт

#### Level 2: RECOMMENDED (warning, не блокируют `full`)

Эти критерии — качество/читаемость. Failure → warning в findings, `coverage_status` может остаться `full` (с пометкой).

- [ ] **Q4:** Название теста описывает поведение (переквалифицировано из required → recommended)
- [ ] **Q7:** Error handling/исключения покрыты
  - **Для REST/HTTP контроллеров** → остаётся REQUIRED
  - **Для сервисов/business logic** → RECOMMENDED
  - **Для pure logic/util** → OPTIONAL
- [ ] **Q9:** Branch coverage (if/else ветки) — RECOMMENDED (LLM-оценка, не инструментальная метрика)

#### Level 3: OPTIONAL (informational)

- [ ] **Q8:** Async behavior — REQUIRED только для async/конкурентного кода. ИНАЧЕ — N/A

#### New Scoring Logic

```
coverage scoring:
  failed_required = count(REQUIRED items where satisfied=false)
  failed_recommended = count(RECOMMENDED items where satisfied=false)
  
  IF failed_required > 0 → coverage_status = "partial"
  ELSE IF failed_required == 0:
    coverage_status = "full"
    IF failed_recommended > 0 → findings += warnings for each failed recommended
```

#### Структура quality gate в JSON

Каждый Q-item теперь структурирован:
```json
{
  "quality_gate": [
    {"id": "Q1", "name": "No internal state assertions", "level": "required", "satisfied": true},
    {"id": "Q4", "name": "Test names describe behavior", "level": "recommended", "satisfied": false, "note": "15% tests use implementation-based names"},
    {"id": "Q7", "name": "Error handling covered", "level": "recommended", "satisfied": false, "note": "Service delegates to GlobalExceptionHandler"},
    {"id": "Q9", "name": "Branch coverage", "level": "recommended", "satisfied": false, "note": "LLM-estimated, ~60% branches covered"}
  ]
}
```

**Acceptance:**
- [ ] Q4 failure НЕ снижает `coverage_status` (warning only)
- [ ] Q7 для сервисов НЕ снижает `coverage_status` (warning only)
- [ ] Q7 для контроллеров (REST, HTTP handlers) СНИЖАЕТ `coverage_status` до `partial`
- [ ] Q9 failure НЕ снижает `coverage_status` (warning only, advisory про JaCoCo)
- [ ] Audit отчёт содержит warnings секцию с recommended failures

---

### FG-3: Dedup targets в Phase 1 Discovery

**Проблема:** Один target обнаружен через несколько ссылок (controller + service + repository) → дублируется 2-3 раза в plan.

**Требования:**

1. Добавить **явный dedup-stage** после Phase 1 Discovery в `skills/test-audit/SKILL.md`:

```
ALGORITHM: dedup_targets(discovered_targets):
  // Phase 1.a — canonicalize
  canonical_map = {}  // canonical_path → target_record
  
  FOR each target IN discovered_targets:
    canonical = resolve_canonical_path(target.source_file)
    IF canonical IN canonical_map:
      existing = canonical_map[canonical]
      // Merge: combine discovery sources, keep richer quality gates
      existing.discovery_sources += target.discovery_sources
      existing.quality_gates = merge(existing.quality_gates, target.quality_gates)
      log("[AUDIT] dedup: merged duplicate '{target.name}' → canonical '{canonical}'")
    ELSE:
      canonical_map[canonical] = target
  
  // Phase 1.b — output
  deduplicated = values(canonical_map)
  removed_count = length(discovered_targets) - length(deduplicated)
  IF removed_count > 0:
    log("[AUDIT] deduplicated: {removed_count} duplicate targets removed")
  
  RETURN deduplicated
```

2. Canonical path resolution:
   - Использовать абсолютный путь к исходному файлу (source file, НЕ тестовому)
   - Нормализовать: убрать `../`, `./`, привести к lowercase (для case-insensitive FS)

3. Merge logic для quality gates:
   - Если дубликат нашёл additional discovery source → добавить в список
   - Quality gates — union (если один нашёл Q7-fail, другой нет → fail)

**Acceptance:**
- [ ] В audit output нет дублированных targets (проверка: уникальность target.id или target.source_file)
- [ ] Лог содержит `[AUDIT] deduplicated: N duplicate targets removed` (или `0` если не было)
- [ ] Если target найден через controller И service → один entry с `discovery_sources: ["controller", "service"]`

---

### FG-4: LLM Branch Coverage — disclaimer

**Проблема:** "Branch coverage: 45%" выглядит как инструментальная метрика (JaCoCo), но это субъективная LLM-оценка.

**Требования:**

1. В `skills/test-audit/SKILL.md §2.2` (Branch Coverage Assessment) — добавить явное правило:

```
RULE: Branch coverage data from audit are LLM-ESTIMATED, not instrumented.

All audit outputs containing branch coverage MUST include disclaimer:
  "[ESTIMATED] Branch coverage is LLM-estimated from code/test analysis.
               Run JaCoCo (Java), c8 (JS), or coverage tool for precise metrics."

Audit report summary MUST NOT present branch coverage as exact percentage.
Format: "Branch coverage: ~45% (LLM-estimated)"  // NOT "Branch coverage: 45%"
```

2. Q9 quality gate item — добавить поле `"estimation_method": "llm"` в JSON:
```json
{"id": "Q9", "name": "Branch coverage", "level": "recommended", 
 "satisfied": false, "estimation_method": "llm",
 "note": "LLM-estimated. Run JaCoCo for precise Java coverage."}
```

3. В test-plan.md report section — добавить footnote:
```markdown
> ⚠️ Branch coverage percentages are **LLM-estimates**, not instrumented measurements.
> Run project coverage tools (JaCoCo, c8, etc.) for precise data.
```

**Acceptance:**
- [ ] Все audit отчёты содержат disclaimer про LLM estimation
- [ ] Процент branch coverage показан как `~XX% (LLM-estimated)` не `XX%`
- [ ] test-plan.md содержит footnote про инструментальные метрики

---

### FG-5: Project-level Quality Score

**Проблема:** "Full Coverage = 0" создаёт ложное впечатление что проект не покрыт, хотя 337 файлов получили бы `full` если бы Q4/Q7/Q9 были non-blocking.

**Требования:**

1. Добавить **двухуровневый scoring** в audit report:

| Метрика | Уровень | Описание |
|---------|---------|----------|
| `coverage_status` | Per-file | full / partial / invalid / missing |
| `strict_quality_score` | Project | 0-100%, считает ТОЛЬКО required items failures |
| `full_quality_score` | Project | 0-100%, считает ALL items failures |

2. `strict_quality_score` формула:
```
strict_quality_score = (targets_with_all_required_satisfied / total_targets_with_tests) × 100

// Показывает какой % файлов прошли бы full если recommended были non-blocking
```

3. Audit summary report — новая секция:

```markdown
## Coverage Summary

| Metric | Value |
|--------|-------|
| Source files | 839 |
| Files with tests | 337 (40%) |
| Full coverage (strict*) | 312 (93%) |
| Partial coverage | 25 (7%) |
| Missing | 502 |

> * Full (strict) = all REQUIRED quality gates satisfied.
>   Recommended items failures (Q4, Q7-service, Q9) generate warnings but do not reduce status.
>   Full Quality Score: 93%

## Quality Warnings (non-blocking)

| Warning | Affected files | Description |
|---------|---------------|-------------|
| Q4: Test naming | 45 files | 13% use implementation-based names |
| Q7: Error handling (service) | 80 files | Services delegate error handling |
| Q9: Branch coverage (estimated) | 120 files | LLM-estimated branch gaps |
```

4. В `test-plan.md` добавить сводку:
```
## Quality Score Summary

- Strict Quality Score: **93%** (required items only)
- Full Quality Score: **67%** (all items including recommended)
- Files with warnings: **156** (have recommended items failures but may still be full)
```

**Acceptance:**
- [ ] Audit report содержит ОБЕ метрики: strict_quality_score и full_quality_score
- [ ] Показано N файлов, которые получили бы `full` если бы recommended были non-blocking
- [ ] Warnings секция показывает распределение recommended failures по типам (Q4 vs Q7 vs Q9)
- [ ] test-plan.md содержит Quality Score Summary

---

### FG-6: GlobalExceptionHandler Awareness (Java overlay)

**Проблема:** В Spring-приложениях обработка ошибок делегирована `@ControllerAdvice` / `GlobalExceptionHandler`. Аудит требует от каждого сервиса свой error test — дублирование.

**Требования:**

1. В `context/java-testing.md` — добавить **R4.1: Conditional Error Handling Assessment**:

```markdown
## R4.1 Error Handling Assessment — GlobalExceptionHandler Awareness

При оценке Q7 (Error handling) аудитор ОБЯЗАН проверить:

### Шаг 1: Обнаружение GlobalExceptionHandler
Проверить проект на наличие:
- `@RestControllerAdvice` или `@ControllerAdvice` класс
- `@ExceptionHandler` методы

ЕСЛИ найден → перейти к Шагу 2.
ЕСЛИ НЕ найден → Q7 = required для всех targets (standard behavior).

### Шаг 2: Проверка покрытия GlobalExceptionHandler
ЕСЛИ `GlobalExceptionHandler` ИЛИ `@ControllerAdvice` класс ИМЕЕТ собственные тесты:
  → Перейти к Шагу 3.
ЕСЛИ НЕ ИМЕЕТ тестов:
  → Q7 = required для всех targets (global handler не протестирован, нужен per-target fallback).

### Шаг 3: Conditional Q7 assessment
| Тип target | Q7 level | Обоснование |
|------------|----------|-------------|
| REST Controller (`@RestController`) | **optional** | GlobalExceptionHandler обрабатывает HTTP error responses |
| Service (`@Service`) | **optional** | Сервис выбрасывает exception, handler обработает |
| Pure logic / util | **optional** | Нет error paths требующих HTTP response |
| Сам GlobalExceptionHandler | **required** | Должен быть протестирован сам |

Логирование:
  `[AUDIT] java: GlobalExceptionHandler detected and tested → Q7=set to optional for controllers/services`
  `[AUDIT] java: GlobalExceptionHandler detected but NOT tested → Q7=required for all targets`
  `[AUDIT] java: No GlobalExceptionHandler found → Q7=required for all targets`
```

2. В test-audit SKILL — добавить **stack-specific extension point**:
```
EXTENSION: Each stack overlay (java-testing.md, react-testing.md, etc.) MAY 
override Q-level assessment based on framework patterns.

Audit agent MUST check loaded context overlay for Q-level overrides BEFORE
assigning level to quality gate items.
```

**Acceptance:**
- [ ] Если `GlobalExceptionHandler` существует И протестирован → Q7 для сервисов/контроллеров = `optional`
- [ ] Если `GlobalExceptionHandler` существует но НЕ протестирован → Q7 = `required` для всех
- [ ] Если `GlobalExceptionHandler` НЕ существует → Q7 = `required` (default behavior)
- [ ] Audit лог содержит java-specific Q7 assessment message
- [ ] Q7 level для каждого target записан в quality_gate JSON

---

## 4. Implementation Order & Dependencies

```
Phase 1 (P0 — critical, MUST be done first):
  ┌─────────────────────────────────────────────────────┐
  │ FG-1: Строгий scoring (blocked by nothing)          │
  │ FG-2: Three-level quality system (blocked by FG-1)  │
  └─────────────────────────────────────────────────────┘
  
Phase 2 (P1 — quality, after Phase 1):
  ┌─────────────────────────────────────────────────────┐
  │ FG-3: Dedup targets (blocked by nothing)             │
  │ FG-4: LLM disclaimer (blocked by nothing)            │
  └─────────────────────────────────────────────────────┘
  
Phase 3 (P2 — UX polish, after Phase 1-2):
  ┌─────────────────────────────────────────────────────┐
  │ FG-5: Project-level quality score (needs FG-2)       │
  │ FG-6: GlobalExceptionHandler (needs FG-2)            │
  └─────────────────────────────────────────────────────┘
```

---

## 5. Files to Modify — Summary

| Файл | Изменения |
|------|-----------|
| `context/testing-standards.md §3` | Quality Checklist → трёхуровневая система (required/recommended/optional), переквалификация Q4/Q7/Q9 |
| `context/java-testing.md` | Добавить R4.1: GlobalExceptionHandler awareness, conditional Q7 levels |
| `skills/test-audit/SKILL.md` | §2.4 Scoring algorithm → строгий; Phase 1 → dedup; report format → two-level scoring + warnings |
| `skills/test-plan-template/SKILL.md` | Report format → quality score summary, warnings distribution, LLM disclaimer |

---

## 6. Testing & Verification

После реализации:

1. **Re-run audit** на defaults проекте — проверить что:
   - Нет дубликатов (FG-3)
   - Нет `full` с failed required (FG-1)
   - Q4 failures не снижают статус файлов (FG-2)
   - Q7 failures для сервисов не снижают статус (FG-2)
   - strict_quality_score > 0 (FG-5)

2. **Re-run audit** на def-restr проекте — проверить что:
   - Full Coverage не 0% (если были мелкие issues только) (FG-2, FG-5)
   - GlobalExceptionHandler обработан корректно (FG-6)

3. **Schema validation** — agent-state.json валиден по `agent-state-schema.json`:
   - `quality_gate` элементы имеют `id`, `level`, `satisfied` поля
   - `coverage_status == "full"` → все required satisfied

---

## 7. Expected Impact Analysis

| Метрика | До (def-restr) | После (estimated) | Изменение |
|---------|---------------|-------------------|-----------|
| Full Coverage | 0 (0%) | ~312 (93% strict) | +93% |
| Partial | 8 (2.4%) | ~25 (7%) | Больше файлов с real gaps |
| Duplicate tasks в plan | 3+ | 0 (deduped) | -100% |
| Status inconsistency | BUG | Fixed | Invariant enforced |
| Branch coverage trust | "45%" (misleading) | "~45% (LLM-est.)" | Transparent |
| Q7 relevance (Spring) | 60% fail, many false + | Warnings for delegated handlers | More accurate |

---

## 8. Exit Conditions

- [ ] `context/testing-standards.md §3` refactored с трёхуровневой системой
- [ ] `context/java-testing.md` содержит R4.1 с GlobalExceptionHandler awareness
- [ ] `skills/test-audit/SKILL.md` содержит строгий scoring, dedup, two-level scoring report
- [ ] `skills/test-plan-template/SKILL.md` содержит quality score summary format
- [ ] Audit re-run на defaults проекте: strict_quality_score > 80%, no duplicates, no status inconsistency
- [ ] Audit re-run на def-restr проекте: Full > 0%, GlobalExceptionHandler processed
- [ ] agent-state.json валиден с новыми quality_gate структурой

---

*SPEC готова для передачи агенту implementer.*
