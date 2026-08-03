# Spider Solitaire

Offline-capable, dark-neon Spider Solitaire PWA built with React 19, TypeScript, and Vite.

## Quick start

```bash
npm install
npm run dev
```

Play: drag or tap movable runs, **Deal** for stock, **Hint** / **Undo** / **Redo**, change difficulty and theme in the top bar.

Shortcuts: `⌘/Ctrl+Z` undo, `⌘/Ctrl+Shift+Z` redo, `H` hint, `D`/`Space` deal, `N` new, `M` mute, `Esc` clear.

## Scripts

| Script                  | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Local Vite dev server                      |
| `npm run build`         | Typecheck + production build               |
| `npm run preview`       | Preview the production build               |
| `npm run typecheck`     | `tsc -b`                                   |
| `npm run lint`          | ESLint flat config                         |
| `npm run test`          | Vitest (engine/solver/ui)                  |
| `npm run test:coverage` | Coverage (≥80% lines/functions/statements) |
| `npm run e2e`           | Playwright matrix                          |
| `npm run check`         | typecheck + lint + coverage + e2e          |

## Architecture

State is `{ seed, difficulty, moveLog }`. The board is derived by folding the log. Layout is a pure `computeLayout(state, viewport)`. Pointer drag writes offsets without React re-renders per move. The solver runs in a Web Worker.

See `docs/rules.md`, `docs/testing.md`, `docs/animation.md`, and `docs/adr/`.
