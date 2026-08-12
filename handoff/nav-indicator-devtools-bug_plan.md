# Plan: Nav active-indicator does not track scroll (only "works" with DevTools open)

**Date:** 2026-08-12
**Status:** In Progress
**Supersedes context:** `handoff/nav-indicator-bug_notes.md` (8 prior rounds, all lint/build-clean and code-reviewed, none effective)

---

## Path declaration (required by the task)

**I am taking path (a): a concrete root cause identified by reading the code, with a fix that
structurally eliminates the class of bug.**

Reasoning for choosing (a) over (b): the DevTools-open-vs-closed dependency is fully explained by
a CSS media query that already exists in the codebase, and the "frozen indicator" behaviour is
provable from the layout geometry without running anything. See "Root cause" below.

However — because 8 previous rounds were also "certain" — **Step 0 is a mandatory, zero-code
falsification gate** that the user runs in the browser before a single line is changed. It needs no
instrumentation, no rebuild, and no round-trip through the code: it is one console paste plus one
DevTools docking change. If Step 0 falsifies the theory, we do **not** guess again — we fall back to
the instrumentation plan in "Appendix B" (path (b)) and stop there for that round.

---

## Goal

Make the nav active-indicator track the actually-visible stacked-sticky section during wheel/trackpad
scrolling with DevTools closed, by replacing viewport-geometry-based active-section detection with
scroll-offset-based detection that is definitionally consistent with the (already proven correct)
click scroll target.

---

## Root cause

### The two facts that combine into the bug

**Fact 1 — under the stacked-sticky layout, `computeActiveId()` is mathematically degenerate.**

`components/StackSection.module.css` gives every card `position: sticky; top: 0; min-height: 100svh`,
and all six sections are siblings inside `<main>` (`app/page.tsx`). The sticky constraint rectangle is
the containing block — `<main>` — which spans the *entire* document. Therefore **every section the
user has already scrolled past stays pinned at `rect.top === 0` for the rest of the page**. That is
not a defect; it is exactly the mechanism that produces the "stacked cards" effect.

`Nav.tsx:25-42` picks the section whose rect midpoint is closest to `window.innerHeight / 2`:

- Every pinned card: `rect.top = 0`, `rect.height ≈ 100svh ≈ innerHeight` → `mid ≈ innerHeight/2` → `dist ≈ 0`.
- The Framer `scale` transform (`StackSection.tsx:22`, `1 → 0.96`) does **not** break the tie: scaling
  about the default `transform-origin: 50% 50%` moves `rect.top` down by `(1-s)·h/2` and shrinks
  `rect.height` by the same factor, so `rect.top + rect.height/2` is **exactly unchanged**.
- The incoming (not-yet-pinned) card has `rect.top > 0` → `mid > innerHeight/2` → strictly worse.
- The comparison is `dist < bestDist` (strict), so on a tie the **first** entry of `SECTION_IDS` wins.

