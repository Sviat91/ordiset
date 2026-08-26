# Review Feedback: DemoStage desktop embed progressive-shrink fix

**Date:** 2026-08-26
**Reviewer verdict:** APPROVED
**Orchestrator verification:** independently confirmed

## Critical/Architectural Issues
None.

## Minor Issues (both closed by orchestrator, no coder round-trip needed)

1. **Step 10 static-check output wasn't pasted into the plan.** Closed — orchestrator independently re-ran `npx tsc --noEmit` (clean) and `npm run lint` (clean) directly against the working tree, and appended the results into `handoff/demostage_shrink_plan.md` Step 10.
2. **D8 "fixedViewport branch is byte-identical" claim needed a direct `git diff` check** (reviewer had no Bash access to run one). Closed — orchestrator ran `git diff -- components/DemoStage.tsx` directly: the `if (hasBox && fixedViewport)` style-calculation branch has **zero diff lines**. The only diff line mentioning `fixedViewport` at all is the removal of the now-moot `if (fixedViewport) return;` early guard inside `handleLoad` (planned removal, D8's table item 2) — the branch itself is untouched.

## Independently Reproduced Checks
- `git status --porcelain` → only `components/DemoStage.tsx` modified (plus the new untracked `handoff/demostage_shrink_plan.md`). Diff scope confirmed as exactly one source file, matching AC-2.
- `git diff --stat` → `components/DemoStage.tsx | 98 +++++++++---------------------------------------`, 1 file changed, 18 insertions(+), 80 deletions(-).
- `npx tsc --noEmit` → clean.
- `npm run lint` → clean.

## Passed Checks (per reviewer, all verified against the plan)
- Auto-fit branch matches D1 exactly (no `needH`, `viewportH = Math.max(box.h, minViewportHeight)`, `s = box.h / viewportH`).
- `needH`, `syncNeed`, `contentNonce`, `contentRoRef`, `fonts.ready`, `topUpTimer` fully removed, zero orphaned references anywhere in the codebase.
- `handleLoad` reduced correctly (Step 4).
- Outer `ResizeObserver` effect deps `[]` correct — body references nothing external.
- Auto-click effect deps `[autoClickText, loadNonce]` correct, no staleness risk.
- Imports trimmed correctly (`useCallback` dropped, rest still used).
- JSDoc (Step 9) accurately reflects new semantics, references D1.
- D6 confirmed structurally: no other file references `minViewportHeight`, so `PreviewSection.tsx`/`AdminPanelSection.tsx` needed no edits.
- Plan file: Steps 1–12 and AC-1/AC-2/AC-3 all `[x]`; AC-4–AC-8 correctly left unchecked (live-only).

## Status
**Ready for the user's live verification pass.** Static/code-level work is complete and approved. Nothing further for coder/planner unless live testing (AC-4–AC-8) surfaces a real issue.
