# Feedback: Admin Panel section + cross-iframe brand sync

**Date:** 2026-08-22
**Plan:** `handoff/admin-panel_plan.md`
**Verdict:** APPROVED

## Verification performed

Cross-checked every file the coder touched against the plan's Architecture Decisions:

- `components/DemoStage.tsx` — D3 (bounded auto-click poll), D4 (`needH`/`contentNonce` reset re-measurement), D7 (1s storage-poll fallback, selected over D5 after Step 1's live probe found `storage` events do not cross a same-origin child iframe → parent boundary) all implemented exactly as specified.
- `components/sections/AdminPanelSection.tsx` (new) — full-bleed embed mirroring `PreviewSection`, `z={3}`, `autoClickText="View admin demo"`, no `reloadOnStorageKey` (correct — it's the writer, must not self-reload).
- `components/sections/PreviewSection.tsx` — only addition is `reloadOnStorageKey="ordiset-demo-brand"`; no `autoClickText` (correct — must not auto-navigate).
- `app/page.tsx` — `AdminPanelSection` inserted between Preview and Mobile, z-order comment updated.
- `lib/sections.ts` — `"admin"` inserted into `SECTION_IDS` between `"preview"`/`"mobile"`; `getSectionTops`/`getSectionTop` bodies byte-identical (the `el.offsetHeight` invariant preserved).
- `components/Nav.tsx` — `{ href: "#admin", label: "Admin panel" }` inserted at the correct position, nothing else changed.
- `components/sections/MobileSection.tsx`/`BookingSiteSection.tsx`/`NotificationsSection.tsx` — exactly one `z` literal changed each (4/5/6), no other diffs.
- `components/sections/ContactSection.module.css` — `z-index: 7` confirmed.
- Z-index cascade verified literal-by-literal: Hero=1, Preview=2, Admin=3, Mobile=4, BookingSite=5, Notifications=6, Contact=7. Ascending, no collisions.
- `StackSection.tsx`, `WindowChrome.tsx`, `DemoStage.module.css`, `ScrollDock.tsx` — confirmed untouched, no plan-forbidden edits.
- `ScrollDock.tsx`'s `STATIC_STACK_QUERY` vs `StackSection.module.css`'s media query — confirmed byte-identical (V9).
- `public/demo-app/assets/*` and `public/demo-app/index.html` — confirmed untouched (black-box constraint respected).

**The coder's own mid-task bug fix** (plan's `instanceof HTMLElement` check replaced with a type cast, since elements from the iframe's own JS realm have a distinct `HTMLElement` constructor than the parent page — a cross-realm `instanceof` pitfall) — reviewed and confirmed correct. The selector (`"button, a"`) already guarantees a clickable element; the cast doesn't drop any real type-safety net.

**Verification Plan (V1-V12)** — recorded results in the plan file are concrete (real pixel dimensions, real `needH`/scale numbers, real timing) and consistent with what the shipped code actually does, not rubber-stamped checkmarks.

## Findings

None. No Critical/Architectural issues, no Minor/Syntax issues.

## Outcome

APPROVED. Faithful, disciplined execution of the plan — every architecture decision reflected correctly, z-index cascade fully consistent, both risk mechanisms (D3 auto-click poll, D7 sync fallback) implemented exactly as specified with a genuinely-executed live probe selecting D7 over D5. All "must not touch" constraints respected.
