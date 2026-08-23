# Review: PreviewSection fixedViewport mobile variant
**Date:** 2026-08-23
**Verdict:** APPROVED

## Critical/Architectural Issues
None.

## Minor/Syntax Issues
None.

## Passed Checks
- [x] Two CSS-toggled `WindowChrome`+`DemoStage` variants implemented per plan step 1 in `PreviewSection.tsx`.
- [x] `.desktopOnly`/`.mobileOnly` CSS toggle re-added in `sections.module.css`; media queries verified exact logical complements of `STATIC_STACK_QUERY` (`ScrollDock.tsx:13`).
- [x] Coder's judgment call verified correct via full cascade trace: `.mobileOnly` correctly has no centering rules of its own (would override `.growFull`'s `align-items:stretch` at equal specificity, breaking the height chain). Full chain traced: `.growFull` (stretch) → `WindowChrome`'s `.window` (fills height) → `.bodyFull` (`height:100%`) → `DemoStage`'s `.stage` (`height:100%`) — definite height delivered correctly in both variants.
- [x] No unused/missing imports in `PreviewSection.tsx`.
- [x] Props correct: both instances share `src` and `reloadOnStorageKey`; desktop variant byte-identical to before; mobile variant has a distinct title (`"Ordiset live demo (compact)"`, no collision with `MobileSection.tsx`'s `"Ordiset live demo (mobile)"`) and `fixedViewport={{width:390,height:844}}` matching `MobileSection.tsx`'s dimensions.
- [x] Out-of-scope files (`AdminPanelSection.tsx`, `MobileSection.tsx`, `DemoStage.tsx`) confirmed untouched this round.

## Summary
`PreviewSection` now gets a `fixedViewport` variant on mobile/short viewports (same 899px/700px breakpoint used site-wide), matching `MobileSection`'s already-proven approach, while keeping the `WindowChrome` look (no `PhoneFrame` bezel) on both variants for visual consistency. Desktop is unchanged. This removes `PreviewSection`'s mobile rendering from the content-height/box-tracking machinery entirely (the real suspected culprit on actual devices, which DevTools emulation can't reproduce), rather than continuing to tune the auto-fit path.
