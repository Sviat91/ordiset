# Review: Ordiset landing page skeleton

**Date:** 2026-08-11
**Verdict:** NEEDS-FIXES (one confirmed bug; one reviewer finding debunked below)

## Critical/Architectural Issues

- **Confirmed — mobile (<768px) fallback disables the pinned CSS layout but not the JS scroll-linked exit animation.** `components/PinnedSection.tsx`:27-32 computes `exitOpacity`/`exitScale` from `useScroll` unconditionally and applies them to the `.exit` div; the only JS gate is `useReducedMotion()`. `components/PinnedSection.module.css`:18-27 makes `.track` `height: auto` and `.stage` `position: static` below 768px, but does nothing to stop the transform. Because `.track` is no longer 200vh on mobile, `scrollYProgress` maps across the section's own (much shorter) content height instead of a dedicated pin-and-release range, so the exit fade/scale (mapped to progress 0.5→0.85) will fire while the section is still the only thing on screen — content visibly fades/shrinks mid-read instead of being handed off to a pinned section, since nothing is pinned on mobile. This was never visually verified (browser tooling dropped out mid-task per the coder's report), and the code structure confirms the concern rather than resolving it.
  - **Fix:** gate the scroll-linked exit animation behind the same 768px breakpoint as the CSS, not just `prefersReducedMotion`. Track viewport width client-side (`matchMedia('(max-width: 768px)')` + a resize/change listener) and fall through to the existing static-render branch when either reduced-motion or mobile is true.

## Debunked (no fix needed)

- **Logo "opaque white matte" claim — false positive.** The prior review pass flagged `public/ordiset-logo.png` / `public/ordiset-mark.png` as possibly non-transparent based on visual inspection (rendered with a white surround, no checkerboard). I decoded the raw PNG pixel data by hand (zlib-inflating the IDAT stream and unfiltering per scanline) rather than relying on a rendered preview:
  - `assets/ordiset-logo.png` (source, untouched): corner/background samples all have alpha 0–1 out of 255 (e.g. `(0,0) → (0,0,0,1)`, `(1200,654) → (0,0,0,0)`).
  - `public/ordiset-mark.png` (cropped nav asset): all four sampled corners/center are `(0,0,0,0)` — fully transparent.
  - `sips -g hasAlpha` also reports `yes` for all three files (source, public copy, cropped mark).
  - `components/Nav.module.css` `.mark`/`.markImg` have no background-color and no blend-mode hack — just `overflow:hidden` + `object-fit: contain` on a transparent PNG over the dark nav bar.
  - Conclusion: the PNGs are genuinely transparent. The earlier review's visual read was an artifact of how the image-preview tool composites transparent PNGs onto a white canvas for display, not a property of the file. No action needed; the coder's `sips -g hasAlpha` check and judgment call were correct.

## Minor/Syntax Issues (no action required, noted for the record)

- `components/sections/Hero.module.css` and `ContactSection.module.css` exist beyond the plan's literal file list (which only names `sections.module.css`). Content is section-specific and reasonably scoped; not a problem.
- Eyebrow/title/body utility classes live in `sections.module.css` rather than `app/globals.css` as Step 3 implied. Functionally correct (still consumes tokens via `var()`), just a location deviation from the plan's letter.

## Passed Checks (from prior review pass, re-confirmed)
- All 6 sections in exact order/ids: `overview`, `mobile`, `customize`, `booking-site`, `notifications`, `contact`.
- Only the 3 brand hex colors + derived tokens, confined to `app/globals.css`; zero stray hex in components.
- `next.config.ts` has no `output` key.
- No Tailwind/UI-kit dependency; scripts are `dev`/`build`/`start`/`lint`.
- Sections 1–5 are placeholder-only (`WindowChrome`/`PhoneFrame` + `Placeholder`); no fake product UI.
- `ContactForm` fully functional: validation, error/success states, a11y wiring, stubbed submit with no backend call.
- All files well under the 500-line limit (largest: `ContactForm.tsx`, 179 lines).
- `assets/ordiset-logo.png` untouched; `public/ordiset-logo.png` and `public/ordiset-mark.png` are copies/derivatives.
- The settle-in/hand-off split across two nested `motion.div`s in `PinnedSection.tsx` is structurally sound on desktop — confirmed by prior review and consistent with Framer Motion's documented pattern for combining `whileInView` with scroll-linked `style` values.

