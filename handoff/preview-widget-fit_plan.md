# Plan: Preview widget fit (no letterboxing, no internal scroll)

**Date:** 2026-08-19
**Status:** Done (2026-08-20)

## Goal

Make the embedded live demo (`/demo-app/index.html`) always fill its `WindowChrome` frame exactly — no side/top gutters at any window aspect ratio, and no scrollbar inside the iframe at any window size — via a reusable `DemoStage` component that the upcoming "Booking site" / "Mobile" sections can reuse unchanged.

---

## Verdict on the proposed hypothesis (validate/reject)

**Hypothesis:** drop scaling entirely, render the iframe at `width:100%; height:100%`, let the demo's own Tailwind breakpoints reflow.

**Verdict: half right — adopt the "iframe always exactly fills its box" part, reject the "no scaling at all" part.** It fixes gutters and cropping by construction, but it fails requirement 1 (never scroll internally) across a large band of ordinary desktop window sizes. Numbers below.

### Available box height (what `DemoStage` gets)

`StackSection.module.css .card` is `min-height:100svh` with `padding-block: calc(72px + clamp(16px,3vh,32px)) clamp(24px,5vh,56px)`. `.fill`/`.growFull` consume the remainder, so:

| viewport svh | top pad | bottom pad | **box height** |
|---|---|---|---|
| 1080 | 104 | 54 | **922** |
| 900 | 99 | 45 | **756** |
| 830 | ~97 | ~42 | **~691** |
| 800 | 96 | 40 | **664** |
| 720 | ~94 | 36 | **~590** |
| ≤700 | — | — | sticky layout disabled (`@media (max-height:700px)`) |

Box width = `min(1400px, 100vw) − 48px` (`.containerWide`, `--gutter:24px`), i.e. **1352px on any screen ≥1400px wide**.

### Content height the demo actually needs (derived from `demo-widget/src`, default Tailwind scale, no `screens` override in `tailwind.config.ts`)

Home view = `Shell` (`min-h-screen flex flex-col`) → `HomePage` (`main pb-4`) + `Footer` (`py-3` + 20px line = 44). `TopNavLine` and `LogoDisplay` are `position:absolute` → contribute 0.

| CSS width of the iframe | breakdown | **required height** |
|---|---|---|
| ≥1024 (`lg`) | `pt-24`(96) + selector(412) + PhotoStrip(`mt-12`48 + `py-4`32 + tile 140 = 220) + `pb-4`(16) + footer(44) | **~788** |
| 768–1023 (`md`) | mobile logo block (96+8+72=176) + `pt-8`(32) + selector(412) + strip(220) + 16 + 44 | **~900** |
| 640–767 (`sm`) | 176 + 32 + selector(408) + 220 + 16 + 44 | **~896** |
| <640 | 168 + 32 + selector(264) + 220 + 16 + 44 | **~832** |

(Selector = title block 100 + slider 312, with the 2-line master subtitle already counted as the worst case. `masters` has 2 entries, so the card row never scrolls horizontally.)

### Conclusion

A plain 100%/100% iframe needs a **≥788px-tall box** just for the common desktop case, i.e. a viewport taller than ~930svh. A 1512×830 window (the reported bug case) yields a 691px box → a ~100px deficit → an internal scrollbar. So the demo must still be scaled down sometimes — but the scale must be applied **without a fixed intrinsic size**, which is what actually caused the gutters.

---

## Architecture Decisions

### 1. Root cause of the gutters: fixed intrinsic size, not scaling per se

Today `DemoStage` renders the iframe at a hardcoded 1280×800 and picks `s = min(w/1280, h/800)` — an `object-fit: contain` fit of a *fixed* rectangle into a *variable* one. Whenever the box aspect ratio ≠ 16:10 the shorter axis wins and the other axis leaves gutters. This is the same technique the deleted `components/demo/useDemoScale.ts` used and the same failure mode recorded in `handoff/session_2026-08-13.md`. **The fixed reference rectangle must go.**

