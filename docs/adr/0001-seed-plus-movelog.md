# ADR 0001: Seed + move-log as source of truth

## Status

Accepted

## Context

Spider needs undo/redo, replay, tiny saves, seed sharing, and deterministic tests.

## Decision

Game identity is `{ seed, difficulty, moveLog }`. `GameState` is derived by folding the log through `applyMove`. Snapshot the fold every 25 moves. Auto-flip and foundation removal are `Effect`s, not log entries.

## Consequences

- Undo/redo is log index manipulation.
- Saves and share codes stay compact.
- Solver solutions must replay through the real engine to a win.
- Tests can assert exact board equality after fold/undo.
