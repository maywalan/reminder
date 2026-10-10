# Handoff: Tickle calendar widgets (Round 4)

## Overview
Home-screen and lock-screen widgets for Tickle's calendar. They show the same data as the Calendar screen (13a in `Tickle draft 2.dc.html`): plans by day, coloured by list, today highlighted. Approved direction: **Round 4** — 4a (large), 4c (medium + two small), 4b (lock-screen accessories). Rounds 1–3 in the file are earlier explorations; ignore them except as reference for empty / overflow copy.

## About the design files
`Tickle calendar widget.dc.html` is an HTML design reference, not production code. Recreate it natively — on iOS with **WidgetKit + SwiftUI** (the target). Open the file in a browser; Round 4 is the top section. Placeholder grey squares in the dock and the lock-screen buttons are context only.

## Fidelity
High-fidelity. Colours, type sizes, spacing and copy are final. Sizes are drawn at the 393pt-wide iPhone (small 158×158, medium 338×158, large 338×354); use the family's real size from `context.displaySize` and keep proportions.

## Widget families
| Design | WidgetKit family | Content |
| --- | --- | --- |
| 4a Large | `.systemLarge` | 6-week month grid, plan names as chips in each day |
| 4c Medium | `.systemMedium` | 2-week grid (current week + next), same cell as large |
| 4c Small "Today" | `.systemSmall` | Weekday + date, up to 3 of today's plans with time |
| 4c Small "Next 3 days" | `.systemSmall` (second widget kind or an App Intent config) | Today / tomorrow / day after, up to 2 chips each |
| 4b Inline | `.accessoryInline` | `Thu 14 · [cal icon] 2:00 Design review` |
| 4b Rectangular | `.accessoryRectangular` | "Next · 2:00 PM" / title / "then {next} · {time}" |
| 4b Circular A | `.accessoryCircular` | Count of open plans today + progress ring (done / total) |
| 4b Circular B | `.accessoryCircular` | "MAY" / "14" |

iOS does not allow large widgets on the lock screen; 4b is the lock-screen offer. Large/medium also work in StandBy.

## Home-screen widget styling (4a, 4c)
- Container: `rgba(18,22,40,.62)` over the wallpaper with blur (use `.containerBackground` with a dark material; in iOS 26 clear/tinted modes let the system restyle it), 1px `rgba(255,255,255,.12)` hairline, radius = system.
- Padding: large 12/9/9 (top/sides/bottom); medium 10/9/7; small 11/10/10.
- Font: Anuphan only (bundle the font in the widget extension). White text.
- **Header** (large/medium): title 700 14pt (medium 13pt) — "May 2026" / "May 10 – 23". Right pill: 600 10.5pt, padding 2×8, radius 9, bg `rgba(255,255,255,.14)`, copy "{n} plans today" (hide when 0 → "Free today").
- **Weekday row**: S M T W T F S, 700 9pt, `rgba(255,255,255,.5)`, Sunday first.
- **Grid**: rows split height equally; 1px row dividers `rgba(255,255,255,.08)`, top border `.1`.
- **Day cell**: padding 2×1.5. Date circle 15×15, 700 9pt, centred.
  - Normal: `rgba(255,255,255,.92)`. Outside month: `rgba(255,255,255,.28)`, no chips.
  - Public holiday: date in `#FFC24D`.
  - Today: white circle, text `#10203A`.
- **Chip**: height 11, radius 3, gap 1.5, bg = list colour at ~33% alpha (`{hex}55`), 2pt left bar in solid list colour, text 600 7pt, single line, tail ellipsis. Done plans: 50% opacity + strikethrough.
- **Overflow**: max 2 chips per cell. If a day has 3+, show the first chip then "+{n-1} more" (600 7pt, `rgba(255,255,255,.65)`).
- Small "Today": "THU" 700 10pt `#7FB3FF` + "14" 700 22pt. Rows 24pt tall, radius 6, 3pt bar, title 600 10.5pt, time 500 9pt `.7`. Max 3; if more, last row becomes "+{n} more".
- Small "Next 3 days": 3 equal columns, gap 4. Label 700 8.5pt ("Today" white, others `.6`), date 700 17pt. Chips 30pt tall, text 8.5pt wraps to 2 lines. Max 2 + "+n".

## Lock-screen styling (4b)
Render with system vibrancy (`widgetRenderingMode == .vibrant`) — no list colours. Designs show white at full / 75% opacity on a `rgba(255,255,255,.18)` blurred plate (use `AccessoryWidgetBackground()`).
- Rectangular: kicker 700 11pt `.75` with 7pt dot; title 700 14pt; sub 500 11pt `.75`.
- Circular count: number 700 20pt, "to do" 600 9pt; ring 5pt stroke, track `.25`, fill = done/total.
- Circular date: "MAY" 700 10pt tracking .5, "14" 700 24pt.

## List colours (from the Calendar screen)
```
Violet  #7B61FF   Purple #A455D6   Teal   #17A8A0
Green   #35B978   Amber  #F0A32E   Rose   #E0616F
Holiday date #FFC24D   Today circle #FFFFFF / text #10203A
```

## Data & behaviour
- Data model per day: `[Plan { title, time | allDay, listColour, isDone }]`, plus holiday name. Read from the shared App Group store the app writes to.
- Ordering inside a day: timed plans by time, then all-day.
- Timeline: one entry at midnight (rolls today), plus an entry after each plan's start time (updates "Next"). Call `WidgetCenter.reloadAllTimelines()` when a plan is added, edited or ticked in the app.
- Tap targets (`widgetURL` / `Link`): day cell → Calendar tab, Month view, that day expanded; chip → plan detail; "+n more" → that day; small/rect "Next" → plan detail.
- Empty today: pill reads "Free today"; small Today shows "Nothing planned" + "+ Add a plan" (deep link to New plan sheet). See Round 2 (2a) for copy.
- Plain (non-interactive) widgets in Round 4. Round 2/3 large tick-off is not in scope.

## Assets
- `design_handoff_tickle_icon_6b/icon-master.svg` — app icon, shown in the dock for context only.
- `assets/tickle-glyph.svg` — mascot, used only in rounds 1–3 (not in Round 4).

## Files
- `screenshots/4a-large.png`, `screenshots/4c-medium-small.png`, `screenshots/4b-lock-screen.png` — 2x captures of each phone. Backdrop blur isn't captured; widgets on device should look more frosted.
- `Tickle calendar widget.dc.html` — design (Round 4 at top: `#4a`, `#4c`, `#4b`). Sample data lives in the logic class (`ev`, `hol`).
- `support.js` — runtime needed to open the HTML file locally.
