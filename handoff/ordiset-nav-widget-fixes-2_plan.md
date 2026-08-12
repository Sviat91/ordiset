# Plan: Nav scroll-up fix (round 2), shared placeholder copy, remove Overview chip, shrink Hero text

## Context
Round 1 (`handoff/ordiset-nav-widget-fixes_plan.md`) fixed the Customize widget collapse and the width/height coupling, but the "Overview" nav link still doesn't scroll back up (down still works). It also didn't go far enough on Hero's text/widget balance, and missed two content issues: two different bespoke placeholder labels between Hero/Customize's `WindowChrome`, and a stray "app.ordiset.com" address chip on Overview's widget that should not be there.

## Changes

### 1. `components/Nav.tsx` — replace `scrollIntoView` with a manually computed `window.scrollTo`
Round 1's fix (`el.scrollIntoView({ behavior, block: "start" })`) still fails scrolling upward to `#overview`. Rather than continue guessing at scrollIntoView's internal target-resolution behavior on `position: sticky` elements (which is a documented source of cross-browser inconsistency), stop depending on it entirely:

```ts
const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
};
```
This computes the absolute target scroll offset once, at click time, from the element's current on-screen position — it does not ask the browser to internally resolve the target relative to a `position: sticky` ancestor chain the way `scrollIntoView` does. Keep everything else in `scrollToId`'s call sites (all 7 links) unchanged.

### 2. `components/WindowChrome.tsx` — reusable placeholder label, no more silent chip default
Two problems in the current component:
- `label` is a required prop and Hero/CustomizeSection each pass their own bespoke string ("Live demo — coming soon" vs "Admin panel — preview coming soon") — the user wants one shared placeholder reused across both instead of two different ones.
- `chip` falls back to a hardcoded `"app.ordiset.com"` when omitted — this is what's putting an address chip on Overview's widget that should not be there.

```tsx
type WindowChromeProps = {
  label?: string;
  chip?: string;
  children?: ReactNode;
};

export default function WindowChrome({
  label = "Preview coming soon",
  chip,
  children,
}: WindowChromeProps) {
  return (
    <div className={styles.window}>
      <div className={styles.titlebar}>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        {chip && <div className={styles.address}>{chip}</div>}
      </div>
      <div className={styles.body}>
        {children ?? <Placeholder label={label} />}
      </div>
    </div>
  );
}
```
Then in `components/sections/Hero.tsx`, change `<WindowChrome label="Live demo — coming soon" />` to `<WindowChrome />` (uses the shared default, no chip — matches the user's request to remove the address text from Overview entirely).
In `components/sections/CustomizeSection.tsx`, change `<WindowChrome label="Admin panel — preview coming soon" chip="admin.ordiset.com" />` to `<WindowChrome chip="admin.ordiset.com" />` (drops its bespoke label in favor of the shared default; keeps its chip, which the user did not ask to remove).

### 3. `components/sections/Hero.module.css` + `Hero.tsx` — shrink Hero's text to free up height for the widget
Round 1 fixed `.grow`'s `align-items` so `WindowChrome` can stretch to fill available height, but the user says it's still too short and has now explicitly asked twice to shrink the headline/body text to give the widget more room. Use higher-specificity selectors scoped through `.content` (a Hero-local class) so these overrides deterministically win over the global/shared rules regardless of CSS file load order — do not edit the shared `h1`/`.body` rules in `globals.css`/`sections.module.css` directly, since those are used by every other section.

In `Hero.module.css`, add:
```css
.content h1 {
  font-size: clamp(2.25rem, 4.5vw, 3.25rem);
}

.content .lede {
  font-size: 0.9375rem;
  line-height: 1.55;
}
```
And tighten the existing `.actions` rule's `margin-top` from `32px` to `20px`.

In `Hero.tsx`, add `heroStyles.lede` to the body paragraph's className alongside the existing `styles.body`:
```tsx
<p className={`${styles.body} ${heroStyles.lede}`}>
```
Leave the eyebrow and other markup untouched.

## Out of scope — do not touch
- Everything listed as out-of-scope in `handoff/ordiset-nav-widget-fixes_plan.md` (`ContactForm.tsx`, `PhoneFrame.tsx`, `StackSection.tsx/.module.css`, phone-widget sections, global `h1`/`.body` tokens, `WindowChrome.module.css`).
- `CustomizeSection`'s own heading/body text sizing — not mentioned as a problem, leave as-is.
- `.grow`'s `align-items: stretch` / `width: 100%` from round 1 — already correct, do not revert.

## Verification checklist
- [x] `npm run lint` clean
- [x] `npm run build` clean
- [x] `Nav.tsx`: no remaining use of `scrollIntoView`; all 7 links use the new `window.scrollTo` handler
- [x] `WindowChrome.tsx`: `.address` chip only renders when `chip` is truthy; `label` has a default value and is no longer a required prop anywhere it's called without one
- [x] `Hero.tsx` and `CustomizeSection.tsx` no longer pass bespoke `label` props
- [x] Hero's h1/body font-size overrides use `.content`-qualified selectors (not bare `h1`/`.body`), confirmed higher specificity than the global/shared rules
- [x] No changes outside the files listed in "Changes" above
