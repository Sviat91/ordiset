# Plan: Ordiset marketing landing page (skeleton pass)

**Date:** 2026-08-11
**Status:** In Progress

## Goal
Build the complete Next.js landing-page skeleton for Ordiset — nav, scroll mechanics, design tokens, typography, 6 sections in order with consistent labeled placeholder shells for sections 1–5, and a fully working contact form (stubbed submit).

## Architecture Decisions

**Stack (fixed — do not revisit)**
- Next.js App Router + TypeScript, npm, deployed as a normal Node process (`next build` → `next start`) under PM2. **No `output: 'export'` and no `output: 'standalone'`** — leave `next.config.ts` at defaults.
- Framer Motion (`framer-motion`) for scroll-driven transitions.
- Plain CSS: one `app/globals.css` for tokens/reset/base type, CSS Modules per component. **No Tailwind, no UI kit, no CSS-in-JS.**

**Scroll mechanics — native sticky + Framer Motion, no scroll-jacking**
Sections 1–5 are each wrapped in one shared `PinnedSection` primitive:
- Outer "track" `<section>`: `height: 200vh; position: relative` and carries the anchor `id`.
- Inner "stage" `<motion.div>`: `position: sticky; top: 0; height: 100vh; display: flex; align-items: center`. The stage stays pinned for ~100vh of scrolling, then the next section rides up over it. This is real pinning using native scroll — anchor links, keyboard and scrollbar all keep working.
- **Settle-in:** `initial={{ opacity: 0, y: 24 }}` + `whileInView={{ opacity: 1, y: 0 }}` with `viewport={{ once: true, amount: 0.35 }}`, `transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}`.
- **Hand-off out:** `const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end start'] })`, then `useTransform(scrollYProgress, [0.5, 0.85], [1, 0])` → opacity and `[0.5, 0.85] → [1, 0.94]` → scale, applied to the stage via `style`. So the pinned section recedes/fades exactly while the next one arrives.
- Two independent mechanisms, one small file. Do not add a scroll-hijacking library, IntersectionObserver bookkeeping, or a section state machine.

**Fallbacks:** below 768px and under `prefers-reduced-motion: reduce`, `PinnedSection` renders a plain static section (`height: auto`, no sticky, no transforms) — use `useReducedMotion()` from framer-motion plus a CSS media query. Mobile becomes a normal vertical stack.

**Smooth-scroll nav:** pure CSS — `html { scroll-behavior: smooth; scroll-padding-top: calc(var(--nav-h) + 8px) }`, disabled under reduced motion. Anchor `<a href="#id">` only. **No JS scroll handler, no scroll-spy, no active-link tracking** in this pass.

**Client/server split:** only `PinnedSection` and `ContactForm` get `'use client'`. Section components stay server components that pass plain JSX children into `PinnedSection`. Nav is a server component (always-on blurred bar, no scroll listener).

**File layout**
```
app/layout.tsx            app/page.tsx            app/globals.css
components/Nav.tsx                 + Nav.module.css
components/PinnedSection.tsx       + PinnedSection.module.css
components/WindowChrome.tsx        + WindowChrome.module.css
components/PhoneFrame.tsx          + PhoneFrame.module.css
components/Placeholder.tsx         + Placeholder.module.css
components/ContactForm.tsx         + ContactForm.module.css
components/sections/Hero.tsx
components/sections/MobileSection.tsx
components/sections/CustomizeSection.tsx
components/sections/BookingSiteSection.tsx
components/sections/NotificationsSection.tsx
components/sections/ContactSection.tsx
components/sections/sections.module.css   (shared split/stack layout classes)
public/ordiset-logo.png
```
Every file should land well under 200 lines; the 500-line limit is never in play.

---

## Implementation Steps

- [x] **Step 1: Scaffold Next.js into the existing repo**
  - Files: repo root `/Users/sviat/ordiset`
  - `create-next-app` refuses to run in a non-empty directory, and `assets/` is not on its safe-list. So:
    1. `mv /Users/sviat/ordiset/assets <scratchpad>/assets`
    2. From `/Users/sviat/ordiset`: `npx create-next-app@latest .` — starting flag set: `--ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm`. If a flag is rejected by the installed version, drop it and answer the prompts: TypeScript **yes**, ESLint **yes**, Tailwind **no**, `src/` **no**, App Router **yes**, import alias **`@/*`** (Turbopack: either, default is fine).
    3. `mv <scratchpad>/assets /Users/sviat/ordiset/assets`
  - Do not touch `.git`. Verify the generated `.gitignore` covers `node_modules`, `.next`, `.env*`.
  - Delete create-next-app boilerplate: `app/page.module.css`, the demo markup in `app/page.tsx`, and unused `public/*.svg`.

