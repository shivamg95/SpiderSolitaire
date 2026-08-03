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

Use `?seed=&d=&moves=` plus the test-only `window.__spider` bridge when `import.meta.env.MODE === 'test'`.
