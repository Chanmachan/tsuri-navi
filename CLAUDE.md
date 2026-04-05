# Claude Code Instructions

See: @AGENTS.md

## Session routine
- Read `docs/spec.md` before implementation.
- Keep changes small. Update `tasks/todo.md` as you go.
- Mark a todo item as done (`- [x]`) only after the change is committed **and** lint/typecheck/tests all pass.
- When context grows noisy, use /compact.

## Planning
- For non-trivial changes, update `tasks/todo.md` first.
- Use Plan Mode for complex tasks.

## Editing rules
- Fix code errors from hooks before proceeding.
- If the same mistake recurs, encode it as a test or hook.