# Review: ordiset-nav-widget-fixes-4

**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
None found.

## Minor/Syntax Issues
None found.

## Passed Checks
- [x] `components/Nav.tsx` `getSectionTop`/`scrollToId` match the plan's code snippet exactly, line for line (`Nav.tsx:25-33`, `89-92`), including the `if (sectionId === id) break` order and the `if (el) top += el.offsetHeight` guard.
- [x] `getDocumentTop` (round 3's helper) is fully removed — no remaining references in `Nav.tsx`.
- [x] **Core claim verified as correct**: `offsetHeight` is a pure layout-box measurement computed before the transform/compositing stage, so it is unaffected by `scale` transforms — confirmed in `StackSection.tsx:22,38` where Framer Motion applies `style={{ scale }}` (a visual/compositing-only property) to the same `motion.section` element that carries `id={id}`. It is also unaffected by `position: sticky` because sticky elements retain their full in-flow box size; only their rendered position shifts while scrolled, not their layout size. Round 4 never reads the target's own position at all — only the `offsetHeight` of elements strictly before it — sidestepping both failure modes that plausibly broke rounds 2 and 3.
- [x] Loop correctness: `SECTION_IDS` order matches `app/page.tsx` render order and each section's actual `id` exactly. `break` on match means the target's own height is never added; nothing skipped or double-counted.
- [x] For `overview` (first in the array), loop breaks on first iteration, returning `top = 0` — verified correct: `Nav` is `position: fixed` (out of flow), `main` has no `padding-top`, `body`/`html` have no margin/padding, `overview`'s id sits directly on the outermost section element.
- [x] No margin-collapsing traps: no section sets `margin`, both `border-top` and internal `padding` are included in `offsetHeight`, so the sum genuinely equals cumulative document distance.
- [x] Null-guard is sufficient in practice: `scrollToId` only runs post-hydration from a click, and all six sections are statically rendered with no conditional/lazy sections.
- [x] All 7 click sites route through `scrollToId` unchanged; reduced-motion handling untouched.
- [x] No other files touched beyond `Nav.tsx`.

## Summary
This round does not rely on reading any position/offset property of the target element itself — the property class (`offsetTop`, `getBoundingClientRect`) that is genuinely ambiguous or transform-polluted for a `position: sticky` + `scale`-transformed element, which is what plausibly broke rounds 2 and 3. `offsetHeight` is, by spec, a pre-transform layout-box value untouched by both `position: sticky` and the scale transform — traced through the actual CSS/JSX, not taken on faith. `SECTION_IDS` order, DOM ids, and render order all line up with no gaps or offset traps.

**Caveat carried forward explicitly**: static reading can verify the CSS-spec correctness of the approach exhaustively, but cannot substitute for an actual browser click-test, particularly across the `max-width: 899px, max-height: 700px` breakpoint where `position` switches to `static`. Given three prior "should work" verdicts the user reported as still broken, this should be confirmed in-browser by the user before being called fully closed, even though no defect was found on inspection.

## Final verdict
**APPROVED** — no implementation defect found; core hypothesis (offsetHeight immune to sticky/transform) independently verified against the actual CSS/JSX, not just asserted. Recommend user confirms in-browser given the history on this bug.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.
- Прочитал `Nav.tsx` напрямую — код совпадает с описанием ревьюера.

## Final verdict (orchestrator)
**APPROVED.** Нужно подтверждение пользователя в браузере — код-ревью само по себе не может это гарантировать после трёх предыдущих провалов.