- [x] **Step 2: Install Framer Motion + confirm PM2-friendly scripts**
  - `npm i framer-motion` (v12 supports React 19; import from `'framer-motion'`, not `'motion/react'`).
  - Confirm `package.json` scripts are `dev` / `build` / `start` (`next start`) / `lint`. Do not add custom deploy scripts. Leave `next.config.ts` at its generated default — record in a one-line comment or nothing at all; **no `output` key**.
  - Verify: `npm run build` succeeds on the empty scaffold.

- [x] **Step 3: Design tokens + global base styles**
  - Files: `app/globals.css`
  - `:root` tokens (exact brand colors, rest derived):
    - `--bg: #121417` · `--surface: #22262B` · `--accent: #E0C188`
    - `--bg-elevated: #1A1D21` · `--accent-hover: #EBD2A4` · `--accent-press: #CBAA71` · `--accent-soft: rgba(224,193,136,0.12)` · `--on-accent: #121417`
    - `--text: #F2F3F5` · `--text-muted: #A2A8B0` · `--text-faint: #6E757E` · `--danger: #E5736A`
    - `--border: rgba(255,255,255,0.08)` · `--border-strong: rgba(255,255,255,0.14)`
    - `--radius-window: 14px` · `--radius-card: 12px` · `--radius-phone: 38px` · `--radius-pill: 999px`
    - `--shadow-window: 0 24px 60px -20px rgba(0,0,0,0.65)`
    - `--maxw: 1120px` · `--nav-h: 64px` · `--gutter: 24px`
  - Base: box-sizing reset, `color-scheme: dark`, `html/body { background: var(--bg); color: var(--text) }`, `scroll-behavior: smooth`, `scroll-padding-top: calc(var(--nav-h) + 8px)`, `img { max-width:100% }`, visible `:focus-visible` outline in `--accent`.
  - Typography scale (utility classes or plain element rules): display `clamp(2.75rem, 6vw, 4.5rem)/1.05, weight 600, letter-spacing -0.03em`; h2 `clamp(2rem, 4vw, 3rem)/1.1, -0.02em`; body `1.0625rem/1.65, color var(--text-muted), max-width 52ch`; eyebrow `0.75rem, uppercase, letter-spacing .14em, color var(--accent)`.
  - `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`
  - **Rule for the whole build: no raw hex outside `globals.css`.**

- [x] **Step 4: Root layout, font, title**
  - Files: `app/layout.tsx`
  - `next/font/google` Inter → `{ subsets: ['latin'], variable: '--font-sans', display: 'swap' }`; apply the variable class on `<html lang="en">`; `body { font-family: var(--font-sans), system-ui, sans-serif }`. If the build machine has no network for font fetch, fall back to a system stack in `globals.css` and note it.
  - `export const metadata = { title: 'Ordiset — Universal Booking System' }` — **title only**. No description, OG, robots, sitemap, favicon work.
  - Render `<Nav />` then `{children}`.

- [x] **Step 5: Logo asset handling**
  - Files: `public/ordiset-logo.png` (copy of `assets/ordiset-logo.png`; leave the original in place)
  - The source is ~2400×1309 with a lot of empty margin and a **vertical lockup**: ring mark occupies roughly x 37–63%, y 19–63% of the image; the full ring+wordmark+subtext lockup occupies roughly x 30–68%, y 19–85%.
  - **Nav:** the full vertical lockup is too tall for a 64px bar. Use judgment — preferred approach is a CSS crop to the ring only (fixed-size wrapper with `overflow: hidden` + oversized/absolutely positioned image, or a `background-image` with tuned `background-size`/`background-position`) next to an Inter-set "ORDISET" wordmark in `--text`, letter-spacing ~0.14em. Pre-cropping a second PNG with `sips` is an acceptable alternative if it reads cleaner. Tune the crop visually; the percentages above are a starting point.
  - **Hero:** the full lockup may be used at larger size above the headline, or omitted if the nav already carries the brand — coder's call, keep it restrained.
  - **Verify alpha first:** `sips -g hasAlpha assets/ordiset-logo.png`. If the PNG turns out to have an opaque white matte, **stop and flag it** — do not paper over it with blend modes; a transparent asset is needed.
  - `next/image` with explicit `width`/`height` (+ `priority` in nav) is preferred; a plain `<img>` is acceptable if the crop is simpler that way.

