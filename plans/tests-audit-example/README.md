# Пример артефактов gigatest

Эта директория содержит пример `agent-state.json` и `test-plan.md`, которые создаёт агент `test-auditor` после завершения аудита.

## Что внутри

- **`agent-state.json`** — машиночитаемый план, валидируется по [`agent-state-schema.json`](../../skills/agent-workflow-core/agent-state-schema.json)
- **`test-plan.md`** — человеко-читаемая копия, синхронно обновляется из JSON

## Формат

Оба файла коммитятся в репозиторий. `test-plan.md` даёт красивый diff в PR — видно какие задачи добавлены, какие выполнены, как изменилось покрытие.

## Структура плана

```
.gigacode/plans/tests-audit-YYYY-MM-DD/
├── agent-state.json          ← валидируется по схеме
└── test-plan.md              ← git-trackable, human-readable
```

## Как использовать

1. Скопируйте эту директорию в `.gigacode/plans/tests-audit-YYYY-MM-DD/` как отправную точку
2. Или запустите агента `test-auditor` — он создаст оба файла автоматически
3. Агент `test-implementer` будет выполнять задачи по одной из `agent-state.json`
