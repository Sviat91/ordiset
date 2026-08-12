# Review: Nav scroll-spy indicator, anchor-scroll fix, widget sizing fixes
**Date:** 2026-08-12
**Verdict:** APPROVED

## Critical/Architectural Issues
(none found)

## Minor/Syntax Issues
(none found)

## Passed Checks
- [x] `.grow` fix scope: `components/sections/sections.module.css:29-36` — `width: 100%` and `align-items: stretch` correctly added. Confirmed via grep that `.grow` is referenced only by `Hero.tsx:31` and `CustomizeSection.tsx:19`. All three `.split`-based phone sections (`MobileSection.tsx`, `BookingSiteSection.tsx`, `NotificationsSection.tsx`) use `.split`/`.centerY`/`PhoneFrame` exclusively and never touch `.grow` — zero risk of regression to those sections.
- [x] `Hero.module.css:60-63` `.visual` correctly adds `max-width: 90%` alongside the pre-existing `width: 100%`; no cascade collision since `.grow` (loaded from a different module) also declares `width: 100%` in agreement, not conflict.
- [x] `WindowChrome.module.css` untouched (confirmed by direct read) — its `.body { flex: 1 1 auto; min-height: 0; aspect-ratio: 16/10 }` already supports the stretch fix as the plan claimed, no change needed or made.
- [x] `Nav.tsx` correctly converted to `"use client"` client component.
- [x] IntersectionObserver (`Nav.tsx:34-52`) is correctly instantiated with `rootMargin: "-50% 0px -50% 0px"` over all 6 `SECTION_IDS` (including `contact`, which has no nav link) and is disconnected in the `useEffect` cleanup (`return () => observer.disconnect()`) — no leak. Effect deps `[]` is correct since it only uses `document.getElementById` (stable DOM lookup) and the stable `setActiveId` setter.
- [x] activeId computation logic is sound: the callback only calls `setActiveId` for entries where `entry.isIntersecting === true`, never for entries transitioning to `false`. This avoids a plausible race during the sticky-card handoff (where a leaving section's callback could otherwise stomp the newly active section) — verified by reading `StackSection.tsx`/`StackSection.module.css` to understand the sticky+scale stacking mechanism.
- [x] Indicator positioning (`Nav.tsx:54-77`): second `useEffect` correctly depends on `[activeId]`, computes `left`/`width` via `activeLink.getBoundingClientRect().left - linksEl.getBoundingClientRect().left` (correctly relative to the `.links` container, which now has `position: relative` per `Nav.module.css:60`), recomputes on `window resize`, and cleans up the resize listener. Indicator correctly hidden (`setIndicator(null)`) when `activeId` is `contact` or `null`/not yet determined, matching the plan's explicit requirement.
- [x] Click handlers: `scrollToId(id)` factory (`Nav.tsx:79-85`) is wired via `onClick` on the brand/logo link (`#overview`), all 5 `LINKS` anchors, and the `Contact` CTA — all 7 interactive links covered. Each calls `e.preventDefault()` then `scrollIntoView({ behavior, block: "start" })`.
- [x] Reduced-motion branch correct: `behavior: prefersReducedMotion ? "auto" : "smooth"` (`Nav.tsx:82`), and the indicator's Framer Motion `transition` is set to `{ duration: 0 }` under reduced motion (`Nav.tsx:127`) — both branches verified to use `"auto"`, never `"smooth"`, under reduced motion.
- [x] Type safety: ref callback pattern on each link (`Nav.tsx:113-116`) uses the standard `(el) => { if (el) ... else ... }` idiom with implicit `void` return — valid callback-ref signature, no type issues. `linkRefs` typed as `useRef<Map<string, HTMLAnchorElement>>(new Map())`, `linksRef` typed as `useRef<HTMLElement>(null)` matching the `<nav>` element. No `any` usage observed.
- [x] `LINKS` array unchanged in content/order (Overview, Customize, Mobile, Booking site, Notifications) and matches `SECTION_IDS` order and `app/page.tsx` render order (Hero→Customize→Mobile→BookingSite→Notifications→Contact, z=1..6).
- [x] Scope discipline: confirmed by direct read that `WindowChrome.tsx` is untouched. Grep for `.grow`/`.visual` usage across `components/` shows only the two intended call sites. No modifications found in `ContactForm.tsx`, `PhoneFrame.tsx`, `Placeholder.tsx`, `StackSection.tsx`/`.module.css`, `MobileSection.tsx`, `BookingSiteSection.tsx`, `NotificationsSection.tsx`, or global `h1`/`.body` typography tokens — all consistent with the plan's "out of scope" list.

## Summary
The implementation matches the plan precisely on all five verification axes requested. The `.grow` fix is correctly scoped and provably cannot affect the `.split`-based phone sections (grep-confirmed single-consumer usage). The Nav.tsx scroll-spy is well-constructed: the IntersectionObserver is properly torn down, its `isIntersecting`-only filtering avoids a plausible stale-activeId race during the sticky-card stacking transition (verified by independently reading `StackSection.tsx` to understand the layout mechanism rather than trusting the plan), and the indicator positioning math is correctly container-relative with a resize listener for correctness across viewport changes. All 7 clickable nav elements get `preventDefault` + `scrollIntoView`, and the reduced-motion branch correctly uses `"auto"` in both the scroll and the indicator's Framer Motion transition. No out-of-scope files were touched. Reviewer had no Bash access and did not re-run `npm run lint`/`npm run build` — see orchestrator follow-up below.

## Final verdict
**APPROVED** — no changes required.

---

## Orchestrator follow-up (lint/build + own verification)

- `npm run lint` and `npm run build` run independently — both pass clean (Turbopack build, 4/4 static pages generated, TypeScript passed).
- Read `Nav.tsx` and `Nav.module.css` directly: confirms the reviewer's description precisely — `isIntersecting`-only filtering in the observer callback, container-relative `getBoundingClientRect()` math for the indicator, `scrollToId` wired to all 7 links (brand, 5 nav links, CTA), reduced-motion branch using `"auto"`/`{ duration: 0 }`.
- `.indicator` (`Nav.module.css:76-83`) renders as a 2px accent bar at `bottom: -6px` inside `.links` (which now has `position: relative`) — a thin sliding strip under the active link's text, matching the user's request ("полоса, которая переезжает плавно"). `.row` has no `overflow` rule, so the indicator won't get clipped.

## Final verdict (orchestrator)
**APPROVED.** All four reported issues addressed and independently verified: scroll-spy indicator implemented, anchor-scroll-up bug fixed via explicit `scrollIntoView`, Customize widget collapse fixed, Overview widget narrowed with its height decoupled from width via the `.grow` stretch fix.
