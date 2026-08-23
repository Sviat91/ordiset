# Plan: Admin panel — mobile burger fix + phone-frame view on narrow screens

## Context
Two related bugs reported by the user after testing the live site (ordiset.com) on mobile:

1. **Admin demo's mobile burger menu is empty.** `demo-widget/src/admin/AdminApp.tsx`
   renders `<AdminSidebar>` inside its own mobile drawer (the `lg:hidden` overlay
   opened by the topbar's hamburger button), but `AdminSidebar`'s root `<aside>`
   (`demo-widget/src/admin/AdminSidebar.tsx:22-25`) carries `hidden lg:flex` as a
   base class — meaning it renders `display:none` below the `lg` breakpoint
   regardless of context. So the drawer overlay opens, but the sidebar content
   inside it is invisible. Confirmed via code read; this is a real, unconditional
   bug (affects the admin demo everywhere it's embedded below `lg` width, not
   just this site).

2. **`AdminPanelSection` (`components/sections/AdminPanelSection.tsx`) shows the
   desktop `WindowChrome`+auto-fit-`DemoStage` embed at all viewport sizes.** On a
   real phone, the iframe's own internal viewport ends up ~448px wide (auto-fit
   scaling still renders desktop-width content, just visually shrunk), which is
   narrower than demo-widget's own `lg` breakpoint — so the embedded admin demo
   is *always* in its own mobile/burger layout inside that iframe, hitting bug
   #1. User chose: on narrow/short viewports, this section should switch to the
   same phone-frame (`PhoneFrame` + `DemoStage` `fixedViewport`) treatment
   `MobileSection` already uses, instead of the desktop chrome.

Breakpoint to reuse (already the site's single source of truth for
mobile/"static-layout" mode — do not invent a new one):
`(max-width: 899px), (max-height: 700px)` — see `STATIC_STACK_QUERY` in
`components/ScrollDock.tsx:13` and the mirrored media query in
`components/StackSection.module.css:26`.

## Steps

- [x] **1. Fix `AdminSidebar` visibility so it renders inside the mobile drawer**
  - File: `demo-widget/src/admin/AdminSidebar.tsx`
  - Add an optional prop, e.g. `alwaysVisible?: boolean` (default `false`), to
    `AdminSidebarProps`.
  - In the root `<aside>`'s `cn(...)` call, replace the hardcoded
    `'hidden lg:flex'` with a conditional: `alwaysVisible ? 'flex' : 'hidden lg:flex'`.
    Keep everything else (`h-full flex-col overflow-hidden border-r ...`,
    `open ? 'w-60' : 'w-[72px]'`) unchanged.
  - File: `demo-widget/src/admin/AdminApp.tsx`
  - On the `<AdminSidebar>` instance rendered inside the mobile drawer
    (currently `<AdminSidebar section={section} onNavigate={handleNavigate} open={true} onToggleOpen={() => {}} onBackToSite={navigateHome} />`
    around line 86), add `alwaysVisible`. Do **not** touch the other
    (persistent desktop) `<AdminSidebar>` instance on line 77 — it must keep
    its current `hidden lg:flex` behavior unchanged.
  - This demo has its own separate build (`demo-widget/package.json`'s
    `build` script: `tsc -b && vite build`) whose output lives in
    `demo-widget/dist` and is served as static files under `/demo-app/` by the
    Next.js app (see `public/demo-app/` — confirm this is how it's wired
    before assuming a rebuild step; if `public/demo-app` is a built copy of
    `demo-widget/dist`, note in the report that the demo needs rebuilding
    for this fix to show up on the actual site, but do not perform a deploy).

