# Plan: Locale-invariant text blocks (layout shift on language switch)

**Date:** 2026-08-25
**Status:** In Progress

## Goal

Reserve every language-varying text block at the height of its **tallest** locale variant (measured live, at the current width) so that switching EN/UK/PL never resizes or moves the visual block that shares its layout budget — with zero font-size changes and zero hardcoded per-breakpoint pixel values.

---

## Audit results (verified by direct code read this session — do not re-audit)

| File | Coupling | In scope |
|---|---|---|
| `components/sections/Hero.tsx` | A — `.stack` flex column: text feeds `.grow { flex: 1 1 0 }` → `.showcase` height → shots at `top: 36%` | **yes** |
| `components/sections/BookingSiteSection.tsx` | A — same, `.showcase { min-height: 320px }`, shots at `top: 28%` | **yes** |
| `components/sections/NotificationsSection.tsx` | A — same, `.showcase { min-height: 340px }`, shots at `top: 38%` | **yes** |
| `components/sections/MobileSection.tsx` | B — `.split` grid, `align-items: center`: text column height sets the row height; the column's own box recenters, so eyebrow/title jump vertically per locale | **yes** |
| `components/sections/ContactSection.tsx` | none — plain `<section>` (not `StackSection`), `.container > .stack`, no `.grow`, no absolutely-positioned sibling, no shared row. Taller text simply pushes `.formWrap` down, which is "the text block itself" growing — explicitly allowed by the user's requirement. `ContactSection.module.css` has no height budget (`min-height: 100svh` on the section only, padding-driven). | **no — confirmed unaffected, do not touch** |
| `components/sections/PreviewSection.tsx`, `AdminPanelSection.tsx` | none — re-read this session, they render **no visible dict text** (`demoTitle*` → iframe `title` attr, `phoneLabel` → dead prop, `children` always passed to `PhoneFrame`) | **no — do not touch** |

Global reset `* { margin: 0; padding: 0 }` (`app/globals.css:44`) means the only margins inside the text blocks are `.eyebrow { margin-bottom: 12px }` and `.title { margin-bottom: 16px }` — no UA default margins, so introducing a block wrapper cannot change spacing through margin collapsing (nothing has a `margin-top`, and the last child has no `margin-bottom`).

---

## Architecture Decisions

**D1 — New shared client component `components/StableTextBlock.tsx` (+ `StableTextBlock.module.css`).**
Sits next to `PhoneFrame.tsx` / `WindowChrome.tsx` / `DemoStage.tsx`, **not** in `components/sections/` — it is used by 4 different sections.

**D2 — API is a render prop taking the full `Dictionary`:**
```ts
type StableTextBlockProps = { children: (dict: Dictionary) => ReactNode };
```
Rationale: all 3 locale variants must render through *the same JSX shape*, or the measurement is meaningless. A `Record<Locale, ReactNode>` prop would force each call site to spell the markup out 3×. Passing the **full** `Dictionary` (not a pre-sliced namespace) keeps the component generic and lets the call site write `t.hero.title` exactly as it writes `dict.title` today.
**No `className` prop.** Analysis below (D3) shows the wrapper needs no layout class at any of the 4 call sites; adding one would be speculative flexibility (CLAUDE.md §2).

**D3 — The wrapper is a plain block with `position: relative; width: 100%`; the visible variant stays in flow, the other two are absolutely positioned ghosts.**
This is a visual no-op at every call site:
- *Hero / BookingSite / Notifications*: today `p.eyebrow`, `h(1|2).title`, `p.body` are flex items of `.stack` (`flex-direction: column; align-items: center; text-align: center`). As flex items they are shrink-to-fit; inside a `width: 100%` block they are full-width with inherited `text-align: center` — identical rendering, because a centered shrink-to-fit box and a full-width box with centered text paint the same glyphs at the same x. `.stack .body { margin-inline: auto; max-width: 62ch }` keeps the body column identical (descendant selector, still matches through the wrapper). Vertical spacing is unchanged (see the margin note above).
- *MobileSection*: the wrapper simply replaces the existing bare `<div>` grid item — block children stay block children.
- `.stack > *:last-child { margin-top: … }` and `.content.stack > *:last-child { … }` still target `.grow` in all three stack sections (the wrapper is never the last child) — no spacing regression.
- The wrapper must **not** be a flex/grid container: that would disable margin collapsing semantics and change the ghosts' static position. Plain block only.