- [x] **Step 6: `Nav` component**
  - Files: `components/Nav.tsx`, `components/Nav.module.css`
  - `position: fixed; top: 0; inset-inline: 0; z-index: 50; height: var(--nav-h)`, `background: rgba(18,20,23,0.72)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid var(--border)`. Inner row capped at `var(--maxw)` with `--gutter` padding: logo left (links to `#overview`), links center/right, CTA far right.
  - Links: `Overview → #overview`, `Mobile → #mobile`, `Customize → #customize`, `Booking site → #booking-site`, `Notifications → #notifications`. Link style: `0.875rem`, `var(--text-muted)`, hover → `var(--text)`.
  - CTA: `Contact` → `#contact`, gold pill (`background: var(--accent)`, `color: var(--on-accent)`, `border-radius: var(--radius-pill)`, hover `--accent-hover`).
  - Below 768px: hide the link list, keep logo + CTA. **No hamburger/drawer in this pass** — note it in a comment.
  - Add `main { padding-top: var(--nav-h) }` (or equivalent) so the hero is not underlapped.

- [x] **Step 7: `PinnedSection` primitive**
  - Files: `components/PinnedSection.tsx`, `components/PinnedSection.module.css`
  - `'use client'`. Props: `{ id: string; children: React.ReactNode; className?: string }`. Nothing more.
  - Implements exactly the mechanism in Architecture Decisions (track 200vh + sticky 100vh stage, `whileInView` settle-in, `useScroll`/`useTransform` fade+scale exit).
  - `useReducedMotion()` → when true, render the track/stage with no motion props and no transforms.
  - CSS: `@media (max-width: 768px) { .track { height: auto } .stage { position: static; height: auto; padding: 96px 0 } }`.

- [x] **Step 8: `WindowChrome` placeholder shell**
  - Files: `components/WindowChrome.tsx`, `components/WindowChrome.module.css`
  - Props: `{ label: string; chip?: string; children?: React.ReactNode }` (`children` reserved for the follow-up pass with real content; when absent render `<Placeholder label={label} />`).
  - Linear-style chrome: outer `background: var(--surface)`, `1px solid var(--border-strong)`, `border-radius: var(--radius-window)`, `box-shadow: var(--shadow-window)`, `overflow: hidden`.
  - Title bar: 40px tall, `border-bottom: 1px solid var(--border)`, three 9px dots at `rgba(255,255,255,0.16)` on the left, centered address pill (`background: var(--bg-elevated)`, `--radius-pill`, `0.75rem`, `var(--text-faint)`) showing `chip ?? 'app.ordiset.com'`.
  - Body: `aspect-ratio: 16 / 10`, subtle gradient `linear-gradient(180deg, #1B1F24, #15181C)` (define as a token if reused) + faint dot grid via `radial-gradient` background so it never reads as a flat gray box.
  - **NOT a 3D device mockup.** Flat rounded window frame only.

- [x] **Step 9: `PhoneFrame` placeholder shell**
  - Files: `components/PhoneFrame.tsx`, `components/PhoneFrame.module.css`
  - Props: `{ label: string; children?: React.ReactNode }`, same children/placeholder rule.
  - `width: clamp(240px, 26vw, 300px)`, `aspect-ratio: 9 / 19.5`, `border-radius: var(--radius-phone)`, `border: 1px solid var(--border-strong)`, `background: var(--surface)`, `padding: 8px`, `box-shadow: var(--shadow-window)`. Inner screen: `border-radius: 30px`, same gradient + dot grid as the window body, `overflow: hidden`, with a small rounded "island" bar (~78×22, `var(--bg)`) centered at the top.

- [x] **Step 10: `Placeholder` label component**
  - Files: `components/Placeholder.tsx`, `components/Placeholder.module.css`
  - Centered, absolutely positioned inside the parent's content area: a 6px `--accent` dot + label text at `0.8125rem` in `var(--text-faint)`, letter-spacing `0.02em`. Used by both shells so all five placeholders look identical.