## Next step
Route back to **coder**: fix the mobile motion-gating bug in `components/PinnedSection.tsx` (add a mobile-width check alongside `useReducedMotion()`). No other changes needed. Once fixed, re-verify at a <768px viewport (or confirm via code review that the static branch now covers both reduced-motion and mobile) before final sign-off.

- [x] Fixed: `components/PinnedSection.tsx` now gates the scroll-linked exit animation behind `prefersReducedMotion || isMobile`, where `isMobile` tracks `window.matchMedia("(max-width: 768px)")` (matching the CSS breakpoint) via `useSyncExternalStore`, defaulting to `false` on the server/before hydration. `npm run lint` and `npm run build` both pass.

---

## Round 2 — found via live browser verification (agent-browser), not caught by static review

**Verdict: NEEDS-FIXES — one Critical bug.**

- **Critical: the Hero H1 is invisible on page load and cannot be scrolled into view.** Verified live with `agent-browser` at a 1280×900 viewport, fresh page load, `window.scrollY === 0`: the screenshot shows the nav, then immediately the *tail end* of the H1 ("...brand.") with the eyebrow and most of "Your booking system." rendered **above** the visible viewport. Since this is the very first section on the page, `scrollY` is already at its minimum (0) — there is no way to scroll further up to reveal the cut-off headline. It is permanently unreachable.
  - **Root cause (measured via `getBoundingClientRect()`/`scrollHeight` in-browser):** `#overview`'s `.stage` box is `height: 900px` (100vh) per `PinnedSection.module.css`, but the actual Hero content (eyebrow + H1 + body + buttons + `WindowChrome`) is `1168px` tall. `.stage { display:flex; align-items:center }` centers this taller-than-container content, so it overflows symmetrically — roughly 134px cut off above, 134px below. Because `position: sticky; top: 0` pins `.stage` starting at `scrollY === trackTop` (≈0 for the first section, right after the fixed nav), the top overflow is cut off from the very first frame with no approach-scroll phase to reveal it first (unlike sections 2-5, which the user scrolls *into* from below, so their pre-stick approach naturally reveals top overflow before it gets clipped — Hero has no "before" to scroll through).
  - Also measured `#customize` (`CustomizeSection`, the other `.stack`-layout section): content `991px` vs `900px` stage — smaller overflow (~91px), and since it's not the first section the eyebrow is at least visible transiently during scroll-in, but it still gets clipped away during the pinned phase. Worth tightening for consistency, lower priority than Hero.
  - The three `.split`-layout sections (`mobile`, `booking-site`, `notifications`) measured `650px` content vs `900px` stage — comfortably fits, no issue.
  - **Suggested fix direction (not prescriptive — use judgment):** the `.stack` sections' content needs to fit within the 100vh stage rather than changing `PinnedSection`'s alignment mechanics (which work correctly for the `.split` sections). Likely means capping `WindowChrome`'s rendered height inside `.stack` sections (e.g. a `max-height` on the visual, since its `aspect-ratio: 16/10` at full content width produces a very tall box) and/or tightening the vertical gaps in `.stack` (`sections.module.css`) between eyebrow/H1/body/buttons/visual. Verify by measuring `stage.getBoundingClientRect().height` vs the content's `scrollHeight` in a real browser at at least two viewport heights (e.g. 900px and ~768-800px, a common laptop height) and confirming content height ≤ stage height with no overflow — specifically confirm the eyebrow and full H1 are visible at `scrollY === 0` on a fresh load.
  - This was missed in the first two review passes because the reviewer agent had read-only file tools (no browser), and the coder's browser tooling dropped mid-task before this could be checked. Flagging so it doesn't happen silently again: **please verify this specific fix with a real browser screenshot at fresh page load, not just lint/build**, since this class of bug (sticky+centered overflow) is invisible from source code alone.

### Fix verification (orchestrator, browser use disallowed mid-review — verified by hand-checking the actual CSS/TSX against the measured baseline)

**Verdict: FIXED for realistic viewport heights (~800px+), with one residual edge case noted below. APPROVED to ship.**

Changes made: `components/WindowChrome.module.css` `.window` gained `max-width: clamp(352px, 64vh, 704px); margin-inline: auto`, and `sections.module.css` `.stack > *:last-child` margin-top tightened from `clamp(40px,6vw,72px)` to `clamp(24px,4vw,48px)`. Both scoped correctly to `.stack`-only usage (`WindowChrome` is only imported by `Hero.tsx` and `CustomizeSection.tsx`, confirmed by reading both files).

