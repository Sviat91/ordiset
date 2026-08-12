# Review: demo-widget Phase 1 (Widget foundation + Home page)
**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
None found.

## Minor/Syntax Issues
- **Hero.tsx diff slightly exceeds the plan's "exactly two lines" note**: adds an `import DemoApp from "@/components/demo/DemoApp"` line plus wraps `<WindowChrome chip="demo.ordiset.com"><DemoApp /></WindowChrome>` — functionally exactly what the plan intended, technically 3 changed lines rather than 2. Cosmetic, no action needed.
- **`DemoImage` `sizes="360px"` on home master cards** vs. A5's own suggested `"320px"` — A5 explicitly says this is "not critical." No change required.

## Passed Checks
- [x] Token scoping (A2): zero outer-token references anywhere in `components/demo/**`; zero `--lb-*` leakage into `app/globals.css`/`WindowChrome.module.css`.
- [x] Light/dark `--lb-*` hex values match `Demo.md` §6 exactly, token-for-token.
- [x] Scoped `:focus-visible` override present, overriding the outer accent per A2.
- [x] Scale hook matches `min(width/1280, height/800)` exactly; `setScale` called only inside the `ResizeObserver` callback, matching the accepted `Nav.tsx` lint-workaround pattern.
- [x] Canvas and viewport are both `overflow: hidden`; no other scrollable region anywhere in Phase 1 — no scroll-trapping risk.
- [x] `demoState.ts` reducer is genuinely pure — no `Date.now()`, `Math.random()`, or `localStorage` calls anywhere; only `demoStore.ts` contains those.
- [x] `demoStore.ts` `readStore()` is defensive: try/catch, version check, full shape validation, fresh-store fallback with a new random seed. `writeStore()` try/catch-wrapped.
- [x] Mount sequence traced end-to-end: no `Date`/`localStorage`-dependent render occurs before hydration; no mismatch risk.
- [x] Home page copy verified verbatim against `Demo.md` §1 (heading, subtitle, both master names/roles).
- [x] Footer row matches `Demo.md` §4 exactly; names are inert spans per step 1.6, correctly deferring the button conversion to Phase 4.
- [x] `data/images.ts` slot ids/paths cross-checked against the full client checklist table — every id matches the promised path convention one-for-one; matching empty folders with `.gitkeep` exist.
- [x] `DemoImage.tsx` uses `next/image` exclusively, correctly renders the labeled placeholder when `src` is null.
- [x] Scope discipline confirmed: `WindowChrome.*`, `app/globals.css`, `StackSection.*`, `Nav.*`, `sections.module.css`, `Placeholder.*` all untouched; `components/demo/**` tree exactly matches Phase 1's declared file list — no scope creep into `booking/`, `lib/`, `data/reviews.ts`, `data/copy.ts`.
- [x] `package.json` unchanged. CSS Modules per component, no Tailwind, TypeScript everywhere, all files under 500 lines, no unused imports, `"use client"` applied only where needed.

## Summary
Phase 1 is a clean, faithful implementation of the plan. Token scoping is airtight (verified by grep in both directions), the hydration/SSR-safety chain was traced end-to-end with no mismatch risk, the reducer is provably pure, the localStorage store is defensively validated per A4, and every piece of required copy matches `Demo.md` verbatim. The image manifest's id/path convention is consistent and matches the client-facing checklist exactly — the highest-stakes accuracy check for this phase. Scope discipline is excellent. The only notes are cosmetic and require no changes.

## Final verdict
**APPROVED**

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.

## Final verdict (orchestrator)
**APPROVED.** Переходим к Фазе 2.
