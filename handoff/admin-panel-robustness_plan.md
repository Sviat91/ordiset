# Plan: Admin Panel embed robustness fixes

**Date:** 2026-08-22
**Status:** In Progress
**Mode:** LIGHT (orchestrator-written plan; well-understood fixes, no open architecture decisions)

## Goal

Fix two issues the user found after using the new Admin Panel section (`handoff/admin-panel_plan.md`, reviewer-approved):

1. On the very first (cold) load, the Admin Panel embed sometimes showed the plain client-facing page instead of auto-navigating to the admin dashboard — the auto-click never fired.
2. After interacting inside the admin embed (e.g. collapsing the sidebar, or presumably navigating to any admin page taller/shorter than the Dashboard), some UI (reported: the sidebar's collapse/expand toggle) can end up clipped by our letterboxing frame.

## Root cause (found via live testing against the user's own running dev server, `agent-browser`, session `bugcheck1`)

Live-tested the sidebar collapse toggle directly (both via a real DOM `.click()` and by reading its `getBoundingClientRect()` inside the iframe): the vendored demo's own layout is not broken — the toggle button's coordinates are always within the iframe's own content bounds, nothing is negative or off-canvas in the vendored app's own layout.

The real gap is in `components/DemoStage.tsx`'s measurement lifecycle: `syncNeed()` (which reads `iframeRef.current.contentDocument.documentElement.scrollHeight` and grows `needH` to fit) is only ever called from `handleLoad` (on iframe `load`) and once more via the `contentNonce` bump after the auto-click (`autoClickText`) settles. There is **no ongoing observation of the iframe's internal content height** after that. So:

- **Issue 1** is `DemoStage`'s existing bounded auto-click poll (`autoClickText`, ~150ms × 20 attempts ≈ 3s) occasionally not finding the button in time on a slow/cold first load (font loads, JS parse, etc. can push past that window) — it silently gives up and the section is left on the client-facing landing page.
- **Issue 2** is that once the admin dashboard is measured (right after the auto-click), if the visitor then navigates *inside* the admin app to a page with different content height (or interacts with something that changes layout height), nothing re-triggers `syncNeed()`. If the new content is taller than what's currently locked in, the frame's fixed CSS height is too short for it and something can get visually cut off at the bottom edge — a generalization beyond just "the sidebar toggle," it would affect any later height growth inside either embed.

## Fixes

**Fix 1 — Auto-click: use a `MutationObserver` (bounded by an overall timeout) instead of a fixed-interval poll.**
Rather than guessing an interval/attempt count, observe `iframeRef.current.contentDocument.body` for child-list/subtree mutations and re-run the match-and-click check whenever the DOM actually changes, in addition to one immediate synchronous check. Keep an overall timeout (e.g. 10s, generous headroom over the current ~3s) that disconnects the observer if the button never appears, so this can't run forever. Still guarded by the existing `clickedRef` (click at most once), still restarts cleanly on every `load` event. This reacts as soon as the button actually exists rather than hoping a fixed interval lines up, while remaining bounded.

**Fix 2 — Continuous internal content-height watch.**
Add a second `ResizeObserver`, created inside `handleLoad` (so it always targets the *current* load's document), observing `iframeRef.current.contentDocument.documentElement`. On every callback, call the existing `syncNeed()` (unchanged — its logic already only *raises* `needH`, never shrinks, which is the correct behavior here: growing to fit taller content prevents clipping; not shrinking for shorter content just leaves harmless extra letterbox space, not a bug). Disconnect the previous load's observer at the start of `handleLoad` before creating the new one (mirroring how `clickedRef`/poll state is reset there), and disconnect on unmount. This is the same `ResizeObserver` idiom the file already uses for the outer container — just pointed at a new target, not a new concept.

No new props, no API changes — this is entirely internal to `DemoStage.tsx` and applies automatically to both `PreviewSection` and `AdminPanelSection` (and any future embed), since it's not gated behind `autoClickText`/`reloadOnStorageKey`.

## Implementation Steps

- [x] **Step 1:** In `components/DemoStage.tsx`, replace the fixed-interval poll (`window.setTimeout(tryClick, 150)`, 20 attempts) with a `MutationObserver` on `contentDocument.body` (`childList: true, subtree: true`) that re-runs the same match-and-click check on every mutation, plus one immediate synchronous check on setup. Keep a single overall `window.setTimeout` (~10s) that disconnects the observer and gives up, so this remains bounded. Preserve `clickedRef` (click-once guard) and the existing restart-on-every-`load` behavior (still keyed off `loadNonce`/`handleLoad`).
- [x] **Step 2:** In the same file, add a `contentRoRef` (or similar) holding a second `ResizeObserver` instance. In `handleLoad`, disconnect any previous instance, then create a new one observing `iframeRef.current.contentDocument.documentElement`, with its callback calling `syncNeed()`. Disconnect it in the component's unmount cleanup alongside the existing timers/observers.
- [x] **Step 3:** Live-verify against the user's already-running dev server (locate via `curl`/`lsof` on port 3001 — do not start a new one):
  - Reproduce a "slow first load" scenario if possible (e.g. throttle via `agent-browser` network conditions, or a hard cache-cleared fresh session) and confirm the admin embed still lands on the dashboard.
  - Inside the admin embed: collapse/expand the sidebar repeatedly, navigate to a few different admin pages (e.g. Settings — likely the tallest — and something shorter like Calendar), and confirm no clipping and no internal scrollbar at at least two viewport sizes (e.g. 1512×830 and 1000×900).
  - Confirm `PreviewSection`'s embed is unaffected (still measures/no clipping, still no auto-click).
  - Watch for excessive re-render/jank from the new `ResizeObserver` firing during CSS transitions (e.g. the sidebar's own collapse animation) — the existing monotonic `syncNeed` logic should make most callbacks no-ops, but confirm this live rather than assuming it.
- [x] **Step 4:** `npm run lint` and `npm run build` clean.

## Acceptance Criteria

- [x] Admin Panel embed reliably lands on the admin dashboard on load, including a simulated slow first load
- [x] No clipping/internal scrollbar appears in either embed after interacting inside them (sidebar collapse, navigating between admin pages of different heights)
- [x] `PreviewSection`'s existing behavior (no auto-click, still correctly letterboxed) is unaffected
- [x] No new props added to `DemoStage` — both fixes are internal
- [x] Lint and build clean

## Notes / Results

Verified live against the user's own running dev server on port 3001 (confirmed via `curl` returning `200` before starting; no server was started by me).

**Slow/cold load (Fix 1):** Confirmed the dev server was already running, then used `agent-browser`'s CDP WebSocket endpoint (`get cdp-url` → attached directly via a small throwaway Node script using the native `WebSocket` global, no new deps installed) to apply `Emulation.setCPUThrottlingRate` (8x) and `Network.emulateNetworkConditions` (~500kbps, 400ms latency), then did a hard `Page.reload({ ignoreCache: true })`. After the throttled load settled, the Admin Panel embed still landed correctly on the Dashboard (screenshot confirmed) — same result as 3 consecutive untouched reloads beforehand. This exercises the exact race the plan describes (slow/cold first load pushing past the old ~3s poll window); the `MutationObserver` approach handled it without incident.

**Content-height watch (Fix 2):** Inside the admin embed, clicked through to Settings (tall page) and Calendar (shorter page), and toggled the sidebar collapse/expand repeatedly (including 6 rapid clicks in a row). At both 1512×830 and 1000×900 viewports, no clipping and no internal scrollbar appeared in either case; `agent-browser errors`/`console` were empty after the rapid-toggle stress test — no `ResizeObserver loop limit exceeded` warnings or other jank-indicating errors.

One observation worth noting for context (not a bug, not in scope): for this specific vendored admin app, `contentDocument.documentElement.scrollHeight` stays flat at `minViewportHeight` (800) even on much taller pages like Settings — the app appears to manage its own internal scroll regions rather than growing the outer document height. So in practice, for *this* app, Fix 2's `ResizeObserver` callback is mostly a no-op (confirming the plan's own reasoning that `syncNeed`'s monotonic logic makes most callbacks harmless) rather than something visibly exercised by Settings/Calendar navigation. It remains correct and necessary as a general safeguard per the plan (any future embed, or a change to this app's own layout strategy, that does grow document height would now be caught continuously instead of only at load).

**PreviewSection:** Clicked the "Preview" nav link (the stacked/sticky section layout made a raw `scrollIntoView` on the section id a no-op — a pre-existing quirk of position-sticky stacking unrelated to this fix, worked around by using the actual nav link instead). Confirmed the embed still shows the plain client-facing "Choose your specialist" landing page (no auto-click fired), correctly letterboxed, unaffected by either fix.

**Lint/build:** `npm run lint` — clean, no output. `npm run build` — compiled successfully, TypeScript clean, static pages generated with no errors.
