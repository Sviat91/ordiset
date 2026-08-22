# Plan: Admin Panel section + cross-iframe brand sync

**Date:** 2026-08-22
**Status:** Complete — all steps implemented, V1–V12 verified live, lint/build clean

## Goal

Add an "Admin panel" stacked section between Preview and Mobile that embeds the existing `/demo-app` bundle auto-navigated to its admin dashboard, and make the Preview embed visually pick up brand/colour changes saved from that admin embed without a manual page reload.

---

## Findings from planning research (read this first — several contradict or extend the brief)

These were verified by reading the actual files/bundle during planning. They change the design, so they are recorded before the decisions.

**F1 — The demo bundle re-hydrates the *full* brand from `localStorage` at mount. This is what makes the whole feature work.**
`public/demo-app/assets/index-BXJx9uiR.js` contains:
```js
const _y="ordiset-demo-brand", Jl={name:"Loom & Blade",secondaryColor:"#F8F9FA",primaryColor:"#EAECEE",…}
function hj(){try{const e=localStorage.getItem(_y);return e?{...Jl,...JSON.parse(e)}:Jl}catch{return Jl}}
function pj(e){localStorage.setItem(_y,JSON.stringify(e))}
```
`hj()` is the loader: saved JSON is merged over the defaults at mount. So **reloading an already-loaded iframe is sufficient** to make it adopt a brand saved by another instance — the whole palette, not just an accent. No bundle patching needed.

**F2 — `index.html`'s inline pre-mount accent script is dead code (key-name mismatch). The brief's premise about it is wrong, but harmlessly so.**
`public/demo-app/index.html` line 32 reads `brand.darkAccent` / `brand.lightAccent`. The persisted object (F1) has no such keys — it has `accentColor` / `darkAccentColor`. So `accent` is always `undefined`, the `if (accent)` guard never passes, and nothing is pre-applied. Grep confirms `lightAccent` appears **only** in `index.html`, never in the bundle.
Consequences: (a) the correctness of this feature does **not** depend on that script — it depends on F1; (b) there will be a brief flash of the *default* accent between the Preview iframe reloading and the bundle mounting. Cosmetic only. See D8 for how this is handled (default: leave it alone).

**F3 — `localStorage` is written only on explicit "Save changes", not on every colour-picker change. No debounce needed.**
The brand provider is:
```js
function l(u){s(d=>({...d,...u})),a(!0)}          // updateDraft — draft state only, sets dirty
function c(){n(r),pj(r),a(!1)}                     // saveDraft — commits + ONE setItem
```
`pj` (the `setItem`) is called only from `saveDraft`. So one save = one `storage` event = one Preview reload. The "reload storm" risk I was asked to consider does not exist. (A cheap `oldValue === newValue` guard is still specified in D5, for the "user hits Save having changed nothing" case.)

**F4 — The target button is a real `<button>` with no id/data-attribute; text matching is the only viable hook, and it self-destructs after the click.**
```js
function rO(){const{navigateToAdmin:e}=jn();return i.jsx("button",{onClick:e,className:"fixed bottom-3 right-3 z-50 …",children:"View admin demo →"})}
function nO(){const{view:e}=jn();if(e.name==="admin")return i.jsx(tO,{}); …}
```
`nO` early-returns the admin app when `view.name === "admin"`, and the layout that renders `rO` is *not* part of that branch — so **after the click the button is removed from the DOM**. That gives a free idempotency property: a second click attempt can never find it. View state is plain React context state (`{name:"admin"}`) — confirmed not persisted, not in the URL. Text match it is.

**F5 — The bundle renders inside its own `<React.StrictMode>`, and Next.js defaults `reactStrictMode: true`** (`next.config.ts` sets no options). So our own effects double-invoke in dev. A ref guard is mandatory, not optional.

**F6 — The brief's "zero matches for storage/postMessage" claim is right in substance.** There is exactly one `postMessage` hit in the bundle and it is React's scheduler (`new MessageChannel … fe.postMessage(null)`). No `storage` listener, no cross-frame messaging. Confirmed.

**F7 — `ContactSection.module.css` hard-codes `z-index: 6`, which the renumbering would collide with.**
```css
.section { position: relative; z-index: 6; … }
```
Notifications becomes `z=6` under the new numbering. A tie would currently resolve in Contact's favour by DOM order, so it would probably *look* fine — but it silently breaks the stack's stated invariant and is a latent trap. Must be bumped to `7`. The brief did not mention this file.