- [x] **Step 11: Shared section layout CSS**
  - Files: `components/sections/sections.module.css`
  - `.stack` — centered column: eyebrow, h2, body (`margin-inline: auto; text-align: center`), visual below with `margin-top: clamp(40px, 6vw, 72px)`.
  - `.split` — `display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: clamp(32px, 5vw, 80px); align-items: center;` plus `.visualFirst { direction/order }` helper for the mirrored variant; collapses to one column below 900px with the visual **after** the copy.
  - `.container` — `max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gutter); width: 100%`.
  - `.eyebrow` / `.title` / `.body` class hooks mapping to the global type scale.

- [x] **Step 12: Section 1 — `Hero`** (`id="overview"`, `.stack` layout)
  - Files: `components/sections/Hero.tsx`
  - Eyebrow: `White-label booking infrastructure`
  - H1: `Your booking system. Your brand.`
  - Body: `Ordiset gives salons, barbershops, studios, clinics and independent pros their own branded booking site — scheduling, reminders and client history included. No marketplace, no shared traffic. Just your business, running on infrastructure built for it.`
  - Buttons: primary gold `Get in touch` → `#contact`; secondary ghost (`border: 1px solid var(--border-strong)`, transparent bg) `See how it works` → `#mobile`.
  - Visual: `<WindowChrome label="Live demo — coming soon" />`, full content width.
  - H1 is the page's only `<h1>`; all other sections use `<h2>`.

- [x] **Step 13: Section 2 — `MobileSection`** (`id="mobile"`, `.split`, copy left / phone right)
  - Files: `components/sections/MobileSection.tsx`
  - Eyebrow `Mobile` · H2 `Booking that feels native on a phone`
  - Body: `Most of your clients book from a phone at the end of the day. The Ordiset booking flow is mobile-first — pick a service, pick a time, confirm. No app to install, no account to create.`
  - Visual: `<PhoneFrame label="Mobile booking flow — preview coming soon" />`

- [x] **Step 14: Section 3 — `CustomizeSection`** (`id="customize"`, `.stack` layout)
  - Files: `components/sections/CustomizeSection.tsx`
  - Eyebrow `Customization` · H2 `Full control over how it looks`
  - Body: `Colors, logo, services, staff, working hours, deposits and cancellation rules — all editable from one admin panel. Every change goes live on your booking site instantly, and it stays your brand end to end.`
  - Visual: `<WindowChrome label="Admin panel — preview coming soon" chip="admin.ordiset.com" />`

- [x] **Step 15: Section 4 — `BookingSiteSection`** (`id="booking-site"`, `.split`, phone left / copy right)
  - Files: `components/sections/BookingSiteSection.tsx`
  - Eyebrow `Your booking site` · H2 `A site your clients recognize`
  - Body: `Every business gets a dedicated booking site on its own domain or subdomain — your name, your palette, your services. Ordiset stays invisible behind it.`
  - Visual: `<PhoneFrame label="Client booking site — preview coming soon" />`

- [x] **Step 16: Section 5 — `NotificationsSection`** (`id="notifications"`, `.split`, copy left / phone right)
  - Files: `components/sections/NotificationsSection.tsx`
  - Eyebrow `Reminders` · H2 `Confirmations that reach clients where they already are`
  - Body: `Automatic confirmations, reminders and rescheduling links delivered through the booking bot — fewer no-shows, fewer phone calls, no manual follow-up.`
  - Visual: `<PhoneFrame label="Booking bot notifications — preview coming soon" />`

