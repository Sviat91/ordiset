# Plan: reuse the existing PhoneFrame mobile pattern for Preview and Admin

## Context
The just-shipped `PreviewSection` fix (`handoff/preview_fixedviewport_plan.md`
— a mobile-only `WindowChrome` wrapping a `fixedViewport` `DemoStage`)
rendered badly on the user's real device ("вообще ненормально показывается").
User's explicit instruction: throw that out, and instead reuse the mobile
treatment that **already exists and already works** —
`MobileSection.tsx`'s pattern (`PhoneFrame` wrapping a `DemoStage` with
`fixedViewport={{width:390,height:844}}`) — as the narrow-screen variant for
**both** `PreviewSection` and `AdminPanelSection`. Desktop stays exactly as
it is today for both (`WindowChrome` + auto-fit `DemoStage`, unchanged).
`MobileSection.tsx` itself is not touched — it's the reference pattern being
mirrored, not modified.

This resolves the earlier "inconsistent framing" complaint (from the
Admin-panel rounds) the other direction: instead of making mobile-Admin
match mobile-Preview by removing `PhoneFrame` from Admin, both
mobile-Preview and mobile-Admin now consistently use `PhoneFrame`, matching
each other and matching the existing `MobileSection`. Desktop keeps its own
separate, unrelated `WindowChrome` look for both — that was never the part
that was broken.

## Steps

- [x] **1. `PreviewSection.tsx`: replace the `WindowChrome` mobile variant with `PhoneFrame`**
  - File: `components/sections/PreviewSection.tsx`
  - Remove the `.mobileOnly` `WindowChrome`+`DemoStage` block added in the
    previous round (the one with `title="Ordiset live demo (compact)"`).
  - Add `PhoneFrame` to the imports (from `@/components/PhoneFrame`, same as
    `MobileSection.tsx`).
  - Replace it with: `<div className={styles.mobileOnly}><PhoneFrame
    label="Live demo preview — coming soon"><DemoStage
    src="/demo-app/index.html" title="Ordiset live demo (preview, mobile)"
    reloadOnStorageKey="ordiset-demo-brand" fixedViewport={{ width: 390,
    height: 844 }} /></PhoneFrame></div>` — note this `<div>` wraps only
    `styles.mobileOnly` (no `styles.growFull` this time — `PhoneFrame` is an
    intrinsically-sized element that needs its own centering, not the
    stretch-to-fill behavior `WindowChrome` needed; see step 3).
  - Leave the desktop variant (`${styles.growFull} ${styles.desktopOnly}`
    wrapping the existing `WindowChrome`+`DemoStage`, `title="Ordiset live
    demo"`, no `fixedViewport`) completely unchanged.
  - Title must not collide with any other `DemoStage` `title` in the app —
    `MobileSection.tsx` already uses `"Ordiset live demo (mobile)"`, so this
    new instance uses `"Ordiset live demo (preview, mobile)"` instead.

- [x] **2. `AdminPanelSection.tsx`: restore the `PhoneFrame` mobile variant**
  - File: `components/sections/AdminPanelSection.tsx`
  - This is exactly what existed in the first admin-panel round before it
    was reverted (`handoff/admin_mobile_plan.md`, step 2) — restore it:
    add `PhoneFrame` import, wrap the existing `WindowChrome`+`DemoStage` in
    `${styles.growFull} ${styles.desktopOnly}`, and add a new
    `<div className={styles.mobileOnly}><PhoneFrame label="Admin panel
    preview — coming soon"><DemoStage src="/demo-app/index.html"
    title="Ordiset admin panel demo (mobile)" autoClickText="View admin
    demo" fixedViewport={{ width: 390, height: 844 }} /></PhoneFrame></div>`
    block (keep `autoClickText` — the mobile view should also land on the
    admin screen, not the client homepage, matching the original round-1
    reasoning).

- [x] **3. `sections.module.css`: `.mobileOnly` needs its centering rules back**
  - File: `components/sections/sections.module.css`
  - The current `.mobileOnly` (added in the just-reverted round) is a pure
    `display: none` toggle with no other rules, because it was combined
    with `.growFull` on a `WindowChrome` wrapper. Both new mobile variants
    (steps 1 and 2) wrap a `PhoneFrame` instead, used standalone (not
    combined with `.growFull`) — so `.mobileOnly` needs its centering rules
    added back: `display: flex; align-items: center; justify-content:
    center; width: 100%; height: 100%;` alongside its existing `display:
    none` inside the media query. (This is exactly what `.mobileOnly` looked
    like in the first admin-panel round — check
    `handoff/admin_mobile_plan.md` step 3 for the exact original block if
    useful, but verify it's still correct for two consumers now, not one.)
  - `.desktopOnly` stays a pure display-toggle (no other rules) — unchanged,
    used together with `.growFull` on both files' `WindowChrome` wrappers,
    exactly as it already is for `AdminPanelSection.tsx`'s desktop variant.
  - Keep the same breakpoint/media queries already in the file (mirroring
    `STATIC_STACK_QUERY` in `components/ScrollDock.tsx`) — do not change the
    breakpoint values themselves, only add the missing rules to
    `.mobileOnly`.

## Out of scope
- `MobileSection.tsx` — do not touch; it's the pattern being mirrored, not modified.
- `components/DemoStage.tsx` — do not touch; the `syncNeed` fix from an
  earlier round stays as-is and is unrelated to this change.
- No `demo-widget`/`public/demo-app` rebuild needed — entirely a Next.js-app-side change.

## Verification
- [x] `npx tsc --noEmit` at repo root passes.
- [x] `npm run build` passes.
- [x] Grep confirms no duplicate `DemoStage` `title` strings anywhere in
      `components/sections/*.tsx` (5 instances total after this change:
      Preview desktop, Preview mobile, Admin desktop, Admin mobile, Mobile
      section — all must have distinct `title` values).
- [ ] Visual check via `agent-browser` at a mobile viewport (390x844):
      confirm both `#preview` and `#admin` now render inside a phone bezel
      (`PhoneFrame`, with the notch/island visible) rather than a bare
      `WindowChrome` rounded rect, and that neither changes size while
      scrolling or navigating within the embedded demo.
- [ ] Visual check at a desktop viewport (e.g. 1440x900): confirm both
      sections still render exactly as before — plain `WindowChrome`, no
      phone bezel, unchanged from the current production look.
