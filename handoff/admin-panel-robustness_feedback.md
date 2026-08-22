# Feedback: Admin Panel embed robustness fixes

**Date:** 2026-08-22
**Plan:** `handoff/admin-panel-robustness_plan.md`
**Verdict:** APPROVED

## Verification performed

Reviewed `components/DemoStage.tsx` in full against the plan's two fixes:

- **Fix 1 (MutationObserver for auto-click)** — correctly scoped to `contentDocument.body` with `{childList: true, subtree: true}`, plus one immediate synchronous check. Still guarded by `clickedRef` (click-once), bounded by a single ~10s overall timeout, and correctly restarts (disconnecting the previous run's observer/timers first) on every `load` via `loadNonce` — no stale-observer pileup across reloads.
- **Fix 2 (continuous ResizeObserver)** — new observer created inside `handleLoad`, previous instance disconnected before the new one is created each time, separate unmount cleanup effect disconnects whatever the latest instance is via ref (not a stale closure). Confirmed it doesn't interfere with the pre-existing, unrelated outer `ResizeObserver` on the container div.
- `syncNeed()` — confirmed unmodified, still raise-only/monotonic as before.
- No new props on `DemoStage`; `AdminPanelSection.tsx`/`PreviewSection.tsx` confirmed untouched and unaffected (Preview still has no auto-click).
- The coder's live-verification writeup (CDP-attached throttling script simulating a slow first load, sidebar/navigation testing at two viewport sizes) was judged sound and specific, not generic rubber-stamp text — including an honest note that Fix 2's callback is mostly a no-op for this particular vendored app (its `scrollHeight` doesn't change) but remains a correct general safeguard.

## Findings

**Minor (non-blocking, not worth a fix cycle):** `overallTimer` from the auto-click mechanism isn't explicitly cleared at the moment a click succeeds — it still fires ~10s later and calls `.disconnect()` on an already-disconnected observer. Harmless no-op, not a leak. Reviewer explicitly judged this not worth routing back for.

No Critical/Architectural issues.

## Caveat

The reviewer had no Bash access in its session and could not independently re-run `npm run lint`/`npm run build` — it relied on the coder's report (clean) plus its own static read of the file, which showed no obvious issues.

## Outcome

APPROVED. Both fixes are correctly scoped, contained entirely to `DemoStage.tsx`, and verified live against the actual reported symptoms.