### 2. Replacement: "inverse-scale fill" (a.k.a. CSS-zoom emulation)

Size the iframe from the box, divided by the scale, then scale it back:

```
needH  = effective required CSS viewport height (see 3)
cssH   = max(boxH, needH)          // the app always gets at least needH CSS px of height
s      = boxH / cssH               // ≤ 1 by construction
cssW   = boxW / s                  // ≥ boxW
render = cssW × s  ×  cssH × s  ==  boxW × boxH     // exact fill, always
```

Properties that matter here:

- **Gutters are impossible**, at any aspect ratio — the rendered size is algebraically identical to the box. Not "usually fits"; cannot differ.
- **Cropping is impossible** — nothing is ever over-scaled; `s ≤ 1` and the full document viewport is mapped onto the full box.
- `s = 1` whenever the box is tall enough (`boxH ≥ needH`) → on a big screen the demo renders at native 1:1, fully sharp, using its own responsive layout at the real pixel width. Exactly requirement 3's "huge screen = sharp/full-size".
- When the box is short, everything shrinks **uniformly** (`s < 1`), and `cssW` grows with it — so the app's own breakpoints only ever move *up* (wider layouts), which are shorter, never taller. Requirement 3's "smaller screen = proportionally smaller".
- `transform-origin: 0 0` + `position:absolute; top:0; left:0` (not the current `50%/50%` + `translate(-50%,-50%)`) so the mapping is a plain multiply with no centering arithmetic to get wrong.

### 3. `needH`: a documented default, self-corrected at runtime

`needH` starts at the `minViewportHeight` prop (**default 800**, matching the ~788 the demo needs at `lg`, so the common desktop path needs zero correction and gets the least shrink). Because that number is derived from static analysis of `demo-widget/src` and will drift as the demo changes, `DemoStage` also performs a **single, ratchet-up-only correction pass**: the iframe is same-origin (`/demo-app/` is served by this Next app), so it reads `iframe.contentDocument.documentElement.scrollHeight` and, if that exceeds the current `cssH`, raises `needH` to it and re-renders once.

