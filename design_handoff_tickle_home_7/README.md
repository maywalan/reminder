# Handoff: Tickle — Home screen (7a / 7b / 7c)

## Overview
The Today tab home screen of Tickle, a reminder and session app. The feed is:
1. A raised white **Today sheet**. Inside it is a vertical **time rail** listing today's open and live tasks.
2. **Upcoming**: the next few days, as small rows.
3. **Earlier**: today's done or missed items, as small rows.

There are three reference states:
- **7a**: a session is running (live).
- **7b**: idle, with no session running.
- **7c**: a mix of point reminders and time-range sessions.

The design direction is "minimal yet functional". The Today sheet is the only raised surface, and plan colour appears only as small accents.

## About the design files
`home-7a-7c-reference.html` is a **design reference built in HTML**. It is not production code. Recreate it in the target codebase (SwiftUI / React Native / React, etc.) using that codebase's own patterns. Open the file in a browser to see all three frames side by side. Each frame is 320pt wide. The copy in the file is final.

## Fidelity
**High fidelity.** Colours, type, spacing and radii below are final. Match them exactly.

## Screen layout (all states)
The screen background is `#F5F7FA`. From top to bottom:

| Block | Spec |
|---|---|
| Status bar | 38pt tall. |
| Greeting | Padding 8 / 22 / 16. Line 1: "Good afternoon, May", 11pt/500, ink at 50%, `nowrap`. Line 2: "Wed, 14 May", 17pt/700, ink, letter-spacing −0.2. |
| Feed | Horizontal padding 12. Column layout with `gap: 20`. Scrolls under the nav bar. |
| Nav bar | Fixed to the bottom. Unchanged from the current app; see below. |

### Today sheet
- **Container:** background `#FFF`, radius 22, border `1px #E9EEF6`.
- **Shadow:** `0 1px 2px rgba(16,32,58,.04), 0 6px 20px rgba(16,32,58,.05)`.
- **Padding:** 16 top, 10 left/right, 8 bottom. Column layout with `gap: 6`.
- **Header row:**
  - "Today": 18pt/700, ink, letter-spacing −0.2.
  - Count, right-aligned: 11pt/400, ink at 50%, `nowrap`. Copy: "1 live · 2 left" when live, "4 left" when idle.
- **Rail line:** 1px `#E9EEF6`, absolutely positioned at x = 52 inside the list, inset 14 top and bottom.

### Rail row grid (every row)
- `grid-template-columns: 38px 9px 1fr`, `column-gap: 10px`.
- **Column 1:** time, right-aligned.
- **Column 2:** the rail marker.
- **Column 3:** the content.

### Row types
1. **Point reminder** (7b, and 7c rows "Take vitamins" and "Call mom")
   - Row padding: 10 top and bottom. Items centred vertically.
   - Time: 11.5pt/600, ink.
   - Marker: 9×9 circle, white fill, 2px border in the plan colour.
   - Title: 13.5pt/600, ink.
   - Meta: 11pt, ink at 50%. It starts with the plan name in the plan's dark colour at weight 600, then " · 45 min", " · 1 alert", " · reminder", etc.
   - Check ring on the right: 22×22 circle, `1.5px #CFD7E3` border. Tapping it completes the task.
2. **Time-range session** (7c: "Deep work: thesis", "Gym · legs")
   - Row padding: 8 top and bottom. Items stretch to the row height.
   - Minimum height: 54 for 1 hr or less, 72 for 2 hr or more. Rows grow slightly with duration but are **not** scaled to real time.
   - Time column: start at 11.5pt/600 ink on top, end at 10.5pt ink 50% at the bottom (`space-between`).
   - Marker: a vertical bar 5pt wide with radius 3, filled with the plan tint and a 1.5px border in the plan colour. It spans the full row height.
   - Meta ends with the duration, e.g. "Study · 2 hr".
3. **Free-time gap** (7c): an empty row showing "1 hr free" in column 3, 10.5pt, ink at 40%. Show it when the gap between two items is 60 min or more.
4. **Now line** (idle only, 7b)
   - Row padding: 4 top and bottom.
   - Time: current time, 10pt/600, `#1B76E8`.
   - Marker: solid 9×9 `#1B76E8` dot.
   - Content: a 1px `#CFE0F8` line.
   - Placed between the last past item and the first future item.
5. **Live session** (7a, and the top of 7c)
   - Row items stretch. Time column padding: 12 top and bottom. Start (11.5/600 ink) and end (10.5 ink 50%) are pinned to the top and bottom.
   - Rail: at the start time, a solid 9×9 dot in the plan colour. From there, a 1px plan-colour line runs down to a **Now dot**: 9×9, `#35B978`, with a `0 0 0 3px rgba(53,185,120,.18)` halo and a pulse animation.
   - **Now dot position:** `top = 16px + progress%`, where progress = elapsed ÷ duration.
   - **Card:** background `#F6F4FF` (the plan tint), radius 16, padding 12/13. Column layout with `gap: 9`.
     - Title: 13.5/600, ink.
     - Meta line directly under the title (gap 1): "**Work** · ends 15:00". "Work" is `#5A43D6` at weight 600; the rest is 11pt, ink at 50%.
     - Progress bar: 3pt tall, radius 2, track `#E4DFFB`, fill `#7B61FF` at the progress width.
     - Action row (`gap: 12`):
       - Countdown "36:48": 13/600, `#5A43D6`, `flex:1`, `nowrap`.
       - "+10 min": 11.5/600, ink at 50%, text-only button.
       - "Done": outlined pill, 26pt tall, padding 0/12, radius 13, border `1px #CFC6F7`, white background, 11.5/600 `#3B2A9E`.

