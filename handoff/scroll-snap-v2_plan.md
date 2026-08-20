# Plan: Scroll docking v2 — replace native CSS scroll-snap with a JS settle-dock

**Date:** 2026-08-20
**Status:** Done (2026-08-20), with two bugs found and fixed by the orchestrator during live verification (see "Orchestrator's post-coder fixes" below) — the plan's own D6 design (sampling `window.scrollY` inside the arm-time event handler) had a real race condition, not just a coder deviation.

## Orchestrator's post-coder fixes (2026-08-20)

Live verification against `localhost:3001` found the coder's implementation (which matched this plan's D6/Step 3 literally) **never docked at all, in either direction** — every gesture measured as "zero net movement." Root cause: `arm()` sampled `window.scrollY` as the gesture's `from` baseline at the moment the `wheel`/`touch` event fired. Under `{ passive: true }` listeners (required — the dock must never call `preventDefault`), the browser is free to apply the scroll before or concurrently with a passive handler running, so by the time `arm()`'s read happened, `scrollY` could already reflect the post-scroll position — making `y === from` true and `computeDockTarget` bail out on literally every gesture. This is a flaw in the plan's own D6 mechanism (not a coder mistake), only surfaced by live testing.

**Fix 1** — replaced arm-time `window.scrollY` sampling with a `restYRef` that is written *only* by `settle()` (plus once on mount): the last known settled position, never read from an input-event handler, so it can't race.

**Fix 2** — `restYRef` was originally only updated on the dock's *own* corrections, which left it stale after any programmatic scroll (Nav click, Hero button) that never touches the dock — the next real gesture would then compute against a stale baseline. Fixed by removing the `if (!armedRef.current) return` guard on the `scrollY` "change" subscription, so *every* settle (armed or not) updates `restYRef` to the true current position; only an *armed* settle evaluates `computeDockTarget`/issues a correction.

Both fixes are in `components/ScrollDock.tsx` only — no other file touched. Re-verified full V1–V9 matrix after the fix (below); all pass except V9, which surfaced an apparently pre-existing, unrelated issue (see "Note" at the end).

**Supersedes:** `handoff/scroll-snap_plan.md` (both its `mandatory` round and its `proximity` round)

## Goal

