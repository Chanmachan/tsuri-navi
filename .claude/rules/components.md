---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
---
# UI Component Rules

- React functional components with TypeScript
- Export as named export (not default)
- Props type defined as `XxxProps` in same file
- Tailwind CSS only — no inline styles, no CSS modules
- Components must render with mock/dummy data (no API dependency at component level)
- Responsive: mobile-first, test at 375px width
- Accessibility: include aria-labels for interactive elements
- Test file in `__tests__/` subdirectory using Vitest + React Testing Library