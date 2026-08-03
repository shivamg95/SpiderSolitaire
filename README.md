# Spider Solitaire

Offline-capable, dark-neon Spider Solitaire PWA built with React 19, TypeScript, and Vite.

## Quick start

```bash
npm install
npm run dev
```

## Scripts

| Script                  | Purpose                            |
| ----------------------- | ---------------------------------- |
| `npm run dev`           | Local Vite dev server              |
| `npm run build`         | Typecheck + production build       |
| `npm run preview`       | Preview the production build       |
| `npm run typecheck`     | `tsc -b`                           |
| `npm run lint`          | ESLint flat config                 |
| `npm run format`        | Prettier write                     |
| `npm run test`          | Vitest (engine/solver/ui projects) |
| `npm run test:coverage` | Vitest with coverage thresholds    |
| `npm run e2e`           | Playwright matrix                  |
| `npm run check`         | typecheck + lint + coverage + e2e  |

## Architecture

State is `{ seed, difficulty, moveLog }`. The board is derived by folding the log. Layout is a pure `computeLayout(state, viewport, settings)` map. Pointer drag writes Motion values and only commits React state on drop. The solver runs in a Web Worker.

See `docs/rules.md`, `docs/testing.md`, `docs/animation.md`, and `docs/adr/`.
