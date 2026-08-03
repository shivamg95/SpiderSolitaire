# Animation catalogue

All animations read from `useMotionPreset()`. When `prefers-reduced-motion: reduce` or the user setting is on, use the low-motion preset (80ms opacity/position fades; no arcs, particles, shimmer, or idle attract).

## Catalogue

1. Initial deal — arc from stock, 18ms stagger, rotate, spring settle, flip on arrival.
2. Card flip — 3D `rotateY`, shadow contracts mid-flip, 220ms.
3. Drag pickup — scale 1.06, shadow lift, velocity tilt, z raise.
4. Multi-card ribbon — 12ms per-card stagger.
5. Drop snap — spring overshoot + landing ripple.
6. Invalid drop — 6px shake, red rim, spring home, 180ms.
7. Stock deal — 10-card wave with per-column stagger.
8. Foundation completion — gold pulse, collapse, arc to slot, bloom.
9. Auto-complete — 60ms cadence chain.
10. Hint — source glow, dashed path, destination ring.
11. Win celebration — fountain, confetti, score count-up, trophy panel.
12. Undo — reverse motion with time-warp easing.
13. Chrome — panel spring+blur, button ripple, `layoutId` tabs, counters.
14. Idle attract — after 20s, shimmer on movable runs.
15. Theme switch — `clip-path` circular reveal from the toggle.

## Performance rules

- Animate only `transform` / `opacity`.
- `will-change` only during an active drag.
- Never animate `width` / `height` / `top` / `left`.
- Single rAF loop for drag; no full-board re-render per `pointermove`.
