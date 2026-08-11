# Testing

## Layers

- **Engine / solver**: Vitest node projects, 100% line/branch/function/statement coverage.
- **UI**: Vitest jsdom project with Testing Library.
- **E2E**: Playwright across desktop + tablet projects.

## ASCII board fixtures

Prefer the engine ASCII DSL (`parseBoard` / `printBoard`) over hand-built object literals. Example:

```
difficulty: 1
c0: [2] SK SQ SJ
c1: [0] S5
c2: -
stock: 20
found: 3
```

## Property tests

`fast-check` covers conservation, legal-move agreement, fold determinism, undo identity, and invariants over random playouts.

## Deterministic e2e

`npm run e2e` builds with `--mode test` (`npm run build:e2e`), which is the only build that installs the `window.__spider` bridge from `src/features/testing/bridge.ts`. Production bundles do not contain it — the mode check is a build-time constant, so the dynamic import is eliminated.

The bridge deals a seed, replays an encoded move log (`?moves=` or `play()`), prints the ASCII board for assertions, and states a winnability verdict directly. Playwright cannot conjure a position the solver has proven dead, and waiting on a real multi-second search would be slow and flaky, so verdicts are stated and the browser is used for what it is for: that the warning, the rescue panel and the rewind behave on a real board. Call `stopWatcher()` first, or the background check will overwrite the stated verdict.

## Seed pool

`src/solver/seedPool.test.ts` re-solves a sample of shipped seeds and replays each solution to `isWon`; `npm run seeds:verify` does the whole pool across processes. This is the test that backs the winnable promise — if it fails, the pool ships a deal the app claims is winnable and is not.
