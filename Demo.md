## 0. What you're building and why

The real product is a multi-tenant salon booking system. `demo.ordiset.com`
is a live instance of it, branded as a fictional salon called **"Loom &
Blade"** (dark, copper/rust luxury-barbershop identity) — that's the sample
data used for every screenshot below.

The widgets on this landing page must **look and behave like that real
product**, but must be **fully fake**: local React state only, **no backend
calls, no real bookings, no real captcha**. Reasoning: many anonymous
visitors will click through these at once — a shared real backend would let
them corrupt each other's view of it. A local-only mock has nothing shared
to corrupt, and it's simpler to build than a real "non-persisting" mode
grafted onto the actual app.

**Persistence:** seed each visitor's demo state (calendar availability
pattern + any date/service they pick while clicking through) from
`localStorage`, scoped to their own browser — same rule already used for the
admin color-customization widget elsewhere on this page. That means: a
visitor's calendar looks the same if they reload or come back later, and a
demo booking they complete stays visibly "booked" for them. _(This is my
assumption, carried over from your earlier localStorage decision — flag it
if you actually want the calendar to reshuffle on every load instead.)_

---

## 1. Home — master selection

- Top bar: brand logo + wordmark (top-left, home only), "About Us" nav tab,
  language dropdown (`EN ⌄`), a small round account icon, and a theme-toggle
  icon (striped barber-pole icon) on the far right.
- Heading: **"Choose your specialist"**, subtitle **"Book a visit with your
  chosen specialist"**.
- Two specialist cards, each a square photo with the name and role overlaid
  at the bottom:
  - **Marek Zawadzki** — _Top Barber / Art Director_
  - **Anna Nowak** — _Senior Stylist / Color Expert_
- Below that: a horizontal, auto-scrolling, infinite-loop photo strip
  (marquee) of salon/work photos (haircuts, coloring, styling shots).
  **Placeholder for now** — real photos come separately.

## 2. Master booking page (one per specialist)

Reached by clicking a specialist card. Layout:

- Back-chevron top-left, same top bar (minus logo/account icon), circular
  master photo, heading **"Book a visit"**.
- Left panel: a month calendar (prev/next arrows, `Mo Tu We Th Fr Sa Su`
  header, current month name + year). **Today's date must be visually
  highlighted.**
- Right column, three stacked boxes:
  1. **Service** — a dropdown that expands into a scrollable list. Each row:
     service name, duration, and price shown as an original price with
     strikethrough next to a discounted price (e.g. `170 zł` struck through,
     `153 zł` next to it).
  2. **Manage booking** — an orange pill button, "Click to manage your
     booking". Decorative in this mock (no real lookup flow needed).
  3. A small promo box with two lines, exact copy:
     - `🏷️ Wed, Thu 11:00–15:00: -20% on all services`
     - `🏷️ -10% on all services`
- Below the calendar: a short bio paragraph + an "Achievements &
  Certifications" bullet list (trophy/building/scissors emoji bullets).
- Below the bio: another horizontal auto-scrolling marquee — **content
  differs per master** (see below). **Placeholder for now.**

### Sample service list — Marek ("Top Barber")

| Service                              | Duration | Price             |
| ------------------------------------ | -------- | ----------------- |
| Combo: Haircut & Beard               | 75 min   | ~~170 zł~~ 153 zł |
| Classic Men's Haircut                | 45 min   | ~~110 zł~~ 99 zł  |
| Royal Shave with Hot Towel           | 45 min   | ~~100 zł~~ 90 zł  |
| Hair Wash & Blow Dry Styling         | 45 min   | ~~90 zł~~ 81 zł   |
| Deep Nourishing Hair SPA Treatment   | 60 min   | ~~160 zł~~ 136 zł |
| Premium Haircut & Style Consultation | 60 min   | ~~180 zł~~ 162 zł |
| Beard Trim & Shape                   | 30 min   | ~~80 zł~~ 72 zł   |

### Sample service list — Anna ("Senior Stylist / Color Expert")

| Service                              | Duration | Price             |
| ------------------------------------ | -------- | ----------------- |
| Balayage / AirTouch Coloring         | 210 min  | ~~550 zł~~ 495 zł |
| Single-Process Color & Care          | 120 min  | ~~320 zł~~ 288 zł |
| Hair Wash & Blow Dry Styling         | 45 min   | ~~90 zł~~ 81 zł   |
| Deep Nourishing Hair SPA Treatment   | 60 min   | ~~160 zł~~ 136 zł |
| Premium Haircut & Style Consultation | 60 min   | ~~160 zł~~ 144 zł |
| Women's Haircut & Styling            | 60 min   | ~~180 zł~~ 162 zł |