- [x] **Step 17: Section 6 — `ContactSection` + `ContactForm`** (`id="contact"`)
  - Files: `components/sections/ContactSection.tsx`, `components/ContactForm.tsx`, `components/ContactForm.module.css`
  - **Not pinned** — a normal `<section>` in flow with `padding: clamp(96px, 12vh, 160px) 0`. Centered eyebrow `Contact`, H2 `Let's set up your booking system`, body `Tell us about your business and we'll get back to you with a walkthrough.`, then the form at `max-width: 560px`.
  - `ContactForm` is `'use client'` and **fully built**:
    - Fields: `name` (text, required, trimmed min 2), `email` (required, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), `message` (textarea rows 5, required, trimmed min 10). Labels are real `<label htmlFor>` elements (visible, `0.8125rem`, `var(--text-muted)`).
    - Input style: `background: var(--bg-elevated)`, `1px solid var(--border)`, `--radius-card`, `12px 14px`, `color: var(--text)`; focus → `border-color: var(--accent)` + soft `--accent-soft` ring; error → `border-color: var(--danger)`.
    - State via `useState`: `values`, `errors`, `touched`, `status: 'idle' | 'submitting' | 'sent'`.
    - Validate on submit; after a field is touched, re-validate on blur and clear its error on change. `noValidate` on the `<form>`; `aria-invalid` + `aria-describedby` → error `<p id>` under each field, `role="alert"`.
    - Submit: `preventDefault()` → validate → if invalid, focus the first invalid field and stop → if valid, `status='submitting'`, `await new Promise(r => setTimeout(r, 600))`, `status='sent'`, reset values, render a success line `Thanks — we'll be in touch shortly.` with `role="status"`. Button disabled and labelled `Sending…` while submitting.
    - Add `// TODO: wire to a real endpoint — out of scope for this pass` at the stub. **No `fetch`, no API route, no email service, no server action.**
  - Optional single-line footer at the very bottom of this section: `border-top: 1px solid var(--border)` + `© 2026 Ordiset` in `var(--text-faint)`. One line, no separate component, no link columns.

- [x] **Step 18: Compose the page**
  - Files: `app/page.tsx`
  - Render `<main>` with the six sections in exact order: Hero, MobileSection, CustomizeSection, BookingSiteSection, NotificationsSection, ContactSection. No other content.

- [x] **Step 19: Verify + manual pass**
  - `npm run lint` clean; `npm run build` clean; `npm start` serves on :3000.
  - Manually verify: all five nav links + CTA scroll to the right section with the nav not covering the heading; pinned sections settle and hand off without jitter; page is a clean static stack at 375px width and under forced reduced motion; every placeholder shows its label; form validation and success states behave.
  - Report anything that needed judgment (especially the logo crop) back in the handoff summary.

---

## Acceptance Criteria
- [x] `npm run build` and `npm run lint` pass with zero errors; `npm start` runs the app (PM2-compatible `next start`).
- [x] `next.config.ts` has **no** `output` key (no `export`, no `standalone`); no Tailwind or UI-kit dependency present.
- [x] Only `#121417`, `#22262B`, `#E0C188` as brand colors; all colors declared in `app/globals.css` and consumed via `var(--…)` — no raw hex in component CSS.
- [x] Six sections render in the exact specified order with the specified anchor ids; nav stays visible and functional through all pinned transitions.
- [x] Sections 1–5 show consistently styled window-chrome / phone-frame shells with visible "coming soon" labels — no plain gray boxes, no fake product UI, no 3D device art.
- [x] Contact form validates name/email/message client-side, shows inline errors and a success state, and submits to a clearly-commented stub.
- [x] Every file is under 500 lines (target: under 200).
- [x] Below 768px and under `prefers-reduced-motion: reduce`, the page degrades to a static vertical stack with no pinning (implemented via `useReducedMotion()` branch + `@media (max-width: 768px)` in `PinnedSection.module.css`; not re-verified visually in a browser in this pass — see report).
- [x] `assets/ordiset-logo.png` still exists untouched; a copy lives in `public/`.

## Constraints & Risks
- **Do not modify `.git`.** `assets/ordiset-logo.png` is the source of truth — copy it, never overwrite or delete it.
- **create-next-app will refuse a non-empty directory** — follow the move-assets-aside sequence in Step 1 exactly, and move `assets/` back afterward.
- **Logo risk:** the asset is a vertical lockup with heavy whitespace and must be cropped/sized for the nav; if it has no alpha channel, flag it instead of hacking blend modes.
- **Font risk:** `next/font/google` needs network access at build time; fall back to a system stack if unavailable.
- **Framer Motion / React 19:** install current `framer-motion` (v12+); if peer-dep warnings appear, report rather than downgrade React.
- **Non-goals for this pass (do not build):** real screenshots or product UI in sections 1–5, any backend/API route/email delivery, CMS, analytics, cookie banner, i18n, dark/light toggle, blog, pricing, testimonials, mobile nav drawer, scroll-spy active nav states, SEO metadata beyond `<title>`, OG images, favicon design, tests infrastructure, CI, Dockerfile, PM2 ecosystem file.
- Sections 1–5 placeholder shells must be built so the follow-up pass can drop real content into the `children` prop without restyling the frames.
