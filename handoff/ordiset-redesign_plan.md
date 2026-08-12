# Plan: Ordiset landing redesign — stacking cards, dominant widgets, floating nav

**Date:** 2026-08-11
**Status:** Complete

## Goal
Replace the fade/shrink pinned-scroll mechanic with a pure-CSS "stacked cards" cover effect, make the WindowChrome visuals dominant, turn the nav into a floating pill with a correctly-cropped logo, add restrained ambient accent glow, and reorder the sections — all on top of the existing working codebase.

---

## Architecture Decisions

### A1. Stacking mechanic: sticky siblings + ascending z-index, zero JS
Drop the 200vh-track / 100vh-stage split entirely. Each of the 6 top-level sections is a **direct sibling inside `<main>`**, each `position: sticky; top: 0; min-height: 100svh`, opaque background, ascending `z-index` 1→6. Later sections paint over earlier ones and each pins at the viewport top, so plain scrolling produces "next card rises from the bottom and covers the previous one" with **no JavaScript at all**. `StackSection` is therefore a **server component** in its base form (no `"use client"`, no framer-motion import).

Why this beats the old mechanic:
- No `whileInView` + scroll-linked `style` on the same element → bug class #1 structurally impossible.
- `min-height` (not `height`) + top-down flow (not force-centred fixed box) → no `align-items:center` overflow clipping.

### A2. Sticky containing block & the Contact section
Each sticky section's containing block is `<main>`, which spans the whole page. So section 5 (Notifications) stays pinned at `top: 0` for the rest of the document, **including underneath the Contact section**. Contact is static (`position: relative`, no sticky) and must therefore:
- get `z-index: 6` so it paints **over** the pinned section 5 as it scrolls up (static/`z-index:auto` elements paint *below* positioned `z-index >= 1` elements — without this, Contact would be hidden behind Notifications);
- get an **opaque** `background: var(--bg)`;
- get `min-height: 100svh` so that at maximum scroll it fills the viewport and no strip of the pinned Notifications card shows above it on tall screens.

No wrapper `<div>` around the stacked sections is needed. Do **not** add `position`/`z-index`/`transform`/`filter`/`isolation` to `<main>` or `<body>` — either would create a stacking context and trap sections 1–6 below the nav.

### A3. `overflow-x: hidden` must become `overflow-x: clip` (prerequisite, not optional)
`app/globals.css` currently has `html, body { overflow-x: hidden }`. Because `html`'s overflow is non-`visible`, `body`'s overflow does **not** propagate to the viewport, so `body` becomes its own scroll container with `overflow-y` used as `auto`. A `position: sticky` descendant then sticks relative to `body`'s scrollport — which never scrolls — so it never sticks. `overflow: clip` never creates a scroll container and is explicitly exempt from the `visible → auto` coercion rule, so `overflow-x: clip; overflow-y: visible` stays intact and sticky keeps working against the real viewport. This is a hard prerequisite for the whole mechanic.

### A4. Vertical budget: the visual absorbs the leftover space
Each card is a flex column: fixed-height text block on top, then a `flex: 1 1 0` region that the WindowChrome fills. This is what "dominant widget" means here — the widget is mathematically as large as the card allows, and the card total is exactly `100svh`, so **nothing can overflow and become unreachable**. The old `max-width: clamp(352px, 64vh, 704px)` cap on `.window` is removed; sizing is now driven by the flex leftover plus `max-height: 100%`.

Worked example (1440×900 viewport, `--nav-h` 72px): card 900 − padding (96 top + 40 bottom) = 764 for content. Hero text ≈ 30 (eyebrow) + 92 (h1) + 140 (body at 62ch) + 78 (actions) ≈ 340 → window region ≈ 424px tall × full container width. Customize text ≈ 209 → window region ≈ 555px tall (~62% of viewport height, ~97% of width). That is the maximum achievable without cutting copy.

