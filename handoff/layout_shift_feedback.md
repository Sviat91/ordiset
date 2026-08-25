# Review Feedback: Locale-invariant text blocks (layout shift on language switch)

**Date:** 2026-08-25
**Reviewer:** reviewer agent (read-only) — this file written by orchestrator per project convention (reviewer has no Write access)
**Verdict:** APPROVED

## Scope reviewed

- `components/StableTextBlock.tsx` (new)
- `components/StableTextBlock.module.css` (new)
- `components/sections/Hero.tsx`
- `components/sections/BookingSiteSection.tsx`
- `components/sections/NotificationsSection.tsx`
- `components/sections/MobileSection.tsx`

## Findings

1. `StableTextBlock.tsx` matches plan Step 3 exactly. Only deviation: an `eslint-disable-next-line react-hooks/set-state-in-effect` comment on the `setGhosts(true)` call — added directly by the orchestrator after the coder flagged the lint rule objecting to the plan's deliberate two-phase-effect pattern (D5). Re-ran `npm run lint` after adding it: clean. Not re-litigated per instructions to the reviewer.
2. Steps 4–7 section wiring all match the plan's exact replacement blocks. `dict`/`d` usage elsewhere (CTA labels, `alt` text, `phoneLabel`, `demoTitle`) untouched, still locale-reactive. `.actions`/`.grow`/`PhoneFrame`/`DemoStage` siblings structurally unchanged.
3. CSS files confirmed byte-identical by the orchestrator via `git diff --stat` on all 4 (`sections.module.css`, `Hero.module.css`, `BookingSiteSection.module.css`, `NotificationsSection.module.css`): zero diff. D10 (keep the `.showcase` min-height floors) holds.
4. Diff scope confirmed via `git status --porcelain`: only the 6 files listed above are new/changed for this feature. (`components/sections/ContactSection.tsx` shows as modified in git status, but that predates this session entirely — pre-existing uncommitted state from the earlier i18n rollout, not touched by this feature's coder or reviewer.)
5. Component logic verified against D1–D11: hydration-safe (ghosts mount only post-hydration via `useLayoutEffect`, first client render matches SSR), `ResizeObserver` observes the 3 variant elements and is cleaned up on unmount, `key={l}` stable across locale switches (no remount), ghosts are `visibility:hidden` + `aria-hidden` + `pointer-events:none` (invisible, inert, out of a11y tree), `offsetHeight`-based measurement (not `getBoundingClientRect`, correctly avoiding the `StackSection` scroll-scale transform).
6. No out-of-scope files touched: `DemoStage.tsx`, `PreviewSection.tsx`, `AdminPanelSection.tsx`, `ContactSection.tsx`, `LocaleProvider.tsx`, `StackSection.*`, `PhoneFrame.*`, `dictionaries/*.json`, `proxy.ts`, `app/**` all confirmed untouched. `LocaleProvider`'s `window.history.replaceState`-based `setLocale` (the round-2 fix this feature must not regress) confirmed intact.

No Critical/Architectural or Minor/Syntax issues.

## Independently verified by orchestrator (reviewer has no Bash access)

- `npx tsc --noEmit`: clean
- `npm run build`: succeeds, `/en /uk /pl` still statically generated
- `npm run lint`: clean (after the eslint-disable fix above)
- `git diff --stat` on the 4 protected CSS files: zero diff
- `git status --porcelain`: diff scope matches plan exactly

## Remaining before this feature is done

Plan Step 1 (baseline measurement) and Step 8 (live verification checklist) require a running dev server via `agent-browser`, per project convention (build-green has proven insufficient for this exact class of bug, twice). Per standing instruction, the orchestrator does not start the dev server — waiting on the user to run `npm run dev` and confirm before live verification proceeds.
