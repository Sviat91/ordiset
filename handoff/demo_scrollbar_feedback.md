# Review: demo_scrollbar

**Date:** 2026-09-01
**Verdict:** APPROVED

## Verified against plan (`handoff/demo_scrollbar_plan.md`)

- Only `components/DemoStage.tsx` touched — no other files reference the new
  style-injection logic.
- No `public/demo-app/*` files touched.
- Injected CSS only uses `scrollbar-width: none`, `-ms-overflow-style: none`,
  and `::-webkit-scrollbar { display: none }` — no `overflow: hidden` or
  `scrolling="no"` anywhere in the injected block or the `<iframe>` JSX. The
  lone pre-existing `overflow: hidden` in the file is an unrelated comment
  about the frame's own clipping, not part of this change.
- Injection happens inside the existing `handleLoad`, guarded by
  `doc?.head && !doc.getElementById("demo-stage-hide-scrollbar")` to prevent
  double-insertion, and wrapped in the same `try { } catch { }` pattern
  already used elsewhere in the file for `contentDocument` access.
- Runs unconditionally — not gated on `fixedViewport`. All 4 call sites
  (`MobileSection`, `PreviewSection`, `AdminPanelSection` desktop + mobile —
  confirmed 2 `<DemoStage` occurrences in `AdminPanelSection.tsx`, 1 each in
  `MobileSection.tsx`/`PreviewSection.tsx`) route through this shared
  component, so the fix applies to all of them automatically.
- Implementation notes in the plan file report clean `tsc`, `eslint`, and
  `npm run build`; `git diff --stat` scoped to `components/DemoStage.tsx`
  only (26 insertions).

No Critical/Architectural or Minor/Syntax issues found.

## Orchestrator independent re-check

- `git diff --stat` re-run: confirmed single file, 26 insertions, no other
  paths touched.
- `git status --porcelain -- public/demo-app`: no output.
- Read the final `handleLoad` in `components/DemoStage.tsx` directly:
  injection is scoped to hiding scrollbar chrome only, matches plan exactly,
  reuses the existing try/catch idiom already present in the file for
  `autoClickText`'s `contentDocument` access.

Reviewer had no Write access, per established convention — this file was
authored by the orchestrator from the reviewer's reported findings.
