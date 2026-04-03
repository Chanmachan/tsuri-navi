---
paths:
  - "src/lib/api/**/*.ts"
---
# API Client Rules

- All API clients export async functions, not classes
- Return typed response objects (define in `src/types/`)
- Include error handling with typed error responses
- Add retry logic with exponential backoff for network errors
- Cache responses in SQLite via the db layer (do not cache in memory)
- Each client in its own file: `open-meteo-weather.ts`, `open-meteo-marine.ts`, `tide736.ts`
- Corresponding test file in `__tests__/` subdirectory
- Do not hardcode API URLs — use environment variables or config