# Review: Nav scroll-up fix (round 2), shared placeholder copy, remove Overview chip, shrink Hero text
**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
(none found)

## Minor/Syntax Issues
(none found)

## Passed Checks

- [x] **`Nav.tsx:79-85`** — `scrollIntoView` fully removed (grep across the repo confirms zero remaining source-code references; the only hits are stale prose in old `handoff/*.md` docs). New `scrollToId` handler computes `top = el.getBoundingClientRect().top + window.scrollY` and calls `window.scrollTo({ top, behavior })`.
- [x] **Directional correctness verified against the actual sticky-stack layout** (`StackSection.module.css:1-12`, `.card { position: sticky; top: 0; ... }`), not just trusted at face value: each `<section>` (id target) is `position: sticky`. When a target section has already scrolled past its native flow position (e.g. clicking "Overview" while on "Booking site"), `getBoundingClientRect().top` correctly reports a large negative value (it has "unstuck" and scrolled away above the viewport), and adding `window.scrollY` correctly recovers its true document-absolute top (~0), so `scrollTo` lands it right. When the target hasn't yet reached its sticky range (scroll-down case), `rect.top` is a large positive value representing its natural pre-stick offset, and the same formula computes the correct absolute target. This is a real DOM measurement (`getBoundingClientRect`), not the same internal target-resolution path `scrollIntoView` uses, so it plausibly sidesteps the specific cross-browser sticky-ancestor bug the plan describes — no directional regression risk identified for either up or down.
- [x] All 7 links wired: brand/logo (`#overview`, `Nav.tsx:90`), all 5 `LINKS` anchors (`Nav.tsx:117`), and the `Contact` CTA (`Nav.tsx:132`) — each calls `scrollToId(id)`/`scrollToId("overview")`/`scrollToId("contact")` correctly.
- [x] Reduced-motion branch intact: `behavior: prefersReducedMotion ? "auto" : "smooth"` (`Nav.tsx:84`) — consistent with `globals.css`'s `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }`, so the explicit `"auto"` option and the CSS fallback agree.
- [x] **`WindowChrome.tsx:5-15`** — `label` is now optional (`label?: string`) with default `"Preview coming soon"`; `chip` is optional with no default (`chip?: string`); `.address` chip only renders via `{chip && <div className={styles.address}>{chip}</div>}` (line 24) — no hardcoded fallback, confirmed no `"app.ordiset.com"` string exists anywhere in the file.
- [x] **`Hero.tsx:32`** — `<WindowChrome />` — no `label`, no `chip` passed; correctly relies on the shared default and renders no address chip on the Overview widget, matching the request to remove it.
- [x] **`CustomizeSection.tsx:20`** — `<WindowChrome chip="admin.ordiset.com" />` — only `chip` passed, no bespoke `label`, correctly uses the shared default placeholder text while keeping its chip.
- [x] **CSS specificity, computed independent of load order (not just trusted):**
  - `.content h1` (`Hero.module.css:25-27`) = specificity (0,1,1) vs. global `h1` (`globals.css:92-97`) = (0,0,1). `.content h1` strictly dominates on selector weight alone, so it wins under CSS cascade rules regardless of which stylesheet loads/is injected last — this is *not* a repeat of the `.centerY`-class bug (that bug was an accidental *same-specificity* tie broken only by injection order; here the override selector is deliberately built to have strictly greater specificity, so no import-order dependency exists).
  - `.content .lede` (`Hero.module.css:29-32`) = (0,2,0) vs. `.body` in `sections.module.css:50-55` = (0,1,0). Two classes strictly beats one class — same conclusion, order-independent win.
  - Verified the `h1` element in `Hero.tsx:15` (`<h1 className={styles.title}>`) is a genuine DOM descendant of the `.content` div (`Hero.tsx:13`), so the `.content h1` descendant selector actually matches it (this isn't purely academic — confirmed via the real JSX nesting, not assumed).
  - Also confirmed CSS Modules produce unique hashed class names per file, so there's no risk of `.content`/`.lede` semantics leaking into `CustomizeSection.tsx` (which doesn't import `heroStyles` at all) even if class name strings coincidentally matched.
- [x] **`Hero.tsx:16`** — `heroStyles.lede` is applied to the correct paragraph: `<p className={`${styles.body} ${heroStyles.lede}`}>` wraps the actual body copy ("Ordiset gives salons, barbershops..."), not the eyebrow or heading. Eyebrow (`Hero.tsx:14`) and title (`Hero.tsx:15`) left untouched as instructed.
- [x] `.actions` `margin-top` correctly changed from `32px` to `20px` (`Hero.module.css:34-38`).
- [x] **Scope discipline** — confirmed via direct read that `WindowChrome.module.css` is untouched (no chip/label-related styling changes), `StackSection.tsx`/`.module.css` untouched, `Placeholder.tsx` untouched (still requires `label: string`, correctly still supplied non-optionally by `WindowChrome`). `CustomizeSection`'s own heading/body (`CustomizeSection.tsx:11-18`) has no added className, sizing left as-is per plan. `.grow`'s round-1 fix (`sections.module.css:29-36`) is fully intact: `width: 100%` and `align-items: stretch` both still present, not reverted.
- [x] No stray/unexpected file changes found among the reviewed set — every diff traces directly to one of the plan's 3 numbered changes.

## Summary
All three changes match the plan precisely, and the reviewer independently verified the trickiest claims rather than trusting the checklist: the `window.scrollTo` math was checked against the actual sticky-stack CSS (`StackSection.module.css`) to confirm it correctly recovers absolute document offsets in both scroll directions, not just asserted to "work" per the plan's prose. The CSS specificity claims for `.content h1` and `.content .lede` were computed by hand (0,1,1 vs 0,0,1; 0,2,0 vs 0,1,0) and confirmed to be strictly-higher-specificity overrides that are load-order-independent — explicitly ruling out a repeat of the earlier `.centerY` same-specificity/order-dependent bug class. `WindowChrome`'s chip/label defaults, both call sites, and the `.lede` class application were all verified by reading the literal JSX/TSX, not inferred. Out-of-scope files are confirmed untouched, and round 1's `.grow` stretch fix remains intact. No lint/build re-run was performed by the reviewer (no Bash access) — see orchestrator follow-up below.

## Final verdict
**APPROVED** — no changes required.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` and `npm run build` run independently — both pass clean (Turbopack build, 4/4 static pages, TypeScript passed).
- Read `Nav.tsx` and `WindowChrome.tsx` directly: confirms the reviewer's description exactly — `window.scrollTo({ top: rect.top + window.scrollY, behavior })`, no `scrollIntoView` remaining; `WindowChrome` has `label = "Preview coming soon"` default and `{chip && <div className={styles.address}>{chip}</div>}` with no hardcoded fallback.

## Final verdict (orchestrator)
**APPROVED.** All four points from the user's latest feedback addressed: nav now scrolls both directions via a manually-computed absolute offset instead of `scrollIntoView`; Hero and Customize widgets share one placeholder label instead of two bespoke ones; the stray "app.ordiset.com" chip is gone from Overview; Hero's headline/body/button spacing tightened via load-order-safe higher-specificity overrides to give the demo window more room.
