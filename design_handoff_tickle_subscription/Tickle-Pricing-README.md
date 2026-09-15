# Tickle Pricing — Reference for Design

This file is a content and style reference for designing Tickle's pricing screen. It mirrors the current pricing page (`Tickle Pricing`, published as a Claude artifact) so a design tool can recreate or restyle it without guessing at copy, numbers, or tokens.

## Plans

Two tiers: **Free** and **Premium**. No third tier, no lifetime option at launch.

### Free — $0 forever

Tagline: "Everything you need to build one or two routines that stick."

Included:
- Up to 5 active plans
- Daily & weekly recurrence
- Calendar view (current month)
- 1 reminder per plan
- Today view & current streak
- Home Screen widgets
- No data expiry

CTA button label: **Your plan today** (this is the current-plan state, not an action button)

### Premium — Recommended

Tagline: "Unlimited plans, custom recurrence, and full progress history."

Trial badge: **7-day free trial · no card required**

Included:
- Unlimited active plans
- Fully custom recurrence, multiple times/day
- Full calendar — past, future, drag-to-reschedule
- Multiple reminders, smart timing, snooze
- Full history, trends & data export
- Custom themes, icons & widgets

CTA button label: **Start free trial**

## Pricing

| Billing | USD | THB (≈ ฿33.30 / $1, Sept 2026) |
|---|---|---|
| Monthly | $2.67 / month | ฿89 / month |
| Annual | $16.67 / year (≈ $1.39/mo) | ฿555 / year (≈ ฿46.25/mo) |

Annual saves ~48% versus paying monthly all year — shown as a **"Save 48%"** badge on the Annual toggle option.

Footer / fine print copy: "Annual billed as one payment of $16.67/yr (≈ $1.39/mo). Cancel anytime from account settings." (THB version: "Annual billed as one payment of ฿555/yr (≈ ฿46.25/mo). Converted at ≈ ฿33.30/$1 (Sept 2026) — actual App Store price may round differently. Cancel anytime from account settings.")

Page header copy: "Simple pricing, built to keep routines going" / "Start free with the full core loop. Upgrade when you want more plans, deeper history, and finer control over reminders."

## Interaction notes

- A **Monthly / Annual** toggle switches the displayed Premium price and note. Annual carries a "Save 48%" badge.
- A **USD / THB** toggle switches both the Premium price and the Free tier's "$0" / "฿0" label, plus the footer note.
- Premium is visually marked as the recommended plan (an "Recommended" tag above the card).
- No ads anywhere in the product — don't include an ads-related bullet on the Free tier; "No data expiry" replaces it as the equivalent trust-building point.

## Visual tokens (from the current mockup)

Use these if the new design should stay visually consistent with the existing pricing page and its companion pages (benchmark comparison, feature gap, breakeven calculator).

**Color — light**
| Token | Hex | Use |
|---|---|---|
| ink | `#1B211D` | primary text |
| ink-soft | `#4B554E` | secondary text |
| bg | `#F5F7F4` | page background |
| surface | `#FFFFFF` | card background |
| line | `#DCE3DC` | borders/dividers |
| accent | `#1F7A5C` | brand accent (emerald), Premium card border, active toggle |
| accent-soft | `#E4F1EA` | accent tint fills |
| accent-ink | `#0F4A35` | accent text on tint |
| warm | `#B8862B` | secondary accent (savings badge, trial badge) |
| warm-soft | `#F6EBD6` | warm tint fills |

**Color — dark** (swap when `prefers-color-scheme: dark` or explicit dark theme)
| Token | Hex |
|---|---|
| ink | `#EAEEEA` |
| ink-soft | `#AEB8B0` |
| bg | `#14181A` |
| surface | `#1B211E` |
| line | `#2C332F` |
| accent | `#4FD8A4` |
| accent-soft | `#1C332A` |
| accent-ink | `#8FEAC4` |
| warm | `#D9A356` |
| warm-soft | `#332A18` |

**Typography**
- Display / headings: **Fraunces** (serif, weights 500/600)
- Body / UI text: **Public Sans** (weights 400/500/600)
- Prices, data, monospace labels: **IBM Plex Mono** (weights 400/500)
- Loaded via Google Fonts: `Fraunces:wght@500;600`, `Public+Sans:wght@400;500;600`, `IBM+Plex+Mono:wght@400;500`

**Layout**
- Two pricing cards side by side (stacks to one column under 600px)
- Premium card gets an accent border + subtle ring to stand out; Free card is neutral
- Prices set in IBM Plex Mono with tabular figures for alignment
- Rounded corners throughout (10–16px), no heavy shadows — separation comes from border color, not elevation

## Source

Live reference page: the "Tickle Pricing" artifact in this account's Claude artifact gallery (title: *Tickle Pricing*). This README should be treated as the source of truth for copy and numbers if the two ever drift — update this file first, then the design.
