# Handoff: Tickle — Home week strip + feed (Today · Upcoming · Earlier) + New plan icon picker

## Overview
Two scoped changes to the Tickle reminder app (`maywalan/reminder`, Expo app in `routine-app/`):

1. **Home** — a new **week strip** with week navigation (doesn't exist in the app yet), plus new UI for the three feed sections: **Today**, **Upcoming**, **Earlier**.
2. **New plan** — a new **Icon** section placed **directly below the Alert section**, plus a full-screen **Choose icon** sheet.

## ⚠ Scope rules (read first)

### Home: ADD the week strip, and change ONLY the Today, Upcoming and Earlier sections
In scope:
- **Week strip (new component).** Insert it between the search row and the feed sheet.
- The Today, Upcoming and Earlier feed sections.

Do **not** touch any of these. Keep the current implementation exactly as it is in the codebase:
- Top section: mascot, greeting, Edit link, header
- Search bar
- Filter / palette / tag buttons next to search
- Bottom nav bar and the + FAB

The reference HTML also shows a redesigned bottom nav bar. **It is out of scope for this handoff.** Ignore it.

### New plan: the Icon section goes below the Alert section
Order in `add-plan.tsx`: … Repeat · Repeat Until · **Alert · Second Alert · Third Alert** → **Icon (new)** → Live Activity → Colour → Photos → Details → Save.

Leave every other field, its order and its behaviour unchanged.

## About the design files
The files in this bundle are **design references built in HTML**. They show the intended look and behaviour and are not production code. Recreate them in the existing Expo / React Native codebase using its components (`theme.ts` tokens, `icon.tsx`, `bottom-sheet.tsx`, etc.). Do not ship the HTML.

## Fidelity
**High-fidelity.** Colours, type, radii and spacing below are final. The mocks are 390pt wide. Font: **Anuphan** only (400/500/600/700). No second font family and no monospace.

---

## Screen 1 — Home week strip (new)

Two stacked rows, placed directly under the search row.

### Week header row
Flex row, space-between, gap 8, padding 12 top / 16 sides / 9 bottom.
- **‹ Previous week / › Next week buttons**: 34×34 circles, white, `1px #E3EAF4` border, 18px chevron in `#10203A` with stroke 2. They scale to 0.92 while pressed. No limit: the user can keep stepping in either direction.
- **Centre block**: a column, centred, line-height 1.25.
  - "Week 20": 15/700, `#10203A`. This is the **ISO-8601 week number** (Monday-start). Add " · 2026" after the number when the week falls in a different year from the current one, or spans two years.
  - Range "12–18 May": 12/500, `rgba(16,32,58,.5)`, no wrap. When the week crosses a month boundary, show both months: "28 Apr – 4 May".
- **"Today" return chip**: 8px to the right of the centre block. Show it **only when the visible week is not the current week**.
  - 26 tall, padding 0×10, radius 13, background `#EAF2FE`.
  - A 13px circular-arrow icon in `#1B76E8`, then "Today" in 12/600 `#0F5FC4`.
  - Tap: jump back to the current week and select today.

### Day row
A 7-column grid (`repeat(7, minmax(0,1fr))`), gap 7, padding 0×16, Monday to Sunday.
- **Day cell**: radius 12, overflow hidden, column layout.
  - Cap: full width, day name ("Mon") in 11/600, padding 3×0.
  - Date number: 19/700, padding 6 top / 7 bottom.
  - Animates `transform` over 0.15s and scales to 0.95 while pressed.
- **Cell states**:
  - Default: background `#FFFFFF`, shadow `0 2 8 rgba(16,32,58,.06)`. Cap `#F1F5FB` with `rgba(16,32,58,.55)` text. Number `#10203A`.
  - Weekend (Sat/Sun): cap `#FCE9EB` with `#C24A57` text. Number `#C24A57`.
  - Today, not selected: number `#1B76E8`. Only applies in the current week.
  - Selected: background `#EAF2FE`, shadow `0 0 0 2px #1B76E8`. Cap `#1B76E8` with white text. Number `#0F5FC4`.
- Tapping a cell selects that day. The feed sheet's title follows the selection: "Today" or "Tomorrow" in the current week, otherwise "Fri 16 May".

### Week strip behaviour
- On open: the current week, with today selected.
- ‹ or ›: move by ±7 days and select that week's **Monday**.
- "Today" chip: return to week offset 0 and select today.
- Optional, not in the mock: a horizontal swipe on the day row can map to ‹ / ›.
- Load data for the visible week. The feed should show the selected day's plans. (The prototype uses static sample data.)

## Screen 1b — Home feed sections

The feed is the white sheet below the week strip: `background #FFFFFF`, top radius 30, shadow `0 -4 20 rgba(16,32,58,.05)`. It scrolls as one list: Today → Upcoming → Earlier. Sheet padding is 20 top, 18 right, 10 left, plus bottom padding so content clears the nav bar.

### 1a. Today
**Header row** (baseline-aligned, gap 6, left padding 12):
- "Today": 23/700, letter-spacing −0.3, `#1B76E8`
- "· Wed, 14 May": 15/500, `rgba(16,32,58,.5)`
- Right-aligned: "{n} left" or "All clear" when n = 0, 13.5/500, `rgba(16,32,58,.5)`. n = today's plans not yet done.

**Timeline row** (one per plan today, flex row, gap 8):
- **Time column**: 52 wide, centred, 6 top padding.
  - Start time "13:00": 12/600, `rgba(16,32,58,.5)`.
  - The live plan shows a **Now** pill instead of the time: background `#35B978`, white 11.5/700, padding 3×9, radius 10.
  - Below it, a **rail**: 3px dotted left border, minimum height 22, fills the row. Colour is `#35B978` for past or live plans and `#D3DBE7` for future ones.
- **Card**: flex 1, 12 bottom margin, radius 20, padding 15 / 14 / 15 / 16.
  - Background `linear-gradient(100deg, {groupColor}24 0%, #FFFFFF 92%)`. The `24` and `22` suffixes are hex alpha.
  - Border `1px {groupColor}22`, shadow `0 4 14 rgba(16,32,58,.06)`.
  - Title: 17/700, letter-spacing −0.2, `#10203A`.
  - Sub line (12.5, gap 5): a 13px clock icon, then:
    - normal plan: "13:00 – 14:00", 500, `rgba(16,32,58,.5)`
    - live plan: "34:12" in 700 `#1B76E8`, then " remaining" in 500. Counts down every second.
  - **Icon chip** on the right: 46×46, radius 15, background `{groupColor}1A`, 26px icon in the group colour, stroke 1.9.
  - **Check circle**: absolute at −6/−6 (top-left), 22×22, 2px border.
    - Undone: white fill, `#DDE3EE` border.
    - Done: `#35B978` fill and border with a white tick.
    - Tap toggles done. A done card goes to 0.6 opacity with a strike-through title.

### 1b. Upcoming
- Header row (padding 22 top / 10 bottom, space-between):
  - "Upcoming": 18/700, `#10203A`
  - "Next 3 days": 13/500, `rgba(16,32,58,.5)`
- Grouped by day. Day label ("Tomorrow · Thu 15", "Fri 16"): 13/600, `rgba(16,32,58,.5)`. Gap 8 between rows, 14 below each group.
- **Row**: padding 11×12, radius 18, background `#F9FBFF`, border `1px #EDF2FA`, gap 12.
  - Icon chip: 40×40, radius 13, background `{groupColor}1A`, 22px icon.
  - Title: 15/600. Sub ("Work · 15 min"): 12/500, `rgba(16,32,58,.5)`.
  - Time chip: background `#EAF2FE`, text 12.5/700 `#0F5FC4`, padding 5×9, radius 10. Shows "All day" for all-day plans.
  - **No checkbox.** A future plan can't be completed.

### 1c. Earlier
- Header row: "Earlier" (18/700) and a "See all" link (14/600, `#0F5FC4`).
- Grouped by day ("Today", "Yesterday · Tue 13"); labels use the same style as Upcoming.
- **Row**: no card. Padding 11×4, bottom border `1px #F1F4FA`, gap 11.
  - Status mark, 22×22:
    - done: solid `#35B978` circle with a white tick
    - missed: `2px #F0A0A8` ring with a `#E0616F` ✕
  - Icon: 18px, `rgba(16,32,58,.4)`.
  - Title: 14.5/500, `rgba(16,32,58,.6)`, struck through when done.
  - Meta on the right, 12.5/500:
    - "done 06:34" in `rgba(16,32,58,.45)`
    - "missed 09:00" in `#C24A57`

**Data:** Earlier shows the past plans already tracked by the app, newest day first. Today's passed plans appear under both the Today timeline (green rail) and Earlier → "Today".

---

## Screen 2 — New plan: Icon section (below Alert)

A card in the same style as the other add-plan cards: white, `1px #E7EDF6`, radius 22, padding 14 / 16 / 16, gap 14.

- **Top row** (gap 12):
  - Selected icon: 46×46, radius 15, background `{planColor}1F`, ring `0 0 0 2 #fff, 0 0 0 4 {planColor}`, 26px icon.
  - "Icon": 16/600. Below it, the label: "Run · Health colour", or "Run · azure (no group)" when there's no group. 13/500, `rgba(16,32,58,.5)`.
  - "All icons ›": 14.5/600, `#0F5FC4`. Opens the Choose icon sheet.
- **Suggested**: label "SUGGESTED FOR “{keyword}”", 11.5/600, tracking 0.8, `rgba(16,32,58,.45)`.
  - Then a 6-column grid, gap 8, of square chips: radius 14, 22px icon.
  - Off: background `#F4F7FC`, stroke `rgba(16,32,58,.55)`.
  - On: background `{planColor}1F`, stroke `planColor`, ring `0 0 0 2 {planColor}`.
  - Suggestions are matched from words in the title.

`planColor` is the plan's group / Colour swatch. With no colour it falls back to azure `#1B76E8`.

## Screen 3 — Choose icon sheet
A bottom sheet over a 28% ink scrim (`rgba(16,32,58,.28)`): top 96, top radius 28, background `#F4F7FC`.

From top to bottom:
- Drag handle: 38×5.
- Header: "Choose icon" (17/700) with "Done" on the right (16/700, `#1B76E8`).
- Search field: 42 tall, radius 21, white, `1px #E3EAF4`, placeholder "Search icons".
- Colour row: "Colour follows the plan's group", plus 22px colour dots. The selected dot has a ring.
- Scrolling groups. Each has a label (11.5/600 caps) and a white card (radius 20, padding 12) holding a 6-column grid of chips:
  - **RECENT**, noted "Your most used": the 6 most-used icons, sorted by use count, highest first.
  - WORK & STUDY · HEALTH · HOME & LIFE · OUT & OCCASIONS, 6 icons each.

**Recent logic:** every pick adds 1 to that icon's count, which can reorder Recent. In production, derive counts from the user's saved plans and persist them across sessions. The prototype seeds sample counts.

## Icon set (24 icons)
24pt grid, 1.9 stroke, round caps and joins, no fills. The exact SVG path data is in the `ICONS` array in `Tickle home timeline.dc.html`; port it into `icon.tsx`.
- Work & study: work, people (Meeting), laptop (Code), mail, book (Study), brush (Create)
- Health: run, gym, heart (Wellbeing), pill (Meds), tooth (Dentist), moon (Sleep)
- Home & life: home, leaf (Plants), cart, meal, coffee, paw (Pet)
- Out & occasions: plane, car, gift, cake, money (Bills), music

Chip sizes: Card 46 / radius 15 / 26px icon · List 40 / 13 / 22 · Inline 28 / 9 / 16.

## State
- Week strip: `weekOffset` (an integer, 0 = current week) and `selectedDayIndex` (0–6, Monday-based). Derive the visible dates as `startOfISOWeek(today) + weekOffset*7 + i`.
- Home: `done[planId]` toggles; a 1s countdown runs for the live plan; `left` = today's undone plans.
- New plan: `icon` (id), `iconUsage` (map of id → count, persisted), and the existing colour / group value drives the tint.

## Design tokens
- Ink `#10203A`. Muted ink uses alpha: .62 / .6 / .55 / .5 / .45 / .4.
- Azure `#1B76E8`, azure-dark `#0F5FC4`, azure-tint `#EAF2FE`
- Green `#35B978` · Rose `#E0616F` / `#C24A57` / `#F0A0A8`
- Group colours: Work `#7B61FF` · Study `#A455D6` · Health `#17A8A0` · Personal `#F08A3C` · Home `#1B76E8`
- Surfaces: app `#F4F7FC` · card `#FFFFFF` · upcoming row `#F9FBFF` · borders `#E7EDF6` / `#EDF2FA` / `#F1F4FA` / `#E3EAF4`
- Radii: 30 sheet · 22 form card · 20 timeline card · 18 upcoming row · 15 / 13 icon chips · 10 time chip
- Alpha suffixes on group colours: `24` card tint · `22` card border · `1A` icon chip · `1F` selected chip

## Files
- `Tickle home timeline.dc.html`: the reference. Open it in a browser with `support.js` next to it.
  - **A** Home viewport: the week strip spec (try ‹ › and the Today chip)
  - **B** Home, full scroll: the Today / Upcoming / Earlier spec
  - **C** New plan with the Icon card below Alert
  - **D** Choose icon sheet
  - **E** Icon set
  - Ignore the bottom nav bar in A and B (out of scope).
  - The week-strip logic (`isoWeek`, `weekRange`, `prevWeek`/`nextWeek`/`thisWeek`) is in the logic class at the bottom of the file.
- `Tickle draft 2.dc.html` (project root, not bundled) has the same changes applied to the draft: section 02 Home feed, and section 07 New plan with Icon below the alerts.