### Upcoming block (outside the sheet, on the grey background)
- **Header:** padding 0/10. Left: "Upcoming", 12/600, ink at 50%. Right: "Calendar", 11/600, `#0F5FC4`, `nowrap`; tapping it opens the Calendar tab.
- **Rows:** padding 7 top and bottom, same grid.
  - Time column: day label ("Thu", "Fri") at 10.5/600, ink at 38%. It appears only on the first row of each day.
  - Marker: 7×7 circle with a 1.5px border in the plan colour.
  - Title: 12.5pt, ink.
  - Time on the right: 11pt, ink at 50%.

### Earlier block (7a, 7b)
- **Header:** as Upcoming, with "Earlier" on the left and "See all" on the right.
- **Done row:** time in ink at 38%, solid 7×7 `#35B978` dot, title 12.5pt with strikethrough in ink at 38%.
- **Missed row:** solid 7×7 `#E0616F` dot. "Missed · Redo" on the right, 11/600, `#C24A57`. Tapping Redo reschedules the task.

### Nav bar (current, unchanged)
- **Bar:** white, top border `1px #EDF1F8`, padding 12 / 8 / 22 (bottom includes the home indicator). Items use `space-around`.
- **Items:** Today · Calendar · [Add] · Progress · Profile.
  - Each item stacks a 30pt icon box (padding 5/12, 20pt icon, 1.8 stroke) over a 9.5pt label. `gap: 4`.
  - Active item: icon box background `#EAF2FE` with radius 14. Icon stroke `#1B76E8`. Label 600 `#0F5FC4`.
  - Inactive items: stroke ink at 40%, label 500 ink at 50%.
- **Add button:** 54×54 circle, `linear-gradient(140deg,#1B76E8,#5AA0F5)`, 4px white border, `margin-top: -26`, shadow `0 8px 18px rgba(27,118,232,.3)`. White "+" at 2.4 stroke.

## Interactions and behaviour
- **Check ring:** tap to complete. The item animates out of the Today sheet and appears at the top of Earlier.
- **Session lifecycle** (only one live at a time):
  1. **Upcoming:** a point or range row.
  2. **Live:** starts at the start time, or earlier if the user taps Start from the row. The row becomes the live card.
  3. **Overtime:** starts after the end time. Change the countdown to "+m:ss" in `#C24A57`, and fill the progress bar completely.
  4. **Done:** the user taps Done. The row moves to Earlier as a done row.
- **+10 min:** extends the end time by 10 minutes and re-flows the rail.
- **Overlap:** if two sessions overlap, the later one stays a normal row until the live one ends.
- **Now line / Now dot:** update every minute. The countdown updates every second.
- **Live Activity** (lock screen and Dynamic Island) mirrors the live card: title, countdown, a progress bar in the plan colour, Done and +10 min.
- **Reduced motion:** turn off the Now-dot pulse.
- **Sheet overflow:** the sheet grows with its content, and the feed scrolls.

## State needed
- `now`: a clock, ticking every second while a session is live, otherwise every minute.
- `tasks[]` with these fields:
  - `id`, `title`, `planId`
  - `start`
  - `end?` (a missing `end` means a point reminder)
  - `status`: `open | live | done | missed`
  - `alerts`, `repeat`
- `plans[]` with `{ id, name, color, dark, tint }`.
- Derived values:
  - `today`: items that are open or live, sorted by start time.
  - `upcoming`: the next 3 items after today, grouped by day.
  - `earlier`: today's done and missed items, most recent first.
  - `gaps`: free time between items.
  - `liveProgress`: elapsed ÷ duration for the live session.

## Design tokens
**Ink:** `#10203A`, used at 100% / 50% / 38% (and 40% for gap text).

**Plan colours** (the base colour is for rails and markers; dark is for text; tint is for fills):

| Plan | Base | Dark text | Tint |
|---|---|---|---|
| Work | `#7B61FF` | `#5A43D6` | `#F6F4FF` (live card); `#E4DFFB` (progress track) |
| Study | `#A455D6` | `#8338B8` | `#F1E6FA` |
| Personal | `#17A8A0` | `#0E7F79` | — |
| Health | `#35B978` | `#1E8A55` | — |
| Health (gym) | `#E08A2E` | `#A55A12` | `#FCEBD8` |

**Status and system colours:**
- Now / live dot: `#35B978`. Idle Now line: `#1B76E8`, with line colour `#CFE0F8`.
- Missed: dot `#E0616F`, text `#C24A57`.
- Link: `#0F5FC4`. Primary: `#1B76E8`.

**Surfaces:**
- Page `#F5F7FA`; sheet `#FFF`.
- Borders: `#E9EEF6` (sheet and rail), `#EDF1F8` (nav bar), `#CFD7E3` (check ring).

**Radii:** sheet 22, live card 16, nav active pill 14, Done pill 13, check ring 11.

**Type:** Anuphan only, no second family and no mono.

| Size / weight | Use |
|---|---|
| 18/700 | Today heading |
| 17/700 | Date |
| 13.5/600 | Titles |
| 13/600 | Countdown |
| 12.5/400 | Small-row titles |
| 12/600 | Section labels |
| 11.5/600 | Rail times, buttons |
| 11/400 | Meta |
| 10.5 | End times, day labels |
| 9.5 | Nav labels |

**Motion:** `tk-pulse` runs for 1.8s ease-in-out, looping. It scales 1 → 1.25 → 1 while opacity goes 1 → .7 → 1.

## Assets
None. Icons are simple 24-unit inline SVG strokes (home, calendar, bars, person, plus). Use the codebase's icon set if it has equivalents.

## Files
- `home-7a-7c-reference.html`: all three frames with notes. Open it in a browser.
- Source canvas in the design project: `Tickle home task bar.dc.html`, section "6a, quieter" (7a–7c).
