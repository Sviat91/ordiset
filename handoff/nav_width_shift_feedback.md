# Review Feedback: Locale-invariant element widths (horizontal shift) + compact nav

**Date:** 2026-08-25
**Reviewer:** reviewer agent (read-only) — this file written by orchestrator per project convention
**Verdict:** APPROVED

## Scope reviewed

- `components/StableLabel.tsx` (new)
- `components/StableLabel.module.css` (new)
- `components/Nav.tsx`
- `components/Nav.module.css`
- `components/sections/Hero.tsx`
- `components/ContactForm.tsx`
- `components/LanguageSwitcher.tsx`

## Findings

1. `StableLabel.tsx` / `StableLabel.module.css` byte-for-byte match plan Steps 2–3: pure CSS grid-stack reservation (no measurement/effects, unlike `StableTextBlock`), `visibility:hidden` ghosts (not `display:none`), cross-fade timings and `prefers-reduced-motion` handling per D11.
2. `Nav.tsx`: only the two `StableLabel` call sites (link label, CTA label) changed; active-link indicator effect (D7) and `linkRefs` wiring untouched.
3. `Nav.module.css`: exactly the D8 compaction (4 properties) + D9's `fit-content` pill media block; `.brand`/`.mark`/`.wordmark`/`.indicator`/breakpoint block untouched.
4. `Hero.tsx`/`ContactForm.tsx`: only the CTA/submit label swapped for `StableLabel`; `Hero.module.css`/`ContactForm.module.css` confirmed **zero diff** by orchestrator via `git diff --stat` (reviewer had no Bash access to check this itself — closed the gap below).
5. `LanguageSwitcher.tsx`: chip label wired per Step 7's "gate passed" branch (`pick: (dict, locale) => string`, `Locale` imported) — implemented on the assumption D6's gate passes (estimated ≈2.2px delta > 1px threshold), since the coder had no dev server to measure live. **Still needs live confirmation — see below.**
6. Grid mechanics verified correct: `display:grid` + `grid-area:1/1` + `white-space:nowrap` on children sizes the track to the widest variant's `max-content`; `justify-items:center` centers the active label within it. No collapse risk.
7. No out-of-scope files touched (grepped for `StableLabel` usage repo-wide — confined to the 6 expected component files).

No Critical/Architectural or Minor/Syntax issues.

## Independently verified by orchestrator (closing the reviewer's Bash gap)

- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean (from coder's report, not re-run here — already green per prior message)
- `git diff --stat` on `Hero.module.css` and `ContactForm.module.css`: **zero diff**, confirmed
- `git status --porcelain`: diff scope matches exactly the 7 files above (plus pre-existing unrelated `M`/`??` entries from the earlier i18n rollout sessions, not from this feature)

## Still open before this feature is fully done

1. **Step 1 (baseline) + Step 10 (live verification)** — require a running dev server via `agent-browser`. Waiting on the user to start `npm run dev`.
2. **D6 gate for `LanguageSwitcher`** — Step 1's live measurement of the chip's cross-locale width delta decides whether Step 7 stays as implemented, or gets reverted (dropping the now-unused `locale` param from `StableLabel`'s `pick` signature) if the real delta is ≤1px. This is not a defect — it's exactly what the plan specified as a measurement-gated step, just executed provisionally because the coder had no dev server.
3. **D9's `fit-content` pill is a visible design change** flagged to the user in advance (nav no longer stretches to `--maxw`, it hugs its now locale-invariant content, ~24% narrower) — needs their eyes on the live result, with a one-block revert path documented in the plan if they don't like it.
