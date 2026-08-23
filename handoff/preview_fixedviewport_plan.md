# Plan: give PreviewSection a fixedViewport variant on mobile

## Context
The previous fix (`handoff/demostage_resize_plan.md` — removing `syncNeed`'s
monotonic-max clamp) was real and correct, but did not fix what the user is
actually seeing: on a **real phone**, pushed to production, `PreviewSection`
still resizes/jumps. Chrome DevTools mobile emulation looks fine — because
DevTools does not simulate Safari/Chrome's mobile address-bar show/hide
animation during scroll, which is almost certainly the actual live culprit
here (this was already suspected earlier in this conversation and could not
be confirmed in headless/CDP testing for exactly that reason).

`PreviewSection`'s current auto-fit mode (`DemoStage` with no `fixedViewport`)
continuously re-measures the *container box* via a `ResizeObserver` on
`.stage` (see `components/DemoStage.tsx` lines ~50-64) and the *iframe
content height* via `syncNeed`. Even with the monotonic-max bug fixed, this
whole mechanism is still live/reactive on every box or content resize — on a
real phone, address-bar animation can perturb the actual rendered layout in
ways DevTools never exercises, re-triggering this measurement loop mid-scroll.

`MobileSection.tsx` already sidesteps this entirely by passing
`fixedViewport={{ width: 390, height: 844 }}` to its `DemoStage` — in that
mode (`components/DemoStage.tsx` lines ~217-231), the rendered size depends
*only* on the container box vs. the fixed target dimensions (a `Math.max`
cover-scale), and `handleLoad` explicitly skips all content-height tracking
(`if (fixedViewport) return;` — no `syncNeed`, no content `ResizeObserver`
ever gets attached). This is the most robust option already proven in this
codebase, which is why the user wants the same approach applied to
`PreviewSection` — not more tuning of the auto-fit path.

**User's stated preference from the prior round (do not regress this):**
`PreviewSection`'s *frame* should stay the plain `WindowChrome` look (no
phone bezel) — the earlier `AdminPanelSection` phone-frame experiment was
explicitly reverted because switching to `PhoneFrame` looked inconsistent
with `PreviewSection`. So this plan must NOT introduce a `PhoneFrame` bezel
here. Only the sizing *mechanism* (`fixedViewport`) changes, not the visual
chrome — both variants below use `WindowChrome`.

Desktop is not reported as broken and a single global `fixedViewport` cannot
cover both a wide/landscape desktop box and a narrow/portrait mobile box
without severe cropping (cover-scale math: a landscape target inside a
portrait box, or vice versa, crops one axis badly — verify this yourself
with the box dimensions before assuming otherwise). So this needs to be
viewport-conditional: mobile gets `fixedViewport`, desktop keeps the current
auto-fit behavior unchanged.

## Steps

- [x] **1. Render two `WindowChrome`+`DemoStage` variants in `PreviewSection`, CSS-toggled**
  - File: `components/sections/PreviewSection.tsx`
  - Mirror the exact CSS-toggle pattern already used once in this codebase
    (`git log`/`git show` the now-reverted commit that added
    `.desktopOnly`/`.mobileOnly` to `AdminPanelSection.tsx` if useful context
    — the class names and media queries below reproduce that same idea).
  - Keep the existing desktop variant exactly as it is today (`WindowChrome
    chrome={false}` wrapping `DemoStage` with `src="/demo-app/index.html"`,
    `title="Ordiset live demo"`, `reloadOnStorageKey="ordiset-demo-brand"`,
    no `fixedViewport`), wrapped in `${styles.growFull} ${styles.desktopOnly}`.
  - Add a second variant, same `WindowChrome chrome={false}` wrapper (do
    **not** use `PhoneFrame` here — see Context), wrapping a `DemoStage`
    with the same `src` and `reloadOnStorageKey`, but a distinct `title`
    (e.g. `"Ordiset live demo (compact)"` — avoid reusing
    `MobileSection.tsx`'s exact `"Ordiset live demo (mobile)"` string, since
    that's a different, already-existing instance) and
    `fixedViewport={{ width: 390, height: 844 }}` (same phone dimensions
    `MobileSection.tsx` and the previously-reverted `AdminPanelSection.tsx`
    mobile variant both used). Wrap this one in `styles.growFull` +
    `styles.mobileOnly` (same `growFull` class as the desktop variant — it's
    still a `WindowChrome`, not a `PhoneFrame`, so it needs the same
    full-bleed centering wrapper, unlike the phone-frame case which needed
    its own dedicated centering class).

- [x] **2. Re-add the `.desktopOnly`/`.mobileOnly` CSS toggle**
  - File: `components/sections/sections.module.css`
  - Add back `.desktopOnly` and `.mobileOnly` plus their two complementary
    media queries, exactly as they existed before being removed in the prior
    round (check git history for the exact prior CSS — same breakpoint,
    `(max-width: 899px), (max-height: 700px)` mirroring `STATIC_STACK_QUERY`
    in `components/ScrollDock.tsx`). This time `.mobileOnly` wraps a
    `WindowChrome` (full-bleed), not a `PhoneFrame` (centered phone), so
    double-check whether `.mobileOnly`'s own flex-centering rules
    (`display:flex; align-items:center; justify-content:center`) are still
    appropriate here or whether the desktop variant's plain `.growFull`
    alone is sufficient without additional centering — reason about this
    from what `.growFull` already does (`display:flex; align-items:stretch;
    justify-content:center`) rather than assuming the old CSS is correct
    for this new use unmodified.

## Out of scope
- Do not touch `AdminPanelSection.tsx` or `MobileSection.tsx` — this plan is
  scoped to `PreviewSection.tsx` only, per the user's message (which was
  specifically about the "Choose your specialist" / "Book a visit" preview
  flow, i.e. `#preview`, not `#admin`).
- Do not revert or touch the `components/DemoStage.tsx` `syncNeed` fix from
  the previous round — it's still correct and still needed for the desktop
  auto-fit variant (and for `AdminPanelSection`, which still uses auto-fit).
- No `demo-widget`/`public/demo-app` rebuild needed — this change is entirely
  in the Next.js app's own components.

## Verification
- [x] `npx tsc --noEmit` at repo root passes.
- [ ] Visual check via `agent-browser` on a mobile-emulated viewport (390x844):
      confirm `#preview` now renders via the `fixedViewport` variant (check
      the iframe's `style.width`/`style.height` are exactly `390`/`844` times
      some constant scale, not varying with content) — and confirm it does
      **not** change size/scale when navigating within the demo (home →
      click a specialist → book a visit → back), by comparing a `get box`
      measurement of the frame before and after.
  - Acknowledge in the report that DevTools/CDP emulation cannot reproduce
    the real mobile address-bar animation that's the actual suspected root
    cause here — this check confirms the `fixedViewport` mechanism itself
    engages and stays size-stable across in-app navigation, but final
    confirmation of the original real-phone bug requires the user's own
    device after deploy.
- [ ] Confirm desktop viewport (e.g. 1440x900) still shows the unchanged
      auto-fit `WindowChrome` embed exactly as before this change.
