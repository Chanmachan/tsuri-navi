# Repository Instructions

## Source of truth
- Code, tests, schemas, ADRs, and CI are truth. Prose docs are not.
- Requirements: `docs/spec.md`
- Architecture decisions: `docs/adr/`

## Workflow
- Do not start implementation before reading:
    - `docs/spec.md`
    - relevant ADRs in `docs/adr/`
- Plan → approval → implement. Never start coding without a plan.
- Always work on a feature branch following the naming rules in `docs/adr/` → see `.claude/rules/git.md`.
- Never commit directly to main. Open a PR for every change.

## Quality gates
- Run lint, typecheck, and tests before finishing.
- Never modify lint/type/test config to make errors disappear.
- Never use `git commit --no-verify`.

## Guardrails
- Do not edit `.env*`, lockfiles, or `.git/`.
- Add or update tests for every behavior change.

## Repo map
- ideas: `idea/`
- research: `research/`
- specs/docs: `docs/`
- tasks: `tasks/`
- hooks: `.claude/hooks/`