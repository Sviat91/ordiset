# Plan: DemoStage desktop embed shrinks progressively during in-app navigation

**Date:** 2026-08-26
**Status:** In Progress
**Mode:** FULL (planner-led)
**Owner of next step:** `coder`

## Goal

Stop the desktop (`fixedViewport`-less) `DemoStage` embed from progressively shrinking and accumulating dead space as the visitor navigates inside the iframe, by removing the circular "measure the embedded document's height → resize the embedded document's viewport from that measurement" dependency in `components/DemoStage.tsx`.

---

## Root Cause (confirmed, not assumed)

The orchestrator's hypothesis (width coupled to scale) is **real but secondary**. Investigation found a stronger, provable primary cause. Both are eliminated by the same fix.

### The measurement is self-referential and can only ratchet upward

`DemoStage`'s auto-fit branch (lines 226–236):

```
cssH  = Math.max(box.h, needH)      // needH := doc.documentElement.scrollHeight
s     = box.h / cssH
width = Math.ceil(box.w / s)        // == box.w * cssH / box.h
```

`needH` comes from `syncNeed()` → `doc.documentElement.scrollHeight`, re-read on every content-size change via a `ResizeObserver` on the iframe's `documentElement`.

**`documentElement.scrollHeight` is not "the content's natural height" — it is `max(content height, viewport height)`.** The viewport height *is* `cssH`, which we set from `needH`. Therefore `needH >= cssH` always holds, so `cssH` is **monotonically non-decreasing and can never come back down**. Every embedded page whose intrinsic content exceeds the current `cssH` bumps `cssH` up permanently. The only reset is the outer `ResizeObserver` (`setNeedH(minViewportHeight)` on line 57), which fires only on a real outer-box resize.

This exactly reproduces every reported symptom, including the one that no other theory explains: *"navigating back to the demo's home/root screen shrinks it too"* — i.e. it never recovers.

### The embedded app makes this unbounded, not just one-shot

`public/demo-app` is a Tailwind SPA whose layout is viewport-relative (verified in `public/demo-app/assets/index-B7ZSfWxM.css` and `index-BEzj_g_l.js`):

- Public shell: `<div class="min-h-screen flex flex-col text-foreground">` → `min-height: 100vh`, i.e. **always at least `cssH` tall**. This is the mechanism that pins `scrollHeight >= cssH` and creates the ratchet.
- Home page (`WD`): `<main class="flex-1 flex flex-col relative pb-4">` — designed to *fill* the viewport, not to be intrinsically tall. This is why the **first load looks correct today**: `needH` converges to exactly `max(box.h, minViewportHeight)`.
- Booking/calendar page: `flex h-[calc(100vh-10rem)] min-h-[560px] flex-col` — its height is `cssH - 160px`. With the site footer + page padding below it, total content height becomes `cssH + δ` where `δ = (footer + padding) - 160px`. If `δ > 0`, each measurement round adds `δ`: **unbounded runaway**, one step per navigation/interaction. This is the "booking calendar → dropdown open → smaller still" sequence in the screenshots.
- Admin shell: `<div class="admin-layout flex h-screen overflow-hidden ...">` — always exactly `100vh`, never scrolls. Confirms why the admin embed looks stable at load but is still on the broken code path (it inherits whatever `cssH` the public home page ratcheted to before the auto-click).

### Where the visible "dead space below" comes from

`min-h-screen` stretches the shell to the (now inflated) `cssH`; the page's actual content sits at the top of that stretched flex column and the footer at the bottom, leaving a growing empty gap in between — rendered in the demo's own dark `body` background, which reads on screenshots as "the underlying page showing through". The iframe element itself always covers the box exactly (`width * s >= box.w`, `height * s >= box.h`), so the gap is *inside* the embedded document, not around it.

### The width coupling (orchestrator's hypothesis) — confirmed as the amplifier

