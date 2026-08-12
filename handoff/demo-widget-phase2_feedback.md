# Review: demo-widget Phase 2 (Master booking page)
**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
None found.

## Minor/Syntax Issues
- Plan's own acceptance-check comment has internally inconsistent arithmetic ("content 700 ... = 686, 14px slack") — the underlying code and actual total (786/800) are correct; only the plan's prose note is off. No action needed.

## Passed Checks
- [x] **Calendar algorithm** — traced the full math: Sundays close unconditionally (`dow === 0` before any RNG), Saturdays use `mulberry32(hash32(seed,y,m,d,masterSalt))() < 0.25` seeded per (seed, date, master), weekday closures use a proper Fisher–Yates over an array that already excludes Sat/Sun, `monthGrid` returns exactly 42 Monday-first cells with correct flags, `timeSlots` correctly steps 30 min between 10:00–19:00 only while `t + duration <= close`, marks ~30% random-taken OR visitor's own bookings OR past times on today, `toDateISO` builds from local date parts with manual padding — no `toISOString()`, no hardcoded date/year literals.
- [x] **Service data** — `MASTER_SERVICES` matches Demo.md's two tables exactly for all 13 rows, including the intentional Premium Haircut split (180→162 zł Marek, 160→144 zł Anna).
- [x] **Calendar component** — real `<button>`s for every day cell, correct `aria-label`/`aria-pressed`, today/past/closed correctly disabled/styled, prev disabled at current month, next correctly capped at +12 months (arithmetic traced, not just presence of a cap).
- [x] **ServiceSelect** — strikethrough on original price, discounted price visually distinct, all three close paths wired (select/Escape/outside-click). `overflow-y: auto` on the popover list is the only scrollable region added in Phase 2.
- [x] **MasterPage layout** — recomputed the 800px budget independently: 786px total, 14px under budget. `overflow:hidden` rows are structural backstops, not used to force-fit oversized content — bio text and achievements list both fit comfortably, nothing silently clipped.
- [x] **Marquees** — Marek's marquee reuses the untouched Phase 1 `MAREK_MARQUEE` slots. Anna's marquee genuinely mixes distinct types (4 plain reviews, 1 Google-badge, 1 map card), not one repeated card re-skinned.
- [x] **Token/scope discipline** — every `var(--...)` resolves to `--lb-`, no outer-token leakage. `package.json` unchanged. No unexpected modifications outside `data/masters.ts` and `pages/MasterPage.tsx` among Phase 1 files.

## Summary
The calendar algorithm — the highest-stakes file in this phase since it feeds Phase 3's booking flow directly — was traced through the actual math and is correct in every dimension checked: deterministic-but-varying-per-master closures, no hardcoded dates, correct local-date handling avoiding UTC shift bugs. Service pricing data transcribed exactly from Demo.md, including the easy-to-miss per-master price difference. Calendar and ServiceSelect components are accessible and correctly wired. Layout budget independently recomputed and confirmed to fit with margin, without silently clipping content via overflow:hidden. No token leakage, no scope creep.

## Final verdict
**APPROVED**

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` и `npm run build` — чисто, независимо перепроверено.

## Final verdict (orchestrator)
**APPROVED.** Останавливаюсь здесь по просьбе пользователя (лимиты). Фазы 3-6 ещё не начаты.
