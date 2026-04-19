# QWEN.md

@./skills/using-gigatest/SKILL.md
@./context/testing-standards.md
@./skills/agent-workflow-core/SKILL.md

## Stack Detection Algorithm

→ см. `skills/agent-workflow-core/SKILL.md`, раздел **W10.2 Stack Detection Algorithm**.

После определения стека:
1. Загрузи `context/testing-standards.md` (всегда)
2. Загрузи соответствующий stack-specific overlay по таблице из W10.2
3. Если проект мультистек (напр. React + Java) — загрузи оба overlay

## Default Behavior

Keep the default path skills-first. Use slash commands as the manual fallback path when the user explicitly requests them or when automatic stage routing is not sufficient.
