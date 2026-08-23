# Plan: fix DemoStage size getting stuck after in-app navigation

## Context
User reported (with real-iPhone screenshots) that `PreviewSection`'s embedded
demo changes visual size/scale after navigating within it and going back —
e.g. open the site (home view renders at its natural size, "Marek Zawadzki"
on two lines) → tap a specialist → land on "Book a visit" (a taller page,
calendar + service list) → go back to the home view → the home view is now
rendered noticeably smaller/more shrunk than its original load ("Marek
Zawadzki" now fits on one line, photo strip cards visibly smaller). This
happens every time, is disorienting, and matches a bug the user recalls
fighting with "on the mobile version" during earlier work.

Root cause, confirmed in code (`components/DemoStage.tsx`): `syncNeed()`
(lines 66-78) computes the iframe's required content height as a **monotonic
maximum** — `required > Math.max(boxH, prev) ? required : prev` — meaning
`needH` can only ever grow across the component's lifetime, never shrink
back down once a taller in-app view has been visited. `PreviewSection.tsx`
embeds a demo the visitor freely navigates within (home ↔ booking flow) using
plain auto-fit (no `fixedViewport`), which is exactly the scenario this
causes visible breakage for. This is not a guess — the existing type comment
on the `fixedViewport` prop (`DemoStage.tsx` lines 20-29) already documents
this exact defect: *"without this, `minViewportHeight`'s scale-to-fit only
ever grows (see `syncNeed`), so visiting a taller in-app page permanently
shrinks every other page of the same embed."* It was previously flagged as a
known limitation but never fixed for `PreviewSection` (which doesn't use
`fixedViewport`).

**Chosen fix (surgical, not a redesign):** make `syncNeed` always reflect the
*current* content height instead of a historical maximum, so the frame
correctly resizes both up and down as the visitor navigates. This preserves
today's "auto-fit the whole page, no internal scroll" look on every
individual view (including `AdminPanelSection`, which has the same class of
bug) — it only fixes the cross-navigation stickiness. The alternative
(switching `PreviewSection` to a `fixedViewport` — a real desktop-viewport
size with internal scrolling, like `MobileSection`'s phone) would be a bigger
visual/UX change (page no longer auto-fits to show everything at a glance;
would need scrolling inside the frame) and was intentionally not chosen here
— note this alternative in the final report in case the user later wants it,
but do not implement it as part of this plan.

## Steps

- [x] **1. Simplify `syncNeed` to track current height, not a running max**
  - File: `components/DemoStage.tsx`
  - Replace the body of `syncNeed` (lines 66-78) so it sets `needH` directly
    to the freshly-measured `doc.documentElement.scrollHeight`, dropping the
    `Math.max(boxH, prev)` comparison entirely. The downstream `cssH =
    Math.max(box.h, needH)` (line 233, unchanged) already guarantees the
    frame never renders shorter than the container box, so that floor does
    not need to be duplicated inside `syncNeed` itself.
  - Update the `useCallback` dependency array for `syncNeed` — it currently
    depends on `[box]` only because of the `boxH` read inside the old
    comparison; once that's removed, `box` is no longer referenced inside
    `syncNeed`, so the deps array should become `[]`. Confirm this doesn't
    break the effect at lines 80-84 (`useEffect(... , [box, contentNonce,
    syncNeed])`) — `box` is already listed there directly, so it still
    re-triggers correctly on box changes even with a stable `syncNeed`
    reference.
  - Do **not** change `handleLoad`, the `autoClickText`/`tryClick` flow, the
    `ResizeObserver` setup, or the `fixedViewport` branch of the render
    logic — none of them need to change for this fix, and the plan for the
    prior admin-panel work already established `fixedViewport` embeds skip
    this code path entirely (`if (fixedViewport) return;` inside
    `handleLoad`), so `MobileSection` (the only current `fixedViewport`
    consumer) is unaffected by this change either way.

- [x] **2. Update the now-stale part of the `fixedViewport` prop's doc comment**
  - File: `components/DemoStage.tsx`, the `fixedViewport` field's JSDoc
    comment (lines 20-29).
  - Remove the specific claim that's no longer true after step 1 (the
    "without this... permanently shrinks every other page" sentence, and the
    "Use for embeds the visitor navigates around in" framing that was
    specifically about working around that bug). Keep the parts that are
    still accurate: it renders at a fixed CSS-px size representing a literal
    device viewport, uniformly scaled to fit the box, with internal
    scrolling instead of auto-fit, and remains mutually exclusive with
    `minViewportHeight`/auto-fit (content-height tracking still skipped
    entirely when set). Keep this edit small — it's a comment correction,
    not a rewrite of the whole doc block.

## Out of scope
- Do not add `fixedViewport` to `PreviewSection.tsx` or `AdminPanelSection.tsx` — see "Chosen fix" above.
- Do not touch `MobileSection.tsx` (already uses `fixedViewport`, unaffected).
- Any deploy/rebuild of `demo-widget` or `public/demo-app` — this fix lives
  entirely in `components/DemoStage.tsx` (the Next.js app itself, not the
  embedded demo), so no demo-widget rebuild is needed for this one.

## Verification
- [x] `npx tsc --noEmit` at repo root passes.
- [ ] Visual check via `agent-browser` against the **local production build**
      (`npm run build && npm run start` — ask the orchestrator/user before
      starting any server; do not start one unprompted) OR against
      `https://ordiset.com` if it already reflects this change once deployed:
      on the `#preview` section, click through to a specialist's booking
      view, then click back to the home view, and confirm the home view
      renders at the same size/scale it had on first load (compare a
      `get box` measurement of a stable element like the "Choose your
      specialist" heading, or the Marek/Anna photo cards, before and after
      the round trip — sizes should match, not shrink).