- [x] **2. Add a mobile phone-frame variant to `AdminPanelSection`**
  - File: `components/sections/AdminPanelSection.tsx`
  - Currently renders only: `StackSection > .containerWide.fill > .growFull >
    WindowChrome(chrome=false) > DemoStage(src="/demo-app/index.html",
    title="Ordiset admin panel demo", autoClickText="View admin demo")`.
  - Change to render **both** variants side by side in the DOM, each wrapped
    in a new CSS-module class that toggles via the shared breakpoint (see
    step 3) — mirror the existing sticky/static CSS-only switching pattern
    already used elsewhere in this codebase (no JS `matchMedia`/hook, no
    conditional mounting logic):
    - Desktop variant (existing markup, unchanged): `WindowChrome` +
      `DemoStage` with the same props as today, wrapped in a new
      `styles.desktopOnly` class alongside the existing `styles.growFull`.
    - Mobile variant (new): `PhoneFrame` (imported from
      `@/components/PhoneFrame`, same as `MobileSection.tsx` does) wrapping a
      `DemoStage` with `src="/demo-app/index.html"`,
      `title="Ordiset admin panel demo (mobile)"` (distinct title, matching
      the `MobileSection` naming convention of appending " (mobile)"),
      `autoClickText="View admin demo"` (keep — the mobile view should also
      land on the admin screen, not the client homepage), and
      `fixedViewport={{ width: 390, height: 844 }}` (same phone size
      `MobileSection.tsx` uses). Give `PhoneFrame` a `label` prop, e.g.
      `"Admin panel preview — coming soon"` (matches `MobileSection`'s
      `label` usage; it's the `Placeholder` fallback text, not visible once
      `DemoStage` mounts as children). Wrap this in a new
      `styles.mobileOnly` class.
  - Do not add any heading/eyebrow/body copy — `AdminPanelSection` has none
    today (confirmed by reading `app/page.tsx` and the current component);
    don't invent copy that wasn't requested.

- [x] **3. Add the two toggle classes to `components/sections/sections.module.css`**
  - Add `.desktopOnly` and `.mobileOnly` classes. `.mobileOnly` needs its own
    centering (it is NOT going inside `.growFull`, which is tuned for the
    full-bleed `WindowChrome`, not a fixed-aspect-ratio phone): `display:
    flex; align-items: center; justify-content: center; width: 100%;
    height: 100%;`. `.desktopOnly` needs no extra rules of its own — it's
    applied on the same element that already has `.growFull` (per step 2),
    just add the media-query hiding.
  - Media queries — copy the exact breakpoint from `STATIC_STACK_QUERY`
    (`components/ScrollDock.tsx:13`), split into its complementary pair:
    ```css
    /* Mirrors STATIC_STACK_QUERY in components/ScrollDock.tsx — keep in sync */
    @media (max-width: 899px), (max-height: 700px) {
      .desktopOnly {
        display: none;
      }
    }

    @media (min-width: 900px) and (min-height: 701px) {
      .mobileOnly {
        display: none;
      }
    }
    ```
  - Double-check the two queries are exact complements of each other (every
    viewport hides exactly one variant, never both/neither).

## Out of scope (do not touch)
- `PreviewSection.tsx` and `MobileSection.tsx` — not part of this request.
- The "resize jumps while scrolling" concern raised earlier in the
  conversation — user's chosen fix for `AdminPanelSection` (phone-frame on
  mobile) addresses the practical symptom for that section; no separate
  `DemoStage` auto-fit/ResizeObserver changes are in scope here.
- Any deploy/server-side step.

## Verification
- [x] `npx tsc --noEmit` (or `npm run build`) at repo root passes.
- [x] Inside `demo-widget/`: `npx tsc -b --noEmit` (or equivalent) passes for
      the `AdminSidebar`/`AdminApp` change — check `demo-widget/package.json`
      for the right command; don't assume, read it first.
- [ ] Visual check via `agent-browser` (do NOT start any dev server — test
      against the already-deployed `https://ordiset.com` unless a plan
      reviewer/user says otherwise): mobile viewport (390x844) on the `#admin`
      section shows a phone-frame demo instead of the desktop chrome; opening
      the demo's hamburger inside that phone frame shows visible nav items,
      not an empty panel. Desktop viewport (e.g. 1440x900) still shows the
      original `WindowChrome` embed unchanged.