**F8 — Renumbering `z` unavoidably touches `MobileSection.tsx`, which the brief lists as out of scope.** CSS `z-index` accepts integers only, so there is no value between `2` and `3`; the three downstream sections must each have their `z={N}` literal incremented. See D2 for the scoped exception.

---

## Architecture Decisions

**D1 — Section id `admin`, label "Admin panel", full-bleed embed mirroring `PreviewSection`.**
`admin` is short, matches the existing hyphen-free-where-possible style (`preview`, `mobile`, `notifications`), and does not collide with anything in `SECTION_IDS`. The section body is a byte-for-byte structural copy of `PreviewSection`'s (`containerWide` + `fill` → `growFull` → `WindowChrome chrome={false}` → `DemoStage`).
*Rejected:* a split layout with an eyebrow/title/body column like `MobileSection`. Reason: that halves the embed's width and changes the container chain that the freshly-verified letterboxing math in `DemoStage.module.css` was tuned against — a real regression risk on work that was just signed off. Full-bleed is the established treatment for a live embed. If the user wants explanatory copy on this section, that is a cheap, separate follow-up.

**D2 — `z` renumbering: Hero=1, Preview=2, **Admin=3**, Mobile=4, BookingSite=5, Notifications=6, Contact=7 (CSS).**
Per F8 this requires editing `MobileSection.tsx`, `BookingSiteSection.tsx`, `NotificationsSection.tsx` — which the brief flags as out of scope. **Scoped exception:** the *only* permitted change in those three files is the single integer literal in `z={N}` on the `StackSection` line. No other token in those files may change. The brief's out-of-scope intent is about redesigning the Mobile section's *content/treatment* (static screenshot vs. live embed, to be handled later), which this does not touch. Reviewer: please read this as an intentional, bounded exception rather than a scope violation.

**D3 — Auto-click is a *bounded poll*, not a single attempt on `load`.**
The brief proposed "once the iframe's `load` fires, find and click." That is not safe on its own:
- The iframe's `load` fires when the document *and its subresources* are done. React 18's `createRoot().render()` commits on a scheduler task (the `MessageChannel` from F6). Whether that commit lands before or after `load` is genuinely not guaranteed — `#root` may still be empty when `handleLoad` runs.
- There is also a real attach race: if the iframe finishes loading before React attaches the `onLoad` prop (warm HTTP cache, bfcache), `handleLoad` never runs at all and a load-only design silently does nothing.

So: poll `iframeRef.current.contentDocument` for the target every 150 ms, up to 20 attempts (~3 s), starting immediately on mount **and** restarting on every `load`. Self-terminating, guarded by a ref so it clicks at most once. This is strictly more robust and costs ~10 lines. Matching uses `querySelectorAll("button, a")` + `textContent?.includes(autoClickText)` with `autoClickText="View admin demo"` — deliberately **excluding** the `→` glyph per the brief.

**D4 — Re-measurement after the click reuses the file's existing reset-then-rAF idiom, via a new `contentNonce`.**
This answers the brief's explicit question ("is `syncNeed` from `handleLoad`'s closure still valid after the click?"). Reasoning against the actual code:
- `syncNeed` is *callable* — it reads `iframeRef.current` (a live ref) and uses a functional `setNeedH` updater, so nothing about it goes stale in a way that breaks it. The only closed-over value is `box?.h`, used as `Math.max(boxH, prev)`; a stale-small `boxH` would only make it *more* eager to raise `needH`. Not a correctness problem.
- **But calling it directly after the click is still wrong, for two reasons the brief did not anticipate:**
  1. **`needH` is monotonic-increasing by construction** (`required > Math.max(boxH, prev) ? required : prev`). The pre-click measurement is the *client landing page's* height. If the admin dashboard is shorter, `needH` stays pinned at the landing page's value forever and the admin view renders permanently smaller than it should, letterboxed into dead space. A raise-only re-measure cannot fix this.
  2. **The DOM is not updated synchronously when `.click()` returns.** The click goes through the iframe's own React; even under discrete-event priority it is not safe to assume the admin tree is committed and laid out by the next statement.
