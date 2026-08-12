# Review: ordiset-nav-widget-fixes-7

## Critical/Architectural Issues
None found.

## Minor/Syntax Issues
None found.

## Passed Checks
- [x] `IntersectionObserver` and its `useEffect` (SECTION_IDS observe-loop, `rootMargin: "-50% 0px -50% 0px"`) are completely removed — no remaining references anywhere in the file.
- [x] `SECTION_IDS` is still used (by `computeActiveId` and `getSectionTop`) and correctly not referenced directly in the new scroll effect — no orphaned import/variable.
- [x] `{ passive: true }` is used on the `scroll` listener — correct, no `preventDefault` is called anywhere in the handler chain.
- [x] rAF throttle is correct: `ticking = false` is the very first statement inside `updateActiveId`, before `computeActiveId()` runs. No scenario leaves `ticking` permanently `true` — it's unconditionally reset every time the rAF callback runs.
- [x] `updateActiveId()` is called synchronously once right after `addEventListener`, so the indicator is set correctly on mount before any scroll occurs.
- [x] Cleanup function correctly removes the `scroll` listener. A pending `requestAnimationFrame` callback is not explicitly cancelled, but Nav is a persistent header with no realistic unmount/remount churn, and React 18 safely no-ops `setState` on unmounted components — harmless omission, not a defect.
- [x] `suppressObserverRef`, `computeActiveId`, the `scrollend`-listener effect, `scrollToId`, and `getSectionTop` are byte-for-byte untouched from round 6.
- [x] No `stopPropagation` on scroll anywhere in the codebase. `overflow-x: clip` on `body` only affects the horizontal axis and does not turn `body`/`html` into a competing vertical scroll container — `window` remains the sole scroll container, so the `window`-level `scroll` listener will reliably receive organic wheel/trackpad scroll events in both directions.
- [x] Implementation is a verbatim match of the plan's literal code snippet.
- [x] Scope discipline: only `Nav.tsx` differs from round-6 state.

## Summary
The IntersectionObserver and its exotic zero-height-root `rootMargin` are fully removed, replaced by a standard `window` `scroll` listener throttled via `requestAnimationFrame`, calling the same proven `computeActiveId()` geometry function used by clicks. The throttle logic is correct and cannot get permanently stuck since `ticking` is reset before the expensive work runs. Initial mount state is handled via a synchronous `updateActiveId()` call. No other scroll-container/stopPropagation issue exists elsewhere in the codebase that could swallow the event before it reaches `window`. This should reliably fix organic scroll updating the indicator in both directions.

## Final verdict
**APPROVED**

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.
- Прочитал `Nav.tsx` напрямую — код совпадает с описанием ревьюера.

## Final verdict (orchestrator)
**APPROVED.**