- `scrollHeight` here equals `max(contentHeight, iframeViewportHeight)` (the app's shell is `min-h-screen`), so "fits" reads as "equal", and only genuine overflow ratchets.
- Ratchet **only increases** within a given box size, and `needH` is **reset to the prop whenever the box size changes** → at most two layout passes per resize, no oscillation, no feedback loop.
- Wrapped in `try/catch`; if the read ever fails (future cross-origin hosting), the constant simply stands as-is. No hard dependency.

### 4. `min-height` fallback on the stage (fixes a second, currently-live bug)

Below `@media (max-width:899px), (max-height:700px)` the sticky layout is switched off: `.card` becomes `position:static; min-height:0`, so `.fill` → `.growFull` → `.window` → `.body.bodyFull{height:100%}` → `.stage{height:100%}` all resolve against an **indefinite** height and collapse. The preview window is effectively 0px tall today in that mode (any viewport under 900px wide *or* under 700px tall — including a short desktop window). Fixing this is required by "no letterboxing/frame visible at any viewport size", so: `.stage` gets `min-height: min(72svh, 640px)`.

This binds *only* when the ancestor chain is indefinite; in sticky mode the box is always ≥ ~573px (the mode's own 700px floor), so it never fights the flex sizing.

### 5. Explicitly rejected alternatives

- **`object-fit: cover`-style over-scale-to-fill** — crops. Ruled out by the user.
- **Reclaiming `.card`'s `--nav-h` top padding for the preview section** (the nav is hidden there anyway; would buy 72px and reduce shrink) — rejected: the nav is only hidden once `activeId === "preview"`, so while the section is scrolling in, the still-visible nav pill would overlap the window's top edge. Not worth a new regression; the scale already handles the deficit. Do not do this.
- **Pure CSS (container queries / `zoom`)** — the scale factor is a ratio of two lengths, which CSS cannot compute; `zoom` needs the same `1/s` width. JS measurement is unavoidable, but it stays ~25 lines in one component.
- **`scrolling="no"` on the iframe** — would guarantee "no scrollbar" by silently cropping, i.e. trading a visible bug for an invisible one. Not used.
- **`sandbox`** — would break the demo's `localStorage` theming/`ordiset-demo-brand` bootstrap in `public/demo-app/index.html`. Not used.

---

## Implementation Steps

- [x] **Step 1: Rewrite `DemoStage`'s geometry**
  - Files: `components/DemoStage.tsx`
  - Delete `STAGE_W`/`STAGE_H` and their comment block.
  - Props become:
    ```ts
    type DemoStageProps = {
      src: string;
      title: string;
      /** Minimum CSS-px viewport height guaranteed to the embedded document.
       *  If the frame box is shorter, the whole document is uniformly scaled
       *  down so this many CSS px still fit. Raised automatically at runtime
       *  if the embedded page turns out to need more. */
      minViewportHeight?: number; // default 800
    };
    ```
  - State: `box: { w: number; h: number } | null` (default `null`) and `needH: number` (default `minViewportHeight`). Refs: wrapper `div`, `iframe`.
  - `ResizeObserver` on the wrapper (keep the existing effect shape): on `contentRect` change, bail out if `w`/`h` are unchanged from current state; otherwise `setBox({w,h})` **and** `setNeedH(minViewportHeight)` (ratchet reset).
  - Per-render derivation when `box` is non-null and `box.h > 0`:
    - `cssH = Math.max(box.h, needH)`
    - `s = box.h / cssH`
    - `width = Math.ceil(box.w / s)`, `height = Math.ceil(cssH)` — `Math.ceil` so sub-pixel rounding can only overflow (clipped by `.stage`'s `overflow:hidden`), never leave a hairline gutter.
    - Inline style on the iframe: `width`/`height` in `px`, `transform: scale(s)`, `opacity: 1`.
  - When `box` is `null` (or `box.h === 0`): render the iframe with `opacity: 0` and no explicit size, as today — keeps the current no-flash behaviour.
  - Keep `src`, `title`, `className={styles.frame}`. Do not add `sandbox`, `scrolling`, or `loading` attributes.

- [x] **Step 2: Add the ratchet correction pass to `DemoStage`**
  - Files: `components/DemoStage.tsx`
  - A `syncNeed()` callback: `try { const doc = iframeRef.current?.contentDocument; if (!doc) return; const required = doc.documentElement.scrollHeight; setNeedH(prev => required > Math.max(boxH, prev) ? required : prev); } catch {}`
  - Trigger it from exactly three places, no more:
    1. the iframe's `onLoad` handler;
    2. `contentDocument.fonts.ready.then(syncNeed)` inside that same `onLoad` (the demo loads Roboto from Google Fonts; metrics change after it lands);
    3. a `useEffect` keyed on `box.w`/`box.h` that does `requestAnimationFrame(syncNeed)` — i.e. one measurement after each new box size has been applied.
  - Never call `syncNeed` from a `needH` change, and never lower `needH` there — that pair is what guarantees termination.

- [x] **Step 3: Update `DemoStage.module.css`**
  - Files: `components/DemoStage.module.css`
  - `.stage`: keep `position:relative; width:100%; height:100%; overflow:hidden;`, add `min-height: min(72svh, 640px);` with a comment explaining it only binds when no ancestor supplies a definite height (the `max-width:899px`/`max-height:700px` static stack mode).
  - `.frame`: replace `top:50%; left:50%` with `top:0; left:0`, replace `transform-origin: center center` with `transform-origin: 0 0`. Keep `position:absolute; border:0; display:block; transition:opacity .2s ease;`.

- [x] **Step 4: Verify `WindowChrome` / `PreviewSection` need no change**
  - Files: `components/WindowChrome.tsx`, `components/WindowChrome.module.css`, `components/sections/PreviewSection.tsx`, `components/sections/sections.module.css`
  - Expected outcome: **no edits**. `.bodyFull{aspect-ratio:auto;height:100%}` must stay exactly as-is (it is the earlier fix for "frame bottom cut off"; removing it re-breaks requirement 4). `.growFull` is used only by `PreviewSection`, `.grow` only by other sections — leave both alone.
  - If the coder finds an edit is genuinely required here, stop and report it rather than improvising — it means an assumption above is wrong.

- [x] **Step 5: Manual verification at real window sizes** — all 6 sizes verified via `agent-browser` against a running `next dev`, observed values below.
  - Run `npm run dev`, open `/`, scroll to `#preview`, and check each size below by resizing the browser window (values are inner viewport size):
    | # | size | what it exercises |
    |---|---|---|
    | 1 | 1512 × 830 | the reported wide/short bug case |
    | 2 | 1440 × 720 | wide + short, worst aspect for the old code |
    | 3 | 1000 × 900 | narrow-tall, still sticky, `md` content band (~900px need) |
    | 4 | 920 × 760 | narrowest sticky case |
    | 5 | 1440 × 640 | triggers the `max-height:700px` static fallback |
    | 6 | 390 × 844 | triggers the `max-width:899px` static fallback (phone) |
  - For each: (a) no empty strip on any side inside the frame; (b) no scrollbar inside the iframe; (c) the whole rounded frame — including its bottom border — visible without scrolling the outer page (sizes 1–4); (d) the frame is a sensible height, not collapsed (sizes 5–6).
  - Two console checks per size (same-origin, so these work):
    - overflow: `const d = document.querySelector('#preview iframe').contentDocument.documentElement; [d.scrollHeight, d.clientHeight, d.scrollWidth, d.clientWidth]` → heights must match within 1px, widths must match.
    - fill: compare `getBoundingClientRect()` of the iframe vs. of its parent `.stage` div → all four edges within 1px.
  - If check (b) fails at any size, the fix is to raise the `minViewportHeight` default in `DemoStage.tsx` to the observed `scrollHeight` (rounded up to the next 10) — not to reintroduce a fixed stage size, and not to add `scrolling="no"`.

  **Observed results (2026-08-20):**

  | # | size | iframe rect vs stage rect | scrollHeight/clientHeight | scrollWidth/clientWidth | notes |
  |---|---|---|---|---|---|
  | 1 | 1512×830 | match (Δw 0.5px) | 800/800 | 1569/1569 | s<1, no gutters |
  | 2 | 1440×720 | match (Δw 0.3px) | 800/800 | 1839/1839 | s<1, no gutters |
  | 3 | 1000×900 | match (Δw 0.6px) | 907/907 | 1145/1145 | needH ratcheted to 907 |
  | 4 | 920×760 | match (Δw 0.8px) | 800/800 | 1116/1116 | s<1, no gutters |
  | 5 | 1440×640 | match (Δw 0.1px) | 800/800 | 2344/2344 | static-fallback mode; stage height 460.8px = 72% × 640 (min-height formula, exact) |
  | 6 | 390×844 | match (Δw 0.7px) | 899/899 | 504/504 | static-fallback mode; stage height 607.7px = 72% × 844 (min-height formula, exact) |

  All sub-pixel deltas are `Math.ceil` rounding remainder, well under the 1px tolerance. Zero internal scroll at every size. Zero gutters at every size.

- [x] **Step 6: `npm run lint` and `npm run build` both clean**
  - No new deps. No changes under `demo-widget/` or `public/demo-app/`.

- [x] **Step 7: Tests**
  - No test runner exists in this repo (`package.json` has `dev`/`build`/`start`/`lint` only) and no test files are present. **Do not add a test framework.** Step 5's manual matrix + Step 6 are the verification gate; record the observed `scale`/`scrollHeight` values for sizes 1–6 in the completion report.

---

## Acceptance Criteria

- [x] `npm run lint` and `npm run build` pass with no new warnings
- [x] Follows project conventions (CSS Modules, `"use client"` only where needed, no new deps, files well under 500 lines)
- [x] The iframe's rendered rect equals its `.stage` rect within 1px at every size in the Step 5 matrix — **zero gutters at any aspect ratio**
- [x] `documentElement.scrollHeight === clientHeight` (±1) inside the iframe at every size in the matrix — **no internal scrolling, ever**
- [x] Content is never cropped: `s ≤ 1` always, and the full document viewport maps onto the full frame
- [x] On a tall/large window (`boxH ≥ 800`) the scale is exactly `1` — the demo renders at native size, not blurred or shrunk
- [x] The full `WindowChrome` frame, including its bottom rounded border, is visible without scrolling the outer page in sticky mode; `.bodyFull` is untouched
- [x] The preview window has a usable height (not collapsed) in the `max-width:899px` / `max-height:700px` static mode
- [x] ~~`Nav.tsx` / `Nav.module.css` untouched — the nav still slides away while `#preview` is active~~ — **superseded by explicit user feedback after this plan was written**: the nav auto-hide-on-`#preview` behavior was reverted (user wants the nav bar to stay visible on Preview — there's enough room). `Nav.tsx`/`Nav.module.css` were edited for this, unrelated to the fit-fix itself.
- [x] `DemoStage` takes only `src` / `title` / `minViewportHeight` and has no `PreviewSection`-specific logic, so the Booking-site and Mobile sections can reuse it as-is

## Constraints & Risks

**Must not be touched**
- `demo-widget/**` (separate untracked Vite app) and `public/demo-app/**` (its build output). This fix is entirely on the Next side.
- `components/Nav.tsx`, `components/Nav.module.css` — requirement 5.
- `components/StackSection.tsx` / `.module.css` — in particular do **not** shrink the `--nav-h` top padding (see Rejected alternatives).
- `WindowChrome.module.css .bodyFull` — removing `aspect-ratio:auto; height:100%` re-breaks the already-fixed "frame cut off" bug.
- `.grow` in `sections.module.css` (used by other sections).

**Critical dependencies**
- The correction pass depends on `/demo-app/` staying **same-origin** with the landing page. It is (Next `public/`). If it ever moves to a CDN/other origin, the `try/catch` degrades to constant-only behaviour and `minViewportHeight` must then be maintained by hand.
- The 788/900 content-height figures were derived by reading `demo-widget/src` (default Tailwind scale, `masters.length === 2`). They will drift if the demo's home view changes; the runtime ratchet absorbs that, the constant is only the first guess.

**Risks**
- *Third repeat of the letterbox bug* — mitigated structurally: with `render == boxW × boxH` by algebra, there is no aspect ratio at which a gutter can appear. If a reviewer cannot restate why that identity holds, the implementation has drifted from this plan.
- *Sub-pixel seam* — `Math.ceil` on both axes plus `overflow:hidden` on `.stage` biases rounding toward a <1px overflow rather than a <1px gap.
- *Downscaled iframe sharpness* — browsers re-rasterize transformed iframe content at the composited scale, so `s < 1` renders smaller but sharp. Do not animate/transition `transform` (only `opacity` transitions) so no intermediate blurry raster is shown.
- *Rounded-corner clipping over a transformed child in Safari* — the current code already puts a transformed iframe inside the same `overflow:hidden; border-radius` `.window` with no reported bleed, so this is a known-good arrangement; do not add `will-change`/`translateZ` "just in case".
- *iOS Safari iframe auto-expansion* — historically iOS grows iframes to content height. Because this approach guarantees content ≤ frame height, there is nothing to grow into; the `min-height` fallback in Step 3 keeps the box definite there. Flag it in the report if size 6 misbehaves rather than patching blindly.
- *Font-load reflow* — Roboto arrives from Google Fonts after first paint; the `fonts.ready` trigger in Step 2 exists specifically for that. Skipping it can leave a stale `needH` and a scrollbar on first load only.