- Therefore, on a successful click: `setNeedH(minViewportHeight)` (drop the monotonic floor) **and** `setContentNonce(n => n + 1)`; then add `contentNonce` to the dep array of the existing effect
  ```tsx
  useEffect(() => { if (!box) return; const raf = requestAnimationFrame(syncNeed); return () => cancelAnimationFrame(raf); }, [box, contentNonce, syncNeed]);
  ```
  This is exactly the pattern the `ResizeObserver` already uses (it resets `needH` to `minViewportHeight` and lets the rAF effect re-measure), so it introduces no new concept to the file.
- Plus one **safety top-up** at ~400 ms that bumps `contentNonce` only (no reset), to catch layout that settles late in the new view. Raise-only, so it cannot cause a downward jump/flicker.
- *Known, accepted dev-only nuance:* under StrictMode's mount→unmount→mount, the first effect run's cleanup clears the pending top-up timer, so in dev the top-up may not fire. Production is unaffected, and the reset+rAF pass (the one that actually matters) still runs. Documented here so the reviewer does not flag it as a bug.

**D5 — Cross-iframe sync: `DemoStage` self-manages a parent-window `storage` listener via a new optional `reloadOnStorageKey` prop.**
Chosen shape, per the brief's suggestion, and I agree with it:
```tsx
useEffect(() => {
  if (!reloadOnStorageKey) return;
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== reloadOnStorageKey) return;   // key===null means localStorage.clear()
    if (e.key !== null && e.oldValue === e.newValue) return;       // saved with no actual change
    try { iframeRef.current?.contentWindow?.location.reload(); } catch {}
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, [reloadOnStorageKey]);
```
- `window` here is the **parent page's** window (`DemoStage` is a client component in the parent document), not the iframe's.
- *Why this shape over lifting state into `app/page.tsx` or a new wrapper client component:* `app/page.tsx` is currently a Server Component with zero state; lifting would force it (or a new wrapper) to become a client component purely to thread a ref between two sibling sections that otherwise share nothing. Self-management keeps `page.tsx` a Server Component, keeps the two section components independent, and makes the behaviour opt-in per embed at the point of use. The cost — a listener per opted-in `DemoStage` — is trivial at one instance.
- *Reload method:* `contentWindow.location.reload()` rather than reassigning `iframe.src`. Reassigning `src` performs a navigation that can push an entry into the **parent's** session history (breaking the back button); `reload()` does not. Both are permitted here because the frame is same-origin.
- Only `PreviewSection` passes this prop. `AdminPanelSection` must **not** — it is the writer (and per spec would not receive its own event anyway), and reloading it would throw away the admin view and re-trigger the auto-click.
- *Deliberately not built:* syncing the separate `"theme"` key (dark/light toggle). The user asked for brand/colours. If an admin-side theme toggle later looks broken against the Preview embed, widening the prop to `string[]` is a ~3-line change. Flagging, not building.

**D6 — ⚠️ The one genuinely uncertain thing: `storage`-event delivery from a same-origin *child iframe* to the *parent* window.**
I am **not** asserting this works. Stating the reasoning and its limit honestly:
- The HTML Standard's "broadcasting to other documents" step says: on a `Storage` mutation, for every `Document` whose origin is same origin as the storage area, **excluding the `Document` whose `Storage` object was used**, queue a task to fire `storage` at that `Document`'s relevant global. It does **not** restrict this to top-level browsing contexts, so same-origin iframes and their same-origin parent are all in scope, and the parent should receive an event for a write made inside a child iframe.
- The limit of my confidence: the overwhelmingly documented/tested case in the wild is *tab-to-tab*, not *child-iframe-to-parent*. This has **not** been live-tested in this repo. Browser behaviour here has historically had quirks, and I have no live evidence either way.
- **Therefore this must be verified live via `agent-browser` (V6) before Step 6 is considered done.** V6 is deliberately sequenced *before* the implementation steps that depend on it, so this is de-risked with a ~5-line probe rather than discovered after the feature is wired.
- Note the *storage area itself* is not in doubt: parent and both iframes are same-origin (`/demo-app/index.html` is served by this Next.js app), so they demonstrably share one `localStorage`. Only the *event notification* is uncertain. That is exactly why the fallback below is cheap and guaranteed.

