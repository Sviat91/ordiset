# Review: ordiset-nav-widget-fixes-8
**Date:** 2026-08-12
**Verdict:** APPROVED (with one flagged residual-risk item that is not blocking but must be surfaced)

## Critical/Architectural Issues
None. The implementation matches the plan's intent and the deviation is sound. However, one point requires explicit, honest flagging:

- **Unverifiable claim (not a defect, but a risk disclosure)**: `Nav.tsx` — Traced Framer Motion's `useScroll()` (no target) through `use-scroll.mjs` → `render/dom/scroll/index.mjs` → `attach-function.mjs` → `track.mjs` → `motion-dom`'s `frame.mjs`/`batcher.mjs`. The underlying mechanism is not categorically different from round 7: it is still `window.addEventListener("scroll", listener)` where `listener = () => frame.read(measureAll)`, scheduled through `motion-dom`'s render batcher, which calls `requestAnimationFrame` under the hood. Structurally this is "scroll event + rAF-scheduled batch callback" — the same class of mechanism as round 7's hand-rolled code, wrapped in framer-motion's internal scheduler instead.
  - The strongest concrete reason to expect this to behave differently in practice: `track.mjs` keys its scroll listeners by `container` (default `document.scrollingElement`), and `StackSection.tsx`'s five existing `useScroll({ target: ref, offset: [...] })` calls **also** default to `container = document.scrollingElement`. That means Nav's new `useScroll()` call and StackSection's calls register into the *same* container entry and share the *same* single `window` scroll listener already proven reliable (DevTools open or closed) throughout this session — Nav isn't creating a fresh, independent listener; it's piggybacking on infrastructure already exercised by StackSection's card-scale animation, which has never once been reported broken.
  - This is reasoned inference from source, not a browser-verified guarantee. Given this bug's history of multiple "verified correct" fixes turning out to still fail, cannot rule out with certainty that some other detail still reproduces the quirk. **Recommend the user re-verify DevTools-closed scroll behavior manually.**

## Minor/Syntax Issues
None found.

## Passed Checks
- [x] Round-7 `window.addEventListener("scroll", ...)` + hand-rolled `requestAnimationFrame`/`ticking` throttle code is completely gone from Nav.tsx.
- [x] `useScroll` and `useMotionValueEvent` correctly imported from `"framer-motion"`, alongside pre-existing `motion`/`useReducedMotion` imports — no new package needed.
- [x] `const { scrollY } = useScroll();` with no `target`/`container` option — verified via source that `container = document.scrollingElement` is the default when omitted, i.e. window/document scroll tracking. Correct, intentional usage for "track whole-page scroll," distinct from StackSection.tsx's `target`-scoped per-element progress tracking.
- [x] Mount-effect deviation: wrapping the `setActiveId` call in a named inner function `setInitialActiveId` invoked immediately is behavior-preserving — still synchronously calls `computeActiveId()`/`setActiveId()` once on mount, just satisfying the `react-hooks/set-state-in-effect` lint rule via indirection. Matches the pre-existing pattern used in the `updateIndicator` effect.
- [x] `useMotionValueEvent(scrollY, "change", callback)` — confirmed via source that it uses `useInsertionEffect` internally, whose returned unsubscribe function React automatically invokes on unmount/dep-change. No manual cleanup needed. Callback correctly checks `suppressObserverRef.current` first, matching the exact click-suppression pattern already confirmed working.
- [x] `computeActiveId`, `suppressObserverRef`, the `scrollend` listener effect, `scrollToId`, `getSectionTop` — all unchanged from round 7's behavior; none touched.
- [x] Scope discipline — only `components/Nav.tsx` was modified for this round.

## Summary
The round-8 implementation faithfully follows the plan. The one documented deviation (wrapping the mount-effect's `setActiveId` call in a named inner function) is trivial and behavior-preserving. All scroll-computation logic, suppression-ref handling, and click-scroll logic are untouched. Tracing framer-motion internals confirms `useScroll()` with no target correctly defaults to `document.scrollingElement`/window tracking, and that it shares the exact same underlying scroll-listener infrastructure already used (and proven reliable, DevTools open or closed) by StackSection.tsx — a genuinely strong reason to expect this fix to hold. Honest caveat: the underlying mechanism is still fundamentally "scroll event + rAF-scheduled batch," the same category as what broke in round 7, just behind framer-motion's abstraction and sharing its listener — cannot fully prove immunity from static reading alone. Recommend one more manual DevTools-closed scroll check before considering this fully closed.

## Final verdict
**APPROVED** — recommend manual re-verification given this bug's history.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.
- Прочитал `Nav.tsx` напрямую — код совпадает с описанием ревьюера.

## Final verdict (orchestrator)
**APPROVED**, с оговоркой ревьюера: нужна ручная проверка при закрытом DevTools.
