# Plan: Nav scroll-spy indicator, anchor-scroll fix, widget sizing fixes

## Context / diagnosis (orchestrator, verified by reading source — no browser used)

1. **Nav has no active-section indicator.** `Nav.tsx` is a server component rendering plain `<a href="#id">` links with zero scroll tracking. User wants a sliding bar (accent or white) under whichever link matches the section currently in view.
2. **Clicking "Overview" after "Mobile" doesn't scroll back up** (down works fine). Nav has no click handlers at all — it relies entirely on native browser fragment-jump combined with `html { scroll-behavior: smooth }` (`app/globals.css`). That combination is a known-fragile one with `position: sticky` stacking-card layouts like this page's. Root cause isn't independently reproducible without a browser, so rather than guess at exact engine internals, the fix is to stop depending on native fragment-jump and drive navigation explicitly in JS (`scrollIntoView`) — which the indicator feature needs anyway for click handling.
3. **`CustomizeSection`'s `WindowChrome` renders collapsed to a tiny box.** Root cause: `components/sections/sections.module.css`'s `.grow` wrapper div has no explicit width. Its ancestor is `.stack` (same file), which sets `align-items: center` — on a column-flex container this shrink-wraps children to their own content width instead of stretching them full width. `Hero.tsx`'s equivalent wrapper doesn't show this bug only because `Hero.module.css`'s `.visual` class (combined on the same div as `.grow`) separately declares `width: 100%`. `CustomizeSection.tsx` has no equivalent override, so its `.grow` div — and the `WindowChrome` inside it — collapses to intrinsic content width.
4. **Overview's widget is "too wide" but user also says it looks "too short."** These aren't actually in conflict. `.grow`'s own `align-items: center` (controlling *its children's* cross-axis sizing) stops `WindowChrome`'s `.window` from stretching to fill `.grow`'s available height — instead `.window`'s height is governed purely by its internal `aspect-ratio: 16/10` relative to its *width*. On very tall viewports this happens to look fine; on typical laptop-height viewports it renders visibly short. Because height is currently coupled to width via the aspect-ratio, naively narrowing the widget (per the "too wide" complaint) would make it *shorter* still. Fixing `.grow` to `align-items: stretch` decouples height from width — `WindowChrome.module.css`'s existing `.body { flex: 1 1 auto; min-height: 0; aspect-ratio: 16/10 }` already supports growing/shrinking away from the aspect-ratio once given a definite container height, no change needed there. This lets us narrow the width and fix the height in the same pass without one undoing the other.

Confirmed via grep-equivalent read: `.grow` is referenced only by `Hero.tsx` and `CustomizeSection.tsx` (both wrap `WindowChrome`). `MobileSection`/`BookingSiteSection`/`NotificationsSection` use `.split` (CSS Grid) + `PhoneFrame` and never reference `.grow` — so the `.grow` fix cannot affect the phone-widget sections.

## Changes

### 1. `components/sections/sections.module.css` — fix `.grow`
```css
.grow {
  flex: 1 1 0;
  min-height: 220px;
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
}
```
- `width: 100%` (new) fixes the CustomizeSection collapse.
- `align-items: stretch` (was `center`) lets `WindowChrome` fill `.grow`'s actual available height instead of being capped by its own aspect-ratio.

### 2. `components/sections/Hero.module.css` — narrow the widget
Add `max-width` to the existing `.visual` rule (do not remove `width: 100%`):
```css
.visual {
  width: 100%;
  max-width: 90%;
}
```
`width` and `max-width` are different properties (no cascade collision regardless of file load order — unlike the earlier `.centerY` bug). Height is no longer coupled to width once change #1 lands, so this purely narrows the widget without re-shrinking it.

### 3. `components/Nav.tsx` + `components/Nav.module.css` — scroll-spy indicator + explicit smooth scroll
- Convert `Nav.tsx` to a client component (`"use client"`).
- Track the active section via `IntersectionObserver` over all six section ids (`overview, customize, mobile, booking-site, notifications, contact`) with `rootMargin: "-50% 0px -50% 0px"` (whichever section spans the vertical center of the viewport is "active"). Store `activeId` in state. Disconnect the observer on unmount.
- Render a `motion.span` indicator (thin bar, accent color) absolutely positioned inside `.links` (add `position: relative` to `.links` in the CSS). Position it via the active link's measured `getBoundingClientRect()` relative to the `.links` container (use refs on each link). Animate `left`/`width` with Framer Motion on `activeId` change; also recompute on window `resize`.
- If `activeId` is `contact` (or anything not in the 5-item `LINKS` list) or nothing is active yet, hide the indicator (no link is highlighted) rather than guessing.
- Add an `onClick` handler to every nav link (and the logo/brand link, which points to `#overview`) that calls `e.preventDefault()` then `document.getElementById(id)?.scrollIntoView({ behavior, block: "start" })`, where `behavior` is `"auto"` under `useReducedMotion()` (from `framer-motion`, already a project dependency) and `"smooth"` otherwise. The CTA (`Contact`) link should get the same handler for consistency.
- Do not change `LINKS` contents/order or any hrefs.

## Out of scope — do not touch
- `ContactForm.tsx`, `PhoneFrame.tsx`, `Placeholder.tsx`, `StackSection.tsx`, `StackSection.module.css`.
- `.split` / `.centerY` / any phone-widget section (`MobileSection`, `BookingSiteSection`, `NotificationsSection`) — not affected by any change here, leave untouched.
- Global `h1` / `.body` typography tokens in `app/globals.css` and `sections.module.css` — not touched. The widget-shortness complaint is resolved structurally via the `.grow` stretch fix (#1), not by shrinking text.
- `WindowChrome.tsx` / `WindowChrome.module.css` — no change needed, its flex/aspect-ratio setup already supports the stretch fix.

## Verification checklist
- [x] `npm run lint` clean
- [x] `npm run build` clean
- [x] `.grow` is referenced only in `Hero.tsx` and `CustomizeSection.tsx` (grep to confirm no regression elsewhere)
- [x] `Nav.tsx` has no unused imports/vars after the client-component conversion
- [x] `IntersectionObserver` is disconnected on unmount (no leak)
- [x] Reduced-motion path (`useReducedMotion()`) uses `behavior: "auto"` for `scrollIntoView`, not `"smooth"`
- [x] No changes made to any file outside the "Changes" section above