⇒ `computeActiveId()` returns a **constant** for essentially the whole page (`"overview"` if the hero
is exactly `100svh`; otherwise whichever pinned card's height is closest to `innerHeight` — still a
constant, and plausibly an intermediate section, which matches the user's "presumably some
intermediate section" guess). `setActiveId(constant)` is a React no-op state write, so nothing
re-renders and the indicator never moves. **This is the reported symptom, exactly: "scrolling does
not move the indicator at all, in either direction."**

**Fact 2 — opening docked DevTools silently switches the page to a completely different layout.**

`components/StackSection.module.css:25-33`:

```
@media (max-width: 899px), (max-height: 700px) {
  .card { position: static; min-height: 0; transform: none !important; ... }
}
```

Docking DevTools to the bottom of a laptop window pushes the viewport under 700px tall; docking to the
right on a typical display pushes it under 899px wide. **Either one flips every card to
`position: static` with natural (much smaller) heights and no transform.** In that layout the sections
occupy disjoint scroll ranges, `getBoundingClientRect()` is meaningful again, and the existing
center-distance math in `computeActiveId()` works perfectly — in both scroll directions, which is
precisely what the user observes with DevTools open.

So the causal chain is: *DevTools docked → viewport crosses a media-query breakpoint → sticky stacking
disabled → geometry stops being degenerate → the indicator "works".* DevTools itself is irrelevant;
only the viewport size it steals is. Nothing about frame rate, CPU throttling, event delivery, or
Framer Motion is involved.

### Why this also explains the click symptoms

- **Adjacent-tab click works.** `scrollToId` (`Nav.tsx:112-120`) sets the correct value optimistically
  and suppresses scroll-driven updates. A short smooth scroll finishes well before the 1000ms fallback,
  `scrollend` clears the suppression *after* the last scroll event, and the optimistic value survives.
- **Multi-section jump reverts backwards and sticks.** A long smooth scroll can outlive the fixed
  `setTimeout(..., 1000)` fallback (`Nav.tsx:117-119`). Suppression is released mid-animation, the very
  next scroll event calls the degenerate `computeActiveId()`, and the constant (a section *earlier*
  than the target) overwrites the correct optimistic value — then never changes again, because the
  function is constant. "Jumps to Notifications correctly, then goes back and lives its own life."
- Note the sticky layout is also several times taller than the static one, so long jumps only exceed
  1000ms with DevTools closed — again consistent.

### Why 8 previous attempts failed

Rounds 8 and 9 replaced the *event source* three times (IntersectionObserver → manual `scroll` +
rAF → Framer `useScroll` + `useMotionValueEvent`) and got the identical symptom every time. That
triple-negative is itself the strongest evidence available: **three independent, correctly-wired event
mechanisms cannot all fail the same way — the bug is in the pure function they all call, not in event
delivery.** Round 7 did touch `computeActiveId`, but only its ordering bias; it kept the
`getBoundingClientRect()`-center model, which is the actual broken assumption. Round 7 was validated
under DevTools-open (i.e. static layout), where that model happens to work.

Equally important: every round was verified by `lint` + `build` + code review. **None of those can
observe a viewport-size-dependent CSS layout branch.** The acceptance criteria in this plan are
therefore behavioural and explicitly require DevTools *undocked*.

---

## Architecture decisions

**AD-1 — Stop deriving the active section from viewport geometry; derive it from scroll offset.**
In a sticky stack the DOM geometry deliberately does not encode "which card is in front" (everything
is at `top: 0`); the scroll offset does. Any `getBoundingClientRect()`-based approach is structurally
unfixable here, and is additionally polluted by the Framer `scale` transform (a suspicion already
raised and never resolved in rounds 3-4). Reading `window.scrollY` and comparing it against the
cumulative flow offsets of the sections removes that entire class of bug.

**AD-2 — Reuse the exact offset table that the click path already uses.**
`getSectionTop` (`Nav.tsx:44-52`, sum of preceding `offsetHeight`s) is the one measurement the user
has confirmed as correct and has told us not to touch. Feeding the *same* table into the active-section
computation makes the click target and the scroll-derived active id **consistent by construction**:
clicking a link scrolls to exactly `T_k`, and at `scrollY === T_k` the detector returns exactly `k`.
The "optimistic click value gets overwritten by a wrong scroll value" failure mode cannot exist any
more, regardless of suppression timing. This is what makes the fix structural rather than a patch.
(It is also valid because nav is `position: fixed` and `* { margin: 0 }`, so `main` starts at document
y=0 and the cumulative sum *is* the document offset — the same premise that makes clicks land right.)

**AD-3 — One formula for both layouts.**
`activeIndex = last k where T_k ≤ scrollY + innerHeight/2` ("the section whose top edge has crossed
the viewport midline"). In the sticky layout that is the card currently covering the lower half of the
viewport; in the `position: static` fallback layout it is the section containing the viewport midline.
No media-query branching in JS, no `getComputedStyle` sniffing, and the DevTools-docked and
DevTools-undocked cases stop being different code paths. It also preserves the original design intent
(`rootMargin: -50%/-50%`, "line through the middle of the screen").

**AD-4 — Do not remove or restructure the suppression mechanism.**
User-confirmed working and explicitly off-limits. After AD-2 it becomes merely cosmetic (it prevents
the indicator from sliding through intermediate tabs during a programmatic scroll); if it releases
early, the final scroll event now lands on the correct section anyway. One narrowly-scoped hardening
is allowed (Step 4) and is independently revertible.

**AD-5 — Falsify before implementing.** See Step 0.

---

## Implementation steps

- [ ] **Step 0 (GATE — no code, user-run, must pass before Step 1): confirm the layout switch.**
  - Files: none.
  - Details: ask the user to run `npm run dev`, open the site, then:
    1. **Undock DevTools into a separate window** (DevTools ⋮ menu → Dock side → "Undock into
       separate window"). The page viewport is now full-size *and* the console is available.
    2. Scroll to the middle of the page with the wheel and paste into the console:
       ```
       ["overview","customize","mobile","booking-site","notifications","contact"].forEach(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();console.log(id,getComputedStyle(e).position,"top",Math.round(r.top),"h",Math.round(r.height),"mid",Math.round(r.top+r.height/2));});console.log("innerHeight",innerHeight,"mq",matchMedia("(max-width: 899px), (max-height: 700px)").matches);
       ```
    3. Re-dock DevTools to the bottom (or right) and run the same snippet again.
  - **Theory is CONFIRMED if:** (undocked) `position` is `sticky`, two or more sections report
    `top 0`, their `mid` values are all ≈ `innerHeight/2`, `mq` is `false`, **and the indicator bug
    still reproduces while DevTools is open-but-undocked**; (docked) `position` is `static` and `mq`
    is `true`.
  - **Theory is FALSIFIED if:** the bug does *not* reproduce with DevTools undocked, or `mq` is
    `false` while docked. In that case → **stop, do not implement Steps 1-4, go to Appendix B.**

- [x] **Step 1: Extract the section-offset table (behaviour-preserving).**
  - Files: `components/Nav.tsx`
  - Details: add a module-scope helper next to `getSectionTop`, e.g.
    `getSectionTops(): { id: string; top: number }[]` — iterate `SECTION_IDS` in order, push
    `{ id, top: runningTotal }` for **every** id (even if `document.getElementById` returns null), then
    add `el.offsetHeight` to `runningTotal` only when the element exists. This reproduces
    `getSectionTop`'s arithmetic exactly, including its "missing element contributes 0" behaviour.
    Rewrite the body of `getSectionTop(id)` to look the id up in that array and return its `top`
    (fallback `0`). Do **not** change its signature, its name, its call site in `scrollToId`, or the
    `offsetHeight` measurement itself — the scroll-to-target behaviour must be byte-for-byte identical.

- [x] **Step 2: Replace the body of `computeActiveId()` with scroll-offset detection.**
  - Files: `components/Nav.tsx` (lines 25-42 today)
  - Details: keep the name, the `(): string | null` signature and both call sites unchanged. New body:
    compute `const line = window.scrollY + window.innerHeight / 2;` then walk `getSectionTops()` in
    order and return the **last** entry whose `top <= line` (entries are ascending, so `break` on the
    first `top > line`); return `null` if there is none. Delete the now-unused
    `getBoundingClientRect`/`bestDist`/off-screen-skip logic — it is dead as a direct result of this
    change, so removing it is in scope. Expected results: `scrollY = 0` → `"overview"`;
    `scrollY = getSectionTop("mobile")` → `"mobile"`. No `getComputedStyle`, no media-query check, no
    `position`-sniffing anywhere.

- [x] **Step 3: Leave the scroll subscription, suppression flag, `scrollend` listener, `scrollToId`,
      `updateIndicator` and the JSX untouched.**
  - Files: `components/Nav.tsx`
  - Details: explicitly a no-op step, listed so it is unambiguous. `useScroll()` +
    `useMotionValueEvent` stay as-is (round 9 proved the event source fires; it was never the problem).
    Do not add `scroll` listeners, do not reintroduce `IntersectionObserver`, do not touch
    `StackSection.tsx`, `StackSection.module.css`, or the `@media (max-width: 899px), (max-height: 700px)`
    block — the fallback layout is an intended design feature, not the bug.

- [x] **Step 4 (optional hardening, do last, independently revertible): make the 1000ms fallback
      non-leaky.**
  - Files: `components/Nav.tsx`
  - Details: store the `window.setTimeout` id from `scrollToId` in a ref; clear any pending timeout at
    the start of each new `scrollToId` call and inside the `scrollend` handler; clear it on unmount.
    Rationale: today a stale timeout from click A can release suppression in the middle of click B's
    animation. After Steps 1-2 this is only a cosmetic flicker, never a stuck wrong state — so if it
    adds any complexity beyond ~6 lines, skip it and say so. **Do not** change the 1000ms value, do not
    make the duration distance-dependent, and do not remove the fallback (the notes' working hypothesis
    proposed those; per the analysis above they address a symptom, not the cause).

- [ ] **Step 5: Verification (there is no test runner in this repo — see Constraints).**
  - Files: none (browser + `npm run lint`, `npm run build`).
  - Details: run the full manual matrix in "Acceptance criteria" **with DevTools undocked or fully
    closed**, then repeat the two most important rows with DevTools docked to prove there is no
    regression in the static layout. Record the outcome per row in the feedback file.

---

## Acceptance criteria

Behavioural (the ones that actually matter — all to be checked with **DevTools closed or undocked**,
i.e. full-size viewport, sticky layout active):

- [ ] Wheel/trackpad scrolling **down** from the top moves the indicator through Overview → Customize
      → Mobile → Booking site → Notifications, each switching roughly as the incoming card's top edge
      crosses the middle of the screen.
- [ ] Wheel/trackpad scrolling **back up** moves it through the same sequence in reverse (no
      directional asymmetry).
- [ ] Scrolling into the Contact section hides the indicator (existing behaviour: `contact` is not in
      `LINKS`); scrolling back up restores it on Notifications.
- [ ] Click on an **adjacent** tab: indicator moves immediately and stays (no regression from round 6).
- [ ] Click **across several tabs** (Overview → Notifications): indicator lands on Notifications and
      **stays** there — no revert, no drift, before *and* after the smooth scroll settles.
- [ ] After any click, resuming wheel scrolling immediately continues from the correct tab (this is the
      case that most cleanly proves the constant-value bug is gone).
- [ ] Same matrix re-checked with DevTools **docked** (static layout): identical, correct behaviour —
      i.e. the fix is layout-independent, not a layout swap.
- [ ] Browser window resized to <900px wide (nav links still visible in the 768-899px band): indicator
      still tracks scrolling.

Mechanical:

- [x] `npm run lint` clean.
- [x] `npm run build` succeeds.
- [x] `getSectionTop`'s returned values and its use in `scrollToId` are unchanged (click still lands
      exactly at the top of the target card).
- [x] Diff touches `components/Nav.tsx` only.
- [x] No `getBoundingClientRect()` remains in the active-section detection path (it may remain in
      `updateIndicator`, which measures nav links — that part is correct and unrelated).

---

## Constraints & risks

**Must not be touched**
- `getSectionTop`'s measurement strategy (`offsetHeight` accumulation) — user-verified working; Step 1
  is a pure extraction, not a rewrite.
- The click mechanism: `preventDefault` → `suppressObserverRef = true` → optimistic `setActiveId` →
  `window.scrollTo`. Only the timeout bookkeeping in Step 4 may change.
- `components/StackSection.tsx`, `StackSection.module.css` (including the `899px/700px` media query),
  `app/page.tsx`, `app/globals.css`, and all section components.
- The `useScroll()` / `useMotionValueEvent` subscription and the Framer `motion.span` indicator
  animation — both proven to work.

**Risks**
1. *Step 0 falsifies the theory.* Mitigated by making Step 0 a hard gate — nothing gets implemented on
   a wrong premise for a 9th time. → Appendix B.
2. *Static-layout sections shorter than half a viewport.* In the `position: static` fallback (only
   reachable at <900px wide or <700px tall, and nav links are hidden entirely below 768px), a section
   shorter than `innerHeight/2` would make the midline fall into the *next* section right after a click
   to it. Detected by the last two acceptance rows. If it occurs, report it in the feedback file rather
   than improvising a threshold — it is a separate, minor, layout-specific decision.
3. *`offsetHeight` is integer-rounded*, so `T_k` can drift by a few px per section. Irrelevant at a
   `innerHeight/2` (~450px) threshold, and it is the same drift the working click path already has.
4. *Sections unstick near the very bottom* (sticky constraint = `main`'s box), so the last few hundred
   px of the page behave slightly differently. The new formula is unaffected — it never reads sticky
   geometry.
5. *No automated test coverage exists*, so "verified" must mean the browser matrix above, not lint +
   build + code review. That combination is exactly what produced 8 false positives.

---

## Appendix A — one-line summary for the reviewer

The indicator is not failing to *update*; `computeActiveId()` is returning the **same value on every
scroll event** because in the sticky stack every passed section sits at `rect.top: 0` with its midpoint
exactly on the viewport centre line. Docked DevTools shrinks the viewport past
`@media (max-width: 899px), (max-height: 700px)`, which disables sticky stacking and accidentally makes
the geometry meaningful again — that, and nothing about DevTools itself, is the "DevTools open works"
effect.

## Appendix B — fallback path (b), only if Step 0 falsifies the theory

Do **not** implement a fix in that case. Instead, land a temporary, clearly-marked instrumentation
patch in `components/Nav.tsx` and hand it back to the user:

- Append records to a global ring buffer (e.g. `window.__navLog`), **not** `console.log`. Chrome does
  not reliably retain console output produced while DevTools was closed, and DevTools-closed is the
  condition under test — logging to the console would destroy the measurement.
- Record, each with `performance.now()`: every `useMotionValueEvent` firing (with `window.scrollY` and
  the `computeActiveId()` result), every `suppressObserverRef` set/clear (with the reason: `click`,
  `scrollend`, or `timeout`), every `scrollend` event, and every `setActiveId` call with its previous
  and next value.
- Cap the buffer at ~500 entries.
- User repro with DevTools closed: reload, scroll down and back up with the wheel, then click
  Overview → Notifications; only then open DevTools and paste `copy(JSON.stringify(window.__navLog))`.
- Repeat with DevTools open from the start and diff the two traces.
- The trace answers the remaining questions directly: are scroll events firing at all, does
  `computeActiveId` return a constant, and when exactly is suppression released relative to the last
  scroll event. Plan the real fix only after reading it.