**D7 — Fallback if D6 fails verification: a 1 s parent-side poll. Same prop, same reload call, ~6 lines swapped.**
```tsx
useEffect(() => {
  if (!reloadOnStorageKey) return;
  let last = localStorage.getItem(reloadOnStorageKey);
  const id = window.setInterval(() => {
    const now = localStorage.getItem(reloadOnStorageKey);
    if (now === last) return;
    last = now;
    iframeRef.current?.contentWindow?.location.reload();
  }, 1000);
  return () => window.clearInterval(id);
}, [reloadOnStorageKey]);
```
This cannot fail for the reason D6 might: it relies only on the shared storage area (certain), not on event delivery (uncertain). Cost is a 1 s worst-case latency, imperceptible for the actual UX (save in the admin embed, then scroll up to Preview) and one cheap timer. No bundle patching either way. **The public prop name and every call site are identical between D5 and D7**, so switching is a self-contained edit inside `DemoStage.tsx` and requires no re-plan.

**D8 — Do not fix the F2 key-name bug in `public/demo-app/index.html` by default.**
The brief says treat the demo bundle as a black-box third-party asset. `index.html` is hand-readable rather than minified, and the fix is a two-token rename (`brand.darkAccent` → `brand.darkAccentColor`, `brand.lightAccent` → `brand.accentColor`), which would remove the reload flash-of-default-accent. But it edits a vendored artifact that will be overwritten the next time the demo app is rebuilt, and it is not required for the feature to work (F1). **Recorded as an optional follow-up requiring explicit user approval — the coder must not do it as part of this task.**

**D9 — No new npm dependencies.** Everything uses `useState`/`useEffect`/`useRef`, `window.setTimeout`/`setInterval`, and the existing same-origin `contentDocument` access that `DemoStage` already relies on. If any step appears to need a package, stop and escalate.

**D10 — File sizes stay well within the 500-line limit.** `DemoStage.tsx` goes from 101 → ~165 lines. `AdminPanelSection.tsx` is ~22 lines. No split needed.

---

## Implementation Steps

- [x] **Step 1: Live-probe the `storage`-event mechanism before writing any sync code (de-risks D6)**
  - Files: none (throwaway console probe — write nothing to the repo)
  - Details: Against the user's **already-running** dev server (locate it with `lsof`/`curl` — **do not start `npm run dev`**), open the landing page in `agent-browser`. In the top-level page console register `window.addEventListener("storage", e => console.log("PARENT GOT", e.key, e.newValue))`. Then, inside the Preview iframe's context, run `localStorage.setItem("ordiset-demo-brand", JSON.stringify({...JSON.parse(localStorage.getItem("ordiset-demo-brand")||"{}"), accentColor:"#ff0000"}))`. Record whether the parent listener fires. This is V6; its result selects D5 (fires) or D7 (does not) for Step 6. **Record the observed result in this file.**

- [x] **Step 2: Extend `DemoStage` with the auto-click mechanism (D3 + D4)**
  - Files: `components/DemoStage.tsx`
  - Details:
    - Add optional props to `DemoStageProps`: `autoClickText?: string` and `reloadOnStorageKey?: string`, each with a short doc comment matching the file's existing comment style. Destructure both in the signature with no defaults.
    - Add `const [loadNonce, setLoadNonce] = useState(0);`, `const [contentNonce, setContentNonce] = useState(0);`, `const clickedRef = useRef(false);`.
    - In `handleLoad`, **prepend** `clickedRef.current = false;` and `setLoadNonce((n) => n + 1);`. Leave the existing `syncNeed()` + `fonts.ready` lines exactly as they are.
    - Add `contentNonce` to the dep array of the existing measurement effect: `}, [box, contentNonce, syncNeed]);`. Change nothing else in that effect.
    - Add the bounded-poll effect with deps `[autoClickText, loadNonce, minViewportHeight]`: returns immediately if `!autoClickText`; defines `tryClick()` which bails if `clickedRef.current`, then inside a `try/catch` reads `iframeRef.current?.contentDocument` and finds the first `HTMLElement` from `doc.querySelectorAll("button, a")` whose `textContent?.includes(autoClickText)`. On a hit: set `clickedRef.current = true`, call `.click()`, `setNeedH(minViewportHeight)`, `setContentNonce(n => n + 1)`, and schedule a single `window.setTimeout(() => setContentNonce(n => n + 1), 400)`. On a miss: increment a local attempt counter and re-arm `window.setTimeout(tryClick, 150)` while `attempts < 20`. Call `tryClick()` once synchronously. Cleanup clears both timers.
    - Comment the two non-obvious points for the reviewer: why the poll exists rather than a single `load`-time attempt (D3), and why `needH` is reset before re-measuring (D4 — the monotonic floor).

