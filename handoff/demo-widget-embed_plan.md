# Plan: embed demo-widget client app into Hero, remove old demo/*

## Goal
Replace the old broken canvas-scaled demo (`components/demo/DemoApp` inside
`Hero.tsx`'s `WindowChrome`) with the fully-built `demo-widget/` app (client
side only, admin comes later). Everything must run from the single root
`npm run dev` command — no second dev server, no second terminal. The
embedded app must load with its real animations, images and styling intact.

## Steps

1. **Fix demo-widget's build so it can live inside another site's folder**
   - Edit `demo-widget/vite.config.ts`: add `base: './'` to the
     `defineConfig({...})` call.
   - Reason: without this, the built `index.html` references assets as
     `/assets/...` and `/favicon.png` (root-absolute), which would collide
     with the ordiset Next site's own root paths once copied into its
     `public/`. `base: './'` makes them relative so the bundle works from
     whatever subfolder it's copied into.

2. **Rebuild demo-widget**
   - `cd demo-widget && npm run build` (runs `tsc -b && vite build`,
     `node_modules` already installed). Confirm it exits clean and
     `dist/index.html` now references relative asset paths
     (`./assets/...`), not root-absolute ones.

3. **Copy the build output into the ordiset Next app's public folder**
   - Remove the old placeholder folders `public/demo/about`,
     `public/demo/brand`, `public/demo/marquee-home`,
     `public/demo/marquee-marek`, `public/demo/masters`,
     `public/demo/reviews` (empty `.gitkeep`-only leftovers from the old,
     now-removed `components/demo/*` approach — nothing references them
     after step 4).
   - Copy `demo-widget/dist/*` → `public/demo-app/` (new folder) in the
     ordiset project, i.e. `public/demo-app/index.html`,
     `public/demo-app/assets/...`, `public/demo-app/*.png`, etc.
   - This is a static copy Next serves automatically from `public/` — no
     extra process, no proxy, works immediately under the existing
     `npm run dev`.

4. **Remove the old dead implementation**
   - Delete the whole `components/demo/` directory (DemoApp, DemoFooter,
     DemoImage, DemoTopBar, Marquee, `booking/`, `data/`, `demoContext.ts`,
     `demoState.ts`, `demoStore.ts`, `lib/calendar.ts`, `pages/`,
     `useDemoScale.ts`, and their `.module.css` files).
   - In `components/sections/Hero.tsx`: remove
     `import DemoApp from "@/components/demo/DemoApp";`.
   - Do **not** touch `Demo.md` at the repo root — that's the client's own
     spec document, not implementation code; leave it as-is.
   - Do **not** touch `components/sections/BookingSiteSection.tsx` /
     `CustomizeSection.tsx` — out of scope for this task, still placeholders
     for later.

5. **Wire the new widget into Hero's existing `WindowChrome` slot**
   - In `Hero.tsx`, inside `<WindowChrome chip="demo.ordiset.com">`, replace
     `<DemoApp />` with an `<iframe>` pointing at `/demo-app/index.html`:
     - `title` set to something descriptive (e.g. "Ordiset live demo").
     - No `sandbox` attribute — same-origin static content, needs its own
       scripts/localStorage to run normally.
   - Add a small class in `Hero.module.css` (next to the existing
     `heroStyles.*` rules) so the iframe fills `WindowChrome`'s `.body`
     completely: `width: 100%; height: 100%; border: 0; display: block;`.
     `WindowChrome`'s outer `.window` already has `overflow: hidden` and
     rounded corners, so the iframe will be clipped to match automatically
     — no extra border-radius needed on the iframe itself.

## Verification
- [x] `demo-widget`: `npm run build` succeeds, `dist/index.html` uses
      relative asset paths.
- [x] `public/demo-app/` exists with `index.html` + `assets/` + images,
      old `public/demo/*` placeholder subfolders gone.
- [x] `components/demo/` directory no longer exists.
- [x] `Hero.tsx` has no reference to the old `DemoApp`/`components/demo`.
- [x] Root project: `npm run lint` and `npm run build` both pass clean
      (confirms nothing else imports the deleted `components/demo/*`).
      `npm run build` passes clean. `npm run lint` initially failed because
      root `eslint.config.mjs` had no ignore for `demo-widget/**` (its own
      separate Vite project, own lint setup) or `public/demo-app/**` (built
      minified output) — added both to `globalIgnores` in
      `eslint.config.mjs`. `npm run lint` now passes clean.
- [x] `npm run dev` at repo root (already running on :3001 from an earlier
      session), Hero section verified in a real browser: no console errors.
      Found and fixed a real bug during this check — Vite's `base` config
      only rewrites asset URLs *it* processes (bundled imports, index.html
      tags); it does not rewrite hardcoded root-absolute strings like
      `'/logo.png'` pointing at files in demo-widget's own `public/` folder,
      which several client-facing files had (`data.ts`, `LogoDisplay.tsx`,
      `ThemeToggle.tsx`, `HomePage.tsx`, `ReviewStrip.tsx`, `PhotoStrip.tsx`,
      `AboutPage.tsx`). Those resolved against the *ordiset* site's root
      instead of `/demo-app/`, breaking the logo/avatar/theme-icon/marquee
      images. Fixed by adding an `asset()` helper in `demo-widget/src/lib/utils.ts`
      (`` `${import.meta.env.BASE_URL}${path}` ``) and routing all of the
      above through it, then rebuilding and re-copying to `public/demo-app/`.
      (Left `admin/pages/DbBrowserPage/mockDbData.ts`'s equivalent literals
      alone — admin-only, out of phase-1 scope.)
      Confirmed via screenshot: logo, theme-toggle icon, and specialist
      photos (Marek/Anna) all render correctly. The app itself (checked
      standalone at full size) is fully functional — heading, both
      specialist cards, marquee strip.
      One layout note, not a bug: the Hero's `WindowChrome` box (pre-existing
      geometry, not part of this task) is short/landscape, so at first paint
      it mostly shows the top nav + centered logo; the rest (specialist
      cards, marquee) is reachable by scrolling inside that window — verified
      the iframe genuinely scrolls (real overflow content, 907px vs 204px
      visible, native scrollbar appears) rather than being clipped/stuck.
