# QWEN.md

@./skills/using-gigatest/SKILL.md
@./context/testing-standards.md
@./skills/agent-workflow-core/SKILL.md

## Stack Detection Algorithm

Определи стек проекта по ключевым файлам (выполняй при старте сессии):

| Если найден файл | И стек | Загрузи overlay |
|------------------|--------|-----------------|
| `package.json` + `"react"` в зависимостях | React | `context/react-testing.md` |
| `package.json` без `"react"` | JS/TS | `context/js-ts-testing.md` |
| `go.mod` или `*.go` файлы | Go | `context/go-testing.md` |
| `requirements.txt` или `pyproject.toml` или `poetry.lock` | Python | `context/python-testing.md` |
| `pom.xml` или `build.gradle` или `*.java` | Java | `context/java-testing.md` |

После определения стека:
1. Загрузи `context/testing-standards.md` (всегда)
2. Загрузи соответствующий stack-specific overlay из таблицы выше
3. Если проект мультистек (напр. React + Java) — загрузи оба overlay

## Default Behavior

Keep the default path skills-first. Use slash commands as the manual fallback path when the user explicitly requests them or when automatic stage routing is not sufficient.
