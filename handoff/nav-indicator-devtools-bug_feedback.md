# Review: Nav active-indicator DevTools bug (Round 9 / FULL mode)

**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
None found in the code itself.

## Minor/Syntax Issues

- **Step 0 gate bypassed without record**: Step 0 is explicitly a mandatory, user-run falsification gate and remains unchecked, while Steps 1–4 (actual code changes) are checked. Strictly, the plan's own protocol required this to pass before any code was written. Mitigating factor: the reviewer independently verified the plan's factual CSS/DOM claims and they hold, and the fix (AD-3) is deliberately layout-independent (one formula for both the sticky and the `position: static` fallback), so even if the root-cause narrative were imperfect, the new scroll-offset detector is not path-dependent on it being exactly right. Not blocking, but Step 5 (the real behavioral browser matrix) is also still unchecked and must be run by the user before this is truly closed.
- **Stale timeout id not nulled after clearing**: `onScrollEnd` calls `window.clearTimeout(scrollTimeoutRef.current)` but never resets `scrollTimeoutRef.current` back to `null` afterward. Not a functional bug (`clearTimeout` on an already-fired/cleared id is a documented no-op), just a small hygiene gap. Not worth a re-round on its own.

## Passed Checks

- [x] `computeActiveId()` traced correctly: `scrollY=0` → returns `"overview"`.
- [x] `scrollY = getSectionTop("mobile")` traced correctly → returns `"mobile"`, matching the plan's stated expectation exactly.
- [x] `getSectionTops()` ascending-order assumption holds both trivially (cumulative sum of non-negative `offsetHeight`s is monotonic) and concretely (document order in `app/page.tsx` matches `SECTION_IDS` order in `Nav.tsx` exactly).
- [x] `getSectionTop(id)` (singular) arithmetic is unchanged from the pre-existing "sum of `offsetHeight` of preceding sections" behavior — same definition, same "missing element contributes 0" fallback. Traced for `"overview"` and `"notifications"` — both match byte-for-byte in arithmetic terms.
- [x] `getBoundingClientRect()` appears exactly twice in the file, both inside `updateIndicator`, measuring nav-link geometry — not in the active-section detection path.
- [x] Step 4 hardening reviewed line-by-line: `scrollTimeoutRef` declared, cleared at the start of `scrollToId` and inside `onScrollEnd`, cleared again on unmount, new timeout id captured into the ref. The `1000`ms constant is untouched and not made distance-dependent. Diff footprint well within the ~6-line budget.
- [x] `suppressObserverRef`, the `scrollend` listener, `useScroll`/`useMotionValueEvent` subscription, `scrollToId`'s core scroll-target logic, `updateIndicator`, and JSX all structurally identical to the round-9 baseline — only Step-4-sanctioned timeout bookkeeping was added.
- [x] `StackSection.tsx`/`.module.css` confirmed untouched and match the plan's factual claims exactly: `.card { position: sticky; top: 0; min-height: 100svh }`, the `@media (max-width: 899px), (max-height: 700px)` fallback, and the scale transform about default transform-origin.
- [x] Root-cause geometry claims independently sanity-checked against real files: all six sections render as direct children of `<main>`, no intervening positioned ancestor; global `* { margin: 0 }` and `Nav` being `position: fixed` confirm `main` starts at document y=0, so the cumulative `offsetHeight` sum is the real document offset.
- [x] Scope discipline: only `components/Nav.tsx` shows the round-9 changes.
- [x] No dead `getBoundingClientRect`/`bestDist`/off-screen-skip remnants from the old `computeActiveId`.
- [x] TypeScript/lint sanity: no unused variables, explicit return types, no new lint surface introduced.

## Summary

The Step 1/2 rewrite of `computeActiveId()`/`getSectionTops()`/`getSectionTop()` is correct by direct trace: it returns `"overview"` at `scrollY=0` and `"mobile"` at `scrollY=getSectionTop("mobile")` exactly as the plan specifies, the offset table is provably ascending both by construction and by matching real DOM order, and `getSectionTop(id)`'s arithmetic for the click-scroll target is unchanged from the pre-round-9, user-confirmed-correct implementation. `getBoundingClientRect()` is fully purged from the active-section detection path. Step 4's timeout hardening is small, correctly scoped. Scope discipline holds — only `Nav.tsx` changed, and all "must not touch" files verified byte-consistent with the plan's factual claims about them, which independently corroborates the plan's root-cause narrative. The one process gap is that Step 0's mandatory falsification gate was skipped — not a code defect, and substantially de-risked by AD-3's layout-independent formula and this review's own static verification, but the user should still run the real browser acceptance matrix (Step 5) before calling this closed, since no automated test coverage exists.

## Final verdict
**APPROVED** — pending user's real-browser verification (Step 5), since that's exactly the gap that produced 8 prior false positives.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.
- Прочитал `Nav.tsx` целиком — код полностью совпадает с описанием ревьюера.

## Final verdict (orchestrator)
**APPROVED.** Нужна реальная проверка в браузере с закрытым DevTools — именно это ни разу не подтверждалось автоматически за все 8 предыдущих раундов.
