# Plan: hide native scrollbar chrome inside embedded demo iframes

## Root cause
`components/DemoStage.tsx` embeds the same built SPA (`public/demo-app/index.html`)
in all four call sites (`MobileSection`, `PreviewSection`, `AdminPanelSection`
desktop + mobile). That SPA's content is taller/wider than the viewport it's
rendered at in both branches (`fixedViewport`'s hard-coded 390x844, and the
auto-fit branch's `max(box.h, minViewportHeight)`), so the embedded document
scrolls internally by design — real phones do the same. What was never done
is suppressing the *browser-native scrollbar chrome* for that internal
scroll. On trackpad-only macOS, overlay scrollbars auto-hide so this was
invisible; connect an external monitor (which typically brings a mouse into
play) and macOS switches to classic always-visible scrollbars, exposing them
on every scrollable element inside the iframe (main body scroll, plus at
least one horizontally-scrollable row) — reported by the user as scrollbar
bars on multiple edges of the phone frame.

Fix belongs in `DemoStage.tsx` only (one file, benefits all 4 call sites) —
not in `public/demo-app/*` (a built Vite artifact, no source in this repo,
would be silently lost on any future rebuild of that sub-app).

## Fix
In `DemoStage.tsx`'s existing `handleLoad` (the `onLoad` handler, already the
single choke point every real page load passes through — SPA in-app
navigation doesn't refire `load`, so a style tag injected here persists
across client-side route changes and only needs re-injection on an actual
reload, which `handleLoad` already receives), inject a `<style>` element into
`iframeRef.current.contentDocument.head` that hides scrollbar chrome without
disabling scroll:

```css
html, body { scrollbar-width: none; -ms-overflow-style: none; }
html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
```

- `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }`
  (Chrome/Safari/Edge) only hide the bar's rendering — the element stays
  scrollable via wheel/touch/keyboard. Do **not** use `overflow: hidden` or
  `scrolling="no"` anywhere — both would kill the intentional internal
  scroll, not just its chrome.
- Wrap the `contentDocument` access in the same `try { } catch { }` pattern
  already used twice in this file (cross-origin or not-yet-accessible
  safety) — copy that guard, don't invent a new one.
- Guard against double-inserting the same style tag with an `id` check
  (cheap, harmless if actually unreachable given the `load`-per-real-nav
  argument above — belt and suspenders, not load-bearing).
- This runs unconditionally in `handleLoad`, regardless of which style
  branch (`fixedViewport` vs auto-fit) is active — both are equally
  susceptible, so don't gate it behind `fixedViewport`.

## Acceptance criteria
- [x] `tsc`/`lint`/build clean.
- [x] `git diff` touches only `components/DemoStage.tsx`.
- [x] No `public/demo-app/*` files touched.
- [x] The injected style hides scrollbar chrome (`display: none` /
      `scrollbar-width: none`), never `overflow: hidden` / `scrolling="no"` —
      internal scroll must remain fully functional, only its visible chrome
      is suppressed.
- [x] Injection happens inside the existing `handleLoad`, wrapped in the same
      try/catch pattern already used elsewhere in this file for
      `contentDocument` access.
- [x] Applies to all four `DemoStage` call sites (no new prop, no branching
      on `fixedViewport`).

## Implementation notes

`components/DemoStage.tsx`'s `handleLoad` now injects a `<style
id="demo-stage-hide-scrollbar">` tag into `iframeRef.current.contentDocument
.head` (guarded by a `getElementById` check and wrapped in try/catch, same
pattern as the existing `contentDocument` access in the auto-click effect).
Runs unconditionally, not gated on `fixedViewport`, so it applies to all four
call sites (`MobileSection`, `PreviewSection`, `AdminPanelSection` desktop +
mobile) since they all route through the same `DemoStage` component.

Commands run from repo root:

```
$ git diff --stat
 components/DemoStage.tsx | 26 ++++++++++++++++++++++++++
 1 file changed, 26 insertions(+)

$ git status --porcelain -- public/demo-app
(no output — nothing touched)

$ npx tsc --noEmit
(no output — clean)

$ npx eslint components/DemoStage.tsx
(no output — clean)

$ npm run build
▲ Next.js 16.3.0 (Turbopack)
✓ Compiled successfully in 1951ms
  Running TypeScript ...
  Finished TypeScript in 986ms ...
✓ Generating static pages using 7 workers (9/9) in 140ms
  Finalizing page optimization ...
(build succeeded, all routes generated)
```
