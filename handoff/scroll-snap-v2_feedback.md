# Feedback: Scroll docking v2 (ScrollDock)

**Date:** 2026-08-20
**Plan:** `handoff/scroll-snap-v2_plan.md`
**Verdict:** NEEDS CHANGES — one Critical/Architectural finding, one Minor

## Critical/Architectural

**`restYRef` can go stale if a real wheel gesture interrupts an already in-flight, unarmed programmatic scroll (Nav/Hero click) before that scroll has settled — this can flip the inferred direction and dock to the wrong section.**

`components/ScrollDock.tsx`: `restYRef` is written only inside `settle()` — never continuously during an active scroll. Sequence: user clicks a Nav link (`window.scrollTo` fires, unarmed) → while that animation is still actively moving `scrollY` (before it's gone quiet for `SETTLE_MS`), the user wheels → `arm()` sets `armedRef.current = true` but does not touch `restYRef` (by design, to avoid reintroducing the original passive-listener race this session already fixed once). When the combined gesture eventually settles, `from = restYRef.current` is still the pre-click position, not the true position where the wheel actually started interrupting.

Reviewer's worked counter-example: rest at `y=0`, Nav click targets `2700`. Mid-animation at true `y≈1500` the user wheels a bit further, gesture settles at `y=450`. Real direction relative to the actual interruption point (~1500) is up → should commit forward to 900. Code computes direction against the stale `from=0` → sees `y(450) > from(0)` → down branch → commits backward to 0. Opposite outcomes for the same physical gesture.

This is a different case than the two races already found and fixed this session (arm-time `scrollY` sampling; stale baseline after a *fully completed* Nav/Hero click) — this is "click, then interrupt before it settles," which D3's reasoning doesn't cover and V5's test doesn't exercise (V5 only tests wheel-then-click).

**Recommended routing:** back to planner. The naive fix (sample `scrollY` directly in `arm()`) is exactly what this session's Fix 1 already ruled out for a different reason (passive-listener race), so this needs a real design decision — e.g. tracking a continuously-updated "last observed position" independent of the settle debounce, so an interruption of an in-flight scroll picks up a live baseline instead of a stale one.

## Minor

`ScrollDock.tsx`'s `settle()` writes `restYRef.current = target` immediately when issuing a correction, before the smooth-scroll animation actually reaches it — an anticipated future value rather than an observed one, which is the exact pattern Fix 1 was meant to avoid. Reviewer traced several concrete cases and found this doesn't change outcomes in the single-hop case, so not blocking — but worth simplifying by removing that line and letting the next natural (unarmed) `settle()` record the real position instead, for consistency with the stated invariant.

## Passed checks (reviewer, independently re-derived)

- Steps 1-2 (CSS removal): byte-clean, nothing else disturbed.
- Step 3 (`ScrollDock.tsx`): matches D6's algorithm exactly — every V1/V2 row hand-traced against the actual code and confirmed correct, symmetric row-for-row.
- Step 4 (`app/page.tsx`): mounted correctly, Server Component preserved.
- Step 5 scope: `StackSection.tsx`, `lib/sections.ts` confirmed untouched; `Nav.tsx`/`Hero.tsx` confirmed unrelated to this task (pre-existing changes from earlier in the session).
- No new dependency. `STATIC_STACK_QUERY` byte-identical between the CSS and JS sides.
- V9's "pre-existing, out of scope" reasoning confirmed sound — `StackSection.tsx`'s scale effect is fully independent of `ScrollDock.tsx`.

## Outcome

Not yet APPROVED. The core symmetric-threshold mechanism (this session's main goal — fixing the up/down asymmetry) is solid and independently verified correct. The remaining finding is a narrower edge case (interrupting a still-animating Nav/Hero click) that should be routed to the planner next session before this can be marked fully done.
