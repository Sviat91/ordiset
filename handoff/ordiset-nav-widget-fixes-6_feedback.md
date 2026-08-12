# Review: Nav indicator direction bug + widget width mismatch (round 6)
**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
None found.

## Minor/Syntax Issues
- Theoretical tie-break edge case in `computeActiveId`: `components/Nav.tsx` — When two adjacent `StackSection` cards are both `position: sticky; top: 0` and momentarily both have `rect.top === 0` (right at the transition instant where one section's sticky range ends and the next begins), both produce `dist = 0` and the strict `<` comparison means the **first** matching id in `SECTION_IDS` order wins the tie. In practice this is unlikely to cause visible bugs because the `IntersectionObserver`'s `rootMargin: "-50% 0px -50% 0px"` only fires when an element's boundary crosses the viewport's center line — which happens during the actively-differentiating part of the transition (partial-visibility, non-tied geometry), not during the flat "both pinned exactly" instant. Not blocking; flagged for awareness only.

## Passed Checks
- [x] `computeActiveId()` correctly identifies a currently-pinned section (`rect.top=0`, `rect.height≈window.innerHeight`) as the winner: `mid = rect.top + rect.height/2 ≈ center`, giving `dist ≈ 0`, the minimum possible.
- [x] The fix structurally eliminates the direction-dependent bug: `computeActiveId()` is a pure function of current DOM geometry (`getBoundingClientRect()`), itself a pure function of `scrollY` — no dependency on `IntersectionObserver` entries array order or scroll history/direction. The same scroll position now always yields the same result whether reached by scrolling up or down.
- [x] Partial-visibility transition cases handled correctly and symmetrically for both scroll directions, since no ordering/history state is involved.
- [x] Off-screen skip guard `rect.bottom <= 0 || rect.top >= window.innerHeight` correctly excludes only fully-hidden sections without excluding any partially-visible section.
- [x] `suppressObserverRef.current` check is correctly the first statement in the observer callback, before `computeActiveId()` is invoked — click-driven scrolls still correctly suppress observer-driven overrides.
- [x] Observer callback signature `() => { ... }` (no `entries` param) is type-correct.
- [x] `IntersectionObserver` construction, `rootMargin`, `observe`/`disconnect` loop left untouched as instructed.
- [x] `sections.module.css` `.grow` now has `max-width: 78%` — nothing else altered.
- [x] `Hero.module.css` no longer contains a `.visual` rule — confirmed via grep, only unrelated `.visualFirst` matched.
- [x] No stray `heroStyles.visual` references anywhere.
- [x] `Hero.tsx` widget wrapper is now `<div className={styles.grow}><WindowChrome /></div>` — textually identical to `CustomizeSection.tsx`'s wrapper.
- [x] `heroStyles` import in `Hero.tsx` still genuinely used (`.root`, `.glow`, `.content`, `.lede`, `.actions`, `.primary`, `.secondary`).
- [x] `CustomizeSection.tsx` left untouched, as instructed.
- [x] Scope discipline confirmed.

## Summary
The core fix for the directional indicator bug is architecturally sound: replacing the entries-array-order-dependent `setActiveId` loop with a pure geometric recomputation removes the root cause of the forward/backward asymmetry, since the new logic has no dependency on scroll direction or event ordering — only on current DOM rects, which are themselves a deterministic function of scroll position. The widget-width fix is straightforward and correctly verified: `.grow` now carries `max-width: 78%`, `.visual` is fully removed, and the two wrapper markups are textually identical. One minor, non-blocking theoretical tie-break edge case was noted for awareness but does not warrant a required fix.

## Final verdict
**APPROVED**

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.
- Прочитал `Hero.tsx` — обёртка виджета `<div className={styles.grow}>`, теперь текстуально идентична `CustomizeSection.tsx`.

## Final verdict (orchestrator)
**APPROVED.**