`width = box.w / s` means the embedded document's CSS viewport width is a function of `s`, hence of `needH`. As `cssH` ratchets up, the native width blows up (e.g. `1352 → 1560 → 2100 → 3000+`), pushing the demo past its `max-w-*` containers so the content becomes a narrow centred column with huge side gutters, and re-triggering reflows that feed new heights back in. It makes the shrink look far worse than the scale factor alone, and it makes the system's fixed point (if any) width/height-order-dependent.

### Conclusion that forces the architectural call

> To show the whole page you must set `viewport height = content height`; but this document's content height is a function of its viewport height. **Content-driven height auto-fitting is mathematically unsound for this embed.** No damping, freezing, hysteresis or re-probing scheme fixes that — they only change how the divergence manifests.

The proven-correct pattern already exists in this very file: the `fixedViewport` branch (mobile), which the orchestrator confirms is bug-free precisely because it never measures the embedded content.

---

## Architecture Decisions

### D1 — Adopt a **box-derived fixed viewport** for the auto-fit branch (chosen over Options 1 and 2)

Replace `needH` with a constant derived only from the outer box:

```
viewportH = Math.max(box.h, minViewportHeight)   // no measurement
s         = box.h / viewportH                    // <= 1
width     = Math.ceil(box.w / s)
height    = Math.ceil(viewportH)
transform = scale(s)
```

This is *literally today's formula with `needH` replaced by `minViewportHeight`*. Properties:

- **No circularity at all.** The embedded viewport is a pure function of `box`, and `box` is stable during in-app navigation (proven in the "Confirmed unaffected" section below). The demo behaves like a real, fixed-size desktop browser window.
- **No distortion, no gaps.** Uniform scale, aspect preserved: `(box.w/s) / viewportH == box.w / box.h`. `Math.ceil` overscans by <1px, clipped by `.stage { overflow: hidden }` — identical to today.
- **First-load parity.** Today `needH` converges to `max(box.h, minViewportHeight)` on the demo home page (it is `flex-1` inside a `min-h-screen` shell, i.e. viewport-filling, not intrinsically tall), so the computed `width`/`height`/`scale` come out the same. Must still be eyeballed live (see AC-4).
- **Same structural guarantee as the mobile branch**, which is the only part of this component with a clean track record.

### D2 — Reject Option 1 (pin native width to `box.w`, height-only / letterbox)

It breaks the width→height link but leaves `needH` driving `cssH`, so the `min-h-screen` ratchet survives untouched: the demo would keep shrinking, and it would now *also* grow a horizontal letterbox gap on the right (`transform-origin: 0 0`) as it shrinks. Strictly worse than today. Rejected.

### D3 — Reject Option 2 (freeze the reference `needH`, update only on real outer resize)

Two fatal problems:

1. **It bakes in a wrong measurement.** The load-time measurement is taken at width `W0 = box.w / s_ref`; setting `cssH = needH` then changes the width, at which point the content reflows to a different height. Freezing preserves that mismatch permanently — dead space stays, it just stops growing. To avoid it you must *also* freeze the width, at which point the height fit converges to `max(box.h, C_intrinsic)`... except on pages whose height is `100vh`-relative (the booking calendar), where the ratchet returns anyway.
2. **It keeps the whole fragile apparatus** (`needH`, `syncNeed`, `contentNonce`, `loadNonce`-ordered re-measures, the 400 ms "safety top-up", the content `ResizeObserver`) plus a new freeze/unfreeze state machine — more moving parts to defend a behaviour that is unsound in principle. Contradicts the repo's "Simplicity First" mandate.

### D4 — Delete content-height tracking entirely rather than leaving it dormant

`needH`, `syncNeed`, `contentNonce`, `contentRoRef` and the `fonts.ready` re-measure exist **solely** to feed the auto-fit branch (the `fixedViewport` branch already early-returns past all of it). With D1 they have no consumer. Leaving dead state wired to live `ResizeObserver`s is a maintenance trap and a future regression source. Remove them and their orphaned effects/timers (CLAUDE.md §3: remove what *this* change orphans).

