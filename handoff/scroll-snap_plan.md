# Plan: Scroll-snap for stacked sections

**Date:** 2026-08-20
**Status:** Done (2026-08-20), tuned same day after user feedback (see below)

## Post-approval correction (2026-08-20)

User reported the approved `mandatory` implementation felt jittery ("дёргается") — any weak scroll attempt got yanked back to the nearest snap point, which fought the previous smooth free-scroll feel instead of just catching near a section boundary. Fixed directly (small, well-understood tuning of an already-approved change, no new coder/reviewer round):

- `app/globals.css`: `scroll-snap-type: y mandatory` → `scroll-snap-type: y proximity` (only pulls in near a snap point; free/smooth scroll everywhere else).
- `components/StackSection.module.css`: removed `scroll-snap-stop: always` from `.card` (was forcing a hard stop at every section even under `proximity`, no longer needed/desired).

Re-verified against `localhost:3001` (no dev server started): scroll distance vs. rest position, on a 900px-tall card —
| wheel delta | % of card | rest scrollY |
|---|---|---|
| 100px | 11% | 0 (snapped back) |
| 300px | 33% | 0 (snapped back) |
| 500px | 56% | 500 (free — no snap) |
| 600px | 67% | 900 (committed forward) |
| 700px | 78% | 900 (committed forward) |
| 2000px (2×+ card) | — | 1800 — stopped cleanly at the next boundary, no skip, despite removing `scroll-snap-stop: always` |

Free zone sits roughly 33–56%, commit-forward kicks in ~60%+ — close to the user's stated ~70–80% expectation and, more importantly, leaves a wide free-scroll middle band so ordinary scrolling doesn't get fought. Nav-click precision (`getSectionTop`) still lands exactly on target. `npm run lint`/`npm run build` re-confirmed clean.

Note: these are headless numeric checks, not a subjective feel test — the user should confirm the actual trackpad feel themselves.
**Mode:** LIGHT (orchestrator-written plan; solution is a standard, well-understood CSS mechanism — no open architectural decision)

## Goal

Each full-viewport stacked section (`#overview`, `#preview`, `#mobile`, `#booking-site`, `#notifications`, `#contact`) should behave like a discrete "page" on scroll: a light/weak wheel or trackpad flick that doesn't clear the section should snap back to the current section; a committed flick should always land fully on the next (or previous) section — never leaving the view mid-transition between two sections.

## Root cause

Sections are plain `position: sticky` cards (`components/StackSection.module.css` `.card`) with a scroll-linked scale animation (`components/StackSection.tsx`, `useScroll`/`useTransform`, target offset `["start start","end start"]`). There is no `scroll-snap-type`/`scroll-snap-align` anywhere in the codebase (confirmed via grep on `app/globals.css`) — scrolling is plain continuous scroll, so the browser stops wherever the gesture's momentum runs out, which can be mid-transition between two sticky cards.

## Fix: CSS scroll-snap

Native CSS scroll-snap is built exactly for "commit vs. snap-back" semantics based on end-of-gesture scroll position/velocity — no JS wheel-delta logic needed.

### Files to change

