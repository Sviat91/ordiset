# Plan: LanguageSwitcher visual redesign (chevron + animated open/close)

**Date:** 2026-08-25
**Status:** In Progress
**Mode:** LIGHT (visual-only polish of one component pair, clear requirements, low risk — orchestrator-authored plan per CLAUDE.md LIGHT flow)

## Goal

User (after confirming the jitter fixes are good) asked for the language switcher to actually look nice: a properly centered/pretty chevron, and a smooth open/close for the dropdown instead of the current instant show/hide. Their words (paraphrased): "make the toggle pretty, the arrow centered or nicer, so it opens down nicely, not just appears — smooth, pleasant, doesn't annoy."

## Why this needs a small mechanism adjustment, not just CSS

Native `<details>` cannot animate its own closing: the browser hides non-`<summary>` children the instant the `open` attribute is removed (no transition is possible on that hide, in any mainstream-supported way, without relying on very new/inconsistent CSS features). The current `LanguageSwitcher.tsx` has `.menu` as a direct child of `<details>`, so no close animation is achievable as-is.

**Fix: keep `<details>`/`<summary>` as the trigger (free `aria-expanded`, native click/keyboard activation — this part is genuinely unchanged), but move `.menu` to be a sibling of `<details>` instead of its child, and drive its visibility with `framer-motion`'s `AnimatePresence` (already a project dependency — used in `Nav.tsx` and `StackSection.tsx`, no new package).** This sidesteps the native hide entirely; `.menu`'s mount/animate/unmount is now fully our own code, so both open and close can animate.

**Accepted tradeoff:** the no-JS fallback (menu reachable via `<details>` alone with JS disabled) is lost, since `.menu` is now conditionally rendered by React. The site already requires JS for its core UX everywhere else (scroll-stacked sections, nav active-indicator, all 9 dictionary-driven components), so this was never load-bearing — noting it here for the record, not asking for re-confirmation.

Everything else about the mechanism stays: `open` state, the outside-click/Escape `useEffect`, `setLocale` on item click, `hrefFor`/`hrefLang` real links.

## Implementation

**File: `components/LanguageSwitcher.tsx`**

1. Change `rootRef`'s type from `useRef<HTMLDetailsElement>` to `useRef<HTMLDivElement>` — it now needs to wrap both the trigger and the menu so outside-click detection still covers both.
2. Restructure the return to:
   ```tsx
   import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
   // ...
   const prefersReducedMotion = useReducedMotion();
   // ...
   return (
     <div className={styles.root} ref={rootRef}>
       <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
         <summary ref={summaryRef} className={styles.summary} aria-label={dict.nav.languageLabel}>
           <StableLabel pick={(_, l) => LOCALE_LABELS[l]} />
           <svg className={styles.chevron} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
             <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
           </svg>
         </summary>
       </details>
       <AnimatePresence>
         {open && (
           <motion.div
             className={styles.menu}
             initial={{ opacity: 0, y: -6, scale: 0.98 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -6, scale: 0.98 }}
             transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
             style={{ transformOrigin: "top right" }}
           >
             {LOCALES.filter((l) => l !== locale).map((l) => (
               <a
                 key={l}
                 href={hrefFor(l)}
                 hrefLang={l}
                 className={styles.item}
                 onClick={(e) => {
                   e.preventDefault();
                   setOpen(false);
                   setLocale(l);
                 }}
               >
                 {LOCALE_LABELS[l]}
               </a>
             ))}
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
   ```
3. `.menu`'s content (the `LOCALES.filter(...).map(...)` block) is unchanged — only its wrapping element moves from a plain `<div>` (child of `<details>`) to `motion.div` (sibling of `<details>`, inside the new outer `<div className={styles.root}>`).
4. The chevron changes from the Unicode `⌄` span to an inline SVG (crisp, precisely centered via its own `viewBox`, avoids font-dependent glyph misalignment). Rotation is driven by a plain CSS attribute selector (`details[open] .chevron`, see CSS below) — no extra JSX state needed for this.
5. Do not touch: the outside-click/Escape `useEffect` body (only the ref's generic type changes), `setLocale`, `hrefFor`, the `LOCALES.filter` logic, `dict.nav.languageLabel` usage.

**File: `components/LanguageSwitcher.module.css`**

1. `.chevron` — replace the unicode-glyph rule with SVG-appropriate styling:
   ```css
   .chevron {
     flex-shrink: 0;
     color: currentColor;
     transition: transform 0.2s ease;
   }

   details[open] .chevron {
     transform: rotate(180deg);
   }

   @media (prefers-reduced-motion: reduce) {
     .chevron {
       transition: none;
     }
   }
   ```
   (Remove the old `.chevron { font-size: 0.7rem; line-height: 1; }` rule — no longer applicable to an SVG.)
2. Add an open-state affordance on the trigger chip, using the same native attribute selector (no JS class needed, `details[open]` reflects the controlled `open` prop synchronously):
   ```css
   details[open] .summary {
     background: var(--bg-elevated);
     border-color: var(--border-strong);
     color: var(--text);
   }
   ```
3. `.root` stays `position: relative` — unchanged, now applies to the wrapping `<div>` instead of `<details>` (same effective coordinate system for `.menu`'s `position: absolute`, no other CSS change needed there).
4. `.menu`, `.item`, `.summary` (base rule), `.summary::-webkit-details-marker`, `.summary:hover` — unchanged.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.
- Live (`agent-browser`, once the dev server is available): click the switcher — menu fades/slides in over ~160ms; click elsewhere or press Escape — menu fades/slides out (not an instant cut); chevron rotates 180° when open; keyboard: Tab to the chip, Enter/Space opens it, Tab reaches the menu items, Escape closes and returns focus to the chip (existing behavior, must still work); `prefers-reduced-motion: reduce` emulated — swap is instant, no motion.
- Confirm outside-click still closes the menu when clicking anywhere outside the new outer `<div className={styles.root}>` (not just outside the old `<details>`).
- Confirm no locale-switch regression: clicking a menu item still calls `setLocale` (no `router.push`, no remount) — quick smoke check, not a re-verification of the whole i18n mechanism.

## Constraints

- No new dependency (framer-motion is already used in `Nav.tsx`/`StackSection.tsx`).
- Don't touch `StableLabel.*`, `LocaleProvider.tsx`, `lib/**`, or anything outside `components/LanguageSwitcher.tsx` / `components/LanguageSwitcher.module.css`.
- Surgical: the `.menu` content block, `setLocale`/`hrefFor` logic, and the outside-click/Escape effect body are moved/kept as-is, not rewritten.
