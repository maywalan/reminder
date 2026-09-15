# Tickle — Paywall screen (implementation spec)

## Package contents

| File | What it is |
|---|---|
| `Tickle paywall (standalone).html` | Open in any browser — the live animated screen, fully self-contained. Start here. |
| `Tickle paywall screen.dc.html` | Editable design source (markup + motion logic). Needs `support.js` beside it. |
| `support.js` | Runtime for the `.dc.html` file. Not app code — do not port it. |
| `README.md` | This spec. |
| `Tickle-Pricing-README.md` | Copy & pricing source of truth. |
| `github.md` | Repo the app lives in. |

Read the spec, open the standalone HTML to see the motion, then implement natively — the HTML is a reference, not code to port.

## What this screen is

A full-screen, modally-presented paywall showing **two plans side by side** — Free (left) and Premium (right, recommended). Annual billing is preselected. Premium is the selected plan on open; tapping either card moves the selection and swaps the primary button label.

Entry points: Profile → upgrade banner, a locked Premium feature (blurred card → "Unlock"), and the plan-limit row when a 6th plan is attempted.

## Layout (top → bottom)

| Region | Spec |
|---|---|
| Status bar | system |
| Utility row | `USD / THB` segmented pill (left), close ✕ (right) |
| Header | Mascot (46×42) + "Simple pricing" (18px/700) + "Two plans. Cancel anytime." (11px/500) |
| Billing toggle | Segmented `Monthly / Annual`, sliding white thumb, `SAVE 48%` badge on Annual |
| Plan cards | Two equal-width, equal-height cards, 10px gutter, 18/14px padding |
| Primary CTA | Full-width 52px pill, 26px radius |
| Fine print | Billing note, 8.5px, centred |
| Footer links | Restore · Terms · Privacy |

Cards are equal height by construction — both contain: name, price, period line, one pill (`7-DAY FREE TRIAL` / `YOUR PLAN TODAY`), divider, six single-line feature rows. **Feature rows must never wrap** — keep copy at or under the strings below.

## Content

### Free — `$0` / `฿0`, "forever" · pill `YOUR PLAN TODAY`
- 5 active plans
- Daily & weekly
- Calendar: this month
- 1 reminder per plan
- Today view & streak
- Widgets, no expiry

### Premium — recommended · pill `7-DAY FREE TRIAL`
- Unlimited plans
- Custom recurrence
- Full calendar + drag
- Reminders & snooze
- History & export
- Themes & icons

## Pricing

| Billing | USD | THB |
|---|---|---|
| Monthly | `$2.67` — "per month" | `฿89` — "per month" |
| Annual | `$16.67` — "per year · ≈$1.39/mo" | `฿555` — "per year · ≈฿46.25/mo" |

Annual saves ~48% vs monthly → `SAVE 48%` badge on the Annual segment.

Fine print, by state:
- Annual USD — "Annual billed as one payment of $16.67/yr (≈ $1.39/mo). Cancel anytime from account settings."
- Annual THB — "Annual billed as one payment of ฿555/yr (≈ ฿46.25/mo). Converted at ≈ ฿33.30/$1 — App Store price may round. Cancel anytime."
- Monthly USD — "Billed $2.67 each month. Cancel anytime from account settings."
- Monthly THB — "Billed ฿89 each month. Converted at ≈ ฿33.30/$1 — App Store price may round. Cancel anytime."

THB figures are a display conversion at ≈ ฿33.30/$1 (Sept 2026). **In the app, read localized prices from StoreKit / Play Billing instead of hardcoding**; keep these strings as fallback copy only.

## CTA states

| Plan selected | Label | Action |
|---|---|---|
| Premium | `Start free trial` | Purchase the selected SKU (annual or monthly) |
| Free | `Your plan today` | Dismiss — no purchase |
| Purchasing | three pulsing dots, label hidden | button stays the same size |
| Success | `✓ Trial started` | background → `#0F5FC4`, mascot hops once, dismiss after ~1s |

## Tokens (in-app palette — matches draft 2, not the marketing page)

| Token | Value | Use |
|---|---|---|
| bg | `#F7FAFF` | screen |
| surface | `#FFFFFF` | Free card |
| ink-dark surface | `#10203A` | Premium card |
| azure | `#1B76E8` | selection ring, checks, CTA, RECOMMENDED tag |
| azure-deep | `#0F5FC4` | success CTA |
| line | `#E7EDF6` | dividers, hairlines |
| ink | `#10203A` | primary text |
| ink-muted | `#3A4759` / `#5A6A80` | feature rows / fine print (solid, not alpha — contrast) |
| ink-on-dark muted | `#C6D6EA` | Premium period line |
| warm tint | `rgba(184,134,43,.2)` + `#EFC985` | trial badge on dark |
| save badge | `#F6EBD6` bg / `#8C6318` text | SAVE 48% |

Type: **Anuphan** for all UI (weights 500/700); **JetBrains Mono** (tabular figures) for prices only. Radii: cards 20px, pills 9–16px, CTA 26px.

## Motion

| Beat | Spec |
|---|---|
| Entrance | Header → toggle → Premium → Free → CTA → fine print, each 14px up + fade, 140ms apart starting at 120ms, 520ms `cubic-bezier(.22,1,.36,1)` |
| Billing / currency change | Thumb (or pill) slides 320ms; price + period + fine print rise 6px and fade in over 340ms |
| Selection | 260ms — azure ring and filled check cross-fade between cards, chosen card lifts 2px, other drops its shadow; no layout shift |
| Purchase | Label → dots (1.1s) → check + one 900ms mascot hop |
| Ambient | Mascot breathe 4s, spark float 4s, blink 6s, RECOMMENDED tag pulse 3.2s, CTA sheen 3.4s |
| Reduced motion | `prefers-reduced-motion: reduce` cancels all ambient loops; entrance may resolve instantly |

## Acceptance criteria

1. Both plan cards render identical height; no card content is clipped.
2. Every feature row is a single line at the shipped type size, in both languages you support.
3. Prices and the fine print come from the store product, and the THB/USD label matches the user's storefront.
4. Annual is the default selection on open; the Monthly/Annual and currency controls update price, period and fine print together.
5. Selecting Free changes the CTA to a dismiss action — the paywall is never a dead end.
6. Restore / Terms / Privacy are reachable and the ✕ always dismisses.
7. Contrast: all secondary type ≥ 4.5:1 against its ground (use the solid muted inks above, never alpha).

## Tweakable props on the design file

`defaultBilling` (Monthly | Annual), `defaultCurrency` (USD | THB), `showControls` (hides the Replay/Purchase demo buttons below the phone).
