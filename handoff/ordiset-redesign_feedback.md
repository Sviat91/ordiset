# Review: Ordiset redesign — stacking cards, dominant widgets, floating nav

**Date:** 2026-08-11
**Verdict:** APPROVED (with one process caveat — see Summary)

## Critical/Architectural Issues
(none found)

## Minor/Syntax Issues
- [ ] Lint/build not independently verified by the reviewer agent: that review session only had Read/Glob/Grep tools (no Bash), so `npm run lint` and `npm run build` could not actually be executed as the plan's Step 13 and acceptance criteria require. The code is statically consistent by inspection (imports used, hooks called unconditionally, types line up). Orchestrator to run `npm run lint && npm run build` for real — see below.

## Passed Checks
- [x] `app/globals.css`: `html, body { overflow-x: clip }`, no `overflow-y` set anywhere on `html`/`body` — confirmed by direct read, with the correct rationale comment present. `main { padding-top }` removed; `scroll-padding-top: 0` set. Brand tokens (`--bg`, `--surface`, `--accent`, `--accent-hover`, `--accent-press`, `--accent-soft`, `--on-accent`) unchanged; only additive tokens (`--accent-glow`, `--shadow-stack`, `--nav-top`, `--nav-pill-h`) and `--nav-h` value added/changed.
- [x] Z-index chain: Hero `z=1`, Customize `z=2`, Mobile `z=3`, BookingSite `z=4`, Notifications `z=5` — all match render order in `app/page.tsx`. Contact has `position: relative; z-index: 6; background: var(--bg); min-height: 100svh`. Nav `z-index: 50`.
- [x] No stacking-context traps: `<body>` and `<main>` have no `position`/`z-index`/`transform`/`filter`/`opacity`/`isolation`/`will-change`/`contain`/`backdrop-filter`. Re-derived independently: since `main` establishes no stacking context, each sticky card's own local context and Nav's local context are siblings in the same root stacking context, so `50 > 6` holds directly.
- [x] Nav is a direct child of `<body>`, sibling of `<main>`, not nested inside anything that would trap it.
- [x] `StackSection.tsx` (Step 12 implemented): `motion.section` uses only `style={{ zIndex: z, scale }}`, no `whileInView`/`initial` anywhere. `useReducedMotion()` branch returns a plain `<section>` with no `style` prop.
- [x] `StackSection.module.css` media query (`max-width: 899px, max-height: 700px`) sets `position: static; min-height: 0` and `transform: none !important`, correctly neutralizing framer-motion's inline `transform` (author-stylesheet `!important` outranks normal-priority inline style per the CSS cascade spec).
- [x] No-unreachable-content: every card is `min-height: 100svh` (not `height`), flex-column, with `.grow { flex: 1 1 0; min-height: 220px }` as the visual region. `WindowChrome.window` has `max-height: 100%`, `PhoneFrame.phone` width is capped by `calc(62svh * 9/19.5)`. Safety-valve media query present.
- [x] Logo crop: confirmed source is 2400×1309 (matches plan assumption). Crop is square (680×680), origin (866,202), fully inside bounds. Margins symmetric: left 32 / right 32, top 42 / bottom 42.
- [x] `public/ordiset-mark.png` and `components/PinnedSection.{tsx,module.css}` are gone; zero code references remain.
- [x] Scope discipline: `ContactForm.tsx`, `PhoneFrame.tsx`, `Placeholder.tsx` untouched except PhoneFrame's one allowed `.phone` width rule. No new dependencies.
- [x] Section order/content: Hero → CustomizeSection → MobileSection → BookingSiteSection → NotificationsSection → ContactSection. All 6 ids unchanged; copy unchanged. Nav `LINKS` order matches.
- [x] Exactly two accent effects: Hero `.glow` and the `.seam` line, gated to `z > 1`.
- [x] `WindowChrome.module.css`: old size cap removed; new flex/aspect-ratio interaction traced and correct (shrinks into a letterbox instead of overflowing).

## Summary
Careful, correct implementation of a genuinely tricky piece of CSS reasoning. The reviewer independently re-derived (rather than trusted) the three highest-risk claims — the `overflow-x: clip` vs `hidden` sticky-breakage mechanism, the stacking-context/paint-order math, and the `!important`-beats-inline-style cascade rule — and all three hold up. Logo crop verified against the actual source image. Scope discipline held throughout.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` and `npm run build` run independently — both pass clean.
- Read `StackSection.tsx`/`.module.css` and `Hero.tsx`/`.module.css` directly: confirmed the `overflow:clip` on `.card` correctly contains the Hero's absolutely-positioned `.glow` regardless of which element is its literal containing block (clipping applies to all painted descendants along the box's rendering area). Confirmed `transform`/`scale` applied to a `position: sticky` element does not affect its own stickiness (sticky is computed pre-transform, at layout time) and that no `position: fixed` descendant lives inside any `.card` (Nav is a sibling of `<main>`, not nested inside a card), so the `transform`-creates-a-containing-block side effect is a non-issue here.
- **One real bug found, self-flagged by the coder, confirmed and fixed by the orchestrator:** `components/sections/sections.module.css` `.centerY` used `justify-content: center`. It's applied only alongside `.split` (a CSS Grid container) on `MobileSection`, `BookingSiteSection`, and `NotificationsSection` — and since `.split`'s `display: grid` is declared *after* `.fill`'s `display: flex` in the same file, `.split` wins the cascade on `display` wherever both classes land on one element, which is always the case here. `justify-content` only affects a grid container's *inline* axis, not the block axis a single implicit row needs for vertical centering — so it was a no-op, and all three split-layout cards would have rendered their text+phone content pinned to the top with dead space below, instead of vertically centered in the tall card. **Fixed**: changed `.centerY` to `align-content: center`, which does correctly center a grid's row track(s) in the block axis. Re-verified lint/build clean after the fix.

## Final verdict
**APPROVED**, with the one `.centerY` fix applied. All Critical items from the plan's own risk list (overflow-x/sticky, Contact z-index/background, ascending z-index chain, no whileInView+scroll-linked-style combination, no-unreachable-content sizing, logo crop symmetry) were independently verified by both the reviewer and the orchestrator and hold up under re-derivation, not just inspection.