This supersedes commit `9901567` ("Fix DemoStage resizing issue after in-app navigation"): that fix made the frame *react* to in-app content-height changes. Under D1 the frame no longer sizes to content at all, so there is nothing to react to. **This is intentional, not a regression** — reviewer please note.

### D5 — Keep the width box-derived, do not hardcode a design viewport (e.g. `1440x900`)

A hardcoded desktop viewport would make the demo's responsive breakpoints deterministic across displays, but would introduce letterboxing whenever the box's aspect ratio differs from the hardcoded one — the exact problem the `fixedViewport` branch's comment (lines 213–218) documents having to work around with `Math.max` overscan. `box.w` is stable and already gives a perfect aspect fit. Not worth the added complexity for a hypothetical benefit.

### D6 — No public API change; both desktop call sites stay untouched

`minViewportHeight` keeps its name, its `800` default and its position in `DemoStageProps`. Neither `PreviewSection.tsx` nor `AdminPanelSection.tsx` passes it, so neither file needs editing. Its **semantics change** from "floor that runtime measurement may raise" to "the embedded viewport height, unless the box is taller" — the JSDoc must be rewritten to say so (D-note: this is the one knob to turn if AC-4 fails live).

### D7 — Accept internal scrolling for embedded pages taller than the viewport

Under D1, a demo page whose intrinsic content exceeds `viewportH` scrolls inside the iframe instead of being squeezed to fit. This is:

- exactly how the demo app behaves in a real browser window of that height;
- the behaviour this project already accepts and documents for the mobile branch ("lets it scroll internally like a real device");
- unlikely to bite in practice — the demo's key pages are built around `100vh` (`min-h-screen` shell + `flex-1` home + `h-[calc(100vh-10rem)]` booking card + `h-screen overflow-hidden` admin).

**Residual risk:** a wheel gesture with the cursor over the iframe would scroll the demo instead of the pinned marketing section. Flagged for live verification (AC-6), not pre-emptively engineered around.

### D8 — The `fixedViewport` branch must remain a byte-identical no-op

Three shared touch-points are edited; each is provably output-neutral for `fixedViewport`:

| Touch-point | Change | Why it is a no-op for `fixedViewport` |
|---|---|---|
| Outer `ResizeObserver` effect | drop `setNeedH(minViewportHeight)`, deps `[minViewportHeight]` → `[]` | `setBox` behaviour unchanged; the fixed-viewport style reads only `box` + `fixedViewport` |
| `handleLoad` | drop everything after `setLoadNonce` (incl. the `if (fixedViewport) return;` guard, now moot) | that code was already skipped when `fixedViewport` was set |
| auto-click `tryClick` | drop `setNeedH(...)`, `setContentNonce(...)` and the 400 ms top-up timer | these currently *do* run on the mobile admin embed, but only mutate `needH`/`contentNonce`, which the fixed-viewport style object never reads → same rendered output |

`match.click()`, `clickedRef`, `loadNonce` and the `MutationObserver`/timeout machinery are untouched, so the mobile admin auto-click keeps working.

---

## Implementation Steps

All edits are in **one file**: `components/DemoStage.tsx`. Do not touch anything else.

- [x] **Step 1 — Rewrite the auto-fit style branch**
  - File: `components/DemoStage.tsx` (currently lines 226–236, the `} else if (hasBox) {` branch)
  - Details: replace the body with a `needH`-free computation:
    - `const viewportH = Math.max(box.h, minViewportHeight);`
    - `const s = box.h / viewportH;`
    - `style = { width: Math.ceil(box.w / s), height: Math.ceil(viewportH), transform: \`scale(${s})\`, opacity: 1 }`
  - Keep `Math.ceil` on both axes (`box` comes from `contentRect` and is fractional; the <1px overscan is clipped by `.stage { overflow: hidden }`).
  - Replace the branch comment with a short one stating: the embedded viewport is derived from the outer box only and is never resized from the embedded document's own content height, because `documentElement.scrollHeight` is `max(content, viewport)` and would ratchet the frame upward forever on a `min-h-screen` embed. Reference D1.