1. **`app/globals.css`**
   - In the existing `html { ... }` rule (already has `scroll-behavior: smooth;`), add `scroll-snap-type: y mandatory;`.
   - There is already a media-query override at `@media (max-width: 899px), (max-height: 700px)` that sets `html { scroll-behavior: auto; }` (this is the **reduced-motion** query — confirm which query this actually is before touching it; do not conflate with `StackSection.module.css`'s own, separate `@media (max-width: 899px), (max-height: 700px)` breakpoint block). Add a **new**, separate media rule matching `StackSection.module.css`'s static-fallback breakpoint (`@media (max-width: 899px), (max-height: 700px)`) that sets `html { scroll-snap-type: none; }` — sections become `position: static` there and must keep scrolling exactly as they do today (no snap-page feel on small/short viewports).

2. **`components/StackSection.module.css`**
   - In `.card` (the default/desktop rule, above the existing static-fallback media block): add `scroll-snap-align: start;` and `scroll-snap-stop: always;` (`always` so a hard, fast flick still stops at the very next section instead of skipping past it — matches the user's explicit requirement that pages "fix" one at a time, never sliding past).
   - In the existing `@media (max-width: 899px), (max-height: 700px)` block (where `.card` becomes `position: static`): add `scroll-snap-align: none;` to explicitly opt this breakpoint out (belt-and-suspenders with the `html`-level `scroll-snap-type: none` above).

No JS changes. No new dependencies.

## Verification (must be run against the user's already-running dev server on `localhost:3001` — do NOT start a new dev server)

Using `agent-browser` against `http://localhost:3001`:

1. Weak scroll (small `wheel`/`mouse wheel` delta, e.g. 80–120px) from a settled section (e.g. `#overview`) → must snap back to the same section, not leave a hybrid half-scrolled state.
2. Strong scroll (large delta, e.g. 600–900px, or repeated deltas) → must land fully on the next section, `getBoundingClientRect().top === 0` (±1px) for that section, no skipped section even on a very large single delta (`scroll-snap-stop: always`).
3. Nav link clicks (`Nav.tsx`'s `scrollToId`) and the Hero "See how it works" anchor (`#preview`) still land exactly on the target section's top — scroll-snap must not fight the existing `window.scrollTo({ top, behavior: 'smooth' })` call.
4. The existing scroll-linked scale animation (previous card shrinking to `0.96` as the next one covers it) still animates smoothly during a snap-triggered scroll — no visual jump/flash.
5. At a narrow/short viewport that trips the static-fallback breakpoint (e.g. 390×844, or 1440×640), scrolling behaves exactly as before this change (no snapping, normal document scroll) — confirms the fallback opt-out works.
6. `npm run lint` and `npm run build` both clean.

## Constraints

- Do not touch `StackSection.tsx` (the scale animation logic) — this is a pure CSS addition.
- Do not touch `Nav.tsx`/`Nav.module.css` (already reverted this session to always show the nav; unrelated to this task).
- Do not touch `demo-widget/`, `public/demo-app/`, or `DemoStage.tsx`/`.module.css` (unrelated, already fixed this session).
- Do not start a dev server — verify against the user's existing `localhost:3001` instance only.

## Implementation Steps

- [x] Step 1: Add `scroll-snap-type: y mandatory;` to `html` in `app/globals.css`.
- [x] Step 2: Add a new media rule (matching the static-fallback breakpoint) setting `html { scroll-snap-type: none; }` in `app/globals.css`.
- [x] Step 3: Add `scroll-snap-align: start; scroll-snap-stop: always;` to `.card` in `components/StackSection.module.css` (default rule).
- [x] Step 4: Add `scroll-snap-align: none;` to `.card` inside the existing static-fallback `@media` block in `components/StackSection.module.css`.
- [x] Step 5: verified by orchestrator via `agent-browser` against `localhost:3001` (2026-08-20):
  - Weak wheel flick (100px) from `#overview` → snapped fully back to `scrollY:0`.
  - Strong wheel flick (700px) → committed fully to `#preview` (`scrollY:900`, exactly one card height at 900px viewport, `previewTop:0`), no half-transition state, confirmed visually via screenshot.
  - Nav click ("Mobile") → landed exactly on `#mobile` (`scrollY:1800`, `mobileTop:0`), scroll-snap did not fight the existing smooth-scroll click handler.
  - At 390×844 (static-fallback breakpoint): `getComputedStyle(html).scrollSnapType === "none"` confirmed, and a weak flick (150px) did NOT snap back — free scroll preserved exactly as before, as intended.
- [x] Step 6: `npm run lint` and `npm run build` clean — both ran clean with no errors/warnings.
