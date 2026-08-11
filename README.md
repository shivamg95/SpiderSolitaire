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

| Script                   | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Local Vite dev server                      |
| `npm run build`          | Typecheck + production build               |
| `npm run preview`        | Preview the production build               |
| `npm run typecheck`      | `tsc -b`                                   |
| `npm run lint`           | ESLint flat config                         |
| `npm run test`           | Vitest (engine/solver/ui)                  |
| `npm run test:coverage`  | Coverage (≥80% lines/functions/statements) |
| `npm run e2e`            | Playwright matrix                          |
| `npm run check`          | typecheck + lint + coverage + e2e          |
| `npm run solver:bench`   | Solve rate / nodes / wall time per suit    |
| `npm run seeds:generate` | Rebuild the verified winnable seed pool    |
| `npm run seeds:verify`   | Re-solve every shipped seed end to end     |

## Architecture

State is `{ seed, difficulty, moveLog }`. The board is derived by folding the log. Layout is a pure `computeLayout(state, viewport)`. Pointer drag writes offsets without React re-renders per move. The solver runs in a Web Worker.

## Winnable deals

Every deal is one a solver has already won. Seeds are proven offline by `npm run seeds:generate` — solved, then the solution replayed through the real engine to a won state — and shipped as seeds plus a difficulty rating in `src/solver/seedPool.generated.ts`. A background miner tops the pool up during idle time into IndexedDB.

The guarantee does not rest on solver strength: a weaker solver yields a smaller pool, never an unwinnable deal.

Because a winnable deal can still be lost in a few moves, the safety net in `src/solver/rescue.ts` re-checks the position after a pause in play, warns only when defeat is _proven_, and can rewind to the last position that could still be won.

See `docs/rules.md`, `docs/testing.md`, `docs/animation.md`, and `docs/adr/`.