### A5. Safety valve: stacking is disabled below 900px wide or 700px tall
A sticky card taller than the viewport has its overflow **permanently unreachable** (it pins at `top:0` and never releases). Arithmetic for a 390×844 phone: padding 136 + hero text ≈ 565 = 701, leaving 143px for the visual, below its 220px floor → ~70px overflow. So one **pure-CSS** media query drops the cards back to normal document flow:

```css
@media (max-width: 899px), (max-height: 700px) { /* .card: position static, min-height 0, normal padding */ }
```

900px matches the existing `.split` grid breakpoint in `sections.module.css`, so the two-column→one-column collapse and the sticky-off point coincide. This is still a large simplification over the old mechanic: no `useSyncExternalStore`, no `matchMedia`, no JS gate — the fallback is "just normal sections".

### A6. Accent usage: exactly two effects
1. Ambient radial glow behind the Hero visual (Hero-scoped, `--accent-glow` token, blurred, low opacity).
2. The card seam: `border-top` + a 1px horizontal accent gradient line + a top-side shadow + a subtle `--bg-elevated → --bg` top gradient on the card background, so the incoming card's leading edge is visible against the identical-coloured card underneath.
No other accent additions. Base aesthetic stays minimal/confident, not decorative.

### A7. Logo: CSS crop of the untouched source, no new PNG
Do **not** reuse or regenerate `public/ordiset-mark.png`. Crop `public/ordiset-logo.png` (2400×1309) in CSS with a fixed square `overflow: hidden` wrapper plus an oversized absolutely-positioned `next/image`. Crop constants are derived below and verifiable by arithmetic alone — no browser and no image tooling needed, which is the whole point given no visual verification is available this session.

---

## Implementation Steps

- [x] **Step 1: globals.css prerequisites**
  - Files: `app/globals.css`
  - Change `html, body { ... overflow-x: hidden }` → `overflow-x: clip`. Keep `max-width: 100vw`. Add a one-line comment: `clip (not hidden) — hidden makes body a scroll container and breaks position: sticky`.
  - Replace `--nav-h: 64px` with the floating-nav trio:
    `--nav-top: 16px; --nav-pill-h: 56px; --nav-h: 72px;` (`--nav-h` = total vertical space the floating nav occupies = `--nav-top + --nav-pill-h`; keep it a literal 72px, and comment the relationship).
  - Add derived tokens (additive only — do **not** touch `--bg`, `--surface`, `--accent`, `--accent-hover`, `--accent-press`, `--accent-soft`, `--on-accent`):
    - `--accent-glow: rgba(208, 118, 77, 0.20);`
    - `--shadow-stack: 0 -24px 48px -24px rgba(0, 0, 0, 0.7);`
  - Remove `main { padding-top: var(--nav-h) }` entirely — the nav now floats over content and each card carries its own top padding.
  - Change `html { scroll-padding-top: calc(var(--nav-h) + 8px) }` → `scroll-padding-top: 0`. Rationale: anchor targets must land at the section's exact flow top so it pins flush; each card's own top padding already clears the floating nav, and `ContactSection`'s `clamp(96px, 12vh, 160px)` top padding exceeds `--nav-h`.
  - Leave the `prefers-reduced-motion` block as-is.