**D4 — Ghost variants are client-only (rendered after mount), never in the SSR HTML.**
Server HTML for `/uk` must contain **only** Ukrainian copy: the site ships `hreflang` + `canonical` per locale (`app/[lang]/layout.tsx`), and injecting the EN+PL hero/body copy into every document is a real language-detection/duplication risk. Rendering ghosts on the server would also buy nothing for first paint (the reservation still can't be computed until the client measures), so there is no upside to trade against.
First client render therefore matches SSR exactly → **no hydration mismatch**.

**D5 — Two-phase `useLayoutEffect`, so the reservation lands before the first post-hydration paint.**
Pass 1 (`ghosts === false`) sets `ghosts = true` and returns. React re-renders synchronously inside the layout-effect flush, the effect re-runs (dep `[ghosts]`), measures, and sets `minHeight` — also synchronously, still before paint. Confirmed against this Next version's docs: *"`useLayoutEffect` runs before paint but after hydration"* (`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md:524`).
**Verified:** React 19.2.8 no longer emits the "useLayoutEffect does nothing on the server" warning (the string does not exist anywhere in `node_modules`) — a plain `useLayoutEffect` is correct here; **do not** add a `useIsomorphicLayoutEffect` shim.

**D6 — Measure with `offsetHeight`, never `getBoundingClientRect()`.**
`StackSection` wraps every section in a `motion.section` with a scroll-driven `scale` transform (`components/StackSection.tsx:22,38`). `getBoundingClientRect()` returns *transformed* boxes, so every reading would be silently scaled by up to 0.96 and the reservation would come out ~4% short at some scroll positions. `offsetHeight` is layout-space and transform-independent. (It is integer-rounded — a ≤1px undershoot, irrelevant here.)

**D7 — `ResizeObserver` observes all three variant elements, not the container.**
Height must be re-derived whenever *anything* changes the rendered text height: container width (the `clamp()` type is fluid — the requirement explicitly rules out per-breakpoint pixel values), the `next/font` `display: swap` swap-in, browser zoom, user font settings. Observing the variants covers all of them with one code path — no separate width bookkeeping and no `document.fonts.ready` special case.
No feedback loop is possible: `min-height` on the wrapper cannot change the height of an in-flow block child (content-sized) or of an absolutely-positioned ghost (`top/left/right` + auto height). The setter is still guarded with `prev === next ? prev : next`.

**D8 — No re-measure is needed on locale switch.** The reservation is `max` over all locales at the current width, which is locale-invariant by construction. A switch is purely: React swaps `className`/`aria-hidden`/`lang` on three already-mounted DOM nodes (stable `key={locale}`, same element type) → no unmount, no remount, no new work. This is what keeps the round-2 "0 network requests per switch" property intact.

**D9 — Hero's `.actions` CTA row stays OUTSIDE the reserved block.**
The structural shift comes from `eyebrow + title + body` height feeding `.grow`'s leftover space. `.actions` is `display: flex; gap: 16px` with two shrink-to-fit anchors ("Get in touch"/"See how it works", "Зв'язатися з нами"/"Подивитися, як це працює", "Skontaktuj się"/"Zobacz, jak to działa") inside a ≥900px-wide container — they cannot wrap at any viewport where the pinned layout is active, so the row's height is already locale-invariant. Wrapping them would add a second reserved box for no benefit. (A verification step below confirms this empirically.)

**D10 — Do NOT remove the `min-height` floors on `.showcase` in `Hero.module.css` (220px via `.grow`), `BookingSiteSection.module.css` (320px), `NotificationsSection.module.css` (340px).**
They stop becoming *load-bearing* for the locale bug, but they remain the safety floor that keeps the absolutely-positioned shots from collapsing at extreme viewport sizes (including the out-of-scope `position: static` mobile path). Removing them is an unforced layout risk in code we were told to touch surgically. **Net effect: none of the three `*.module.css` files for these sections change at all.**

**D11 — `lang={locale}` on each variant div.** One attribute, deterministic from state (no hydration risk), keeps the browser from applying the wrong language's text-shaping/line-breaking rules to the ghosts being measured, and is semantically correct for the visible one.

---

## Implementation Steps

- [ ] **Step 1: Baseline live measurement (before touching any code)**
  - Files: none (measurement only)
  - Details: **Do not start the dev server yourself — ask the user to run `npm run dev` and wait for confirmation.** Then, via `agent-browser` at a fixed viewport of **1440×900**, for each of `/en`, `/uk`, `/pl`, record for each of the 4 sections the *layout-space* offset of the visual block inside its section, using the transform-independent probe (rects are unusable here, see D6):
    ```js
    // top of `sel` in layout space relative to `#sectionId`
    (sectionId, sel) => {
      const s = document.getElementById(sectionId);
      const el = s.querySelector(sel);
      let top = 0, n = el;
      while (n && n !== s) { top += n.offsetTop; n = n.offsetParent; }
      return { top, h: el.offsetHeight };
    }
    ```
    Probes: `('overview', '[class*="showcase"]')`, `('booking-site', '[class*="showcase"]')`, `('notifications', '[class*="showcase"]')`, `('mobile', '[class*="phone"]')` and additionally for `mobile` the text column (`#mobile [class*="split"] > *:first-child`). Also record `#overview [class*="actions"]`'s `offsetHeight` per locale (D9 check).
  - Save the numbers in the handoff message/notes — Step 8 diffs against them.

- [x] **Step 2: Create `components/StableTextBlock.module.css`**
  - Files: `components/StableTextBlock.module.css` (new)
  - Details:
    ```css
    .wrap {
      position: relative;
      width: 100%;
    }

    /* Out of flow, out of the a11y tree and out of find-in-page (visibility:
       hidden), same width as the in-flow variant (left/right: 0) — so its
       measured height is exactly what the visible block would be. */
    .ghost {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      visibility: hidden;
      pointer-events: none;
    }
    ```

- [x] **Step 3: Create `components/StableTextBlock.tsx`**
  - Files: `components/StableTextBlock.tsx` (new, ~60 lines — keep it lean, single-purpose)
  - Details: implement exactly this shape (comments are part of the deliverable; this repo comments *why*, matching `DemoStage.tsx` / `LocaleProvider.tsx` style):
    ```tsx
    "use client";

    import { useLayoutEffect, useRef, useState } from "react";
    import type { ReactNode } from "react";
    import { DICTIONARIES } from "@/lib/dictionaries-client";
    import { LOCALES, type Dictionary } from "@/lib/locales";
    import { useLocale } from "@/components/LocaleProvider";
    import styles from "./StableTextBlock.module.css";

    /** Reserves the height of the tallest locale variant of the same text, so
     *  a sibling visual block's share of the layout budget stops depending on
     *  which language is showing. Font sizing is never touched. */
    export default function StableTextBlock({
      children,
    }: {
      children: (dict: Dictionary) => ReactNode;
    }) {
      const { locale } = useLocale();
      const wrapRef = useRef<HTMLDivElement>(null);
      // Ghosts are client-only: the server HTML for /uk must contain only
      // Ukrainian copy (hreflang/canonical point at single-language docs).
      const [ghosts, setGhosts] = useState(false);
      const [minHeight, setMinHeight] = useState<number>();

      useLayoutEffect(() => {
        if (!ghosts) {
          // Layout effects run before paint and React re-renders synchronously
          // from them, so mounting the ghosts and applying the reservation
          // below both land in this same pre-paint flush — no visible jump.
          setGhosts(true);
          return;
        }
        const el = wrapRef.current;
        if (!el) return;
        const variants = Array.from(el.children) as HTMLElement[];
        const measure = () => {
          // offsetHeight, not getBoundingClientRect(): StackSection applies a
          // scroll-driven `scale` to the whole section, which would shrink
          // every rect-based reading.
          const tallest = variants.reduce((max, v) => Math.max(max, v.offsetHeight), 0);
          setMinHeight((prev) => (prev === tallest ? prev : tallest));
        };
        measure();
        // Observing the variants (not the container) covers width changes,
        // the next/font swap-in, zoom and user font settings in one path.
        const ro = new ResizeObserver(measure);
        variants.forEach((v) => ro.observe(v));
        return () => ro.disconnect();
      }, [ghosts]);

      return (
        <div ref={wrapRef} className={styles.wrap} style={{ minHeight }}>
          {LOCALES.map((l) => {
            const current = l === locale;
            if (!current && !ghosts) return null;
            // Stable key + same element type: a locale switch only swaps
            // attributes on these three nodes, it never remounts them.
            return (
              <div
                key={l}
                lang={l}
                className={current ? undefined : styles.ghost}
                aria-hidden={current ? undefined : true}
              >
                {children(DICTIONARIES[l])}
              </div>
            );
          })}
        </div>
      );
    }
    ```
  - Do not add props, memoization, or a `useIsomorphicLayoutEffect` shim (D5).

- [x] **Step 4: Wire `Hero.tsx`**
  - Files: `components/sections/Hero.tsx`
  - Details: add `import StableTextBlock from "@/components/StableTextBlock";` next to the other component imports. Replace **only** lines 33–35 (`p.eyebrow` / `h1.title` / `p.body.lede`) with:
    ```tsx
    <StableTextBlock>
      {(t) => (
        <>
          <p className={styles.eyebrow}>{t.hero.eyebrow}</p>
          <h1 className={styles.title}>{t.hero.title}</h1>
          <p className={`${styles.body} ${heroStyles.lede}`}>{t.hero.lede}</p>
        </>
      )}
    </StableTextBlock>
    ```
    Leave `const dict = d.hero;` and every other `dict.*` usage (CTA labels, `alt` texts) exactly as-is — they must keep reading the current locale. `.actions` and `.grow` stay siblings of the new block, unchanged (D9).

- [x] **Step 5: Wire `BookingSiteSection.tsx`**
  - Files: `components/sections/BookingSiteSection.tsx`
  - Details: same import. Replace lines 17–21 with:
    ```tsx
    <StableTextBlock>
      {(t) => (
        <>
          <p className={styles.eyebrow}>{t.bookingSite.eyebrow}</p>
          <h2 className={styles.title}>{t.bookingSite.title}</h2>
          <p className={styles.body} style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
            {t.bookingSite.body}
          </p>
        </>
      )}
    </StableTextBlock>
    ```
    Keep the inline `fontSize`/`lineHeight` exactly as written (it must be identical across variants for the measurement to be valid — it is, since one JSX renders all three). `.grow` and everything below it unchanged.

- [x] **Step 6: Wire `NotificationsSection.tsx`**
  - Files: `components/sections/NotificationsSection.tsx`
  - Details: same import. Replace lines 16–18 with:
    ```tsx
    <StableTextBlock>
      {(t) => (
        <>
          <p className={styles.eyebrow}>{t.notifications.eyebrow}</p>
          <h2 className={styles.title}>{t.notifications.title}</h2>
          <p className={styles.body}>{t.notifications.body}</p>
        </>
      )}
    </StableTextBlock>
    ```

- [x] **Step 7: Wire `MobileSection.tsx`**
  - Files: `components/sections/MobileSection.tsx`
  - Details: same import. Replace the bare grid-item `<div>` (lines 17–21) — the wrapper *is* the grid item now, so the old `<div>` disappears rather than nesting:
    ```tsx
    <StableTextBlock>
      {(t) => (
        <>
          <p className={styles.eyebrow}>{t.mobile.eyebrow}</p>
          <h2 className={styles.title}>{t.mobile.title}</h2>
          <p className={styles.body}>{t.mobile.body}</p>
        </>
      )}
    </StableTextBlock>
    ```
    `<PhoneFrame>` and its `DemoStage` child stay byte-identical — `dict.phoneLabel` / `dict.demoTitle` keep reading the current locale. The grid keeps exactly 2 children, so `.split`'s two columns are preserved.

- [ ] **Step 8: Verification (this project has no test runner — do not add one; see "Verification" below)**
  - Files: none
  - Details: run the full Verification checklist and record the before/after numbers.

---

## Verification

`npx tsc --noEmit` and `npm run build` are known to be **green in both the broken and the fixed state** for this class of bug (proven twice on this project). They are necessary, not sufficient. Run them, then do the live pass.

- [ ] `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` succeeds and still statically generates `/en`, `/uk`, `/pl`.
- [ ] **Dev server: ask the user to start `npm run dev`. Never start it yourself.**
- [ ] **Zero position delta across locales.** At 1440×900, re-run the Step-1 probe for `/en`, `/uk`, `/pl`. For all four sections the visual block's `{top, h}` must be **identical across the three locales (±1px)**. Report the before/after table.
- [ ] **Second width.** Repeat at **1280×800** (still `min-width: 900px` / `min-height: 701px`, i.e. the pinned layout). Values will differ from 1440×900 — they must again be equal *across locales* at that width. This proves the reservation is width-adaptive, not a fixed pixel guess.
- [ ] **Reservation is real and locale-invariant.** For each section's wrapper (`[class*="StableTextBlock"]`, or the first child of `#mobile [class*="split"]`), `getComputedStyle(el).minHeight` must be a non-zero px value that is **the same for all three locales** at a given width, and ≥ that locale's natural text height.
- [ ] **In-place switch matches direct load.** Load `/en`, switch to UK via the `LanguageSwitcher`, re-probe: numbers must equal a fresh load of `/uk`.
- [ ] **No remount / no network regression (round-2 property).** Capture network during a locale switch: **0 requests** (previously verified 0; regression to 92 is the failure mode). Set a marker on all 5 `iframe.contentWindow`s before the switch and confirm every marker survives it.
- [ ] **No hydration warnings.** Fresh load of `/en`, `/uk`, `/pl` with the console captured — zero React hydration errors/warnings, zero `ResizeObserver loop` errors.
- [ ] **SSR HTML stays single-language (D4).** Fetch the raw HTML of `/en` (view-source / raw fetch, not the live DOM) and assert it contains **none** of `Ваша система бронювання`, `Twój system rezerwacji`. Same check symmetrically for `/uk` and `/pl`.
- [ ] **Ghosts are inert.** In the live DOM: each ghost has computed `visibility: hidden` and `aria-hidden="true"`; tabbing from the Nav into the Hero reaches the two CTA anchors and never stops inside a ghost; `window.find`-style text search is unaffected (visibility:hidden already guarantees this — just confirm no focusable element exists inside a ghost).
- [ ] **D9 check.** `#overview [class*="actions"]` `offsetHeight` is equal across all three locales at both test widths (if it is not, report back — do **not** silently expand the reserved block; that changes the plan).
- [ ] **Live resize.** With the page open, resize 1440 → 1100 → 1440 and confirm the wrappers' `min-height` recomputes (changes, then returns) with no console errors and no visible flicker.
- [ ] **Mobile path not broken.** At 480×900 (`position: static` fallback) load `/en` and `/uk` and confirm the page still renders sanely — sections stack, nothing overlaps, no horizontal scrollbar. Mobile *improvements* are explicitly out of scope; this is a "did not break it" check only.

---

## Acceptance Criteria

- [ ] All four sections show a **0px (±1px) locale-to-locale delta** in the visual block's layout-space position, at both test widths.
- [ ] No font-size is changed anywhere for any locale (hard user requirement, stated twice).
- [ ] No hardcoded per-breakpoint pixel `min-height` is introduced; every reservation is measured at runtime.
- [ ] Locale switching still performs **0 network requests** and remounts nothing (all 5 demo iframes keep their `contentWindow` markers).
- [ ] SSR HTML per locale contains only that locale's copy.
- [ ] `tsc`, `lint`, `build` clean; `/en /uk /pl` still statically generated.
- [ ] Follows project conventions: `"use client"` where needed, CSS Modules, `@/`-aliased imports, explanatory *why*-comments, every file well under the 500-line limit.
- [ ] Diff touches **only**: `components/StableTextBlock.tsx` (new), `components/StableTextBlock.module.css` (new), `components/sections/Hero.tsx`, `components/sections/BookingSiteSection.tsx`, `components/sections/NotificationsSection.tsx`, `components/sections/MobileSection.tsx`. Nothing else.

---

## Constraints & Risks

**Must not touch:** `components/DemoStage.tsx` (standing constraint from last session), `components/sections/PreviewSection.tsx`, `components/sections/AdminPanelSection.tsx`, `components/sections/ContactSection.tsx`, `components/LocaleProvider.tsx`, `components/StackSection.*`, `components/PhoneFrame.*`, `dictionaries/*.json`, `proxy.ts`, `app/**`.

**No CSS file changes at all.** `sections.module.css`, `Hero.module.css`, `BookingSiteSection.module.css`, `NotificationsSection.module.css` stay untouched — including the `.showcase` `min-height` floors (D10) and `.grow { flex: 1 1 0; min-height: 220px }`, which remain the safety net at extreme viewports. The only new CSS is the new module.

**Must not regress:** `setLocale` stays `window.history.replaceState` — never `router.push`. Nothing in this change may cause a remount of any subtree containing an iframe. This was a hard-won fix (92 requests → 0) verified by live network capture.

**Known accepted risk — one-time reservation on first load.** Per this Next version's docs, on a slow connection the browser can paint the server HTML *before* React hydrates; that pre-hydration paint has no reservation, so on the shorter-text locale the visual block settles by roughly one to two lines' height (~25–50px) once hydration runs. It happens once per page load, never on a locale switch, and is the same class of reflow the site already has from `next/font`'s `display: swap`. The alternatives were explicitly rejected by the user (hardcoded per-breakpoint px) or bought nothing (SSR-rendered ghosts still can't be measured before hydration). If the user later objects to this specific first-load settle, that is a **new** planning round, not a fix to improvise.

**Out of scope, deferred by the user:** all mobile / narrow-viewport (`max-width: 899px`, `max-height: 700px`, `position: static`) layout work, and the `LanguageSwitcher` visual redesign. Do not fix or refactor them; only verify they are not broken.

**Scope discipline:** CLAUDE.md §3 — every changed line must trace to this plan. No adjacent "improvements", no refactoring `dict`/`d` naming in the touched sections, no reformatting.
