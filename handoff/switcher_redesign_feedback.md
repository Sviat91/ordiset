# Review Feedback: LanguageSwitcher visual redesign

**Date:** 2026-08-25
**Reviewer:** reviewer agent (read-only) — this file written by orchestrator per project convention
**Verdict:** APPROVED

## Scope reviewed

- `components/LanguageSwitcher.tsx`
- `components/LanguageSwitcher.module.css`

## Findings

1. JSX matches plan exactly: `rootRef` retyped to `useRef<HTMLDivElement>` on a new outer `<div className={styles.root}>`; `<details>` now contains only `<summary>` (trigger); `.menu` moved to a sibling `motion.div` inside `AnimatePresence` with the plan's exact `initial`/`animate`/`exit`/`transition` props, gated by `useReducedMotion()`; chevron converted from Unicode span to inline SVG; `.menu`'s link-rendering logic (`LOCALES.filter(...).map(...)`, `setLocale`/`hrefFor`/`hrefLang`) unchanged, only relocated.
2. Outside-click/Escape `useEffect` body logic untouched — only the ref's generic type changed. `rootRef` correctly sits on the new outer div, so outside-click detection still covers both trigger and menu.
3. CSS matches plan exactly: `.chevron` rule replaced (SVG-appropriate, no more unicode-glyph sizing), `details[open] .chevron` rotation, `details[open] .summary` open-state affordance, `prefers-reduced-motion` block. `.root`/`.menu`/`.item`/`.summary` base rules untouched.
4. `AnimatePresence`/`motion.div` structure is correct for exit animations (motion.div is AnimatePresence's direct conditional child).
5. `StableLabel` usage and `dict.nav.languageLabel` untouched.

No Critical/Architectural or Minor/Syntax issues.

## Independently verified by orchestrator

- `npx tsc --noEmit`: clean
- `npm run lint`: clean
- `npm run build`: succeeds, `/en /uk /pl` still statically generated
- `git status --porcelain`: diff scoped to exactly `components/LanguageSwitcher.tsx` and `components/LanguageSwitcher.module.css` (closing the gap reviewer flagged — it had no Bash access to check this itself)

## Remaining before this feature is fully done

Live verification (click-to-open/close animation, chevron rotation, keyboard/outside-click behavior, `prefers-reduced-motion`) requires a running dev server — not yet performed, same standing dependency as the other two open plans (`layout_shift_plan.md`, `nav_width_shift_plan.md`).