- [x] **Step 2: New `StackSection` primitive (replaces `PinnedSection`)**
  - Files: create `components/StackSection.tsx`, `components/StackSection.module.css`; **delete** `components/PinnedSection.tsx` and `components/PinnedSection.module.css`.
  - `StackSection.tsx` — **server component, no `"use client"`, no framer-motion**:
    ```tsx
    type StackSectionProps = { id: string; z: number; children: ReactNode };
    ```
    Renders `<section id={id} className={styles.card} style={{ zIndex: z }}>`, plus `{z > 1 && <span className={styles.seam} aria-hidden />}` (the Hero has nothing above it, so no seam), then `{children}`.
    Add a comment explaining that `z` must ascend in the same order the sections appear in `app/page.tsx`.
  - `StackSection.module.css`:
    - `.card`: `position: sticky; top: 0; min-height: 100svh; overflow: clip; display: flex; flex-direction: column; padding-block: calc(var(--nav-h) + clamp(16px, 3vh, 32px)) clamp(24px, 5vh, 56px); background: linear-gradient(180deg, var(--bg-elevated), var(--bg) 240px); border-top: 1px solid var(--border-strong); box-shadow: var(--shadow-stack);`
      - `overflow: clip` contains the Hero glow without creating a scroll container.
      - The background must stay fully opaque — both tokens are opaque hex.
    - `.seam`: `position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.32; pointer-events: none;`
    - Safety valve (Decision A5):
      ```css
      @media (max-width: 899px), (max-height: 700px) {
        .card {
          position: static;
          min-height: 0;
          padding-block: clamp(72px, 10vh, 120px);
          box-shadow: none;
        }
      }
      ```
  - Grep the repo afterwards for `PinnedSection` — there must be zero remaining references.

