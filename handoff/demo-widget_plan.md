# Plan: Loom & Blade interactive demo widget (Hero/Overview)

**Date:** 2026-08-12
**Status:** In Progress
**Spec source:** `Demo.md` (client-written, sections 0–7) — the coder MUST read it for exact copy, service tables and colors. This plan does not duplicate copy, to avoid transcription drift.

## Goal

Replace the "Preview coming soon" placeholder inside the Hero section's `WindowChrome` with a fully local, fake, interactive multi-page demo of the "Loom & Blade" salon booking product (home → master → booking flow → confirmation, plus About Us, 3 legal/help pages, footer, and a light/dark theme toggle on its own brand palette), built in 6 independently reviewable phases with zero new dependencies and zero backend calls.

---

## Findings from the existing codebase (facts the plan is built on)

| Fact | Where | Consequence |
|---|---|---|
| `WindowChrome.body` is `position: relative; aspect-ratio: 16/10; flex: 1 1 auto; min-height: 0`, inside `.window { max-height: 100%; overflow: hidden }`, stretched by `.grow { flex: 1 1 0; max-width: 78% }` | `components/WindowChrome.module.css`, `components/sections/sections.module.css` | The content box is **not** a guaranteed 16:10 — it can be shorter (height-constrained viewport) or taller (tall/narrow `.grow`). The demo must scale-to-fit both axes. Typical desktop size ≈ 1050×560 CSS px; mobile ≈ 330×206. |
| **No `localStorage` usage exists anywhere in the repo** (grep: only mentions inside `Demo.md`) | whole repo | The "admin color-customization widget" that `Demo.md` §0 references **does not exist yet**. There is no established pattern to match — this plan *defines* the pattern (namespaced, versioned key + single JSON record) and the future customize widget should follow it. Flagged in Assumptions. |
| The outer landing palette is *already* the salon's dark palette | `app/globals.css` vs `Demo.md` §6 | `--bg #121417`, `--surface #22262b`, `--accent #d0764d`, `--text #f2f3f5` are the demo's **Dark** tokens almost verbatim (a previous session swapped the landing accent from gold `#e0c188` to terracotta). So "dark demo inside a dark landing" will visually blend. Not a blocker — the window chrome + border still frames it — but it weakens the client's stated "their brand vs our brand" point. See Assumptions A2 / Risks. |
| ESLint (`eslint-config-next/core-web-vitals` + `/typescript`) enforces `react-hooks/set-state-in-effect` and `@next/next/no-img-element` | `eslint.config.mjs`; previously hit in `handoff/ordiset-nav-widget-fixes-8_plan.md` | (a) Never call `setState` directly in an effect body — wrap in a named inner function and call it (pattern already used in `components/Nav.tsx:63-67`), or call it from a callback (ResizeObserver / event handler), which is fine. (b) All real photos must use `next/image`, never `<img>`. |
| Conventions: one CSS Module per component, no Tailwind, no comments in code, TS everywhere, `@/` path alias, `"use client"` only where interactivity is needed | `components/*` | Match exactly. |
| Existing placeholder pattern | `components/Placeholder.tsx` (+ module.css) — absolutely-positioned centered dot + label using outer tokens | The demo needs its **own** placeholder (outer tokens must not leak in). Do not modify or reuse `Placeholder.tsx`. |
| `ContactForm.tsx` | `components/ContactForm.tsx` | Good reference for the Help Center form's validation/status pattern (`Values`/`Errors`/`Status` types, `validate()`, `noValidate`, `aria-invalid`/`aria-describedby`, fake async submit). **Copy the pattern, not the component** — styling/tokens/fields differ. |
| Framer Motion is available and used for scroll-linked work only | `StackSection.tsx`, `Nav.tsx` | The demo needs none of it. Marquee/transitions = plain CSS. Use `prefers-reduced-motion` media query in CSS rather than pulling `useReducedMotion` into the demo tree. |

**No new dependencies.** Calendar grid, marquee, theme toggle and view switching are all plain React state + CSS. Confirmed nothing in `package.json` needs to change.

---

## Architecture Decisions

### A1. Fixed design canvas, scaled to fit (the single most important decision)

The demo is a full desktop product UI that must render inside a ~1050×560 box (and ~330px wide on mobile). Two options were considered:

- *Responsive demo* — internal breakpoints for every page. Rejected: multiplies the work of all 5 content phases and still yields unreadable text on mobile.
- **Chosen: fixed 1280×800 design canvas, uniformly scaled.** The coder designs every page as if it were a 1280×800 desktop browser viewport (plain `px` everywhere). A wrapper scales it with `transform: scale()` to fit the actual box. It reads as a live screenshot of the real product — which is exactly the pitch — and removes all responsive work from Phases 1–5.

```
.viewport   position: absolute; inset: 0; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
            background: var(--lb-bg);            /* leftover bands blend into the page bg */
.canvas     width: 1280px; height: 800px; flex: none; overflow: hidden;
            transform: scale(var(--demo-scale)); transform-origin: center center;
```

`--demo-scale = min(viewportW / 1280, viewportH / 800)`, computed by a `ResizeObserver` on `.viewport` and written to the canvas's inline `style`. 1280×800 is 16:10, matching `.body`'s intrinsic ratio, so on a normal desktop the scale is width-driven and there are no bands at all.

**Hard rule: every demo page must fit within 1280×800. The canvas is `overflow: hidden`.** This is deliberate — a scrollable region inside a full-screen hero would trap the mouse wheel and break the landing page's sticky-stack scrolling. The only exception: the Privacy/Terms body text region may be `overflow-y: auto` (Phase 4), because those pages are reached by a deliberate click, are text-reading contexts, and a scrollbar there is expected.

Scale hook (satisfies `react-hooks/set-state-in-effect` because `setState` runs in the observer callback, not the effect body):

