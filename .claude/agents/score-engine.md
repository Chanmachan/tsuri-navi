---
paths:
  - "src/lib/score/**/*.ts"
---
# Score Engine Rules

- Refer to `docs/spec.md` for score weights and criteria
- Pure functions: input data in, score out. No side effects, no DB access
- Each scoring factor in its own function (e.g., `scoreTide()`, `scoreWind()`)
- Main calculator composes factor functions with configurable weights
- Weights must be injectable (for user customization via settings)
- Return score breakdown alongside total score (for UI display)
- Test with known historical data: 2026/3/14 久ノ浜 must score ×(0-39)
- All scores are integers 0-100