- [x] **Step 3: Create the Admin Panel section component (D1)**
  - Files: `components/sections/AdminPanelSection.tsx` (new)
  - Details: Server Component (no `"use client"` — it renders `StackSection`/`DemoStage`, which are already client components, exactly as `PreviewSection` does). Structure is a copy of `PreviewSection` with `<StackSection id="admin" z={3}>`, and `<DemoStage src="/demo-app/index.html" title="Ordiset admin panel demo" autoClickText="View admin demo" />`. Do not pass `reloadOnStorageKey` here (D5). Do not pass `minViewportHeight` — the default 800 is the starting point; it is a one-prop tuning knob if V4 shows the admin view is cramped.

- [x] **Step 4: Renumber the stack and register the new section (D2)**
  - Files: `app/page.tsx`, `components/sections/MobileSection.tsx`, `components/sections/BookingSiteSection.tsx`, `components/sections/NotificationsSection.tsx`, `components/sections/ContactSection.module.css`
  - Details:
    - `app/page.tsx`: import `AdminPanelSection`, render it between `<PreviewSection />` and `<MobileSection />`, and update the existing z-order comment to read `Hero=1, Preview=2, Admin=3, Mobile=4, BookingSite=5, Notifications=6, Contact=7 set in its own CSS`.
    - `MobileSection.tsx`: `z={3}` → `z={4}`. **Only that literal.**
    - `BookingSiteSection.tsx`: `z={4}` → `z={5}`. **Only that literal.**
    - `NotificationsSection.tsx`: `z={5}` → `z={6}`. **Only that literal.**
    - `ContactSection.module.css`: `.section { z-index: 6 }` → `z-index: 7` (F7). Only that value.

- [x] **Step 5: Register the section id and nav link**
  - Files: `lib/sections.ts`, `components/Nav.tsx`
  - Details:
    - `lib/sections.ts`: insert `"admin",` into `SECTION_IDS` between `"preview"` and `"mobile"`. **Do not touch `getSectionTops`/`getSectionTop`** — the `el.offsetHeight` choice is load-bearing (transform-immune; `getBoundingClientRect()` would reintroduce boundary drift).
    - `components/Nav.tsx`: insert `{ href: "#admin", label: "Admin panel" },` into `LINKS` between the Preview and Mobile entries. Nothing else in `Nav.tsx` changes. (Known pre-existing duplication between `LINKS` and `SECTION_IDS` — keep them in sync manually; do **not** refactor to a shared list as part of this task.)

- [x] **Step 6: Wire the cross-iframe sync into `DemoStage` and `PreviewSection` (D5, or D7 if Step 1 failed)**
  - Files: `components/DemoStage.tsx`, `components/sections/PreviewSection.tsx`
  - Details: Add the effect from D5 verbatim if V6 passed, or the effect from D7 verbatim if it did not — and **record which was used, and why, in the Notes section at the bottom of this file**. Then add `reloadOnStorageKey="ordiset-demo-brand"` to `PreviewSection`'s existing `<DemoStage />`, changing nothing else in that file.

- [x] **Step 7: Run the verification plan (V1–V12) and record results in this file**
  - Files: this plan file only
  - Details: Execute every V item below against the user's own running dev server via `agent-browser`. Record observed numbers/outcomes inline, in the style of the previous plans in this repo. Any V item that cannot be checked must be marked as such with the reason, not silently skipped.

- [x] **Step 8: Lint + build**
  - Files: none
  - Details: `npm run lint` and `npm run build` must both be clean. (No unit-test harness exists in this repo — the V matrix is the test suite. Do not add a test framework as part of this task.)

---

## Verification Plan

Run against the user's **already-running** dev server. **Never start `npm run dev`** — locate the user's server via `lsof`/`curl` and ask first if none is running.