```ts
useEffect(() => {
  const el = ref.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    setScale(Math.min(width / CANVAS_W, height / CANVAS_H));
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

Initial `scale = 0` is not used; render the canvas hidden (`opacity: 0`) until both the scale and the localStorage store have been read on mount, then fade in (`transition: opacity .2s`). This also hides the theme/hydration flash (see A4).

### A2. Scoped theming — the demo's tokens never touch the outer page

All demo tokens are prefixed `--lb-` (Loom & Blade) and declared **only** on the demo root element inside `DemoApp.module.css`. Nothing is added to `app/globals.css`.

```css
.root { color-scheme: light; --lb-bg:#F8F9FA; --lb-tint:#EAECEE; --lb-card:#FFFFFF;
        --lb-primary:#B35C37; --lb-on-primary:#FFFFFF; --lb-text:#1A1D20;
        --lb-muted:#6C757D; --lb-border:#E2E8F0; ... }
.root[data-theme="dark"] { color-scheme: dark; --lb-bg:#121417; --lb-tint:#22262B;
        --lb-card:#1A1D22; --lb-primary:#D0764D; --lb-on-primary:#121417;
        --lb-text:#F1F3F5; --lb-muted:#8B95A1; --lb-border:#2D3239; }
```

Rules the reviewer must enforce every phase:
- **No file under `components/demo/**` may reference an outer token** (`var(--bg)`, `var(--accent)`, `var(--text…)`, `var(--surface)`, `var(--border…)`, `var(--radius-…)`, `var(--shadow-…)`). Grep check: `rg 'var\(--(?!lb-|demo-)' components/demo` must return nothing.
- Demo-local radii/shadows get their own tokens (`--lb-r-card: 12px`, `--lb-r-pill: 999px`, `--lb-shadow`).
- `--lb-on-primary` differs per theme for contrast: white on `#B35C37` (4.6:1); `#121417` on `#D0764D` (7.4:1) — white on `#D0764D` would be 2.6:1 and must not be used.
- `color-scheme` is set on the root so native `select`/`textarea`/scrollbars follow the demo theme, not the page's global `color-scheme: dark`.
- The global `:focus-visible { outline: 2px solid var(--accent) }` in `globals.css` would bleed the landing accent into the widget — override with one scoped rule: `.root :focus-visible { outline: 2px solid var(--lb-primary); outline-offset: 2px; }`.

Theme is toggled by writing `data-theme="light" | "dark"` on the demo root. No global class, no `html` attribute, no `prefers-color-scheme` listener.

### A3. View-state machine (no Next.js routing, no URL changes)

Single `useReducer` in `DemoApp`, exposed through one context so `DemoTopBar`/`DemoFooter` can dispatch without prop drilling.

```ts
type MasterId = "marek" | "anna";
type DemoView =
  | { name: "home" }
  | { name: "master"; masterId: MasterId }
  | { name: "about" }
  | { name: "privacy" }
  | { name: "terms" }
  | { name: "help" };

type DemoState = {
  view: DemoView;
  history: DemoView[];            // for the back chevron; capped at 10 entries
  store: DemoStore | null;        // null until localStorage is read on mount
  locale: "en";                   // see Assumption A6
  draft: { serviceId: string | null; dateISO: string | null; time: string | null };
  confirmation: BookedSlot | null; // non-null => confirmation overlay is open
};

type DemoAction =
  | { type: "hydrate"; store: DemoStore }
  | { type: "navigate"; view: DemoView }
  | { type: "back" }
  | { type: "toggleTheme" }
  | { type: "setLocale"; locale: string }
  | { type: "selectService"; serviceId: string }
  | { type: "selectDate"; dateISO: string }
  | { type: "selectTime"; time: string }
  | { type: "confirmBooking" }
  | { type: "closeConfirmation" };
```

- The reducer is **pure**; it never touches `localStorage`, `Date.now()` or `Math.random()`. Anything non-deterministic is computed in the component layer or passed in the action payload (e.g. `hydrate`). This keeps SSR output deterministic.
- `navigate` pushes the current view onto `history`; `back` pops it (falls back to `{name:"home"}`).
- Switching master resets `draft`.
- `MasterPage` sub-state (calendar's displayed month, dropdown open/closed) is **local `useState` in that component**, not in the reducer — it isn't shared and isn't persisted.
- Rendering: one `switch (state.view.name)` in `DemoApp` picking the page component. No `<Suspense>`, no dynamic imports, no animation between views in this pass (a cross-fade is a Phase 6 nice-to-have, not required).

### A4. localStorage: pattern definition (no existing pattern to copy)

```ts
const STORAGE_KEY = "ordiset-demo-v1";

type BookedSlot = { masterId: MasterId; serviceId: string; dateISO: string; time: string };
type DemoStore = {
  version: 1;
  seed: number;                 // per-visitor, drives calendar closures + taken slots
  theme: "light" | "dark";
  bookings: BookedSlot[];       // capped at 20, newest last
};
```

- **Read once, on mount, inside an effect** — never during render (SSR has no `localStorage`; reading during render causes a hydration mismatch). Wrap the `setState`/`dispatch` in a named inner function per the lint rule.
- Read is fully defensive: `try/catch` around `JSON.parse`, reject anything whose `version !== 1` or whose fields fail a shape check, and fall back to a freshly created store. A corrupt/foreign value must never throw inside the landing page.
- `seed` is created on first visit only: `Math.floor(Math.random() * 2 ** 31)`.
- **Write** in a single effect that watches `state.store`: skip when `null`, otherwise `try { localStorage.setItem(...) } catch {}` (quota/private-mode safe).
- Server render and the first client render are identical: `store === null` → canvas hidden. Nothing that depends on `Date` or `localStorage` renders before hydration.
- **Naming convention for the future**: `ordiset-<widget>-v<n>`, one JSON record per widget. The upcoming admin color-customization widget should use `ordiset-customize-v1`.
- View/`draft` state is **not** persisted — every visit starts on Home. Only `seed`, `theme`, `bookings` persist.

### A5. Image assets: manifest-driven slots (see the full checklist below)

Every image in the demo goes through one component, `DemoImage`, driven by one manifest file. `src: null` renders a labeled placeholder box showing the slot id; setting `src` to a real path is the only change needed when photos arrive. This is what makes "which photo goes where" unambiguous.

### A6. Directory layout

```
components/demo/
  DemoApp.tsx                DemoApp.module.css      "use client" root: reducer, context provider, tokens, viewport+canvas, scale, store effects
  demoState.ts                                       types, initialState, reducer (pure, no side effects)
  demoContext.ts                                     createContext + useDemo() hook
  useDemoScale.ts                                    ResizeObserver hook
  demoStore.ts                                       read/write/validate localStorage record
  DemoTopBar.tsx             DemoTopBar.module.css
  DemoFooter.tsx             DemoFooter.module.css
  DemoImage.tsx              DemoImage.module.css    real photo (next/image) or labeled placeholder
  Marquee.tsx                Marquee.module.css      CSS-only infinite strip, generic children
  pages/HomePage.tsx         pages/HomePage.module.css
  pages/MasterPage.tsx       pages/MasterPage.module.css
  pages/AboutPage.tsx        pages/AboutPage.module.css
  pages/LegalPage.tsx        pages/LegalPage.module.css      Privacy + Terms share one layout, differ by props/data
  pages/HelpPage.tsx         pages/HelpPage.module.css
  booking/Calendar.tsx       booking/Calendar.module.css
  booking/ServiceSelect.tsx  booking/ServiceSelect.module.css
  booking/TimeSlots.tsx      booking/TimeSlots.module.css
  booking/Confirmation.tsx   booking/Confirmation.module.css
  booking/HelpForm.tsx       booking/HelpForm.module.css     (Phase 4; lives here or in pages/ — coder's call, keep it next to its page)
  lib/calendar.ts                                    PRNG + availability rules + month grid + slot generation
  data/masters.ts                                    masters, services, bios, achievements
  data/reviews.ts                                    Anna's invented review-card content
  data/copy.ts                                       legal/help page copy blocks
  data/images.ts                                     the image manifest
```

Every file stays well under the 500-line limit. Files are created by the phase that first needs them — the tree above is the end state, not Phase 1's deliverable.

### A7. Marquee (CSS only)

One generic `Marquee` component: renders `children` twice inside a flex track, `animation: marquee 40s linear infinite` translating `-50%`, `width: max-content`. Duplication (not JS cloning) is what makes the loop seamless. Requirements:
- `@media (prefers-reduced-motion: reduce) { .track { animation: none } }` — the strip stays visible, just static.
- Pause on hover (`.root:hover .track { animation-play-state: paused }`).
- `aria-hidden` is wrong here (Anna's strip has real review text) — instead don't animate content that needs reading via assistive tech; keep the DOM duplicate marked `aria-hidden="true"` so screen readers hear each card once.
- Fixed height per usage, set by the parent; `overflow: hidden` with a soft mask (`mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)`).

---

## Calendar availability rule (Demo.md §3: no hardcoded dates)

`components/demo/lib/calendar.ts`, fully deterministic from `(seed, masterId, year, month, day)` — same visitor always sees the same calendar, works for any month of any year, needs no maintenance.

```ts
function hash32(...nums: number[]): number      // xorshift/mix, returns uint32
function mulberry32(a: number): () => number    // 5-line PRNG, returns [0,1)
function masterSalt(masterId: string): number   // stable char-code sum
```

**Working hours:** `OPEN = 10:00`, `CLOSE = 19:00`, `STEP = 30 min` (constants at the top of the file).

**Day openness** — `isDayOpen(date, seed, masterId)`:
1. `date < today` (local midnight comparison) → **past**: rendered muted, never selectable, not counted as "open".
2. Sunday → **closed**, always.
3. Saturday → **open only if** `mulberry32(hash32(seed, y, m, d, masterSalt))() < 0.25` — i.e. roughly one Saturday a month ("weekends mostly closed").
4. Mon–Fri → **open unless the day is in that month's closed set**:
   - `rng = mulberry32(hash32(seed, y, m, masterSalt))`
   - `closedCount = 2 + Math.floor(rng() * 2)` → 2 or 3 days
   - Fisher–Yates shuffle the month's weekday day-numbers with the same `rng`, take the first `closedCount`.
   - Mixing `masterSalt` in means Marek and Anna have different days off — realistic, free.

**Month grid** — `monthGrid(year, month, seed, masterId): DayCell[]` returns exactly 42 cells (6 rows × 7), **Monday-first** (`Mo Tu We Th Fr Sa Su` per spec), with leading/trailing cells from adjacent months flagged `inMonth: false`. `DayCell = { dateISO, day, inMonth, isToday, isPast, isOpen }`.

**Time slots** — `timeSlots(dateISO, seed, masterId, durationMin, bookings)`:
- Emit every `STEP` from `OPEN` while `slotStart + durationMin <= CLOSE`. (So Anna's 210-min Balayage genuinely shows fewer slots than a 30-min beard trim — cheap realism, ~3 lines.)
- `taken` if `mulberry32(hash32(seed, y, m, d, slotIndex, masterSalt))() < 0.30`, **or** if the visitor's own `bookings` contain that `masterId`+`dateISO`+`time` (this is the localStorage-backed "stays booked for me" behaviour from §3).
- If `dateISO` is today, slots whose start time is already past are `taken`.

**Date string rule (gotcha):** build `dateISO` as `YYYY-MM-DD` from **local** `getFullYear()/getMonth()/getDate()` with manual zero-padding. Never `toISOString()` — it converts to UTC and silently shifts the day for anyone east/west of UTC.

**Month navigation:** prev arrow disabled when already on the current month; forward allowed up to +12 months. `new Date()` is only read after mount (the store gate in A4 guarantees this), so there is no SSR/client date mismatch.

---

## Image asset plan

### Convention

- All demo assets live under `public/demo/<group>/`, never in `public/` root (which holds Ordiset's own brand assets).
- Filenames are zero-padded and sequential within a group (`01.jpg`, `02.jpg` …) so the client can send "these 8, in this order" and the order is preserved literally.
- One manifest, `components/demo/data/images.ts`, is the single source of truth:

```ts
export type ImageSlot = {
  id: string;        // "marquee-home/03" — shown on the placeholder, matches the file path
  src: string | null;// null = not delivered yet
  alt: string;
  label: string;     // short human purpose, e.g. "Home strip 3"
  ratio: string;     // CSS aspect-ratio, e.g. "3 / 4"
};
export const MASTER_PHOTOS: Record<MasterId, ImageSlot>;
export const HOME_MARQUEE: ImageSlot[];      // 8
export const MAREK_MARQUEE: ImageSlot[];     // 8
export const ABOUT_GALLERY_ROW_1: ImageSlot[]; // 4
export const ABOUT_GALLERY_ROW_2: ImageSlot[]; // 2
export const REVIEW_MAP: ImageSlot;
export const REVIEW_AVATARS: ImageSlot[];    // 4, optional
export const BRAND_LOGO: ImageSlot;          // optional
```

- `DemoImage` renders a `position: relative` wrapper with `aspect-ratio: <slot.ratio>` and `border-radius`, then either `<Image src={slot.src} alt={slot.alt} fill sizes={sizes} />` or `<DemoPlaceholder id={slot.id} label={slot.label} />`.
- Placeholder styling: `--lb-tint` fill, dashed `--lb-border`, centered two-line label (`label` bold on line 1, `id` in `--lb-muted` monospace on line 2), plus a subtle diagonal hatch so it can never be mistaken for a finished panel. Keep labels short — they render at ~0.8× scale.
- **Swapping in a real photo = drop the file in the right folder + change one `src: null` to `src: "/demo/…"`.** Nothing else.
- `sizes` should reflect the *scaled* rendered size (canvas px × ~0.85), e.g. `sizes="200px"` for marquee cards, `"320px"` for master cards. Not critical, but avoids over-fetching.

### Checklist to send the client — "here's what to send, in this order"

**Required — 25 files**

| # | Path | Ratio / min size | What it shows |
|---|---|---|---|
| 1 | `public/demo/masters/marek.jpg` | 1:1, ≥800×800 | Marek Zawadzki — portrait, head & shoulders, centered |
| 2 | `public/demo/masters/anna.jpg` | 1:1, ≥800×800 | Anna Nowak — portrait, same framing (also reused as the circular avatar on her booking page) |
| 3–10 | `public/demo/marquee-home/01.jpg` … `08.jpg` | 3:4 portrait, ≥600×800 | Home strip: general salon/work shots — haircuts, coloring, styling, salon atmosphere |
| 11–18 | `public/demo/marquee-marek/01.jpg` … `08.jpg` | 3:4 portrait, ≥600×800 | Marek's own work shots (barbering: fades, beards, classic cuts) |
| 19 | `public/demo/reviews/map.jpg` | 16:10, ≥800×500 | Map/location preview for Anna's review strip (screenshot of the salon's map pin) |
| 20–23 | `public/demo/about/row1-01.jpg` … `row1-04.jpg` | 4:3 landscape, ≥800×600 | About Us row 1 (4 images): lighting, product shelf, lounge area, wash stations |
| 24–25 | `public/demo/about/row2-01.jpg`, `row2-02.jpg` | 16:9 landscape, ≥1200×675 | About Us row 2 (2 wider images): tool tray, salon floor |

**Optional — 6 files (each has a working built-in fallback, so nothing blocks on them)**

| # | Path | Ratio / min size | What it shows | Fallback if not supplied |
|---|---|---|---|---|
| 26 | `public/demo/brand/logo.png` | square, transparent PNG or SVG, ≥512 | "Loom & Blade" logo mark for the home top bar | CSS monogram tile ("L&B") + text wordmark |
| 27–30 | `public/demo/reviews/avatar-01.jpg` … `04.jpg` | 1:1, ≥200×200 | Reviewer avatars on Anna's review cards | Initials circle in `--lb-tint` |
| 31 | `public/demo/reviews/google-review.png` | 16:10, ≥800×500 | Real Google-review screenshot | Neutral in-house "G" badge card (see Risk R3 — do not ship Google's actual trademark asset without the client's own screenshot) |

Also still needed from the client (text, not images): real reviews for Anna's strip, the Help Center email + NIP (`Demo.md` §4 shows them as `[placeholder]`), and confirmation on the language question (Assumption A6).

---

## Implementation Steps

Six phases. **Exactly one phase per coder run, followed by a reviewer run, before the next phase starts.** Every phase ends with `npm run lint` and `npm run build` clean. No browser automation is available in this environment (see `handoff/session_2026-08-11.md`) — visual confirmation is the user's `npm run dev` check; the coder verifies by construction, the reviewer by reading.

---

### Phase 1 — Widget foundation + Home page

Files created: `components/demo/DemoApp.tsx|.module.css`, `demoState.ts`, `demoContext.ts`, `useDemoScale.ts`, `demoStore.ts`, `DemoTopBar.tsx|.module.css`, `DemoFooter.tsx|.module.css`, `DemoImage.tsx|.module.css`, `Marquee.tsx|.module.css`, `pages/HomePage.tsx|.module.css`, `pages/MasterPage.tsx|.module.css` (stub), `data/masters.ts`, `data/images.ts`.
Files modified: `components/sections/Hero.tsx` (two lines only).

- [x] **1.1 Token layer + shell.** `DemoApp.tsx` is `"use client"`. Structure: `.root` (tokens, `data-theme`) → `.viewport` (absolute inset 0, overflow hidden, flex-centered, `background: var(--lb-bg)`) → `.canvas` (1280×800, `transform: scale()`, `overflow: hidden`, `opacity` gated on ready). Implement both palettes exactly as `Demo.md` §6 plus the derived tokens from A2. Add the scoped `:focus-visible` override.
- [x] **1.2 Scale hook.** `useDemoScale.ts` per A1. Returns `{ ref, scale }`. `setState` only inside the ResizeObserver callback.
- [x] **1.3 State machine.** `demoState.ts` (types + `initialState` + pure `reducer` covering `hydrate`/`navigate`/`back`/`toggleTheme`/`setLocale`; the booking actions can be added in Phase 2/3 or stubbed now — prefer defining the full action union now and implementing booking cases in later phases). `demoContext.ts` exports `DemoContext` and `useDemo()` which throws outside the provider.
- [x] **1.4 Store.** `demoStore.ts`: `readStore()` (defensive parse + shape check + version check + fresh-store fallback with a new random `seed`), `writeStore(store)` (try/catch). Wire the mount-read effect and the persist-on-change effect in `DemoApp`, per A4 and the lint workaround.
- [x] **1.5 Top bar.** `DemoTopBar.tsx`: props for which elements to show (`showBrand`, `showAccount`, `showBack`). Contains: brand logo+wordmark (home only), "About Us" tab (underlined/active when `view.name === "about"`), `EN ⌄` dropdown (a real `<button>` + popover list, keyboard-closable via Escape and outside-click; see Assumption A6), round account icon (decorative, `aria-hidden` or `aria-label` + no-op), theme toggle (barber-pole icon drawn as inline SVG — three diagonal stripes in a rounded rect; `aria-pressed`, `aria-label="Switch theme"`). Back chevron on the left when `showBack`.
- [x] **1.6 Footer.** `DemoFooter.tsx`: renders the exact row from `Demo.md` §4. **In this phase the three names are inert `<span>`s** styled identically to how they will look as links — this reserves the vertical space so no later phase reflows the pages. Phase 4 converts them to buttons.
- [x] **1.7 `DemoImage` + placeholder + manifest.** Per A5. Create `data/images.ts` with every slot from the checklist above, all `src: null`. Create `public/demo/.gitkeep` (or the empty group folders) so the destination is obvious to the client.
- [x] **1.8 `Marquee`.** Per A7, generic over children.
- [x] **1.9 Home page.** `pages/HomePage.tsx`: heading "Choose your specialist", subtitle "Book a visit with your chosen specialist", two square master cards (photo slot + name + role overlaid at the bottom, whole card is a `<button>` dispatching `navigate → master`), then the home marquee (8 slots, 3:4 cards). Master names/roles come from `data/masters.ts`.
- [x] **1.10 Master page stub.** Minimal: top bar with back chevron, circular master photo, "Book a visit" heading, footer. Nothing else. This exists purely so the navigation machine and back-chevron are reviewable this phase; Phase 2 fills it in.
- [x] **1.11 Mount it.** `Hero.tsx`: `<WindowChrome chip="demo.ordiset.com"><DemoApp /></WindowChrome>`. Nothing else in `Hero.tsx` changes. `WindowChrome.tsx`/`.module.css` are **not** modified.

**Acceptance checks**
- [x] `npm run lint` and `npm run build` clean; no new dependency in `package.json`.
- [x] `rg 'var\(--(?!lb-)' components/demo` returns nothing (no outer-token leakage).
- [x] `app/globals.css`, `WindowChrome.*`, `StackSection.*`, `Nav.*`, `sections.module.css`, `Placeholder.*` are untouched (`git diff --name-only` shows only `Hero.tsx` + new `components/demo/**` + `public/demo/**`).
- [x] Toggling the theme changes only colors inside the window; the landing page around it is visually unchanged. (verified by construction: tokens declared only on `.root` under `DemoApp.module.css`, `data-theme` toggled locally, no globals touched — not visually tested in a browser, no browser automation available in this environment)
- [x] Reload keeps the chosen theme; the calendar seed exists in `localStorage` under `ordiset-demo-v1` after first load. (verified by construction: `demoStore.ts` read/write + `DemoApp.tsx` mount/persist effects — not visually tested in a browser)
- [x] Home → master card → back chevron → Home works. (verified by construction: `navigate`/`back` reducer cases + `HomePage`/`MasterPage` wiring — not visually tested in a browser)
- [x] Nothing renders before hydration that reads `Date`/`localStorage`; no hydration warning in the dev console. (verified via grep: `Date`/`Math.random`/`localStorage` only appear in `demoStore.ts`, called from inside effects, never during render)
- [x] Every image slot shows a labeled placeholder with its slot id. (verified by construction: `DemoImage` renders the placeholder branch whenever `slot.src` is `null`, and every entry in `data/images.ts` has `src: null`)

---

### Phase 2 — Master booking page (layout, calendar, service dropdown)

Files: `pages/MasterPage.tsx|.module.css` (built out), `booking/Calendar.tsx|.module.css`, `booking/ServiceSelect.tsx|.module.css`, `lib/calendar.ts`, `data/masters.ts` (services/bios/achievements added), `data/reviews.ts`, `Marquee` reused.

- [x] **2.1 `lib/calendar.ts`** exactly per the rule section above (PRNG, `isDayOpen`, `monthGrid`, `timeSlots`, local-date ISO helper). Pure module, no React, no `localStorage`.
- [x] **2.2 Page layout** in the ~1280×800 budget: top bar (56) → header row: back chevron + circular master photo + "Book a visit" (≈70) → main row: **left** calendar panel, **right** column with the three stacked boxes (≈360) → bio + "Achievements & Certifications" list (≈120) → marquee (≈110) → footer (≈44), gaps ≈20. Keep the vertical order from `Demo.md` §2. If it overruns 800, tighten spacing/font sizes — do **not** add scrolling.
- [x] **2.3 Calendar.** Prev/next arrows, `Month YYYY` caption, `Mo Tu We Th Fr Sa Su` header, 6×7 grid. States: closed (muted, `disabled`), past (muted, `disabled`), open (interactive), **today (visible ring — required by spec)**, selected (filled with `--lb-primary`). Real `<button>`s with `aria-label` = full date and `aria-pressed` for selection. Displayed month is local `useState`, prev disabled on the current month, forward capped at +12.
- [x] **2.4 `ServiceSelect`.** Collapsed pill/row showing "Select a service" or the chosen one; expands into a scrollable list (`max-height` + `overflow-y: auto` — this is inside a popover the user opened deliberately, so it is exempt from the no-scroll rule). Each row: name, duration, then original price with `text-decoration: line-through` in `--lb-muted` next to the discounted price in `--lb-text`/`--lb-primary`. Data verbatim from `Demo.md` §2 tables including the intentional per-master price difference for "Premium Haircut & Style Consultation". Closes on select / Escape / outside click.
- [x] **2.5 Manage booking box.** Orange pill button "Click to manage your booking" — decorative; clicking reveals a small inline note under it (see Assumption A8) rather than doing nothing.
- [x] **2.6 Promo box.** Two lines, exact copy from `Demo.md` §2 including the 🏷️ emoji.
- [x] **2.7 Bio + achievements** from `data/masters.ts` (write believable copy per master; achievements use the trophy/building/scissors emoji bullets).
- [x] **2.8 Per-master marquee.** Marek → 8 photo slots (`MAREK_MARQUEE`). Anna → mixed review strip built from `data/reviews.ts`: ≥3 plain review cards (name, star rating, short quote), ≥1 Google-styled card ("Verified Purchase", stars, quote), ≥1 map/location card using `REVIEW_MAP`. Cards must be visibly different *types*, not one repeated card.
- [x] **2.9 Selection state.** `selectService` / `selectDate` reducer cases implemented; selecting highlights but does not yet produce time slots or a confirmation (Phase 3).

**Acceptance checks**
- [x] Lint + build clean; no outer-token leakage; no new deps.
- [x] Whole page fits 1280×800 with no scrollbar on the canvas (verified by summing the fixed-px CSS budget: topbar 56 + content 700 (padding 20 + gaps 24 + header 48 + mainRow 326 + bioRow 108 + marqueeRow 160 = 686, 14px slack) + footer 44 = 800; canvas keeps `overflow: hidden` as a structural backstop — not eyeballed in a browser, no browser automation available in this environment).
- [x] Today's cell is visually distinct (inset ring via `.today` in `Calendar.module.css`); past days and closed days are `disabled` real buttons (not clickable) — verified by construction/code reading.
- [x] Navigating 12 months forward never produces an empty/all-closed month, and Sundays are always closed, Saturdays mostly closed, 2–3 weekdays per month closed — verified by reading `isDayOpen`/`closedWeekdaysForMonth` logic (not executed in a live browser in this environment).
- [x] Marek and Anna show different closed days (masterSalt mixed into every hash) and the correct, different service lists/prices (`data/masters.ts`, transcribed verbatim from `Demo.md` §2, including the differing "Premium Haircut & Style Consultation" price: 162 zł for Marek vs 144 zł for Anna).
- [x] Reloading the page produces the identical calendar (seed persistence works) — verified by construction: `seed` comes from `state.store.seed`, persisted via the Phase 1 store effect; `lib/calendar.ts` never calls `Math.random`.
- [x] `lib/calendar.ts` contains no hardcoded date literals (verified via grep — only `new Date()` calls and numeric constants for hours/steps/grid size).

---

### Phase 3 — Booking flow + confirmation + persistence

Files: `booking/TimeSlots.tsx|.module.css`, `booking/Confirmation.tsx|.module.css`, `pages/MasterPage.tsx` (wiring), `demoState.ts` (booking actions), `DemoApp.tsx` (persist path).

- [ ] **3.1 Time slots.** After a date is picked, the slot list appears (in the right column, below/replacing the Service box area, or under the calendar — coder picks whichever keeps the 800px budget; describe the choice in the phase notes). Slots come from `timeSlots(...)` using the selected service's duration; taken slots are visibly disabled. If a service isn't chosen yet, prompt for it first.
- [ ] **3.2 Confirm.** A primary "Confirm booking" button, enabled only when service + date + time are all set. Dispatches `confirmBooking`, which appends a `BookedSlot` to `store.bookings` (cap 20) and sets `confirmation`.
- [ ] **3.3 Confirmation screen.** Overlay inside the canvas (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`): checkmark, summary of master / service / date / time, and a "Done" action. Escape and the close button both dispatch `closeConfirmation`, returning to the master page with `draft` cleared. Focus moves to the dialog on open and back to the Confirm button on close (no full focus-trap library — a `useEffect` focusing the dialog heading is enough).
- [ ] **3.4 Persistence.** The confirmed slot is written through the Phase 1 persist effect and afterwards renders as taken for that visitor, across reloads.
- [ ] **3.5 Edge states.** Changing the service after picking a time re-validates the slot (clear `time` if it no longer fits). A day with zero available slots shows a short "No times left on this day" message instead of an empty box.
- [ ] **3.6 No captcha anywhere** (spec §3).

**Acceptance checks**
- [ ] Lint + build clean; no network requests originate from the widget (grep: no `fetch`, no `axios`, no `next/server` imports under `components/demo/**`).
- [ ] Full click-through works: Home → master → service → date → time → confirm → confirmation → done.
- [ ] After a reload, the booked slot still shows as taken; a different browser profile (fresh `localStorage`) shows it free.
- [ ] Confirm is impossible with an incomplete selection.
- [ ] The overlay never escapes the canvas bounds and never affects landing-page scroll.

---

### Phase 4 — Footer links + Privacy / Terms / Help Center

Files: `DemoFooter.tsx` (spans → buttons), `pages/LegalPage.tsx|.module.css`, `pages/HelpPage.tsx|.module.css`, `booking/HelpForm.tsx|.module.css`, `data/copy.ts`.

- [ ] **4.1 Footer links** become buttons dispatching `navigate` to `privacy` / `terms` / `help`. Row copy stays exactly as §4.
- [ ] **4.2 `LegalPage`** renders Privacy and Terms from `data/copy.ts` (same layout, different content): heading, intro line, one bulleted section ("Information We Collect" / "Booking Rules"), then the shared legal-entity block. The block's "Strona wsparcia: Centrum pomocy" is a link that navigates to the Help Center. Email/NIP stay as visible `[placeholder]` markers until the client supplies them. The body text region is the one place allowed `overflow-y: auto`.
- [ ] **4.3 `HelpPage`**: heading + "We're here to help" subtitle; two columns. Left = contact form; right = "Contact Information" card (address + "Response Time: Usually within 72 hours on business days") and "Quick Actions" card (three decorative GDPR rows).
- [ ] **4.4 `HelpForm`**: Full name, E-mail, Subject (`<select>`, first option "Select a topic"), Message (`<textarea>`), "Send message". Follow the `ContactForm.tsx` validation pattern (`validate()`, `touched`, `aria-invalid`, `aria-describedby`, `noValidate`, focus first invalid field), a fake ~600 ms pending state, then an inline success state. **No captcha. No network call.**
- [ ] **4.5 Top bar on these pages** keeps the language dropdown and theme toggle working (explicitly called out in §4), plus a back chevron (Assumption A7).

**Acceptance checks**
- [ ] Lint + build clean.
- [ ] All three pages reachable from the footer on **every** page (home, master, about, and from each other), and the back chevron always returns somewhere sensible — no dead ends.
- [ ] Theme toggle and `EN ⌄` work on all three pages.
- [ ] Form validation works, success state appears, nothing is sent.
- [ ] Legal pages fit the canvas or scroll only within their body region.

---

### Phase 5 — About Us page

Files: `pages/AboutPage.tsx|.module.css`, `data/copy.ts` (about paragraph), `data/images.ts` (already contains the 6 slots).

- [ ] **5.1** "About Us" tab in the top bar becomes underlined/active and navigates to the About view.
- [ ] **5.2** Page: short paragraph about the space, then the gallery — row 1 of 4 (4:3), row 2 of 2 (16:9) — via `DemoImage` slots. Footer included.
- [ ] **5.3** Fits the 1280×800 budget in both themes.

**Acceptance checks**
- [ ] Lint + build clean; tab active state correct on About and cleared elsewhere; all 6 slots labeled and in the documented order.

---

### Phase 6 — Polish, accessibility, QA sweep

- [ ] **6.1** `prefers-reduced-motion`: marquees static, no transitions on view change.
- [ ] **6.2** Keyboard pass: every interactive element is a real `button`/`a`/form control, reachable by Tab, with a visible demo-accent focus ring; Escape closes the service dropdown, language menu and confirmation.
- [ ] **6.3** Contrast pass on both themes, especially `--lb-on-primary` and muted text on tinted backgrounds.
- [ ] **6.4** Audit: `data/images.ts` slot ids match the real folder paths one-for-one; no orphan slots; no unused exports.
- [ ] **6.5** Re-run the leakage grep, the no-network grep and the untouched-files check; confirm `package.json` is unchanged since the start.
- [ ] **6.6** Optional (only if time permits and it does not risk the budget): 120 ms cross-fade between views.

---

## Acceptance Criteria (whole feature)

- [ ] `npm run lint` and `npm run build` pass at the end of every phase.
- [ ] Zero new dependencies; `package.json` byte-identical to its pre-feature state.
- [ ] Zero network calls, zero backend, zero captcha anywhere in the widget.
- [ ] The widget's palette is entirely self-scoped: no `--lb-*` token is defined outside `components/demo/**`, and no outer token is read inside it. The landing page renders identically to before with the widget removed.
- [ ] Every page in `Demo.md` §§1–5 exists, is reachable, and is reachable *back out of*.
- [ ] The complete booking click-through works and persists per visitor via `ordiset-demo-v1`.
- [ ] No hardcoded calendar dates; the availability rule holds for any month/year.
- [ ] Every image is a manifest-driven slot rendering a labeled placeholder until a real file lands; swapping one in touches exactly one line.
- [ ] Follows project conventions: CSS Modules per component, no Tailwind, no comments, TypeScript throughout, no file over 500 lines.

---

## Assumptions

These are the calls being made without explicit client confirmation. **The plan proceeds with each stated choice** — the orchestrator should confirm A1/A2/A6 with the client early, since they are the ones that would cause rework.

- **A1 — Fixed 1280×800 canvas, scaled down (readability tradeoff).** On desktop the demo renders at ~0.8× (14 px design text ≈ 11 px actual — fine). On a phone the widget is ~330 px wide → ~0.26× → text is decorative, not readable. Proceeding: the widget is a *look-and-feel* demo on a marketing page, and every alternative that keeps mobile text readable requires deleting content. If the client wants mobile readability, the follow-up is a tap-to-expand fullscreen mode — out of scope for this pass.
- **A2 — The demo's dark palette is nearly identical to the landing page's current palette.** `Demo.md` §6 calls the salon colors "intentionally different from Ordiset's own gold-on-charcoal identity", but a previous session changed the landing accent from gold `#e0c188` to terracotta `#d0764d` — which *is* the salon's dark primary, and the landing's `--bg`/`--surface`/`--text` match the salon's dark tokens too. Proceeding with the palette exactly as specified in §6. Flagging so the client can decide whether the landing should move back toward gold to restore the intended contrast.
- **A3 — Default theme is light.** Not specified. Light makes the widget read as a distinct embedded product surface against the dark landing and makes the toggle obviously do something. Persisted per visitor after first toggle.
- **A4 — localStorage seeding is kept (calendar does not reshuffle on reload).** `Demo.md` §0 explicitly invites this to be flagged. Proceeding with persistence as written. Note that the "same rule already used for the admin color-customization widget" **does not exist yet** — nothing in the repo touches `localStorage` — so this plan defines the pattern (`ordiset-<widget>-v<n>`, one versioned JSON record, defensive read, mount-time hydration) for that widget to follow later.
- **A5 — Theme choice persists too**, in the same record. Not specified; it would be odd for the calendar to persist and the theme not to.
- **A6 — The `EN ⌄` dropdown does not translate anything in this pass.** `Demo.md` §4 says language switching "must work" on legal pages, but no translated strings are supplied anywhere in the spec (though the legal-entity block is in Polish, suggesting EN/PL is the real pair). Proceeding with: a fully working, keyboard-accessible dropdown listing EN (and PL, greyed "coming soon") whose label updates; all content stays English; all copy is centralized in `data/copy.ts` so adding a locale later is a contained change. **No i18n framework is being introduced.** This is the #1 item to confirm with the client — if they want real PL translations, they must supply the strings.
- **A7 — Legal/Help pages get a back chevron.** The spec defines no return path from them, and the home-only logo means a visitor could otherwise be stranded. Same chevron component as the master page, driven by the `history` stack.
- **A8 — "Manage booking" and the GDPR "Quick Actions" are decorative** (spec says so), but a button that does literally nothing reads as broken. Each reveals a one-line inline note ("Available in the live product") on click. If the client prefers truly inert elements, this is a two-line revert.
- **A9 — The confirmation screen is an overlay** over the master page; "Done" closes it and returns to that page (with the slot now shown as taken), rather than returning to Home. This best demonstrates the persistence behaviour.
- **A10 — The master's square home photo is reused as the circular avatar** on the booking page (CSS `border-radius: 50%` + `object-fit: cover`), so only 2 portrait files are needed, not 4.
- **A11 — Bios, achievements, Anna's review cards and the About paragraph are invented placeholder copy** written by the coder (the spec supplies none and §7 says real content comes later). They live in `data/*.ts` so they are trivial to replace.
- **A12 — Prices render as literal strings** ("170 zł" / "153 zł") straight from the spec tables — no currency formatting, no locale number formatting, no discount math.
- **A13 — The Google-review card uses a neutral in-house badge**, not Google's trademarked logo asset, unless the client supplies their own real Google-review screenshot (optional slot 31).

---

## Constraints & Risks

**Must not be touched** (any change here fails review):
- `app/globals.css` — the widget defines zero global tokens and must not read the outer ones.
- `components/WindowChrome.tsx` / `.module.css` — the demo mounts inside `.body` as an absolutely-positioned child; no chrome changes are needed.
- `components/StackSection.tsx` / `.module.css`, `components/Nav.tsx` / `.module.css`, `components/sections/sections.module.css`, `components/Placeholder.tsx` — the sticky-stack scroll mechanic and nav indicator were expensive to get right (see `handoff/session_2026-08-11.md` and the eight `nav-widget-fixes` rounds); nothing in this feature requires touching them.
- `components/ContactForm.tsx` — pattern reference only, not a shared component.
- `components/sections/Hero.tsx` — modified **once**, in Phase 1, by exactly two lines (children + `chip`).
- `package.json` — no new dependencies.

**Risks**
- **R1 — Wheel/scroll trapping.** A scrollable region inside a full-viewport sticky hero would hijack the landing page's scroll and make the site feel broken. Mitigated structurally: the canvas is `overflow: hidden` and every page must fit 1280×800. The only allowed exceptions are the service dropdown's list and the Privacy/Terms body — both entered by deliberate click. **The reviewer must check for stray `overflow: auto/scroll` in every phase.**
- **R2 — Vertical budget on the master page.** It is the densest page (top bar + header + calendar + 3 boxes + bio + achievements + marquee + footer). The Phase 2 budget above sums to ≈780/800 px. If it overruns, tighten spacing/type — do not add scrolling and do not reorder the sections away from the spec's layout.
- **R3 — Trademark asset.** Do not commit Google's logo file; see A13.
- **R4 — Hydration mismatches.** `Date`, `Math.random` and `localStorage` are all client-only. They are confined to `demoStore.ts` (mount effect) and the date-dependent components, all gated behind `store !== null`. A mismatch here surfaces as a console error on the live landing page — the reviewer should specifically check that no `new Date()` / `Math.random()` runs during render or inside the reducer.
- **R5 — Client-JS weight in the hero.** The whole demo ships as a client chunk in the most performance-sensitive section. Keep it dependency-free (no framer-motion in the demo tree), keep placeholders as CSS not images, and avoid inline base64. If the `next build` client bundle for the hero grows uncomfortably, the follow-up option is `next/dynamic` with an intersection-observer mount — deliberately not done in this pass to keep it simple.
- **R6 — No visual verification available in this environment** (browser automation is disallowed per the session notes). Each phase's acceptance checks are written to be verifiable by reading code and running lint/build; the user should eyeball `npm run dev` after each phase, and especially after Phase 2 (canvas budget) and Phase 1 (theme scoping).
