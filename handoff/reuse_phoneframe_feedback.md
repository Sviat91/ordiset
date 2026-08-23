# Review: reuse PhoneFrame mobile pattern for Preview + Admin
**Date:** 2026-08-23
**Verdict:** APPROVED

## Critical/Architectural Issues
None.

## Minor/Syntax Issues
None.

## Passed Checks
- [x] Both `PreviewSection.tsx` and `AdminPanelSection.tsx` have a standalone `.mobileOnly`-wrapped `<PhoneFrame>` wrapping `DemoStage` with `fixedViewport={{width:390,height:844}}`, and an unchanged `.growFull .desktopOnly`-wrapped `<WindowChrome>` desktop variant.
- [x] All 5 `DemoStage` titles across `components/sections/*.tsx` are distinct (Preview desktop/mobile, Admin desktop/mobile, Mobile section).
- [x] `reloadOnStorageKey`/`autoClickText` correctly preserved on Preview's/Admin's mobile variants respectively.
- [x] `.mobileOnly` is a correct base rule (flex-centering), not nested inside a media query; `.desktopOnly`/`.mobileOnly` media queries remain exact logical complements of `STATIC_STACK_QUERY`.
- [x] `MobileSection.tsx` and `DemoStage.tsx` unmodified — the reference pattern was mirrored, not touched.
- [x] No orphaned references to the reverted round's `"Ordiset live demo (compact)"` title anywhere in source.
- [x] Imports, JSX, className construction all correct in both files.

## Summary
Both `PreviewSection` and `AdminPanelSection` now show the same already-proven `PhoneFrame` + `fixedViewport` phone view as `MobileSection` on narrow/short viewports, and are unchanged (`WindowChrome` auto-fit) on desktop. No issues found.