| # | Check | Expected | Result |
|---|---|---|---|
| **V1** | Section order + boundaries | DOM order is `#overview, #preview, #admin, #mobile, #booking-site, #notifications, #contact`. `getSectionTops()` in the console returns 7 entries with strictly ascending `top` values. Computed `z-index` ascends 1,2,3,4,5,6 across the six `StackSection`s, and `#contact` computes to 7. | **PASS.** DOM order exactly matches. Replicated `getSectionTops()` logic live (function isn't on `window`): 7 entries, tops `[0, 699, 1261, 1823, 2326, 2829, 3332]` at 1512×830 (later re-measured `[0,900,1800,2700,3600,4500,5400]` at 1512×900, both strictly ascending). Computed `z-index`: overview=1, preview=2, admin=3, mobile=4, booking-site=5, notifications=6, contact=7. |
| **V2** | Admin embed auto-navigates | Within ~3 s of load, the `#admin` iframe shows the admin dashboard (sidebar with Dashboard/Calendar/Services/…, "Back to site" link, stat cards). The "View admin demo" button is gone from that iframe's DOM (F4). | **PASS after one bug fix** (see Notes). Admin iframe body shows `Dashboard, Calendar, Services, Discounts, Masters, Pages, Settings, …, Back to site`, stat cards ("Today 2", "Revenue 2149.5 zł", …). No "View admin demo" button present in that iframe's DOM. |
| **V3** | Auto-click is opt-in only | The `#preview` iframe still shows the client-facing "Choose your specialist" landing page and still has its "View admin demo →" button. Confirms the new props are inert when omitted. | **PASS.** Preview iframe unchanged: "Choose your specialist" heading, both specialist cards, and the "View admin demo →" button all present throughout, including after the admin embed's button was auto-clicked. |
| **V4** | Admin embed letterboxing | At 1512×830, 1440×720, 1000×900, 920×760: no gutters inside `WindowChrome`, no internal scrollbar in the `#admin` iframe, admin content fills the frame. Record the resolved `needH`/scale for each. **Specifically confirm the admin view is not rendered undersized** — i.e. D4's `needH` reset actually took effect and it did not inherit the taller pre-click landing-page height. | **PASS**, all four sizes. Gutters were sub-pixel rounding only (0.3–0.8px, i.e. effectively 0). No internal scroll (`scrollHeight` never exceeded `clientHeight`) at any size. Resolved `needH`/scale: 1512×830 → needH 800, scale 0.8608; 1440×720 → needH 800, scale 0.7343; 1000×900 → needH 800, scale 0.9413 (vs. Preview's needH 907 at the same size — admin's own content is shorter, confirming it did **not** inherit Preview/landing-page's taller measurement); 920×760 → needH 800, scale 0.7803. `needH` stayed pinned at the `minViewportHeight` floor (800) in every case rather than the taller pre-click landing-page height, confirming D4's reset-then-rAF re-measure took effect. |
| **V5** | No Preview letterboxing regression | Re-run the same four sizes on `#preview`: zero gutters, zero internal scroll — matching the previously signed-off `preview-widget-fit` results. | **PASS**, all four sizes, measured in the same pass as V4 above (same script, same iframe pair). Gutters sub-pixel only, no internal scroll. |
| **V6** | ⚠️ **`storage` event crosses iframe → parent** (D6) | Per Step 1's probe. **This is the uncertain one — do not assume.** Record PASS/FAIL. FAIL selects D7. | **FAIL.** Live-probed before any sync code was written (Step 1): parent `window` had a `storage` listener attached; a same-origin write to `ordiset-demo-brand` performed *inside* the (then-only) Preview iframe's `contentDocument` did not fire it on the parent, even after a 1s grace wait. Confirmed the storage area itself *is* shared (parent could read the value the iframe wrote) — only the event notification failed to cross the iframe→parent boundary. **D7 (1s poll) was implemented**, not D5. |
| **V7** | End-to-end brand sync | In the `#admin` embed: Settings → change a brand colour (and the Salon Name) → "Save changes". Without touching the marketing page, scroll to `#preview` and confirm the client-facing embed now renders the new colour **and** the new name. Record the observed latency. | **PASS.** Set Salon Name to "Test Salon Sync" and accentColor to `#00ff00` in the admin embed's Settings, clicked "Save changes". Preview iframe's footer updated to "© 2026 Test Salon Sync. All rights reserved." without any parent-page reload or user action on Preview. Observed latency: synced by the very first check after the click (well under the 1s poll interval in the observed run — the interval had already been ticking since mount, so the actual wait to the next tick was small); worst case by design is bounded at ~1s + one iframe reload. |
| **V8** | No reload storm, no self-reload | Dragging colour pickers *without* saving triggers zero Preview reloads (F3). Saving triggers exactly one. The `#admin` iframe does **not** reload and stays on the admin dashboard throughout. | **PASS.** While the Salon Name/colour fields were edited (dirty, "Save changes" enabled) but not yet saved, Preview's content stayed unchanged for several seconds. After Save, Preview updated exactly once (no repeated/flapping reloads observed on re-checks). The admin iframe itself never reloaded — it remained on its Settings/Dashboard view (title updated in place to reflect the new brand name, same as any other client of the shared `localStorage`). |
| **V9** | Breakpoint + reduced motion intact | `STATIC_STACK_QUERY` in `ScrollDock.tsx` still byte-matches the `@media` query on line 26 of `StackSection.module.css` (`(max-width: 899px), (max-height: 700px)`). At 390×844 the stack is static and both embeds still render. Under `prefers-reduced-motion`, `StackSection` takes its static branch and the new section behaves like its siblings. | **PASS.** Byte-diffed both: `ScrollDock.tsx` line 13 and `StackSection.module.css` line 26 both read `(max-width: 899px), (max-height: 700px)`. At 390×844 all seven sections computed `position: static` and both iframes rendered live content (client landing page + auto-navigated admin dashboard). Under `prefers-reduced-motion: reduce` at 1512×900, all sections (including `#admin`) rendered as plain `<section>` with no inline `transform` style (the static/no-motion branch), and `#admin` had the same `.seam` marker as its siblings. |
| **V10** | Nav | The new "Admin panel" link appears between Preview and Mobile, does not wrap or overflow the nav row at 1280px and 1024px, scroll-spy highlights it correctly, and the sliding indicator sizes to it. If it overflows, shorten the label to "Admin" (and say so in Notes). | **PASS.** Link order confirmed: Overview, Preview, **Admin panel**, Mobile, Booking site, Notifications. At both 1280px and 1024px all 6 link `top` values were identical (single line, no wrap) and the nav row's `scrollWidth` never exceeded its `clientWidth` (no overflow). Clicking `#admin` and letting scroll-spy settle: the sliding indicator's `left`/`width` matched the "Admin panel" link's own `getBoundingClientRect()` exactly. **Label kept as "Admin panel"** — no overflow occurred, so no need to shorten. |
| **V11** | Scroll docking unaffected | `ScrollDock` still docks correctly across the new `#preview → #admin → #mobile` boundaries in both directions. No code change was needed here; this confirms the `SECTION_IDS` insertion was sufficient. | **PASS.** At 1512×900 (tops: preview=900, admin=1800, mobile=2700): a forward wheel gesture starting at y=1600 (78% through the preview→admin segment) committed forward to y=1800 (admin's start). A backward wheel gesture starting deep in the admin segment (y=1850) and landing at y=950 (back in the preview segment) committed backward to y=900 (preview's start). Both directions dock correctly across the boundary the new section introduced; no `ScrollDock.tsx`/`StackSection` code was touched. |
| **V12** | Lint + build | `npm run lint` and `npm run build` both clean. | **PASS.** `npm run lint` — no output, no errors. `npm run build` — `next build` completed: "Compiled successfully in 930ms", TypeScript finished clean, static pages generated (4/4), no warnings. |

