# Plan: Locale-invariant element widths (horizontal shift on language switch) + compact nav

**Date:** 2026-08-25
**Status:** In Progress

## Goal

Make every shrink-to-fit UI label (6 nav links, nav CTA, language chip, 2 Hero CTAs, ContactForm submit) exactly as wide as its **widest** locale variant so that switching EN/UK/PL never resizes a button or shifts its neighbours horizontally — and make the nav pill itself visibly more compact **first**, so the width being frozen is the tightened one, not today's.

---

## Audit results (verified by direct code read this session — do not re-audit)

Every affected element is shrink-to-fit: its box width *is* its text width, so the box changes with the language.

| Element | File | Widths (est., see table below) | Why it moves things |
|---|---|---|---|
| 6 × `.link` | `Nav.tsx` / `Nav.module.css` | EN 393 / UK 401 / PL 392 (text only, @14px) | `.brand { margin-right: auto }` right-anchors the whole links+switcher+CTA cluster, so **any** per-link delta shifts every element to its right/left |
| `.cta` (nav) | same | EN/PL 88, UK 101 | resizes; its width feeds back into the cluster |
| `.summary` chip | `LanguageSwitcher.tsx` | "EN" 18.5 / "UA" 19.3 / "PL" 16.9 (@14px, `.summary` is @13px → ~17.2/17.9/15.7) | **~2.2px locale delta — the brief assumed 0; it is not 0** (Inter's `U`/`A` are wider than `P`/`L`). Sits *inside* the right-anchored cluster, so its delta shifts all 6 links |
| 2 × Hero CTA | `Hero.tsx` | `ctaPrimary` 12/17/14 chars → ~50% swing | `.actions` is shrink-to-fit inside `.stack { align-items: center }` → symmetric resize, still visible jitter |
| `.submit` | `ContactForm.tsx` | "Send message" 12 / "Надіслати повідомлення" 22 / "Wyślij wiadomość" 16 chars → ~2× swing | `align-self: flex-start`, resizes in place |

**Nothing else is affected.** Checked and confirmed this session:
- `MobileSection` / `BookingSiteSection` / `NotificationsSection` / `ContactSection` text: all block-level inside `StableTextBlock` (`width: 100%`) or centred in `.stack` with `text-align: center` — glyphs stay centred when the box resizes, no horizontal jitter, **no CTAs in any of them**. Out of scope, do not touch.
- `WindowChrome`'s `.address` chip: dead at both call sites (`chrome={false}`). Do not touch.
- `LanguageSwitcher`'s dropdown `.item`s: `position: absolute` popover — out of flow, cannot shift the row. Do not touch.
- `Nav` is mounted in `app/[lang]/layout.tsx` as a sibling of `{children}` — **not** inside `StackSection`, so it carries no scroll-driven `scale`. Hero **is** inside `StackSection` (transform applies). Measurement rule below (D6') covers both uniformly.

---

## Architecture Decisions

**D1 — New client component `components/StableLabel.tsx` (+ `StableLabel.module.css`). Pure CSS reservation, no measurement.**
All three locale variants of the label are rendered into **one grid cell** (`display: grid` + every child at `grid-area: 1 / 1`); the inactive ones are `visibility: hidden`. `visibility: hidden` removes an element from paint, hit-testing, the a11y tree and find-in-page but **not from layout**, so the grid track is always as wide as the longest variant and the box is locale-invariant by construction.

**D2 — This is deliberately NOT the `StableTextBlock` mechanism, and `StableTextBlock` is not refactored, generalized or touched.**
The two solve different problems and the cheap solution differs:
- `StableTextBlock` reserves the **height of wrapping paragraphs at a fluid width** — height is a function of the container width, which only the browser knows, so it genuinely needs live measurement + `ResizeObserver`.
- Here the labels never wrap (`white-space: nowrap`), so the reserved size is a pure intrinsic-sizing question that CSS answers natively. Adding a JS measurement layer would buy nothing and cost: a hook-per-element (illegal inside the nav's `.map()` without an extra component), a `ResizeObserver`, a `useLayoutEffect`, and — decisively — **a post-hydration reflow of the nav on every page load** (e.g. the EN "Mobile" link widening 45px → 62px after hydration). The user is complaining about things jumping; a JS approach would trade a switch-time jump for a load-time one.
- Generalizing the two into one primitive (CLAUDE.md §2) would mean one component carrying both an unused measurement path and an unused CSS path. Rejected.

**D3 — The component renders its own wrapper `<span class="stack">`; call sites need no CSS changes.**
The wrapper is the shrink-to-fit grid; the host element (`<a class="link">`, `<a class="cta">`, `<button class="submit">`, …) sizes to it automatically, so its padding/background/border expand to the reserved width — which is the whole point (reserving a wrapper *inside* a button without the button growing would leave the pill visibly resizing). Verified against every call site: each host is either a flex item (`.link`, `.cta`, `.primary`, `.secondary`, the chip label inside `summary { display: inline-flex }`) or a block-level `align-self: flex-start` button (`.submit`) — all block-level, all auto-width, all size to `max-content` of the grid. **No `*.module.css` at any call site changes** (the only CSS edits in this plan are the deliberate nav compaction, D8/D9).

**D4 — Ghost variants ARE server-rendered here (all three locales in the SSR HTML). This does not contradict the previous round's D4 — it is the same trade with different inputs.**
The previous round refused server-rendered ghosts because they would have injected *the entire body copy* of two other languages into every document (hero lede + 3 section bodies × 2 locales), and because it bought nothing (measurement still had to wait for the client). Here the ghosts are **~18 short UI words per page** (6 nav links + 4 button labels + chip, ×2 extra locales), each marked `lang=".."` + `aria-hidden="true"` + `visibility: hidden`, and server-rendering them buys the single most valuable property in this plan: **the reservation is correct in the very first paint, before hydration, forever** — no settle, no flash, no `useLayoutEffect`. The page's title, description, `<html lang>`, `canonical`, `hreflang` and all body copy remain single-language.
Standing rule for the coder/reviewer: `StableTextBlock` keeps its client-only ghosts. Do not "make them consistent".

**D5 — Reserve **per element**, never per cluster.**
For the nav: reserving `.links` as a whole (one `min-width` on the strip) would pin the strip's outer box but leave each link's own width locale-dependent, so link *positions inside* the strip would still jump (arithmetic: the last link's left edge lands at 394 / 410 / 420px for PL / EN / UK — a 26px jump). Reserving each link individually makes the strip's total a sum of constants (fixed widths + fixed gaps) → the cluster is locale-invariant as a consequence, which is verified explicitly in Step 10, not assumed.
Same for Hero: reserving `.actions` as a whole would keep the row width fixed while the two buttons still traded width across the fixed 16px gap. Per-button.

**D6 — The language chip IS in scope (correcting the brief's premise).**
The brief listed `LanguageSwitcher` as "locale-invariant already, don't touch", on the premise that 2-character labels have equal widths. They do not: in Inter, `U`+`A` ≈ 19.3px vs `P`+`L` ≈ 16.9px at 14px (≈2.2px delta at the chip's 0.8125rem). Because the chip sits *inside* the right-anchored cluster, a 2.2px chip delta shifts all six links by 2.2px — above this plan's ±1px acceptance bar, and it becomes a whole-pill resize once D9 lands. The fix is one wrapped expression.
**Gate:** Step 1 measures the chip in all three locales. If the measured delta is ≤1px, skip Step 7, record the numbers, and drop the now-unused `locale` argument from `StableLabel`'s `pick` signature.

**D6' — Measure with `offsetWidth` / the `offsetLeft`→`offsetParent` chain, never `getBoundingClientRect()`.**
Same reason as the previous round's D6: `StackSection` applies a scroll-driven `scale` to Hero, so rects are silently scaled. Offsets are layout-space and transform-independent. Works for the fixed-position nav too (`offsetParent` is `null` for a fixed element and `offsetLeft` is then relative to the initial containing block — the chain simply terminates there).

**D7 — The active-link indicator now spans the reserved box, and that is correct.**
`Nav.tsx`'s indicator effect measures `getBoundingClientRect()` on the real `<a>` elements. After reservation those boxes are locale-invariant, so the indicator's `left`/`width` become locale-invariant too — the indicator stops jumping *for free*, and no double-counting is possible (it measures the same single box it always did; nothing is added around the `<a>`). Consequence: for a locale whose label is shorter than the reserved width, the underline overhangs the glyphs by a few px on each side (max ≈ 8px, on "Огляд"), reading as a padded tab underline. Accepted; the alternative (measuring an inner span) would reintroduce a locale-dependent indicator width, i.e. the bug.
**Do not touch** the indicator effect, including its `locale` dependency — after this change the re-measure returns identical values, which is harmless, and removing it is an unforced risk.

**D8 — Nav compaction: one uniform type scale + tighter gaps (identical for all three locales — no per-locale anything, ever).**
| Property | Now | New | Why |
|---|---|---|---|
| `.link` `font-size` | `0.875rem` | `0.8125rem` | Not an invented value: it is already the size of `.summary` and `.item` in `LanguageSwitcher.module.css`. After this the nav's three text elements share one size (today: 14 / 13 / 14). Saves ≈31px of link text. |
| `.cta` `font-size` | `0.875rem` | `0.8125rem` | same scale |
| `.cta` `padding` | `9px 18px` | `8px 14px` | 14px horizontal on a 13px label keeps the pill proportional; saves 8px |
| `.links` `gap` | `20px` | `16px` | 1.23× the new font size (was 1.43×); 16px is already the `gap` of Hero `.actions`. Saves 20px over 5 gaps |
| `.row` `gap` | `28px` | `18px` | only 2 of its 3 gaps are inside the right-anchored cluster; saves 20px |

**D9 — The nav pill becomes `width: fit-content` on desktop only — this is what actually delivers "sized to the longest language".**
Arithmetic (est., @13px, see table below): reserved cluster ≈ **689px** vs today's widest-locale (UK) cluster ≈ **705px**. So D8 alone buys ≈16px — it pays for the reservation penalty (Σ per-link maxima is ≈67px wider than any single locale's own sum) and little more; it would **not** read as "smaller". The pill's own width is the visible thing the user is complaining about, and it is currently pinned at `--maxw` (1120px) with ≈273px of dead space between the wordmark and the first link.
`@media (min-width: 1024px) { .nav { width: fit-content } .brand { margin-right: 22px } }` makes the pill hug its (now locale-invariant) content: **≈853px, a ≈24% shorter row**, centred, still inside the gutters — literally "as wide as the longest language, and no wider". The `margin-right: 22px` override is required because `margin-right: auto` resolves to 0 in a shrink-to-fit flex container; 22 + the 18px row gap = 40px of separation, 2.5× the inter-link gap, which reads as a grouping break.
Scoped to `min-width: 1024px` so the sub-1024 nav (links hidden, mobile explicitly out of scope) keeps today's full-width pill exactly.
**Revert path if the user dislikes the floating pill: delete this one media block. Reservation and compaction survive untouched.**

**D10 — Keep the `max-width: 1023px` links breakpoint where it is.** The brief asked to check, not assume: at a 900px viewport the available width is `900 − 2×24 = 852px` and the reserved pill needs ≈853px. It does not fit, with zero margin. At 1024px: 976 available vs ≈853 needed ✓. The breakpoint stays.

**D11 — The requested "animation" is a label cross-fade, not a width transition.**
After D1 there is no width change left on a locale switch, so animating `width`/`min-width` would animate nothing. What *does* change is the glyphs, and the stacked-grid structure makes a clean cross-dissolve free: outgoing variant fades out over 90ms (then flips to `visibility: hidden`), incoming fades in over 110ms after a 90ms delay — sequential, so the two words never smear over each other. Disabled under `prefers-reduced-motion: reduce`. ~6 lines of CSS in the new module, nothing else.

**D12 — ContactForm: reserve across locales, NOT across the `submit`/`submitting` states.**
`pick` returns the *current* state's string, so the stack holds the 3 locale variants of whichever state is showing → locale-invariant in both states. The button still resizes once when it flips to "Надсилаємо…" during an actual submit. That is a one-off state change during a network request, not a locale-switch jump, it is not what the user reported, and covering it would mean widening the component's API (a second candidate-list prop) for exactly one call site — CLAUDE.md §2. Documented as a known, accepted exception; if the user raises it, it is a new round.

---

## Estimated widths used to justify D8/D9

Inter advance-width arithmetic, ±5% — **used only to size the compaction; Step 1/Step 10 live measurements are authoritative.** Per-link reserved width = max over the three locales.

| Link | EN @14 | UK @14 | PL @14 | reserved @13 |
|---|---|---|---|---|
| overview | 61.9 | 42.1 | 57.5 | **57.5** |
| preview | 53.2 | 66.0 | 53.8 | **61.3** |
| admin | 83.3 | 91.0 | 37.0 | **84.5** |
| mobile | 44.9 | 66.3 | 53.1 | **61.6** |
| bookingSite | 82.2 | 63.5 | 86.0 | **79.9** |
| notifications | 84.3 | 85.0 | 101.7 | **94.4** |
| **text total** | 409.8 | 413.9 | 389.1 | **439.2** |

Reserved strip = 439.2 + 5×16 = **519**. Chip ≈ **47**. CTA = 58.9 + 28 = **87**. Row gaps 2×18 = **36**. Cluster ≈ **689** (vs ≈705 today, UK). Pill = 14 + brand ≈118 + 22 + 689 + 10 ≈ **853** (vs 1120 today).

---

## Implementation Steps

- [ ] **Step 1: Baseline live measurement (before touching any code)**
  - Files: none (measurement only)
  - Details: **Do not start the dev server yourself — ask the user to run `npm run dev` and wait for confirmation.** Then via `agent-browser` at a fixed **1440×900** viewport, for each of `/en`, `/uk`, `/pl`, record `{left, w}` for every probe below using the transform-independent chain (D6'):
    ```js
    (sel) => {
      const el = document.querySelector(sel);
      let left = 0, n = el;
      while (n) { left += n.offsetLeft; n = n.offsetParent; }
      return { sel, left, w: el.offsetWidth };
    }
    ```
    Probes:
    `header [class*="row"]` (the pill) ·
    `header nav a:nth-of-type(1)` … `:nth-of-type(6)` ·
    `header details summary` (**the D6 gate — record this one carefully**) ·
    `header a[href="#contact"]` (nav CTA) ·
    `header [class*="indicator"]` (scroll to `#preview` first so it exists; let it settle ~500ms) ·
    `#overview [class*="actions"]`, `#overview [class*="actions"] > a:nth-child(1)`, `… > a:nth-child(2)` ·
    `#contact button[type="submit"]`.
    Also record `#overview [class*="actions"]` `offsetHeight` (D3 regression check) and the *widest-locale* cluster width, computed as `(pill.left + pill.w - 10) − (first nav link).left`, for the D9 acceptance bar.
  - Save every number in the handoff notes — Step 10 diffs against them.

- [x] **Step 2: Create `components/StableLabel.module.css`**
  - Files: `components/StableLabel.module.css` (new)
  - Details:
    ```css
    /* All locale variants share one grid cell, so the box is always as wide as
       the longest of them and the visible one is centred in it. The inactive
       ones keep `visibility: hidden`: out of paint, hit-testing, the a11y tree
       and find-in-page, but still contributing their width to the track. */
    .stack {
      display: grid;
      justify-items: center;
    }

    .stack > * {
      grid-area: 1 / 1;
      white-space: nowrap;
    }

    /* Sequential cross-fade on locale switch (never runs on first paint —
       there is no previous value to transition from). */
    .current {
      visibility: visible;
      opacity: 1;
      transition: opacity 110ms ease 90ms;
    }

    .ghost {
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      /* opacity first, then flip visibility — and pointer-events: none so the
         fading-out label can never eat a click during those 90ms. */
      transition: opacity 90ms ease, visibility 0s linear 90ms;
    }

    @media (prefers-reduced-motion: reduce) {
      .current,
      .ghost {
        transition: none;
      }
    }
    ```

- [x] **Step 3: Create `components/StableLabel.tsx`**
  - Files: `components/StableLabel.tsx` (new, ~35 lines — keep it lean, single-purpose)
  - Details: implement exactly this shape (the comments are part of the deliverable; this repo comments *why*):
    ```tsx
    "use client";

    import { DICTIONARIES } from "@/lib/dictionaries-client";
    import { LOCALES, type Dictionary, type Locale } from "@/lib/locales";
    import { useLocale } from "@/components/LocaleProvider";
    import styles from "./StableLabel.module.css";

    /** Reserves the width of the widest locale variant of a short UI label, so
     *  buttons and nav links stop resizing — and stop shifting their
     *  neighbours — when the language changes. Pure CSS (all variants stacked
     *  in one grid cell): correct in the first paint, no measurement, no
     *  post-hydration reflow. The host element must be block-level and
     *  auto-width, which every call site already is. */
    export default function StableLabel({
      pick,
    }: {
      // `locale` is passed too because the language chip's labels come from
      // LOCALE_LABELS rather than from the dictionaries.
      pick: (dict: Dictionary, locale: Locale) => string;
    }) {
      const { locale } = useLocale();
      return (
        <span className={styles.stack}>
          {LOCALES.map((l) => {
            const current = l === locale;
            // Stable key + same element type: a switch only swaps className /
            // aria-hidden on three already-mounted nodes, never remounts them.
            return (
              <span
                key={l}
                lang={l}
                className={current ? styles.current : styles.ghost}
                aria-hidden={current ? undefined : true}
              >
                {pick(DICTIONARIES[l], l)}
              </span>
            );
          })}
        </span>
      );
    }
    ```
  - No props beyond `pick`, no memoization, no measurement, no effects.

- [x] **Step 4: Wire `Nav.tsx` (6 links + CTA)**
  - Files: `components/Nav.tsx`
  - Details: add `import StableLabel from "@/components/StableLabel";` next to the other component imports. Replace **only** these two expressions:
    - line 141 `{dict[link.key]}` → `<StableLabel pick={(t) => t.nav[link.key]} />`
    - line 157 `{dict.contact}` → `<StableLabel pick={(t) => t.nav.contact} />`
  - Keep `const dict = d.nav;` (still used for `dict.logoAlt`), keep `locale` and the whole indicator effect **byte-identical** (D7), keep the `linkRefs` callback refs on the `<a>` elements (the indicator must keep measuring the anchor, not the inner span).

- [x] **Step 5: Wire `Hero.tsx` (2 CTAs)**
  - Files: `components/sections/Hero.tsx`
  - Details: same import. `{dict.ctaPrimary}` → `<StableLabel pick={(t) => t.hero.ctaPrimary} />`, `{dict.ctaSecondary}` → `<StableLabel pick={(t) => t.hero.ctaSecondary} />`. Everything else (`dict.alt*`, `StableTextBlock`, `.grow`, `.showcase`) untouched. `Hero.module.css` is **not** edited.

- [x] **Step 6: Wire `ContactForm.tsx` (submit)**
  - Files: `components/ContactForm.tsx`
  - Details: same import. Replace the button's child:
    ```tsx
    <StableLabel
      pick={(t) =>
        status === "submitting" ? t.contactForm.submitting : t.contactForm.submit
      }
    />
    ```
    `disabled`, `type`, `className` and every other line unchanged. `ContactForm.module.css` is **not** edited. Per D12 the submit→submitting width change is knowingly left alone.

- [x] **Step 7: Wire `LanguageSwitcher.tsx` (chip label) — gated on Step 1**
  - Files: `components/LanguageSwitcher.tsx`
  - Details: **only if Step 1 measured a `header details summary` width delta > 1px across locales** (expected ≈2px, D6). Then: same import, and `{LOCALE_LABELS[locale]}` inside `<summary>` → `<StableLabel pick={(_, l) => LOCALE_LABELS[l]} />`. Nothing else in the file changes — the dropdown `.item`s, the outside-click/Escape effects and `setLocale` stay exactly as they are.
    If the measured delta is ≤1px: skip this step, write the measured numbers into the handoff notes, and simplify `StableLabel`'s prop to `pick: (dict: Dictionary) => string` (dropping the unused `locale` arg and the `Locale` import).
    **Coder note (2026-08-25): Step 1 (live measurement) was not run by the coder — no dev server available in this session. Implemented as if the gate passed (D6's own arithmetic estimates ≈2.2px > 1px), per orchestrator instruction. Orchestrator must verify live and revert this one step (plus simplify `StableLabel`'s `pick` signature per the plan's fallback) if the measured delta turns out ≤1px.**

- [x] **Step 8: Compact the nav (uniform, locale-independent — D8)**
  - Files: `components/Nav.module.css`
  - Details: exactly four edits, nothing else in the file:
    - `.row` → `gap: 18px;` (was 28px)
    - `.links` → `gap: 16px;` (was 20px)
    - `.link` → `font-size: 0.8125rem;` (was 0.875rem)
    - `.cta` → `font-size: 0.8125rem; padding: 8px 14px;` (was 0.875rem / `9px 18px`)
  - Do **not** touch `.brand`, `.mark`, `.markImg`, `.wordmark`, `.indicator`, `--nav-pill-h`, `padding-inline`, or the existing `max-width: 1023px` block (D10).

- [x] **Step 9: Shrink the pill to its content on desktop (D9)**
  - Files: `components/Nav.module.css`
  - Details: append one new block (keep the existing `max-width: 1023px` block untouched and above/below it — order is irrelevant, the queries are complementary):
    ```css
    /* Above the breakpoint the pill hugs its content instead of stretching to
       --maxw. The content is locale-invariant (StableLabel), so this is
       literally "as wide as the longest language, and no wider". Below the
       breakpoint the links are hidden, so the full-width pill is kept as-is. */
    @media (min-width: 1024px) {
      .nav {
        width: fit-content;
      }

      /* `margin-right: auto` resolves to 0 in a shrink-to-fit flex container;
         22px + the 18px row gap = 40px of separation from the link strip. */
      .brand {
        margin-right: 22px;
      }
    }
    ```
  - Must land **after** Steps 4–8 are in place: with a fit-content pill, any unreserved element would resize the *entire* pill on switch.

- [ ] **Step 10: Verification (this project has no test runner — do not add one; run the checklist below)**
  - Files: none
  - Details: run the full Verification checklist and record the before/after table against Step 1.

---

## Verification

`npx tsc --noEmit` and `npm run build` are **green in both the broken and the fixed state** for this class of bug (proven three times on this project now). Necessary, not sufficient. Run them, then do the live pass.

- [ ] `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` succeeds and still statically generates `/en`, `/uk`, `/pl`.
- [ ] **Dev server: ask the user to start `npm run dev`. Never start it yourself.**
- [ ] **Zero horizontal delta across locales.** At 1440×900, re-run every Step-1 probe on `/en`, `/uk`, `/pl`. Every probe's `{left, w}` must be **identical across the three locales (±1px)** — including the pill, all 6 links, the chip, the nav CTA, the indicator, both Hero CTAs, `.actions`, and the submit button. Report the before/after table.
- [ ] **Second width.** Repeat at **1280×800**. Values differ from 1440×900 (the pill is centred), but must again be equal *across locales* at that width.
- [ ] **In-place switch matches direct load.** Load `/en`, switch to UK and then PL via the switcher, re-probe after each: numbers must equal a fresh load of that locale. This is the actual bug the user reported — no element may move by more than 1px.
- [ ] **The nav got smaller.** Reserved pill width at 1440×900 must be **≥15% narrower** than the Step-1 baseline pill (1120px → target ≈850px), and the reserved cluster (first-link left → CTA right edge) must be **no wider than the widest-locale baseline cluster** from Step 1 (≈705px). If the cluster comes out wider, **report back — do not tune numbers by guessing.**
- [ ] **Breakpoint arithmetic holds (D10).** At exactly 1024×900 the pill fits inside the gutters with no horizontal scrollbar and no overflow outside the rounded border; at 1023×900 the links are hidden and the pill is full-width exactly as before this change.
- [ ] **Indicator is locale-invariant and still tracks (D7).** Click through several nav links at `/uk`, confirm the underline animates to each link and its `{left, w}` equals `/en`'s and `/pl`'s for the same active section (±1px).
- [ ] **No remount / no network regression (standing property).** Capture network during a locale switch: **0 requests**. Set a marker on all 5 `iframe.contentWindow`s before the switch, confirm every marker survives.
- [ ] **No hydration warnings.** Fresh load of `/en`, `/uk`, `/pl` with the console captured — zero React hydration errors/warnings.
- [ ] **SSR HTML: body copy still single-language, labels intentionally multi-language (D4).** Raw-fetch `/en` and assert it contains **none** of `Ваша система бронювання`, `Twój system rezerwacji` (i.e. `StableTextBlock`'s guarantee is intact). It **will** contain `Сповіщення` / `Powiadomienia` / `Skontaktuj się` etc. inside `aria-hidden` spans — that is by design, do not "fix" it. Confirm `<html lang="en">`, `canonical` and `hreflang` are unchanged.
- [ ] **Ghosts are inert.** For each `StableLabel` ghost span: computed `visibility: hidden`, `aria-hidden="true"`, not focusable (they are `<span>`s). Tab through the nav: exactly one stop per link + chip + CTA, and each link's accessible name (devtools a11y pane or `el.ariaLabel ?? el.innerText`) is the **current locale's word only**.
- [ ] **Cross-fade behaves (D11).** After a switch, the outgoing label is fully gone within ~250ms; no ghost is left with `visibility: visible`; clicking a nav link *during* the fade still navigates (pointer-events check). With `prefers-reduced-motion: reduce` emulated, the swap is instant.
- [ ] **Hero row height unchanged.** `#overview [class*="actions"]` `offsetHeight` equals the Step-1 baseline (the new `<span>` wrapper must not change the button height; a ±1px change is a red flag — report it).
- [ ] **Form still works.** Submit the contact form with invalid then valid input at `/uk`: validation errors, focus management, the `submitting` state and the success message all behave as before.
- [ ] **Mobile path not broken.** At 480×900 load `/en` and `/uk`: the pill is still full-width (D9 is desktop-only), nothing overlaps, no horizontal scrollbar. Mobile *improvements* stay out of scope — "did not break it" only.

---

## Acceptance Criteria

- [ ] Every probed element shows a **0px (±1px) locale-to-locale delta** in both `offsetWidth` and layout-space `left`, at both test widths, on direct load **and** after in-page switching.
- [ ] The nav pill is ≥15% narrower than baseline and its width no longer depends on the language.
- [ ] No per-locale font-size, spacing or width anywhere. The nav compaction (D8) is one uniform change applied identically to EN/UK/PL.
- [ ] No hardcoded per-locale or measured-by-guessing pixel widths: every reservation is intrinsic CSS sizing; the only new fixed numbers are the deliberate D8/D9 design values, each justified against measured text widths above.
- [ ] Locale switching still performs **0 network requests** and remounts nothing (all 5 demo iframes keep their `contentWindow` markers).
- [ ] SSR body copy per locale is still single-language; `StableTextBlock` is unmodified.
- [ ] `tsc`, `lint`, `build` clean; `/en /uk /pl` still statically generated.
- [ ] Follows project conventions: `"use client"`, CSS Modules, `@/`-aliased imports, *why*-comments, every file far under 500 lines.
- [ ] Diff touches **only**: `components/StableLabel.tsx` (new), `components/StableLabel.module.css` (new), `components/Nav.tsx`, `components/Nav.module.css`, `components/sections/Hero.tsx`, `components/ContactForm.tsx`, and `components/LanguageSwitcher.tsx` (Step 7, gated). Nothing else.

---

## Constraints & Risks

**Must not touch:** `components/StableTextBlock.*` (shipped, approved, working — read for context only), `components/DemoStage.tsx`, `components/StackSection.*`, `components/PhoneFrame.*`, `components/WindowChrome.*`, `components/LocaleProvider.tsx`, `components/sections/PreviewSection.tsx`, `AdminPanelSection.tsx`, `ContactSection.tsx`, `MobileSection.tsx`, `BookingSiteSection.tsx`, `NotificationsSection.tsx`, `dictionaries/*.json`, `lib/**`, `proxy.ts`, `app/**`. `Hero.module.css` and `ContactForm.module.css` are **not** edited (D3) — if the coder finds themselves needing a CSS change there, the wrapper assumption broke: stop and report.

**Must not regress:** `setLocale` stays `window.history.replaceState` — never `router.push`. Nothing here may cause a remount of any subtree containing an iframe (this change only swaps classNames on already-mounted spans, so the risk is structural-only: do not add `key`s derived from `locale`).

**Known accepted risks:**
1. *Multi-locale UI labels in the SSR HTML* (D4). ~18 extra short words per page, `lang`-tagged, `aria-hidden`, `visibility: hidden`; `hreflang`/`canonical`/`<html lang>`/metadata/body copy all stay single-language. Low SEO risk, taken deliberately in exchange for a reservation that is correct before hydration. If the user or a future SEO audit objects, the fallback is client-only ghosts — which reintroduces a one-time post-hydration reflow of the nav on every page load.
2. *The active-link underline overhangs short labels by up to ~8px* (D7). Inherent to a locale-invariant indicator.
3. *The submit button still resizes between `submit` and `submitting`* (D12). Not locale-triggered; explicitly out of scope.
4. *The floating fit-content pill is a visible design change* (D9). It is the only lever that actually shortens the row (D8 alone buys ≈16px of ≈705px). Revert path if the user dislikes it: delete the one `@media (min-width: 1024px)` block; reservation and compaction remain.
5. *Width estimates in this plan are Inter advance-width arithmetic (±5%)*. They justify the D8/D9 numbers; the live measurements in Steps 1/10 are authoritative. If measurement contradicts the estimates by enough to fail the "cluster no wider than baseline" bar, report back rather than improvising new values.

**Scope discipline:** CLAUDE.md §3 — every changed line must trace to a step above. No adjacent "improvements", no renames, no reformatting, no refactor of `dict`/`d` naming, no touching the indicator effect or the `LanguageSwitcher` dropdown.