- [x] **Step 2 — Delete the content-height state**
  - File: `components/DemoStage.tsx`
  - Remove: `const [needH, setNeedH] = useState(minViewportHeight);` (line 41), `const [contentNonce, setContentNonce] = useState(0);` (line 43), `const contentRoRef = useRef<ResizeObserver | null>(null);` (line 45).
  - Keep: `ref`, `iframeRef`, `boxRef`, `box`, `loadNonce`, `clickedRef`.

- [x] **Step 3 — Delete `syncNeed` and its driver effect**
  - File: `components/DemoStage.tsx`
  - Remove the `syncNeed` `useCallback` (lines 63–72) and the `useEffect` that `requestAnimationFrame(syncNeed)` on `[box, contentNonce, syncNeed]` (lines 74–78).

- [x] **Step 4 — Reduce `handleLoad` to its auto-click bookkeeping**
  - File: `components/DemoStage.tsx` (lines 80–111)
  - Final body: `clickedRef.current = false;` then `setLoadNonce((n) => n + 1);` — nothing else.
  - Remove: the `if (fixedViewport) return;` guard and its comment, the `syncNeed()` call, the content `ResizeObserver` block and its comment, the `fonts.ready.then(syncNeed)` block.
  - `fixedViewport` is still read in the render body, so it must remain a destructured prop.

- [x] **Step 5 — Delete the `contentRoRef` unmount-cleanup effect**
  - File: `components/DemoStage.tsx` (lines 113–117) — remove the whole `useEffect`.