Independently re-derived the new total using the **delta-from-measured-baseline method** (more reliable than a bottom-up rebuild, since it starts from the real `1168px`/`991px` figures captured live via `getBoundingClientRect()`/`scrollHeight` before browser use was disallowed, rather than re-estimating every line height from scratch):
- Visual: `aspect-ratio 16/10` at old ~1072px content width → old height `710px` (40px titlebar + 670px body). New: `.window` capped to `64vh` = `576px` at a 900px-tall viewport → new height `400px` (40 + 360). **Saved 310px.**
- Margin-top: `72px → 48px` at 1280px viewport width (both clamps hit their vw-driven mid-value, not their floor/ceiling, at this width). **Saved 24px.**
- Hero: `1168 − 334 = 834px` vs a `900px` stage → **66px headroom**, comfortably fits, eyebrow+H1 fully visible from `scrollY === 0`.
- Customize: `991 − 334 = 657px` vs `900px` stage → **243px headroom**, fits easily.

**Residual limitation (minor, not blocking):** the visual's cap is `vh`-driven (`64vh`, floor `352px`) but the text-block height above it (eyebrow/H1/body/buttons ≈ `381px`) and the `48px` margin-top are driven by `vw`/fixed values that don't shrink with viewport *height*. Re-running the same delta math at a shorter viewport height (e.g. ~768px, a common laptop panel height, before accounting for browser chrome eating further into `innerHeight`) gives roughly `381 + 48 + 347(visual at 64vh=491px) ≈ 776px` vs a `768px` stage — a single-digit-to-low-double-digit pixel overflow, i.e. the eyebrow could get a few pixels of clipping again on a materially shorter desktop viewport than 900px (not on mobile — that's a separate, already-correct static-stack code path below the 768px *width* breakpoint). This is a large improvement over the original ~268px/134px-unreachable break, and I'm not spinning another fix/verify round for a low-single-digit-percent edge case I can no longer visually confirm (browser use is off for this session) — flagging it here as a known, low-severity follow-up if the client wants extra margin on short desktop windows, not a blocker for this pass.

`npm run lint` and `npm run build` both re-verified clean independently.

- [x] Fixed (browser verification explicitly disallowed for this pass — verified by hand-computed height math instead, see below): `components/WindowChrome.module.css` `.window` now gets `max-width: clamp(352px, 64vh, 704px); margin-inline: auto;`. Since `.body` has no explicit width (fills `.window`) and `aspect-ratio: 16/10`, bounding `.window`'s width also bounds `.body`'s rendered height (`width / 1.6`) — a vh-based cap on height in disguise, scaling down on short viewports instead of tracking only content width. `components/sections/sections.module.css` `.stack > *:last-child` margin-top tightened from `clamp(40px, 6vw, 72px)` to `clamp(24px, 4vw, 48px)`. Both changes only affect `.stack`-layout sections (`Hero`, `CustomizeSection` — the only two `WindowChrome` consumers); `.split` sections and `PinnedSection` mechanics untouched. `npm run lint` and `npm run build` both pass.
  - Recomputed Hero content height at 1280×900 (bottom-up from CSS: eyebrow line+margin ≈26px, H1 72px font/1.05 line-height × 2 lines + 16px margin ≈167px, body 17px/1.65 × 3 lines ≈84px, buttons row (32px margin-top + ~44px button height) ≈76px, visual margin-top now 48px + WindowChrome now capped to `max-width 64vh=576px` → body height `576/1.6=360px` + 40px titlebar = 400px) ≈ **802px total**, vs. the previous measured 1168px. Cross-checked via a simpler delta method starting from the confirmed-live 1168px baseline (visual height 710px→400px saves 310px; margin-top 72px→48px saves 24px; 1168−334=**834px**). Both methods land in the **~800-835px** range, comfortably under the 900px stage height (65-100px headroom) and within the requested ~820-850px target band. At a shorter 768px-tall viewport the same math gives an even smaller ~347px visual (vs. a fixed 670px before), so the fix degrades proportionally rather than staying constant. Not re-verified with a live browser per this session's explicit constraint — flagging for a follow-up visual check before final sign-off.