- [x] **Step 3: Card layout helpers in `sections.module.css`**
  - Files: `components/sections/sections.module.css`
  - Add `.containerWide` — same as `.container` but `max-width: min(1400px, 100%)`; used only by the two `WindowChrome` sections so the widget can go near edge-to-edge:
    ```css
    .containerWide { max-width: min(1400px, 100%); margin-inline: auto; padding-inline: var(--gutter); width: 100%; }
    ```
  - Add `.fill` — the flex-column body of a card, so the visual absorbs leftover height:
    ```css
    .fill { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
    ```
    (Apply to the container element inside a `StackSection`; combined with `.card`'s `flex-direction: column` this makes the container itself the flex item that grows.)
  - Add `.grow` — the region the widget fills:
    ```css
    .grow { flex: 1 1 0; min-height: 220px; display: flex; align-items: center; justify-content: center; margin-top: clamp(24px, 4vh, 48px); }
    ```
  - Widen the centred body measure to cut Hero text height (layout only, **no copy changes**): change `.stack .body { margin-inline: auto }` to also set `max-width: 62ch`.
  - Also add vertical centring for the `.split` sections so they read well inside a full-height card: `.split { ... }` gains nothing new; instead give the split sections `.fill` + `justify-content: center` via a `.centerY { justify-content: center; }` helper used on `.fill` for the three PhoneFrame sections.
  - Keep `.stack > *:last-child { margin-top: clamp(24px, 4vw, 48px) }` working — if `.grow` now carries its own `margin-top`, make sure the two don't stack up; drop the `.grow` margin if the `:last-child` rule already applies to it.

- [x] **Step 4: `WindowChrome` sizing overhaul**
  - Files: `components/WindowChrome.module.css` (no change to `WindowChrome.tsx`)
  - `.window`: **delete** `max-width: clamp(352px, 64vh, 704px)` and its comment. New rules:
    `width: 100%; max-width: 100%; max-height: 100%; margin-inline: auto; display: flex; flex-direction: column;`
  - `.body`: keep `aspect-ratio: 16 / 10` and the gradient/dot-grid background; add `flex: 1 1 auto; min-height: 0;`.
  - Result inside `.grow`: the window is as wide as `.containerWide` allows and as tall as the leftover flex space allows. When the aspect-derived height exceeds the available height, `max-height: 100%` clamps it into a wider letterbox instead of overflowing. Never overflows, never unreachable.

- [x] **Step 5: PhoneFrame short-viewport guard (the one allowed PhoneFrame change)**
  - Files: `components/PhoneFrame.module.css`
  - The phone is up to 300px wide × `19.5/9` = up to 650px tall; on a 700px-tall card the available region is smaller than that. Cap the width by the height budget so the phone **shrinks** (it is never enlarged — the client excluded PhoneFrame from the "make it bigger" ask):
    ```css
    .phone { width: min(clamp(240px, 26vw, 300px), calc(62svh * 9 / 19.5)); }
    ```
  - Leave `aspect-ratio`, radius, border, padding, shadow and `.screen`/`.island` untouched. Do not touch `PhoneFrame.tsx` or `Placeholder.tsx`.

- [x] **Step 6: Section components — swap `PinnedSection` → `StackSection`, assign `z`**
  - Files: `components/sections/Hero.tsx`, `CustomizeSection.tsx`, `MobileSection.tsx`, `BookingSiteSection.tsx`, `NotificationsSection.tsx`
  - `z` values must match the **new** page order: Hero `z={1}`, Customize `z={2}`, Mobile `z={3}`, BookingSite `z={4}`, Notifications `z={5}` (Contact is 6, set in CSS — Step 8).
  - Hero: container becomes `${styles.containerWide} ${styles.stack} ${styles.fill}`; wrap the `WindowChrome` in `<div className={`${heroStyles.visual} ${styles.grow}`}>`.
  - Customize: container becomes `${styles.containerWide} ${styles.stack} ${styles.fill}`; wrap its `WindowChrome` in `<div className={styles.grow}>`.
  - Mobile / BookingSite / Notifications: keep `${styles.container} ${styles.split}`, add `${styles.fill} ${styles.centerY}` so the two-column grid centres vertically in the full-height card. `visualFirst` on BookingSite stays.
  - **No copy changes, no `id` changes** (`overview`, `customize`, `mobile`, `booking-site`, `notifications`).

- [x] **Step 7: `page.tsx` section reorder**
  - Files: `app/page.tsx`
  - New order: `Hero, CustomizeSection, MobileSection, BookingSiteSection, NotificationsSection, ContactSection`.
  - Reorder the imports to match. Add a short comment: render order must stay in sync with the `z` props in Step 6.

- [x] **Step 8: Contact section stacking fixes**
  - Files: `components/sections/ContactSection.module.css` (**do not touch `ContactForm.tsx` / `ContactForm.module.css`**)
  - `.section` gains: `position: relative; z-index: 6; background: var(--bg); min-height: 100svh; border-top: 1px solid var(--border-strong); box-shadow: var(--shadow-stack);`
  - Keep the existing `padding: clamp(96px, 12vh, 160px) 0` and `.formWrap` / `.footer` rules unchanged.
  - Rationale is Decision A2 — without `z-index: 6` + opaque background, Contact renders *behind* the still-pinned Notifications card.

- [x] **Step 9: `Nav` floating pill**
  - Files: `components/Nav.module.css`, `components/Nav.tsx`
  - `.nav` (the fixed positioner, no visual styling):
    `position: fixed; top: var(--nav-top); left: var(--gutter); right: var(--gutter); max-width: var(--maxw); margin-inline: auto; z-index: 50;`
    (left+right+`margin-inline: auto` centres it without `transform` — avoids creating an unnecessary containing block. `z-index: 50` already exceeds the max section z-index of 6.)
  - `.row` (the visible pill): `height: var(--nav-pill-h); border-radius: var(--radius-pill); background: rgba(26, 29, 33, 0.72); backdrop-filter: blur(14px); border: 1px solid var(--border-strong); box-shadow: 0 14px 34px -14px rgba(0, 0, 0, 0.7); padding-inline: 14px 10px; display: flex; align-items: center; gap: 28px;` — keep `max-width`/`margin-inline: auto` off `.row` (the `.nav` wrapper already handles width).
  - Keep `.brand`, `.links`, `.link`, `.cta` behaviour and the `@media (max-width: 768px) { .links { display: none } }` rule. Keep the "no hamburger in this pass" comment.
  - `Nav.tsx`: reorder `LINKS` to match the new page order → `Overview, Customize, Mobile, Booking site, Notifications` (hrefs unchanged). Swap the mark `src` to `/ordiset-logo.png` with `width={2400} height={1309} sizes="120px" priority` (Step 10).

- [x] **Step 10: Logo re-crop (CSS crop, no new asset)**
  - Files: `components/Nav.module.css`, `components/Nav.tsx`; delete `public/ordiset-mark.png`; leave `assets/ordiset-logo.png` and `public/ordiset-logo.png` untouched.
  - Derived crop (source 2400×1309): ring bounding box ≈ x 898–1514, y 244–840 → centre (1206, 542), max dimension 616. Square crop side **680** centred on that: origin **(866, 202)**, extent 866–1546 × 202–882 (both inside the image). Padding inside the crop: left 32 / right 32, top 42 / bottom 42 → **symmetric by construction**, which is exactly the check the client's complaint demands.
  - CSS:
    ```css
    .mark {
      --mark-size: 30px;
      --crop: 680;      /* square crop side, source px */
      --crop-x: 866;    /* crop origin x, source px */
      --crop-y: 202;    /* crop origin y, source px */
      position: relative;
      width: var(--mark-size);
      height: var(--mark-size);
      overflow: hidden;
      flex: none;
    }
    .markImg {
      position: absolute;
      max-width: none;  /* required: globals.css sets img { max-width: 100% } */
      width: calc(var(--mark-size) * 2400 / var(--crop));
      height: auto;
      left: calc(var(--mark-size) * var(--crop-x) / var(--crop) * -1);
      top: calc(var(--mark-size) * var(--crop-y) / var(--crop) * -1);
    }
    ```
    Remove the old `object-fit: contain` / `width:100%; height:100%` rules on `.markImg`.
  - Sanity arithmetic at `--mark-size: 30px`: scaled image width `30 × 2400 / 680 = 105.88px`; `left = -38.21px`; `top = -8.91px`; ring occupies x `1.41px → 28.59px` and y `1.85px → 28.15px` inside the 30px box — equal margins on all four sides. Verify these numbers still hold before committing.
  - **Verify the source dimensions first**: `sips -g pixelWidth -g pixelHeight public/ordiset-logo.png` must report 2400 × 1309. If it differs, scale `--crop`, `--crop-x`, `--crop-y` and the literal `2400` proportionally and redo the arithmetic above.
  - Keep the `<span className={styles.wordmark}>ORDISET</span>` pairing exactly as-is — the pairing was never the complaint.

- [x] **Step 11: Ambient accent glow (Hero only)**
  - Files: `components/sections/Hero.module.css`, `components/sections/Hero.tsx`
  - Add `<span className={heroStyles.glow} aria-hidden />` as the first child inside the Hero's container.
  - ```css
    .glow {
      position: absolute;
      top: -14%;
      left: 50%;
      translate: -50% 0;
      width: min(1100px, 130%);
      aspect-ratio: 1;
      background: radial-gradient(closest-side, var(--accent-glow), transparent 72%);
      filter: blur(70px);
      pointer-events: none;
      z-index: 0;
    }
    ```
  - The Hero container needs `position: relative` and its real content needs `position: relative; z-index: 1` so the glow sits behind. Add a Hero-scoped `.content` wrapper class if that is cleaner than restyling shared `sections.module.css` classes — **do not** put `position: relative` on the shared `.container`/`.stack` classes if it risks the other sections.
  - The glow is clipped by `.card { overflow: clip }`, so it cannot cause horizontal scroll or bleed onto the previous card.
  - This plus the Step 2 seam line are the **only** two accent additions. Do not add more.

- [x] **Step 12 (OPTIONAL — skip if in doubt): scroll-linked recede on cards**
  - Files: `components/StackSection.tsx`, `components/StackSection.module.css`
  - Only do this if Steps 1–11 build clean and you want the extra polish. **Acceptance criteria do not require it.**
  - Convert `StackSection` to `"use client"`, render `motion.section`, and:
    ```ts
    const ref = useRef<HTMLElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const scale = useTransform(scrollYProgress, [0.15, 1], [1, 0.96]);
    ```
    Apply `style={{ scale }}` **directly to the sticky section itself** and to nothing else. Do **not** add `whileInView`, `initial`, or any entrance animation anywhere on this element — that is the exact combination that froze `opacity: 0` last time. When `prefersReducedMotion` is true, render the plain non-motion `<section>` branch (identical markup, no `style`).
  - Why the measurement is safe here (already verified from source, do not re-derive): `node_modules/framer-motion/dist/es/render/dom/scroll/on-scroll-handler.mjs:11-18` and `.../scroll/offsets/inset.mjs:3-11` compute the target offset by summing `offsetTop` up the `offsetParent` chain, i.e. from **layout** position, not `getBoundingClientRect()`. Sticky's scroll shift does not affect `offsetTop`, so progress advances normally even while the card is pinned. Progress 0→1 maps to scroll `[T, T+H]` where `T` is the card's flow top and `H` its height — exactly the window during which the next card covers it.
  - **Mobile/short-viewport gate is pure CSS, no JS**: add to the existing Step 2 media query
    ```css
    @media (max-width: 899px), (max-height: 700px) { .card { transform: none !important; } }
    ```
    `!important` in a stylesheet beats framer-motion's inline `transform`, so no `matchMedia`/`useSyncExternalStore` gate is needed. This is what prevents last pass's "section shrinks mid-read on mobile" bug.

- [x] **Step 13: Verification pass** — see the Verification section below. Run `npm run lint` and `npm run build`; both must pass with no new warnings.

---

## Verification (manual reasoning — NO browser automation, explicitly forbidden this session)

- [x] **Z-index audit.** Confirm exactly one ascending chain in a single root stacking context:
  Hero 1 · Customize 2 · Mobile 3 · BookingSite 4 · Notifications 5 · Contact 6 · Nav 50.
  Confirm the `z` props in the section components match the render order in `app/page.tsx` after the reorder.
- [x] **No stacking-context traps.** Grep/read to confirm `<main>` and `<body>` have no `position`, `z-index`, `transform`, `filter`, `opacity < 1`, `isolation`, `will-change`, `contain`, or `backdrop-filter`. Any of these would nest sections 1–6 inside `main`'s context and could put them above or below the nav incorrectly. The nav (`z-index: 50`, `backdrop-filter`) must remain a direct child of `<body>`.
- [x] **Nav always on top.** `50 > 6`; nav is `position: fixed` and not clipped because neither `<body>` nor `<html>` is a containing block for fixed elements (no transform/filter on either), and `overflow: clip` alone does not clip fixed descendants.
- [x] **Sticky is not broken by an overflow ancestor.** Confirm `html, body` use `overflow-x: clip` (not `hidden`) after Step 1, and that no ancestor of the sections (`html`, `body`, `main`) has `overflow: hidden/auto/scroll` on either axis. `.card { overflow: clip }` is on the sticky element itself, which is fine — `clip` never creates a scroll container.
- [x] **No unreachable content.** For each stacked section, confirm the card is a flex column of `min-height: 100svh` whose visual region is `flex: 1 1 0` (so the total is exactly `100svh` whenever the text block fits), and that `WindowChrome`/`PhoneFrame` are height-capped (`max-height: 100%` / the `62svh` width cap). Re-run the budget arithmetic from Decision A4 for the tallest text block (Hero) at 1440×900 and 1280×800 and confirm the leftover exceeds `.grow`'s 220px floor. Confirm the `@media (max-width: 899px), (max-height: 700px)` valve turns `position: sticky` into `position: static` so any card that *could* exceed the viewport is never pinned.
- [x] **Contact is reachable and covers.** Confirm Contact has `position: relative; z-index: 6; background: var(--bg); min-height: 100svh` — otherwise the pinned Notifications card (still stuck at `top: 0` through the rest of `<main>`) hides it, or shows as a strip above it at maximum scroll.
- [x] **Anchors.** With `scroll-padding-top: 0` and `main`'s `padding-top` removed, confirm each `#id` still exists (`overview`, `customize`, `mobile`, `booking-site`, `notifications`, `contact`), that the nav link order matches the new page order, and that each card's own `padding-top: calc(var(--nav-h) + …)` keeps headings clear of the floating pill.
- [x] **Reduced motion.** With Step 12 skipped, there is no JS motion at all and `prefers-reduced-motion` degrades trivially (globals already sets `scroll-behavior: auto`). If Step 12 was done, confirm the `useReducedMotion()` branch renders a plain `<section>` with no `style` prop and no `whileInView` anywhere.
- [x] **Logo crop.** `sips -g pixelWidth -g pixelHeight public/ordiset-logo.png` = 2400 × 1309; recompute the four inner margins from Step 10 and confirm left = right and top = bottom. Confirm `public/ordiset-mark.png` is deleted and unreferenced (`grep -r ordiset-mark`).
- [x] **Dead code.** `grep -r PinnedSection` returns nothing; `components/PinnedSection.tsx` and `.module.css` are deleted.
- [x] `npm run lint` clean; `npm run build` succeeds.

---

## Acceptance Criteria
- [x] `npm run lint` and `npm run build` both pass.
- [x] Sections render in order Hero → Customize → Mobile → Booking site → Notifications → Contact, all 6 present, ids unchanged, copy unchanged.
- [x] Each of the first five sections is a `position: sticky; top: 0; min-height: 100svh` opaque card with ascending z-index; the core cover effect needs zero JavaScript.
- [x] `PinnedSection` is gone; the 200vh-track/100vh-stage pattern no longer exists anywhere.
- [x] `WindowChrome` fills the leftover height of its card at up to 1400px wide (old `max-width: clamp(352px, 64vh, 704px)` removed); `PhoneFrame` is not enlarged.
- [x] Nav is a floating rounded pill inset from the viewport edges, with the same links (reordered) and the same smooth-scroll anchors.
- [x] Nav logo is a symmetric square crop of the untouched source, verified by arithmetic; `public/ordiset-mark.png` deleted.
- [x] Exactly two accent effects: the Hero ambient glow and the card seam line.
- [x] No new npm dependencies; `ContactForm.tsx`/`.module.css` untouched; `--bg`/`--surface`/`--accent` family values unchanged.
- [x] No browser automation was used at any point.

## Constraints & Risks
- **Do not touch** `components/ContactForm.tsx` or `components/ContactForm.module.css` (out of scope), `components/PhoneFrame.tsx`, `components/Placeholder.tsx`, `assets/ordiset-logo.png`, `public/ordiset-logo.png`.
- **Do not change** the brand token *values* (`--bg`, `--surface`, `--accent`, `--accent-hover`, `--accent-press`, `--accent-soft`, `--on-accent`). Only additive tokens (`--accent-glow`, `--shadow-stack`, `--nav-top`, `--nav-pill-h`) and the `--nav-h` layout value may change.
- **No new dependencies.** framer-motion 13.1.0 is already installed and is the only motion library; the base mechanic uses none of it.
- **No copy/content changes.**
- **Highest risk #1:** `overflow-x: hidden` → `clip` (Step 1). If this is missed, every sticky card silently fails and the page becomes six plain stacked sections. Verify it first.
- **Highest risk #2:** a stacked card taller than the viewport permanently hides its overflow. The `flex: 1 1 0` visual region plus the 899px/700px media valve are what prevent it — do not remove either, and do not swap `min-height: 100svh` for a hard `height`.
- **Highest risk #3:** Contact rendering behind the still-pinned Notifications card if `z-index: 6` / opaque background are omitted.
- **Known trap (do not repeat):** never put a `whileInView`/`initial` entrance animation and a scroll-linked `style` transform on the same element.
- 500-line-per-file limit still applies; nothing here comes close.