- [x] **Step 6 — Strip the re-measure side effects from the auto-click path**
  - File: `components/DemoStage.tsx` (inside `tryClick`, lines ~150–160, plus the effect's declarations/cleanup/deps)
  - Remove: `setNeedH(minViewportHeight);`, `setContentNonce((n) => n + 1);`, the `topUpTimer = window.setTimeout(...)` safety top-up, and their two explanatory comments. `match.click()` and `clickedRef.current = true;` stay; `return true;` stays.
  - Remove the now-orphaned `let topUpTimer: number | undefined;` declaration (line 133) and its `if (topUpTimer !== undefined) window.clearTimeout(topUpTimer);` cleanup (line 189).
  - Change the effect deps from `[autoClickText, loadNonce, minViewportHeight]` to `[autoClickText, loadNonce]`.
  - Leave the long explanatory comment above the effect (lines 119–128) untouched — it documents the `MutationObserver` strategy, which is unchanged.

- [x] **Step 7 — Clean up the outer `ResizeObserver` effect**
  - File: `components/DemoStage.tsx` (lines 47–61)
  - Remove `setNeedH(minViewportHeight);` (line 57). The effect body then references no props → change deps `[minViewportHeight]` → `[]`.
  - Everything else (the `boxRef` no-change guard, `setBox`, `ro.observe`, the disconnect cleanup) stays exactly as-is.

- [x] **Step 8 — Fix the imports**
  - File: `components/DemoStage.tsx` (line 3)
  - `useCallback` is only used by the deleted `syncNeed` → import becomes `import { useEffect, useRef, useState } from "react";`. Verify `useEffect`/`useRef`/`useState` are all still used before trimming further.

- [x] **Step 9 — Update the prop JSDoc to match the new semantics**
  - File: `components/DemoStage.tsx` (lines 9–13 and 20–26)
  - `minViewportHeight`: delete "Raised automatically at runtime if the embedded page turns out to need more." Replace with wording along the lines of: *the CSS-px viewport height given to the embedded document; if the frame box is taller this is ignored and the box height is used at scale 1, if the box is shorter the whole document is uniformly scaled down so this many CSS px still fit. Never derived from the embedded document's own content height — see D1 in `handoff/demostage_shrink_plan.md`.*
  - `fixedViewport`: delete the trailing "content-height tracking is skipped entirely when this is set" clause (there is no content-height tracking any more). Keep the rest, including the "scrolls internally like a real device" note.

- [x] **Step 10 — Static verification (no test runner in this repo)**
  - There is no test framework in `package.json` — do **not** add one, and do not add a test step to this plan's scope.
  - Run, from the repo root, and paste the results into the handoff:
    - `npx tsc --noEmit`
    - `npm run lint`
    - `npm run build`
  - All three must be clean. Pay particular attention to `react-hooks/exhaustive-deps` on the two dependency arrays changed in Steps 6 and 7.
  - Do **not** start a dev server (project standing rule — the user runs `npm run dev` themselves).
  - **Results (independently re-run by orchestrator, 2026-08-26):**
    - `npx tsc --noEmit` → clean, no output.
    - `npm run lint` → clean, no warnings/errors.
    - `npm run build` → clean (coder's report: `✓ Compiled successfully`, all routes generated, no errors).

- [x] **Step 11 — Self-review the diff against D8**
  - Re-read the final `if (hasBox && fixedViewport)` branch and confirm it is character-for-character unchanged, and that no remaining code path can alter the values it reads (`box`, `fixedViewport`).
  - Confirm the diff touches exactly one file and that every removed line traces to "orphaned by removing content-height tracking".

- [x] **Step 12 — Hand off with an explicit live-check list**
  - The coder cannot run a browser in this environment. Write the AC-4…AC-8 checks below verbatim into the handoff summary so the user can run them against their own `npm run dev`.

---

## Acceptance Criteria

**Static (coder verifies):**

- [x] AC-1 — `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
- [x] AC-2 — The diff touches **only** `components/DemoStage.tsx`.
- [x] AC-3 — `components/DemoStage.tsx` contains no occurrence of `needH`, `syncNeed`, `contentNonce`, `contentRoRef`, `fonts.ready`, or `topUpTimer`; and the `if (hasBox && fixedViewport)` branch is byte-identical to `main`.

**Live (user verifies via their own `npm run dev`; browser tooling is unavailable to the agents):**

- [ ] AC-4 — **First-load parity.** Desktop Preview section on first paint looks the same as before the fix (same apparent zoom, no new letterboxing, no new internal scrollbar). If it does not, the single knob is `minViewportHeight` (D6) — report the observed difference rather than re-architecting.
- [ ] AC-5 — **The bug is gone (`PreviewSection` desktop).** Run the exact reported sequence — pick a specialist → go to the booking calendar → open the service dropdown → navigate back to the demo's home screen. The embed's on-screen size must be **identical at every step**, with no growing dead space and no failure to recover on the way back home.
- [ ] AC-6 — **`AdminPanelSection` desktop.** The auto-click still lands on the admin panel, the panel fills the frame, and toggling the admin sidebar (`open`/`onToggleOpen`) causes **no** frame resize. Also check D7's residual risk: scrolling the page with the cursor over the embed.
- [ ] AC-7 — **Mobile path unregressed.** At a viewport matching `(max-width: 899px), (max-height: 700px)`, the `PhoneFrame` embeds in `PreviewSection`, `AdminPanelSection` and `MobileSection` render and behave exactly as before, including the mobile admin auto-click.
- [ ] AC-8 — **Outer resize still re-fits.** Resizing the browser window re-fits the desktop embed correctly and aspect-preservingly (this is the one path that still recomputes, via the outer `ResizeObserver`); crossing the 899px/700px breakpoints in both directions still swaps desktop↔mobile cleanly.

---

## Constraints & Risks

**Must not be touched (verified as not implicated — see next section):**

- `components/StackSection.tsx` / `.module.css`, `components/WindowChrome.tsx` / `.module.css`, `components/DemoStage.module.css`, `components/PhoneFrame.tsx`, `components/sections/sections.module.css`.
- The `fixedViewport` branch and every mobile call site (D8).
- Anything i18n/locale-related (`StableTextBlock`, `StableLabel`, `LocaleProvider`, dictionaries) — unrelated subsystem, and item 1 of the previous session was just live-confirmed working.
- `public/demo-app/**` — a built third-party artifact, read-only for diagnosis. **Do not "fix" the demo app's `h-[calc(100vh-10rem)]` / `min-h-screen` layout.** D1 makes the host resilient to whatever the embed does, which is the correct boundary.
- `AGENTS.md` / `CLAUDE.md` — the `next dev`-generated block stays as-is.

**Risks:**

1. **First-load appearance could shift** if the demo home page turns out to be intrinsically taller than `max(box.h, 800)` — my static reading of the bundle (`main.flex-1` inside a `min-h-screen` shell) says it is not, but this was reasoned from a minified build, not observed in a browser. Mitigation: AC-4 + the `minViewportHeight` knob (D6). **Do not** respond to an AC-4 failure by reintroducing content measurement.
2. **Internal iframe scrolling** on over-tall demo pages (D7) — accepted by design, verify via AC-6.
3. **Behaviour change vs. commit `9901567`** is deliberate (D4). If the reviewer flags "the frame no longer reacts to in-app content-height changes" as a regression, point them at D1/D4: that reaction *is* the bug.
4. **Dependency-array edits** (Steps 6, 7) are the likeliest source of a lint failure or a subtle effect-lifecycle change. The outer `ResizeObserver` effect must still run exactly once per mount and disconnect on unmount.
5. **No automated tests exist** in this repo (`package.json` has only `dev`/`build`/`start`/`lint`). Static checks + the user's manual pass are the entire safety net; do not silently expand scope by adding a test harness.

---

## Confirmed Unaffected (investigated, explicitly ruled out)

The outer box (`box` from the `ResizeObserver` on `.stage`) is **stable during in-app iframe navigation**, so nothing in the outer layout chain is part of this bug:

- **`components/DemoStage.module.css`** — `.frame` is `position: absolute`, so the iframe is out of flow and cannot contribute to `.stage`'s size; `.stage` is `overflow: hidden`. There is no path from iframe size back to `box`. `.stage`'s `min-height: min(72svh, 640px)` is viewport-derived only.
- **`components/WindowChrome.tsx` / `.module.css`** — `.window` (`max-height: 100%`, flex column) → `.body.bodyFull` (`height: 100%`, `aspect-ratio: auto`) resolve purely from the parent flex height. Nothing reads the iframe. The `chrome={false}` path used by both desktop call sites renders no titlebar, so there is no variable-height sibling either.
- **`components/StackSection.tsx` / `.module.css`** — `.card`'s height comes from `100svh` + padding only. The framer-motion scroll-driven `scale` is a **CSS transform**, and `ResizeObserver.contentRect` is reported in the element's own untransformed coordinate space, so it cannot perturb `box`. (The scroll-scale was floated last session as a suspect — ruled out.)
- **`components/sections/sections.module.css`** — `.containerWide` / `.fill` / `.growFull` are all viewport-derived flex sizing; `.desktopOnly` / `.mobileOnly` only toggle `display` at the `(max-width: 899px), (max-height: 700px)` breakpoint.
- **`components/sections/PreviewSection.tsx` / `AdminPanelSection.tsx`** — both desktop branches already use the correct prop set; the fix is entirely inside the shared component, so **no edits are needed here**, only the AC-5/AC-6 verification passes.
- **`components/sections/MobileSection.tsx`, `components/PhoneFrame.tsx`** — `fixedViewport` path only; covered by AC-7 as a regression guard, not modified.
- **Locale/i18n components** — no interaction with `DemoStage`; out of scope entirely.