---

## Acceptance Criteria

- [x] All V1–V12 checks pass (or any failure is explicitly recorded with reasoning, not silently skipped)
- [x] `npm run lint` and `npm run build` are clean
- [x] Follows project conventions (no new deps, every file under 500 lines, existing style matched)
- [x] A new `#admin` section sits between Preview and Mobile and auto-navigates its embed to the admin dashboard without user interaction
- [x] Saving brand/colour settings in the Admin embed updates the Preview embed with no manual page reload by the visitor
- [x] `DemoStage`'s existing behaviour is **byte-behaviour-identical** when the two new props are omitted — `PreviewSection`'s letterboxing is unchanged except for the added `reloadOnStorageKey`
- [x] `STATIC_STACK_QUERY` in `ScrollDock.tsx` still byte-matches the `@media` query in `StackSection.module.css`
- [x] `z` values ascend in render order across all six `StackSection`s, with `#contact` above all of them
- [x] The chosen sync mechanism (D5 vs D7) is recorded in Notes with the V6 evidence that selected it

---

## Constraints & Risks

**Must not touch**
- `public/demo-app/assets/*` — black-box vendored build output. No hand-patching of minified JS, under any circumstance.
- `public/demo-app/index.html` — including the F2 key-name bug. Optional follow-up only, needs explicit user approval (D8).
- `lib/sections.ts`'s `getSectionTops`/`getSectionTop` bodies — the `el.offsetHeight` choice is deliberate and load-bearing. Only the `SECTION_IDS` array changes.
- `ScrollDock.tsx` — including its documented KNOWN LIMITATION comment. Do not "fix" it as a drive-by; it is deliberately deprioritised and tracked elsewhere.
- `StackSection.tsx` / `StackSection.module.css`, `DemoStage.module.css`, `WindowChrome.tsx` — no changes needed by this task.
- `MobileSection.tsx` beyond the single `z` literal (D2's scoped exception). The Mobile section's content/treatment is the user's separate, later task.

**Risks**
1. **(Highest) `storage`-event cross-iframe delivery is unverified** — D6. Mitigated by probing it first (Step 1 / V6) and by having D7 pre-written as a drop-in with an identical public prop shape.
2. **Auto-click timing** — mitigated by the bounded poll (D3) rather than a single `load`-time attempt. Residual risk: if the demo app's button text ever changes on a rebuild, the auto-click silently no-ops and the section shows the client site instead. Acceptable for a pre-built demo asset, but worth knowing; there is no stable id/data-attribute to key off (F4).
3. **`needH` monotonicity** — D4. If V4 shows the admin view rendering undersized, the reset did not take effect; re-check the ordering of `setNeedH(minViewportHeight)` versus the `contentNonce` bump.
4. **Reload flash** — because of F2, the reloading Preview iframe will briefly show the default accent before the bundle mounts and applies the saved brand. Expected and cosmetic; D8 covers the optional fix.
5. **Two live embeds of the same SPA on one page** doubles the demo's runtime cost. Both are already in the DOM at page load (no lazy mounting in the current design). If V4/V5 reveal jank on the stacking-scale animation, flag it — do not solve it speculatively here.

---

## Notes / Results

- **V6 outcome and the mechanism selected (D5 or D7):** V6 **FAILED** — live-probed via `agent-browser` before any sync code was written. A `storage` listener on the parent `window` did not fire when `ordiset-demo-brand` was written from inside the (then-only) Preview iframe's own `contentDocument`, even though the parent could immediately read the new value directly (confirming the storage area is genuinely shared, only event delivery failed). **D7 (1s `setInterval` poll comparing `localStorage.getItem` snapshots) was implemented in `DemoStage.tsx`**, not D5's `storage`-event listener. Both share the identical public prop (`reloadOnStorageKey`) and call sites, exactly as D7 anticipated, so no other file needed to change because of this choice.
- **Observed V7 sync latency:** Saved "Test Salon Sync" + accent `#00ff00` in the admin embed; Preview's footer read "© 2026 Test Salon Sync." by the very first poll check after the click (a fraction of a second — the 1s interval had already been running since mount and happened to tick shortly after). Worst-case by design is bounded at ~1s (poll interval) plus one iframe `location.reload()`.
- **Nav label kept as "Admin panel" or shortened to "Admin":** Kept as **"Admin panel"** — measured zero overflow and no wrapping at both 1280px and 1024px viewport widths, so the shortening fallback in V10 was not needed.
- **Anything that had to deviate from this plan, and why:** One implementation bug was found and fixed during live verification (V2), not present in the plan's own pseudocode reasoning but introduced by a literal `instanceof HTMLElement` runtime check when implementing Step 2's auto-click matching logic. Because the candidate `<button>`/`<a>` element comes from the iframe's own `contentDocument` (a distinct JS realm from the parent page), it is never `instanceof` the parent realm's `HTMLElement` constructor even though it is a real, clickable `HTMLElement` in its own realm — a classic cross-realm `instanceof` pitfall. This silently made the auto-click condition always `false`, so the admin embed never auto-navigated. Fixed by dropping the runtime `instanceof` check and casting instead (`as HTMLElement | undefined`), since the `"button, a"` selector already guarantees a clickable element regardless of which realm it came from. This is a bug-fix to correctly realize the already-agreed D3 design, not a change of approach or scope, verified live afterward (V2/V3 both PASS post-fix). Separately (not a plan deviation, just a testing-tool note): `agent-browser`'s coordinate-based `click` command did not reliably register clicks on buttons inside these nested, CSS-`transform: scale()`'d iframes (two attempts silently no-opped); switching to invoking `.click()` directly on the DOM node via `eval` inside the iframe's own document worked reliably for all manual verification steps (Settings nav, Save changes). This has no bearing on the app code — `DemoStage`'s own auto-click already uses direct `.click()`, which is unaffected.
