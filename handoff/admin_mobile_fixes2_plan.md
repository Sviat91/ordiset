# Plan: undo Admin phone-frame, fix collapsed sidebar clipping, rebuild demo

## Context
User tested the previous change on the live site and gave concrete feedback
(screenshots) on three points:

1. **Inconsistent framing.** `AdminPanelSection`'s new mobile variant uses
   `PhoneFrame` (a phone bezel with a notch/"island"), while `PreviewSection`
   on mobile still uses the plain `WindowChrome` (rounded rect, no bezel).
   User compared both and explicitly prefers the `WindowChrome` look — it's
   already viewable on mobile, and a dedicated real-phone preview already
   exists lower on the page (`MobileSection`, id="mobile"), so a second
   phone-bezel instance for the admin demo is redundant. **Decision: revert
   `AdminPanelSection` to always render the single `WindowChrome`+`DemoStage`
   embed (no viewport-based variant), matching `PreviewSection`.**

2. **Burger still shows empty in the user's screenshot.** This is almost
   certainly *not* a code bug — it's the previous session's `AdminSidebar`
   fix (`alwaysVisible` prop) not being live yet. `demo-widget` is a separate
   Vite app; its build output is committed as a static copy under
   `public/demo-app/`, and nothing auto-syncs the two. The `alwaysVisible`
   fix only exists in `demo-widget/src/...` source right now — `public/demo-app/`
   still has the old bundle. This plan includes rebuilding `demo-widget` and
   refreshing `public/demo-app/` so the fix (and the new one below) are
   actually present in what gets deployed. Do not re-diagnose the empty-burger
   issue in code — the previous fix (`alwaysVisible` on the mobile-drawer
   `AdminSidebar` instance in `AdminApp.tsx`) was reviewed and approved; only
   rebuild/verify it.

3. **New real bug: collapsed sidebar clips.** On desktop, collapsing the
   admin sidebar to its icon-only rail (`w-[72px]`) visually overlaps/clips
   the header row, because it renders *two* 32px icon buttons (the brand's
   scissors logo + the collapse toggle) plus `px-4` padding and a `gap-2` —
   that needs ~104px in a 72px rail. There's already a **runtime-only CSS
   patch** for this exact overflow in `components/DemoStage.tsx` (search
   `__sidebar-clip-fix`) that zeroes the row's padding to make both icons
   *just* fit. User doesn't want a tighter fit — they want the scissors logo
   gone entirely when collapsed, leaving only the burger/menu toggle. This
   also makes the runtime patch unnecessary (one 32px icon + 16px padding
   each side = 64px, comfortably under 72px) — remove it, don't leave dead
   workaround code for a problem that no longer exists once the root cause
   (rendering the logo icon in a rail with no room for it) is fixed at the
   source.

## Steps

- [x] **1. Revert `AdminPanelSection` to a single unconditional embed**
  - File: `components/sections/AdminPanelSection.tsx`
  - Remove the `PhoneFrame` import and the whole `<div className={styles.mobileOnly}>...</div>` block (the phone-frame variant added last session).
  - Remove the `styles.desktopOnly` class from the remaining wrapper div —
    it should go back to exactly `className={`${styles.growFull}`}` around
    the existing `WindowChrome`/`DemoStage`, with `DemoStage`'s props
    unchanged (`src="/demo-app/index.html"`, `title="Ordiset admin panel demo"`,
    `autoClickText="View admin demo"`).
  - End state: this file should be functionally identical to what it was
    before last session's phone-frame change (i.e. matching the same shape
    as `PreviewSection.tsx` — single `WindowChrome`+`DemoStage`, no viewport
    branching).

- [x] **2. Remove the now-unused CSS**
  - File: `components/sections/sections.module.css`
  - Remove `.mobileOnly`, `.desktopOnly`, and their two media-query blocks
    (added last session, lines ~102-121 as of this writing). Confirm first
    with a repo-wide grep that nothing else references `mobileOnly`/
    `desktopOnly` before deleting (as of this plan, only
    `AdminPanelSection.tsx` uses them, and step 1 removes that usage).

- [x] **3. Hide the scissors logo icon when the sidebar is collapsed**
  - File: `demo-widget/src/admin/AdminSidebar.tsx`
  - In the header row (`<div className="flex h-16 items-center gap-2 border-b border-border px-4">`,
    around line 29), wrap the existing scissors-icon `<div>` (the
    `bg-primary/10 text-primary` box containing `<Scissors ... />`, lines
    30-32) in `{open && ( ... )}`, mirroring how the brand-name `<span>` right
    after it is already conditional on `open`. Do not change the `Menu`
    toggle button below it — it already gets `mx-auto` when `!open`, which
    will now correctly center it alone in the row.
  - Result: collapsed rail shows only the burger/menu toggle button,
    centered; expanded rail is unchanged (scissors icon + brand name + menu
    toggle, exactly as today).

- [x] **4. Remove the now-obsolete runtime sidebar-clip-fix patch**
  - File: `components/DemoStage.tsx`
  - Inside `handleLoad`, in the `try { const doc = ... }` block, remove the
    comment (`// The vendored demo's collapsed admin sidebar...` through
    `...no-op if the markup changes).`) and the
    `if (doc && !doc.getElementById("__sidebar-clip-fix")) { ... }` block
    that follows it (search `__sidebar-clip-fix` to find the exact lines).
    Do **not** touch the `ResizeObserver`/`contentRoRef` code directly above
    it in the same `try` block, or the `fonts.ready` block that follows in a
    separate `try` — both are unrelated and still needed.

- [x] **5. Rebuild `demo-widget` and refresh `public/demo-app/`**
  - Read `demo-widget/package.json`'s `build` script first — don't assume
    the command. Run it from inside `demo-widget/`.
  - Copy the resulting `demo-widget/dist/` output over `public/demo-app/` at
    the repo root (check how `public/demo-app/` is currently structured
    relative to `demo-widget/dist/` before copying — e.g. whether it's a
    flat copy of `dist`'s contents — so the copy lands in the right shape;
    don't guess, compare directory listings first).
  - This step is required for steps 3 and 4's fixes, and the *previous*
    session's `alwaysVisible` fix, to actually be present in what the site
    serves — none of them live in `demo-widget/src` alone.

## Out of scope
- `PreviewSection.tsx` / `MobileSection.tsx` — unchanged, already correct
  per user feedback (points 1 and 2 above reference them only as the target
  look / the existing mobile preview, not as files to edit).
- Any deploy of the main Next.js app itself, or server-side action — the
  orchestrator will decide with the user whether/how to deploy after this
  is verified locally.

## Verification
- [x] `npx tsc --noEmit` at repo root passes.
- [x] Inside `demo-widget/`: run its real typecheck/build command (from its
      `package.json`, not an assumed one) and confirm it passes.
- [x] Grep confirms zero remaining references to `mobileOnly`, `desktopOnly`,
      and `__sidebar-clip-fix` anywhere in the repo (outside this plan file).
- [x] Report the exact `cp`/copy command used for `public/demo-app/` and its
      output, so the orchestrator can double check nothing was silently
      skipped or partially copied.