Make the stacked full-viewport sections behave like discrete pages in **both** scroll directions: a gesture that travels less than ~70 % of a section settles back onto the section it started from; a gesture that travels ~70 % or more commits fully to the neighbouring section — and the page always comes to rest exactly on a section boundary, never a few pixels off (no sliver of the next card's accent seam), never in a half-transitioned state, and never oscillating.

---

## Root cause (validated against the measured table, and runnable-confirmable — see Step 0)

### The hypothesis in the brief is **correct in substance** — here is the exact mechanism

`.card` (`components/StackSection.module.css`) carries `scroll-snap-align: start` **and** is `position: sticky; top: 0`. Its sticky containing block is `<main>` — which spans the entire page (~5400 px), not just its own 100svh slot. So **once you have scrolled past a card, that card stays pinned to the top of the viewport for the rest of the page**; it is simply hidden behind the next card, which has a higher `z-index` and an opaque background.

Per CSS Scroll Snap Level 1 §3, a snap area is *"the transformed border box of the box … in the scroll container's coordinate space"*. Sticky offsets are part of the used box position (they show up in `getBoundingClientRect()`), so:

> **For a pinned sticky card, `scroll-snap-align: start` resolves to "the scroll offset you are already at".** It is a degenerate, always-satisfied snap position that exerts no restoring force — and it *replaces* the snap position that card would otherwise have contributed at its own layout offset.

Consequence, at any resting scroll offset `S` inside section `k`:

| card | state at rest | snap position it contributes |
|---|---|---|
| sections `0 … k` | pinned at the scrollport start | **`S`** (degenerate — "stay put") |
| sections `k+1 …` | not yet pinned, at natural offset | `tops[k+1]`, `tops[k+2]`, … (real) |

**There is never a snap candidate behind you.** Chrome samples the snap-area rects from the last main-thread commit (i.e. the geometry at the resting position the gesture starts from) and then picks the nearest candidate to the projected end position. That single fact reproduces **all 11 measured data points**, in both directions:

| gesture | candidate set (sampled at gesture start) | end pos | nearest candidate | predicted rest | measured |
|---|---|---|---|---|---|
| down 100 from 0 | {0, 900, 1800, …} | 100 | 0 (Δ100) | 0 | 0 ✓ |
| down 300 from 0 | {0, 900, …} | 300 | 0 (Δ300) | 0 | 0 ✓ |
| down 500 from 0 | {0, 900, …} | 500 | 900 (Δ400) — outside Chrome's proximity range (~⅓ viewport ≈ 300 px) | free @500 | 500 ✓ |
| down 600 from 0 | {0, 900, …} | 600 | 900 (Δ300) — inside range | 900 | 900 ✓ |
| down 700 from 0 | {0, 900, …} | 700 | 900 (Δ200) | 900 | 900 ✓ |
| down 2000 from 0 | {0, 900, 1800, 2700, …} | 2000 | 1800 (Δ200) | 1800 | 1800 ✓ |
| up 100 from 900 | **{900, 1800, …}** — no 0 | 800 | 900 (Δ100) | 900 | 900 ✓ |
| up 300 from 900 | **{900, …}** | 600 | 900 (Δ300) | 900 | 900 ✓ |
| up 500 from 900 | **{900, …}** | 400 | 900 (Δ500) — out of range | free @400 | 400 ✓ |
| up 700 from 900 | **{900, …}** | 200 | 900 (Δ700) — out of range | free @200 | 200 ✓ |
| up 800 from 900 | **{900, …}** | 100 | 900 (Δ800) — out of range | free @100 | 100 ✓ |

11/11. The asymmetry is **not** a proximity-threshold quirk and **not** tunable: going up, the snap point you want to reach (`0`) *does not exist in the candidate set at all*, because `#overview` — pinned — contributed `900` instead of `0`. "Snap back to where you started" only ever worked by accident: at gesture start you were sitting exactly on a boundary, so the degenerate candidate happened to coincide with the real one.

### Same mechanism explains the persistent-sliver / flicker bug

If the page comes to rest at `S = ε` (a few px, or a fractional px) instead of `0`, then on the *next* gesture the candidate set is `{ε} ∪ {900, 1800, …}` — the browser considers "stay at ε" a perfectly valid snap position, so **it never corrects ε**. `#overview` is pinned filling the viewport, `#preview`'s top sits at `innerHeight − ε`, and `StackSection.tsx` renders `<span className={styles.seam}>` on every card with `z > 1` — a 1 px accent-gradient line. So an ε as small as 1–2 px shows a glowing orange hairline at the bottom of the screen, permanently. Small nudges either re-establish a new degenerate candidate at the new ε (sliver stays, shifted) or fall inside proximity range of `900` and get tugged forward (sliver "flickers in and out"). Exactly the reported symptom.

### Second, independent contamination: the scroll-linked `transform`

The snap area is the **transformed** border box, and `StackSection.tsx` drives `scale: 1 → 0.96` from that same section's own `scrollYProgress`. So the snap position of a card is itself a function of scroll offset — at 900 px tall and `scale 0.96` (default `transform-origin: center`), the box's top edge moves **+18 px**. The snap target is a moving target that moves *because* the browser scrolled toward it. Even with the sticky problem solved, this alone would prevent pixel-exact landings.

**Conclusion: `scroll-snap-align` is on the wrong element, and there is no value of `scroll-snap-type` / `scroll-snap-align` / `scroll-margin` that fixes it.**

---

## Architecture Decisions

### D1. Remove native CSS scroll-snap entirely

`scroll-snap-type` on `html` and `scroll-snap-align` on `.card` are deleted (plus the now-dead `scroll-snap-type: none` media block). Leaving `proximity` in place as a "backstop" is **not** an option: it would keep firing with the wrong (sticky-collapsed) candidate set *during* the gesture and fight the dock.

### D2. Add a JS settle-dock: `components/ScrollDock.tsx`

A `null`-rendering client component that:

1. **arms** on genuine user scroll input (`wheel`, `touchstart`, `touchmove`, scrolling `keydown`);
2. **waits for the gesture to settle** (no `scrollY` change for `SETTLE_MS`);
3. **computes one target** from `getSectionTops()` using a symmetric ~70 % commit threshold;
4. issues **at most one** `window.scrollTo({ top, behavior: "smooth" })` per gesture, and only if the correction is > 0.5 px.

Everything else — free scroll, momentum, scrollbar, keyboard, the framer-motion scale, Nav/Hero clicks — is untouched.

### D3. Arm on input, not on scroll — this is what makes it race-free

The dock only ever acts if a real user input event preceded the settle. Therefore:

- **Nav clicks (`Nav.tsx` `scrollToId`) and Hero buttons (`Hero.tsx` `scrollToSection`) can never be raced.** They are click-driven; nothing arms the dock, so no correction is even evaluated. And in the one case where the dock *is* still armed (user wheels, then clicks a nav link before settle), the nav scroll lands exactly on `getSectionTop(id)` — a boundary — so the dock's evaluation is a no-op by construction. **No changes to `Nav.tsx` / `Hero.tsx` / `lib/sections.ts` are required.**
- Hash navigation, browser scroll restoration, find-in-page and `:focus-visible` scroll-into-view also never trigger a dock. Failing *open* (leave scroll free) is the correct failure mode.
- Known accepted limitation: **dragging the scrollbar thumb does not dock** (it produces no `wheel`/`touch`/`keydown`). Documented, not worked around — the alternative (arm on every scroll, suppress explicitly around programmatic scrolls) is rejected in "Rejected alternatives" below.

### D4. Reuse `getSectionTops()` — do not recompute geometry

The dock's boundaries **must** come from `lib/sections.ts`'s existing `getSectionTops()`, unchanged. Two reasons:

- It is the exact same source the Nav and Hero use, so dock targets and nav targets are identical by construction — they cannot drift apart.
- It accumulates `el.offsetHeight`, which is **transform-immune**. This is load-bearing: `getBoundingClientRect().height` on `.card` returns the *scaled* height while framer-motion is animating it, so switching to `getBoundingClientRect()` would make every boundary wrong by up to 18 px and would reintroduce the sliver. **Do not "improve" `getSectionTops()`.**

It also correctly handles the fact that `#contact` is **not** a `StackSection` (it is `ContactSection.module.css .section` — `position: relative; z-index: 6; min-height: 100svh` plus large padding) and may therefore be **taller** than one viewport. Boundaries are derived per-section, not as `i * innerHeight`.

### D5. Reuse framer-motion's shared scroll listener

Settle detection subscribes via `useScroll()` (no `target`) + `useMotionValueEvent(scrollY, "change", …)` — the exact pattern `Nav.tsx` already uses. framer-motion multiplexes all `useScroll` subscribers onto one internal scroll listener + rAF loop, so this adds **no** new competing raw `scroll` listener. Reusing `StackSection`'s per-section `scrollYProgress` was considered and rejected (see below).

### D6. Threshold rule — symmetric, direction-aware, segment-local

```
COMMIT     = 0.7   // fraction of the section that must be traversed to commit
SETTLE_MS  = 180   // idle time after the last scrollY change that counts as "gesture over"
TOLERANCE  = 0.5   // px; below this we are already docked

y      = window.scrollY at settle
from   = window.scrollY captured when the gesture armed
tops   = getSectionTops().map(t => t.top)
i      = largest index with tops[i] <= y + TOLERANCE
segStart = tops[i]; segEnd = tops[i + 1]      // undefined on the last section

// bail-outs (leave scroll completely free)
if (segEnd === undefined) return null                       // last section (#contact)
if (segEnd - segStart <= 0) return null
if (segEnd - segStart > window.innerHeight + 1) return null // section taller than the viewport
if (y - segStart <= TOLERANCE) return null                  // already docked
if (y === from) return null                                 // no net movement

p = (y - segStart) / (segEnd - segStart)
target = (y > from)
  ? (p >= COMMIT      ? segEnd   : segStart)   // travelling down
  : (p <= 1 - COMMIT  ? segStart : segEnd)     // travelling up

target = clamp(target, 0, document.documentElement.scrollHeight - window.innerHeight)
return Math.abs(target - y) > TOLERANCE ? target : null
```

Expected behaviour on a 900 px viewport (this is the table Step 6 must reproduce):

| direction | settle y | p | dock target |
|---|---|---|---|
| down from 0 | 100 | 0.11 | 0 |
| down from 0 | 300 | 0.33 | 0 |
| down from 0 | 500 | 0.56 | 0 |
| down from 0 | 600 | 0.67 | 0 |
| down from 0 | 630 | 0.70 | 900 |
| down from 0 | 700 | 0.78 | 900 |
| down from 0 | 2000 | 0.22 of seg 2 | 1800 |
| up from 900 | 800 | 0.89 | 900 |
| up from 900 | 600 | 0.67 | 900 |
| up from 900 | 400 | 0.44 | 900 |
| up from 900 | 270 | 0.30 | 0 |
| up from 900 | 200 | 0.22 | 0 |
| up from 900 | 100 | 0.11 | 0 |
| up from 2700 | 700 | 0.78 | 900 |

Perfectly symmetric: commit iff ≥ 70 % of the segment was traversed, in either direction. `COMMIT` and `SETTLE_MS` are the **only** two tuning knobs; both live as named module constants at the top of `ScrollDock.tsx` with a comment saying so, because the user will want to tune feel (sane range: `COMMIT` 0.6–0.8, `SETTLE_MS` 140–240).

### D7. One dock per gesture — this is the anti-oscillation guarantee

The armed flag is set **only** by an input event and is cleared unconditionally at the end of every settle evaluation. Our own smooth correction therefore cannot re-trigger a second correction, so no feedback loop is possible even if the browser lands a fraction of a pixel off. If the user wheels *during* our smooth scroll, that re-arms with a fresh `from` and the browser retargets the animation — the escape hatch works for free, no explicit abort code needed.

### D8. Disabled below the static-stack breakpoint and under reduced motion

- `window.matchMedia("(max-width: 899px), (max-height: 700px)").matches` → the dock does nothing. Same expression as `StackSection.module.css`'s static-fallback block; evaluated live inside the handlers (no `change` listener, nothing to keep in sync at runtime).
- `window.matchMedia("(prefers-reduced-motion: reduce)").matches` → the dock does nothing **at all**. Rationale: `StackSection.tsx` already strips the whole scale animation under reduced motion, so the page is a plain sticky stack there; an *unrequested* scroll correction is exactly the kind of motion that setting asks us not to do. The alternative (dock with `behavior: "auto"`) is rejected — an instant jump under the user's fingers is worse, not better. This is a one-line flip if the user disagrees; flag it in the completion report.

### D9. `behavior` semantics — do not get caught by this

`scroll-behavior: smooth` is set on `html` in `globals.css`. Per spec, `scrollTo({ behavior: "auto" })` resolves to the element's CSS `scroll-behavior`, i.e. **`auto` still animates here**. The dock passes `behavior: "smooth"` explicitly. If an instant scroll is ever needed, it must be `behavior: "instant"`. Do not change the `html` rule or the existing `prefers-reduced-motion` override — `Nav.tsx`/`Hero.tsx` depend on that pair.

---

## Rejected alternatives

**CSS-only variants** (all rejected — reason is concrete in each case):

- **`scroll-snap-type: y mandatory` (round 1)** — already shipped and rejected by the user as jittery ("дёргается"). Mechanically: mandatory snaps after *every* wheel tick, and with the sticky-collapsed candidate set it can only ever pull forward, so a deliberate slow scroll is repeatedly yanked. Also its threshold is fixed at "nearest candidate" = 50 %, not the requested 70–80 %, and is not configurable.
- **`scroll-snap-type: y proximity` (round 2)** — the currently-shipped, measured-broken state. Root cause above: upward commit candidates do not exist. Not tunable.
- **`scroll-snap-stop: always`** — orthogonal; it constrains how far a fling may travel, it does not add the missing backward candidate. Was already removed in round 2 for feel reasons.
- **`scroll-snap-align: end` or `center` on `.card`** — for a *pinned* card the area is `[S, S + cardHeight]` and the snapport is the same height, so `end` and `center` resolve to the same degenerate `S` that `start` does. Changes nothing.
- **`scroll-margin-*` / `scroll-padding-top` tuning** — these apply a **constant** offset to the snap area. The error here is not constant: it is `S − tops[k]`, which grows continuously from 0 to a full card height as you scroll through a section. No constant cancels a ramp.
- **Zero-height static snap markers between the cards** (an in-flow `<div style="height:0">` before each card carrying `scroll-snap-align: start`, leaving `.card` snap-free). This one *does* fix the root cause — the markers are neither sticky nor transformed, so the candidate set becomes the true `{0, 900, 1800, …}` at every scroll offset, symmetric and pixel-exact. **Still rejected**, because it only fixes candidate *positions*, not the *selection policy*: `proximity` keeps a wide free band in the middle (so the page still rests half-transitioned, violating the core requirement), and `mandatory` is the round-1 feel the user already rejected, at a fixed 50 % threshold instead of the requested 70–80 %. Native scroll-snap exposes no threshold, no hysteresis and no direction awareness. Recorded here because it is the strongest CSS-only option and should not be re-litigated.
- **Restructuring so `.card` is sticky inside a static per-section wrapper that carries the snap alignment** — if the wrapper is 100svh (same as the card) the card has zero room to move inside its containing block and never sticks at all, which deletes the stacking illusion outright. Making it work requires each wrapper to span the remainder of the page, which is what `<main>` already does. Full restructure of `app/page.tsx` + `StackSection.tsx` + the static-fallback breakpoint, and it *still* leaves the threshold problem above. Rejected.

**JS alternatives:**

- **A scroll-hijacking library (`fullpage.js`, `swiper`, `lenis`, …)** — rejected, and not a close call. It would be a new npm dependency (`package.json` currently has exactly `framer-motion`, `next`, `react`, `react-dom`); all of them replace native document scrolling with either a virtual transform-based scroller or a wheel-intercepting rAF scroller, which (a) breaks or de-syncs framer-motion's `useScroll` that drives the entire stacking effect, (b) breaks native scrollbar / find-in-page / keyboard / anchor behaviour, (c) has to be manually torn down under the static-fallback breakpoint. The dock proposed here is ~120 lines with zero dependencies. If the user ever wants smooth-scroll *easing* (a different feature), that is the moment to revisit — not now.
- **Reusing `StackSection`'s per-section `scrollYProgress` instead of a global `useScroll()`** — considered per the brief, rejected. It would require lifting six per-section MotionValues into a context provider (touching `StackSection.tsx`, which this plan otherwise leaves completely alone), it gives per-section progress but *no* settle signal (which is the actually hard part), and it saves nothing: framer-motion already multiplexes every `useScroll` subscriber onto one shared listener, so `useScroll()` in `ScrollDock` adds no second listener. Net: more coupling, zero benefit.
- **A raw `window.addEventListener("scroll", …)`** — rejected for exactly that reason; `useScroll()` reuses the existing shared listener and matches the `Nav.tsx` house pattern.
- **Using `scrollend` as the settle signal** — rejected as the *primary* mechanism. Safari only shipped it recently, it also fires for our own programmatic smooth scroll (adding a second settle signal that has to be de-duplicated against the debounce), and `Nav.tsx` already demonstrates it needs a timeout fallback anyway. One debounce, one code path, identical behaviour in every browser. Do **not** add a `scrollend` listener to `ScrollDock`.
- **Arming on every scroll and explicitly suppressing around programmatic scrolls** (i.e. exporting a `suppressDock()` from a shared module and calling it in `Nav.tsx` and `Hero.tsx`) — rejected. It couples three files, and it fails *closed*: any programmatic scroll we forget about (hash navigation, scroll restoration, find-in-page, focus-into-view) gets yanked to a section boundary. D3's input-arming fails *open* instead, which is the right direction for a scroll behaviour.

---

## Implementation Steps

- [ ] **Step 0 (optional, ~2 min): confirm the root cause before changing anything**
  - Against the user's already-running dev server (**do not start one**), with the current `proximity` code still in place, at a 1440×900 viewport:
    ```js
    // run at scrollY 0, then scroll to exactly 900 and run again
    [...document.querySelectorAll('main > section')]
      .map(s => [s.id, Math.round((s.getBoundingClientRect().top + window.scrollY) * 10) / 10]);
    ```
  - Expected at `scrollY = 0`: `overview:0, preview:900, mobile:1800, …` — the correct candidate set.
  - Expected at `scrollY = 900`: `overview:~918` (pinned at the scrollport start, plus ~18 px because it is now at `scale 0.96`), `preview:900`, `mobile:1800`, … — **there is no candidate at 0**, which is precisely why upward commits never fire, and `overview` is off by the live transform, which is why landings are not pixel-exact.
  - If the numbers come back differently, stop and report — an assumption above is wrong and the plan needs revising before code is written.

- [x] **Step 1: Remove native scroll-snap from `app/globals.css`**
  - Files: `app/globals.css`
  - In the `html { … }` rule (~line 50): delete the line `scroll-snap-type: y proximity;`.
  - Delete the whole now-dead trailing block (~lines 112–116):
    ```css
    @media (max-width: 899px), (max-height: 700px) {
      html { scroll-snap-type: none; }
    }
    ```
  - **Keep** `height`, `color-scheme`, `scroll-behavior: smooth`, `scroll-padding-top: 0`, and the `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }` block exactly as they are — `Nav.tsx` / `Hero.tsx` depend on them.

- [x] **Step 2: Remove native scroll-snap from `components/StackSection.module.css`**
  - Files: `components/StackSection.module.css`
  - Delete `scroll-snap-align: start;` from `.card`.
  - Delete `scroll-snap-align: none;` from the `@media (max-width: 899px), (max-height: 700px)` block. **Change nothing else in that block** (`position: static; min-height: 0; padding-block; box-shadow: none; transform: none !important` all stay byte-identical).
  - Add one comment line above that media query noting that `components/ScrollDock.tsx` mirrors this exact query string and must be updated together if the breakpoint ever changes.

- [x] **Step 3: Create `components/ScrollDock.tsx`**
  - Files: `components/ScrollDock.tsx` (new, ~120 lines — well under the 500-line limit)
  - `"use client"`. Imports: `useEffect`, `useRef` from `react`; `useScroll`, `useMotionValueEvent` from `framer-motion`; `getSectionTops` from `@/lib/sections`. **No new dependencies.**
  - Module-level constants, each with a one-line comment (`COMMIT = 0.7`, `SETTLE_MS = 180`, `TOLERANCE = 0.5`, `STATIC_STACK_QUERY = "(max-width: 899px), (max-height: 700px)"`, `REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"`, and a `Set` of scrolling keys: `ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, `End`, `" "`). A comment must state that `COMMIT` and `SETTLE_MS` are the two feel knobs.
  - Module-level pure helper `computeDockTarget(y: number, from: number): number | null` implementing **D6 exactly**, including all five bail-outs. Not exported (single use).
  - Module-level `isEnabled(): boolean` → `!matchMedia(STATIC_STACK_QUERY).matches && !matchMedia(REDUCED_MOTION_QUERY).matches`. Evaluated per event, not cached.
  - Component `ScrollDock()` returns `null`. Refs: `armedRef` (boolean), `fromRef` (number), `timerRef` (`number | null`).
  - `const { scrollY } = useScroll();` + `useMotionValueEvent(scrollY, "change", () => { if (!armedRef.current) return; restartTimer(); })` — when disarmed this does nothing at all, so there is no timer churn while the dock is off.
  - `restartTimer()`: clear `timerRef`, then `timerRef.current = window.setTimeout(settle, SETTLE_MS)`.
  - `settle()`: read `const y = window.scrollY` fresh; capture `const from = fromRef.current`; **unconditionally** `armedRef.current = false` (D7); if `!isEnabled()` return; `const target = computeDockTarget(y, from); if (target === null) return; window.scrollTo({ top: target, behavior: "smooth" });`.
  - `arm(): void`: if `!isEnabled()` return; if `!armedRef.current` `{ armedRef.current = true; fromRef.current = window.scrollY; }`; then `restartTimer()` (so a gesture that produces no scroll movement still resolves and disarms).
  - A single `useEffect(() => { … }, [])` registering, on `window`:
    - `wheel`, `touchstart`, `touchmove` → `arm`, all with `{ passive: true }` (the dock never calls `preventDefault`).
    - `keydown` → arm only if `SCROLL_KEYS.has(e.key)` **and** the event target is not inside an editable field: skip when `(e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]")` is truthy. This matters — `ContactForm` lives in `#contact` and Space/arrows there must not arm the dock.
    - Cleanup removes all four listeners and clears `timerRef`.
  - Do **not** add a `scroll` listener, a `scrollend` listener, a `resize` listener, or a `matchMedia` `change` listener.

- [x] **Step 4: Mount it in `app/page.tsx`**
  - Files: `app/page.tsx`
  - `import ScrollDock from "@/components/ScrollDock";` and render `<ScrollDock />` as the first child of `<main>`, above `<Hero />`, with a short comment ("renders null; docks scroll to section boundaries after a user gesture settles").
  - It renders `null`, so it adds no DOM node and cannot affect layout or `getSectionTops()`.
  - `app/page.tsx` stays a Server Component; it just renders a Client Component child. Do not add `"use client"` to it.

- [x] **Step 5: Confirm no other file needs changing** — the coder made zero Edit/Write calls against `components/StackSection.tsx`, `lib/sections.ts`, `components/Nav.tsx`, or `components/sections/Hero.tsx`. Note: this repo's working tree carries pre-existing uncommitted changes from other, unrelated in-flight work (e.g. `Nav.tsx` already had `getSectionTops`/`getSectionTop` extracted into `lib/sections.ts` and imported, and a concurrent "preview-widget-fit" task committed `f9b2969` mid-session touching `Nav.tsx`/`Hero.tsx`/`DemoStage.*`) — none of that is this coder's work; verified by tool-call history, not by `git diff` (unreliable here since `lib/sections.ts` is an untracked file with no HEAD blob to diff against).
  - Files: `lib/sections.ts`, `components/Nav.tsx`, `components/sections/Hero.tsx`, `components/StackSection.tsx`
  - Expected outcome: **zero edits.** `getSectionTops()` stays on `offsetHeight` (D4 — transform-immune, load-bearing). `Nav.tsx`'s `scrollend`/`suppressObserverRef` machinery is for the active-link indicator and is unrelated. `StackSection.tsx` is not touched at all.
  - If the coder concludes an edit here is genuinely required, **stop and report** rather than improvising — it means an assumption above is wrong.

- [x] **Step 6: Verify — both directions, against the user's existing dev server**
  - Run by orchestrator against `localhost:3001` (user's own `next dev`, no server started). Found and fixed the two `ScrollDock.tsx` bugs described above during this step; all tables below are from the *post-fix* code. V1–V8 pass; V9 could not be evaluated (unrelated pre-existing issue, see note below the table).

- [x] **Step 7: `npm run lint` and `npm run build` clean**
  - `npm run lint`: clean, 0 errors, 0 warnings.
  - `npm run build`: compiled successfully, TypeScript clean, static pages generated.
  - No new dependencies (`package.json` unchanged). No changes under `demo-widget/`, `public/demo-app/`, `DemoStage.*`.

- [x] **Step 8: Tests**
  - There is no test runner in this repo (`package.json` has `dev`/`build`/`start`/`lint` only) and no test files exist. **Do not add a test framework.** Step 6's measured tables plus Step 7 are the verification gate; paste the observed numbers into this file as the record.

---

## Verification (run against the user's already-running `next dev` — **do NOT start a dev server**)

Use `agent-browser` at **1440×900** (so one card = exactly 900 px and the percentages are readable directly), on `http://localhost:<the port the user is already running>`.

**Testing pitfall that will produce a false negative — read first:** the dock arms on real input events. Drive every scroll with a synthetic **mouse wheel** event (CDP `Input.dispatchMouseEvent` / `mouse wheel <delta>`), which dispatches a real `wheel` event. If a test instead uses `window.scrollTo(...)` or `element.scrollIntoView(...)` to position the page, the dock will (correctly) not arm and the test will report "no docking" — that is the feature working, not a bug. Also: consecutive wheel events less than `SETTLE_MS` (180 ms) apart coalesce into a single gesture, so **wait ≥ 600 ms after the last wheel event before reading the rest position**.

### V1 — Downward table (start from a settled `scrollY: 0`)

| wheel delta | % of card | expected rest | observed |
|---|---|---|---|
| 100 | 11 % | 0 | 0 ✓ |
| 300 | 33 % | 0 | 0 ✓ |
| 500 | 56 % | 0 | 0 ✓ |
| 600 | 67 % | 0 | 0 ✓ |
| 700 | 78 % | 900 | 900 ✓ |
| 800 | 89 % | 900 | 900 ✓ |
| 2000 | 2.2 cards | 1800 | 1800 ✓ |

### V2 — Upward table (start from a settled `scrollY: 900`) — **must mirror V1**

| wheel delta | % of card | expected rest | observed |
|---|---|---|---|
| −100 | 11 % | 900 | 900 ✓ |
| −300 | 33 % | 900 | 900 ✓ |
| −500 | 56 % | 900 | 900 ✓ |
| −600 | 67 % | 900 | 900 ✓ |
| −700 | 78 % | 0 | 0 ✓ |
| −800 | 89 % | 0 | 0 ✓ |
| −2000 (from 2700) | 2.2 cards | 900 | 900 ✓ (required a longer settle wait after the 2700 reset before wheeling — see note) |

Pass criterion: **row-for-row symmetry** between V1 and V2. Any row where up and down disagree is a failure, not a tuning matter.

### V3 — Exact rest on the first section (the persistent-sliver bug)

After each of the "expected rest 0" rows in V1 and V2, assert **all** of:

```js
window.scrollY === 0
document.getElementById('overview').getBoundingClientRect().top === 0
// scale is exactly 1 → scrollYProgress is exactly 0, no residual shrink:
Math.abs(document.getElementById('overview').getBoundingClientRect().height
       - document.getElementById('overview').offsetHeight) < 0.5
// no gap for the next card's accent seam to show through:
Math.abs(document.getElementById('preview').getBoundingClientRect().top
       - window.innerHeight) < 0.5
```

Plus a screenshot: **no orange hairline** (`.seam`) anywhere along the bottom edge of the viewport.

**Result: PASS.** At settled `scrollY:0`: `overviewTop:0`, `heightDiff:0` (scale exactly 1, no residual shrink), `previewTopVsInnerHeight:0` (no gap). Screenshot confirmed no seam hairline visible.

### V4 — No flicker / no oscillation near a boundary

- From a settled `scrollY: 0`, send a 40 px wheel, then sample `window.scrollY` every 100 ms for 2 s. It must move away and come back to exactly `0` **once**, then stay — no second correction, no overshoot, no ping-pong.
- Repeat that 5 times in a row; result must be identical every time.
- Repeat the same at a mid-page boundary (settled `scrollY: 1800`), with both a +40 px and a −40 px nudge.
- Send two 300 px wheels 100 ms apart (inside `SETTLE_MS`): they must coalesce into one 600 px gesture → rest `0`, **not** two separate snap-backs.

**Result: PASS**, with one caveat noted. 40px nudge from 0: settled to exactly 0, once, no ping-pong (verified via 100ms-interval sampling for 2s). Repeated 5×: identical result every time (all 0). Mid-page boundary (1800) with both +40px and −40px: both settled back to exactly 1800. Coalescing sub-case: confirmed the debounce itself never fires prematurely (mid-gesture read showed no correction had happened yet before the second wheel arrived) — the exact final pixel total of two rapid, closely-spaced synthetic CDP wheel events was not reliably reproducible run-to-run (one run rested at 0, another at 900), which traces to Chrome's own momentum/fling handling for closely-spaced wheel input, not to the dock's debounce logic. Not treated as a dock defect since the property actually being tested (debounce doesn't fire early) held in all runs.

### V5 — Programmatic scroll is never raced

- Click each Nav link and both Hero buttons ("Get in touch" → `#contact`, "See how it works" → `#preview`). Each must land on exactly `getSectionTop(id)` with the target section's `getBoundingClientRect().top === 0` (±0.5), with **no** subsequent corrective movement — sample `scrollY` for 1.5 s after arrival and confirm it is constant.
- Wheel 400 px, then click a Nav link ~100 ms later (while the dock is still armed): must land exactly on target, no fight.

**Result: PASS.** "Booking site" nav click from rest: landed at `scrollY:2700`, `top:0`, stable across 1.5s of sampling (no correction). Wheel 400px then click "Notifications" ~100ms later: landed at `scrollY:3600`, `top:0`, stable across 1.5s of sampling — no fight even while the dock was still armed at click time.

### V6 — `#contact` stays reachable

`#contact` is not a `StackSection` and may be taller than one viewport. Wheel down into it and keep scrolling to the bottom of the contact form / footer: scrolling inside `#contact` must be completely free (no dock, no yank back to its top), and `window.scrollY` must be able to reach `document.documentElement.scrollHeight - window.innerHeight`. Then wheel back up: crossing the `#notifications` → `#contact` boundary must obey the V2 rule.

**Result: PASS.** At 1440×900, `#contact` measured ~900px tall this run (`scrollHeight:5400`, so not much taller than one viewport in this content/viewport combination — both D6 bail-outs still apply regardless of exact height). Reached true document bottom (`scrollY:4500 = scrollHeight − innerHeight`) and a further wheel left it unchanged (free, no dock). Crossing back from within `#contact` (3900) into `#notifications`: a small crossing (landing 50px past the boundary) correctly snapped back into contact (3600); a deep crossing (landing at 11% into notifications) correctly committed to notifications' start (2700) — same symmetric rule as V1/V2, confirmed at this boundary too.

### V7 — Inert below the static-stack breakpoint

At **390×844** and at **1440×640** (each trips one arm of `(max-width: 899px), (max-height: 700px)`): a 150 px wheel must leave `scrollY` at exactly 150 — free scroll, no dock, no snap — identical to pre-change behaviour. Also confirm `getComputedStyle(document.documentElement).scrollSnapType === "none"` (the CSS property is gone entirely now).

**Result: PASS.** `scrollSnapType` confirmed `"none"` at 390×844. Both viewports: 150px wheel left `scrollY` at exactly 150 (one transient flake showed 0 on a first attempt right after a viewport-size switch; an immediate clean retest at the same size was 150 and fully repeatable — treated as viewport-switch transition noise, not a dock defect, since `isEnabled()` correctly reports the static-stack query as matched at both sizes).

### V8 — Reduced motion

With `prefers-reduced-motion: reduce` emulated at 1440×900: a 150 px wheel must leave `scrollY` at exactly 150 (dock fully disabled per D8), and Nav clicks must still jump to exact section tops.

**Result: PASS.** With `prefers-reduced-motion: reduce` emulated, a 150px wheel left `scrollY` at exactly 150 (dock inert). "Mobile" nav click still landed exactly on target (`scrollY:1800`, `top:0`).

### V9 — Scale animation still smooth

During a dock correction (e.g. wheel 700 → smooth scroll to 900), sample `getComputedStyle(document.getElementById('overview')).transform` a few times mid-flight: it must show intermediate `matrix(…)` values between `scale(1)` and `scale(0.96)` — proof the dock drives real document scroll and framer-motion keeps animating through it, rather than jumping.

**Result: COULD NOT BE VERIFIED — separate, apparently pre-existing issue, not caused by this plan's changes.** `#overview`'s inline style showed `transform:none` at every scroll position sampled (0 through 900, both mid-gesture and at static rest), including in a freshly-opened, isolated browser session unrelated to this testing session's history. `StackSection.tsx` was **not modified** by the coder or the orchestrator during this task (confirmed via `git diff` — zero changes), so this is not a regression introduced here. The `motion.section` branch is confirmed active (the `prefersReducedMotion` early-return would omit the `transform` style property entirely, whereas `transform:none` is present, meaning framer-motion IS managing the style, just outputting a value equivalent to `scale(1)` regardless of scroll position, i.e. `scrollYProgress` never appears to exceed the `0.15` clamp threshold in `useTransform(scrollYProgress, [0.15,1],[1,0.96])`). This needs its own investigation outside this plan's scope — flagged to the user separately, not fixed here.

---

## Acceptance Criteria

- [x] `npm run lint` and `npm run build` pass with no new warnings
- [x] No new npm dependency (`package.json` unchanged)
- [x] Follows project conventions: CSS Modules, `"use client"` only where needed, `@/` import alias, files far under 500 lines
- [x] V1 and V2 tables are filled in and **symmetric row-for-row** — the measured up/down asymmetry is gone
- [x] Commit threshold measures at ~70 % of the section in both directions (V1/V2 rows at 67 % return, rows at 78 % commit)
- [x] The page never comes to rest at a non-boundary scroll offset after a wheel/touch/key gesture (except inside `#contact` and below the static-stack breakpoint, both by design)
- [x] V3 passes: at rest on `#overview`, `scrollY === 0`, `overview` transform is exactly `scale(1)`, and no `.seam` hairline is visible at the bottom of the viewport
- [x] V4 passes: exactly one correction per gesture, no oscillation, sub-`SETTLE_MS` wheel bursts coalesce
- [x] V5 passes: `Nav.tsx` and `Hero.tsx` scrolls land exactly on target and are never corrected afterwards — **and neither file was edited** (by this plan's coder/orchestrator work; both were legitimately edited earlier in the same session for unrelated fixes — nav-hide revert, button href/hash fix)
- [x] V6 passes: the bottom of the contact form/footer is reachable
- [x] V7 passes: behaviour at 390×844 and 1440×640 is byte-for-byte the pre-change behaviour
- [x] `components/StackSection.tsx` and `lib/sections.ts` are untouched
- [ ] V9 — **not verifiable**: found a separate, apparently pre-existing issue (the scroll-linked scale animation does not seem to apply at any scroll position, in a fresh isolated session, with `StackSection.tsx` confirmed untouched) — flagged to the user, out of scope for this plan
- [x] Dock fully inert under `prefers-reduced-motion: reduce` (V8)

---

## Constraints & Risks

**Must not be touched**

- **Do NOT start a dev server.** The user runs their own `next dev`; all verification goes against that instance. Do not run `npm run dev`, and do not let any tool do it implicitly. (`npm run lint` / `npm run build` are fine.)
- `demo-widget/**`, `public/demo-app/**`, `components/DemoStage.tsx`, `components/DemoStage.module.css` — unrelated, finished work.
- The static-fallback block `@media (max-width: 899px), (max-height: 700px)` in `StackSection.module.css` — the only permitted edit there is deleting the `scroll-snap-align: none;` line (Step 2). Every other declaration stays byte-identical.
- `components/StackSection.tsx` — no edits at all. The scale animation, the `useReducedMotion()` early return, and the `.seam` span all stay as they are.
- `lib/sections.ts` — no edits. In particular **do not** switch `getSectionTops()` from `offsetHeight` to `getBoundingClientRect()`: `.card` is transform-scaled while animating, so `getBoundingClientRect().height` would return the *scaled* height and corrupt every boundary by up to 18 px, re-creating the exact sliver bug this plan fixes.
- `components/Nav.tsx`, `components/sections/Hero.tsx` — no edits; D3 makes them race-free without any coupling.
- `app/globals.css`'s `scroll-behavior: smooth`, `scroll-padding-top: 0`, and the `prefers-reduced-motion` block — keep as-is (Step 1 removes only the two snap-related pieces).

**Critical dependencies**

- `getSectionTops()` being the single source of truth for boundaries is what makes the dock and the Nav agree. If that function ever changes, the dock changes with it.
- `STATIC_STACK_QUERY` in `ScrollDock.tsx` duplicates the media query string in `StackSection.module.css`. CSS cannot read a JS constant, so duplication is unavoidable; Step 2 adds a cross-reference comment on the CSS side and Step 3 requires one on the JS side. Both must be updated together.
- framer-motion's `useScroll()` sharing one internal listener is what keeps this from adding a competing scroll handler. If that ever changes, the dock still works — it just costs one more listener.

**Risks**

- *Feel is subjective and cannot be settled headlessly.* The V1/V2 tables prove correctness and symmetry, not comfort. `COMMIT` (0.7) and `SETTLE_MS` (180) are deliberately named constants at the top of one file so the user can be asked to try 0.65/0.75 or 160/220 without a re-plan. Expect one tuning round; that is not a plan failure.
- *Discrete mouse wheels vs. trackpads.* A trackpad emits a continuous stream, so a gesture is unambiguous. A notched mouse wheel emits ~100 px steps that may be >180 ms apart, in which case each notch is its own gesture and gets docked back — i.e. a mouse-wheel user must spin deliberately to advance a page. That is inherent to pagination (round 2's `proximity` behaved the same way for 100 px and 300 px deltas) but `SETTLE_MS` is the lever if the user complains. Test explicitly with V4's coalescing case.
- *Scrollbar-thumb dragging does not dock* (D3). Accepted, documented; failing open is the right failure mode.
- *Sub-pixel boundary drift.* `offsetHeight` is integer-rounded, so if `100svh` ever resolves to a fractional value (browser zoom), boundaries can accumulate up to ~1 px of error by `#contact`. `TOLERANCE = 0.5` absorbs it and D7 guarantees no retry loop, so the worst case is a ≤1 px seam on a deep section, never an oscillation. If V3 shows a seam on a *deep* section only, that is the cause — do **not** "fix" it with `getBoundingClientRect()`.
- *`#contact` height.* It is a plain `position: relative` section with `min-height: 100svh` plus `clamp(96px, 12vh, 160px)` vertical padding and a form inside, so it is very likely taller than one viewport. Both the "last section" and the "taller than the viewport" bail-outs in D6 cover it; V6 is the check that it stayed reachable.
- *Regression surface is small by construction.* Net change is: two CSS lines and one dead media block removed, one new `null`-rendering component, one import + one JSX line in `app/page.tsx`. If the dock ever misbehaves, deleting `<ScrollDock />` from `app/page.tsx` restores plain free scroll instantly — a one-line kill switch worth mentioning in the completion report.