(Yes, "Premium Haircut & Style Consultation" is priced differently per
master — that's real per-master pricing in the source data, not a typo.)

### Marek's marquee → work photos

Same kind of strip as the homepage one — barbering/coloring work shots.
**Placeholder, real photos coming separately.**

### Anna's marquee → reviews strip

A horizontal strip mixing different card _types_, not just one repeated
card: customer review cards (name, star rating, short quote), at least one
card styled like a Google review (Google logo, "Verified Purchase", stars,
quote), and one card styled like a map/location pin preview. **Placeholder,
real content coming separately** — for now, fill with a few invented
believable-looking cards of each type so the mixed-card layout is visible.

## 3. The booking flow itself (this is the part that must feel interactive)

A visitor should be able to actually click through, locally:

1. Pick a master (from Home).
2. Pick a service from the dropdown.
3. Pick an open date on the calendar, then a time slot.
4. Confirm → show a **final confirmation screen**: checkmark, a summary of
   the chosen master/service/date/time, and a close/done action.

**Calendar availability — do not hardcode specific dates.** Generate
open/closed days with a rule instead (e.g. "most weekdays open, a couple of
randomly-chosen weekdays per month closed, weekends mostly closed") so nine
months from now it still looks correct without anyone having to edit it.
Once a visitor picks a slot, it should show as taken **for that visitor**
(via the localStorage seed from section 0) — not a shared/real calendar.

**No captcha anywhere in this flow.** It's fully local/fake — there is
nothing to protect.

## 4. Footer + legal pages (every page below shares this)

Every widget page ends with a footer row:
`Privacy Policy · Terms of Service · Help Center | © 2026 Loom & Blade. All rights reserved.`

Clicking any of those swaps the widget's content area to a legal page while
keeping the same top bar. **Language switching (`EN ⌄`) must work on these
pages too** — this was called out as important.

### Privacy Policy — sample content

Heading **"Privacy Policy"**, intro line about protecting personal data,
then an **"Information We Collect"** section with bullets:

- **Contact Information**: first name, last name, phone number, email address.
- **Booking History**: details of past appointments and selected services.
- Data never shared with third parties without explicit consent.

Then a legal-entity block (same block appears on Terms too):

```
Loom & Blade Sp. z o.o.
Adres: ul. Grzybowska 62/ lok. U4, 00-844 Warszawa
Email: [placeholder]
NIP: [placeholder]
Strona wsparcia: Centrum pomocy → link to Help Center
```

### Terms of Service — sample content

Heading **"Terms of Service"**, intro line, then a **"Booking Rules"**
section with bullets:

- Appointments can be canceled for free up to **24 hours** in advance.
- You must provide accurate contact details when booking.
- Service pricing may adjust if additional requirements are requested.

Same legal-entity block as above.

### Help Center — two columns

- Heading **"Help Center"**, subtitle **"We're here to help"**.
- Left: a **Contact form** — Full name, E-mail, Subject (dropdown, "Select
  a topic"), Message (textarea), "Send message" button. No captcha widget —
  this form doesn't really submit in the mock, a fake success state on
  click is enough.
- Right, two stacked cards:
  - **Contact Information** — address + "Response Time: Usually within 72
    hours on business days".
  - **Quick Actions** — three rows: "Delete my data / Right to be
    forgotten", "Export my data / Export data", "Withdraw consents /
    Withdraw consents". These are GDPR self-service entry points in the
    real product — decorative here is fine.

## 5. About Us page

Reached via the "About Us" nav tab (becomes underlined/active). Content:
a short paragraph about the space, then a photo gallery — first row of 4
images, second row of 2 — interior/detail shots (lighting, product shelf,
lounge area, wash stations, tool tray, salon floor). **Placeholder for now**,
real photos coming separately.

## 6. Theme toggle — must work everywhere in this widget

Every page/state above must support both a light and a dark theme, switched
by the barber-pole icon in the top bar. Use these **exact colors as the
widget's default palette** — note these are the **demo salon's own brand
colors** (rust/copper/orange), intentionally different from Ordiset's own
gold-on-charcoal landing identity. The outer landing page stays in Ordiset's
own colors; only the content _inside_ this product-demo widget uses the
salon's branded palette below, because that's the point being demonstrated
(a client's own branding rendering inside their own instance).

**Light theme:**
| Token | Hex | Use |
|---|---|---|
| Page Background | `#F8F9FA` | main background |
| Secondary Tint | `#EAECEE` | accent backgrounds, hover states |
| Card Background | `#FFFFFF` | cards/panels |
| Primary Button | `#B35C37` | buttons, highlighted elements |
| Body Text | `#1A1D20` | main text |
| Muted Text | `#6C757D` | subtitles, placeholders |
| Borders | `#E2E8F0` | dividers/outlines |

**Dark theme:**
| Token | Hex | Use |
|---|---|---|
| Dark Background | `#121417` | main background |
| Dark Secondary Tint | `#22262B` | accent backgrounds, hover states |
| Dark Card | `#1A1D22` | cards/panels |
| Dark Primary Button | `#D0764D` | buttons, highlighted elements |
| Dark Text | `#F1F3F5` | main text |
| Dark Muted Text | `#8B95A1` | subtitles |
| Dark Borders | `#2D3239` | dividers |

## 7. Still coming separately (don't block on these — use placeholders)

- Home marquee photos (work/style shots).
- Marek's marquee photos (his own work shots).
- Anna's review-card marquee assets (real reviews/screenshots).
- About Us gallery photos.
- Final wording tweaks, if any, once the above assets are in.

---

If your environment has a frontend-design review skill/workflow, use it for
this pass too, same as for the skeleton phase.
