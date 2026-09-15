# Tickle — Subscription status screen (implementation spec)

## Package contents

| File | What it is |
|---|---|
| `Tickle subscription status (standalone).html` | Open in any browser — the live screen, all five states, fully self-contained. Start here. |
| `Tickle subscription status.dc.html` | Editable design source (markup + motion logic). Needs `support.js` beside it. |
| `support.js` | Runtime for the `.dc.html` file. Not app code — do not port it. |
| `Tickle paywall (standalone).html` | The paywall this screen links to, for context. |
| `Tickle-Pricing-README.md` | Copy & pricing source of truth. |
| `github.md` | Repo the app lives in. |

Read the spec, open the standalone HTML to see the motion, then implement natively — the HTML is a reference, not code to port.

## What this screen is

`Profile → Subscription`. One screen that reports the user's current entitlement and gives them control of it. Five states, same skeleton — only the hero, meter, action and billing values change.

| State | When |
|---|---|
| **Trial** | 7-day free trial running |
| **Monthly** | Active monthly subscriber |
| **Annual** | Active annual subscriber |
| **Ending** | Cancelled but still entitled until period end |
| **Free** | No subscription (or lapsed) |

The chips below the phone in the design file are a **review control only** — not part of the app.

## Layout (top → bottom)

| Region | Spec |
|---|---|
| Nav | Back ← + "Subscription" (16px/700) |
| Status hero | 22px-radius card. Status pill, plan name (17px/700), price line (11px mono), mascot (46×42) top-right, then a meter: label + value row (10.5px) over a 6px progress bar |
| Included list | White card — title + three one-line rows with check dots |
| Billing details | White card — 4 rows: Plan / Next charge / Payment / Member since (label 11px `#5A6A80`, value 11px `#10203A`, mono for dates) |
| Primary action | Full-width 50px azure pill |
| Minor action | Centred 11.5px text button |
| Footer | Restore · Terms · Privacy (10.5px) |

Hero is dark (`#10203A`) for every entitled state and white for Free.

## State content

| State | Pill | Plan / price | Meter label · value · fill | Primary | Minor |
|---|---|---|---|---|---|
| Trial | `TRIAL · 4 DAYS LEFT` — azure `#1B76E8` on white ink | Premium — Annual · `$16.67 / yr after trial` | Trial ends 17 Sep 2026 · day 3 of 7 · 43% azure | Manage in App Store | Cancel trial |
| Monthly | `ACTIVE` — green `rgba(79,216,164,.2)` / `#8FEAC4` | Premium — Monthly · `$2.67 / month` | Renews 13 Oct 2026 · $32.04 / yr at this rate · 100% azure | Switch to annual · save 48% | Cancel subscription |
| Annual | `ACTIVE` — green | Premium — Annual · `$16.67 / yr (≈ $1.39/mo)` | Renews 13 Sep 2027 · ≈ $1.39 / mo · 100% azure | Manage in App Store | Cancel subscription |
| Ending | `ENDS 13 OCT` — warm `rgba(184,134,43,.22)` / `#EFC985` | Premium — Monthly · `Cancelled · no further charges` | Premium until 13 Oct 2026, then Free · 27 days left · 68% warm `#D9A356` | Keep Premium | What changes on Free? |
| Free | `FREE PLAN` — `#EEF3FA` / `#3A4759` | Free · `$0 forever` | Active plans used · 5 of 5 · 100% warm | Start free trial → paywall | Restore purchases |

Included list: "Unlimited plans & custom recurrence", "Full calendar, history & export", "Smart reminders, themes & widgets". Title is "Included in your plan", and on Free it becomes **"Unlock with Premium"** with grey dots instead of azure.

Billing rows by state — Plan: `Premium annual` / `Premium monthly` / `Free`; Next charge: renewal date, `—` when cancelled or Free; Payment: store method (`Apple Pay`, `Visa ·· 4242`), `—` on Free; Member since: account creation date.

## Data & platform notes

- Derive the state from the store entitlement, not local flags: `isInTrial`, `willRenew`, `expirationDate`, `productId`, `periodType`. "Ending" = entitled **and** `willRenew == false`.
- Prices, currency and renewal dates come from StoreKit / Play Billing localized product info — the strings above are fallback copy. THB display follows `Tickle-Pricing-README.md` (≈ ฿33.30/$1, Sept 2026).
- Cancel and payment-method changes are **deep links to the store's manage-subscriptions sheet**; the app never cancels directly. "Switch to annual" is an in-app upgrade/proration purchase.
- Refresh entitlement on app foreground and after returning from the store sheet, animating any state change.
- Free state's primary action opens the paywall (see `Tickle paywall (standalone).html`).

## Tokens

Same as the paywall: bg `#F7FAFF`, surface `#FFFFFF`, dark surface `#10203A`, azure `#1B76E8`, line `#E7EDF6`, ink `#10203A`, muted ink `#3A4759` / `#5A6A80`, ink-on-dark muted `#C6D6EA`. Status-only additions: green `rgba(79,216,164,.2)` fill + `#8FEAC4` text, warm `rgba(184,134,43,.22)` fill + `#EFC985` text, warm bar `#D9A356`. Type: Anuphan 500/700 for UI, JetBrains Mono (tabular) for dates, prices and counts. Radii: hero/cards 20–22px, pills 9px, CTA 25px.

## Motion

| Beat | Spec |
|---|---|
| Entrance | Hero → included list → billing card → CTA → footer, each 13px up + fade, 140ms apart from 110ms, 500ms `cubic-bezier(.22,1,.36,1)` |
| Meter fill | Bar animates 0 → target width over 600ms on the same curve, after the hero lands |
| State change | Pill, plan, price, meter and billing values rise 5px and fade in over 340ms; hero background and bar colour cross-fade 350ms; mascot hops once (900ms) |
| Ambient | Mascot breathe 4s, spark float 4s, blink 6s, CTA sheen 3.4s |
| Reduced motion | `prefers-reduced-motion: reduce` cancels ambient loops |

## Acceptance criteria

1. Every state renders without clipping at the smallest supported device height; the billing card never pushes the CTA off-screen.
2. The status pill colour communicates the state at a glance: green = active, azure = trial, warm = ending, grey = free.
3. Dates, prices and payment method always match the store record — never a cached guess.
4. "Ending" never claims a next charge, and Free never claims a renewal.
5. Cancel routes to the store's manage-subscriptions sheet; on return the screen reflects the new state.
6. Secondary type is solid muted ink (≥ 4.5:1), never alpha.
7. Restore, Terms and Privacy are reachable from this screen.
