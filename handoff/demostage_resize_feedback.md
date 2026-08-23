# Review: DemoStage resize fix (monotonic-max removal)
**Date:** 2026-08-23
**Verdict:** APPROVED (after one minor fix applied directly by orchestrator)

## Critical/Architectural Issues
None.

## Minor/Syntax Issues
- `components/DemoStage.tsx` (in `tryClick`, near the `setNeedH(minViewportHeight)` reset): stale comment claimed `needH` was "monotonic-increasing (see syncNeed)" — no longer true after this fix. **Fixed directly by orchestrator** (trivial one-comment edit, no coder/reviewer round-trip needed): reworded to describe the reset's actual remaining purpose (avoiding a one-frame flash of the pre-click page's height before the `contentNonce` re-measure lands).

## Passed Checks
- [x] `syncNeed` now directly does `setNeedH(required)` from `doc.documentElement.scrollHeight`, no `Math.max(boxH, prev)` monotonic clamp; `useCallback` deps changed `[box]` → `[]`, correctly (no stale-closure risk — `box` no longer referenced in the function body).
- [x] Downstream `cssH = Math.max(box.h, needH)` floor unchanged — still guarantees the frame never renders shorter than the container box.
- [x] The `useEffect` that calls `syncNeed` via `requestAnimationFrame` still lists `box` directly in its own deps array, so it still re-triggers correctly on box changes despite `syncNeed`'s now-stable identity.
- [x] `handleLoad`, `autoClickText`/`tryClick` control flow, `ResizeObserver` setup, and the `fixedViewport` render branch all structurally unchanged, per plan.
- [x] `fixedViewport` JSDoc trimmed correctly — stale claim removed, remaining rationale (fixed CSS-px size, uniform scale, internal scroll, mutual exclusivity with auto-fit) intact and grammatical.
- [x] No other file in the repo references `needH`/`syncNeed` — blast radius fully contained to `DemoStage.tsx`.
- [x] `Element.scrollHeight` can't return a pathological value (always a non-negative integer); no defensive check needed, would be overengineering.

## Summary
Core fix matches the plan exactly and is confirmed correct: `PreviewSection` and `AdminPanelSection` (both auto-fit, no `fixedViewport`) will now correctly re-measure and resize — both up and down — as the visitor navigates within the embedded demo, instead of getting permanently stuck at the tallest page ever visited. `MobileSection` (the only `fixedViewport` consumer) is unaffected, confirmed by grep and by the `if (fixedViewport) return;` early-return in `handleLoad`. One stale comment found by review (unrelated to the plan's two touched blocks) was fixed directly.
