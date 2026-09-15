repo: maywalan/reminder
branch: main
path: routine-app

## Last sync
date: 2026-09-04T00:00:00Z

### Updated in this project
- Added the app-icon section (09→10) and the New plan screen (12a) to Tickle draft 2 as section 07; motion / design system / app icon renumbered 08 / 09 / 10.
- Refreshed the Claude Code handoff bundle: standalone HTML rebuilt, README gained App icon and New plan specs.

### 2026-09-02T16:35:00Z
- Read profile.tsx, edit-profile.tsx, bottom-sheet.tsx, widget-preview.tsx and theme.ts (FONT_SCALE_OPTIONS, swatches).
- Added round 16: Profile in 10a's visual language.

## Sync history

### 2026-09-02T11:06:00Z
- Read progress.tsx, its four progress/* components, utils/progress.ts, segmented-control.tsx and recap.tsx.
- Added round 14 (Progress directions) and round 15 (Progress in 10a's language: Week / Month / Year).

### 2026-09-02T06:20:00Z
- Read add-plan.tsx in full and rebuilt the New plan screen (12a) with every field it implements, re-ordered per design direction.
- Rebuilt the Calendar screen (13a) in four states from calendar.tsx, month-view, week-view and year-view.
- Added Home samples 11a (Today / Upcoming / Past activity) and 11b (running Live Activity card).

### 2026-08-30T16:12:00Z
- Read the Expo app's design tokens, Today screen, todo row, live-activity card, tab bar, calendar and icon set as the basis for the redesign.
- Recreated the current Today screen from source values as the redesign baseline.
- Added round-1 design foundations: 3 palette options, type scale, shape/shadow tokens, icon set restated.
- Added a 13-screen wireframe flow, 3 navigation alternatives, and the "Momo" mascot / CI sheet.

## Screen map
| Project screen (Reminder Wireframes.dc.html) | Repo files |
|---|---|
| 1e Current Today (baseline recreation) | routine-app/src/app/(tabs)/index.tsx, src/components/todo-item.tsx, src/components/live-activity-card.tsx, src/components/tab-bar.tsx, src/constants/theme.ts |
| 1a Foundations (colors, type, radii, icons) | routine-app/src/constants/theme.ts, src/components/icon.tsx |
| 1b 05 Today / 06 Empty | routine-app/src/app/(tabs)/index.tsx, src/components/todo-item.tsx |
| 1b 07 Add / edit plan | routine-app/src/app/add-plan.tsx (structure per README feature list) |
| 11a / 11b Home — upcoming, past activity, live activity | routine-app/src/app/(tabs)/index.tsx, src/components/todo-item.tsx, src/components/live-activity-card.tsx |
| 13a Calendar — month compact/detailed, week, year | routine-app/src/app/(tabs)/calendar.tsx, src/components/calendar/month-view.tsx, week-view.tsx, year-view.tsx, src/hooks/use-holidays.ts |
| 07 New plan (draft 2) / 12a New plan — full field set | routine-app/src/app/add-plan.tsx, src/utils/repeat.ts, src/constants/theme.ts (SwatchColors) |
| 1b 08 Calendar month / 09 Calendar week | routine-app/src/app/(tabs)/calendar.tsx, src/components/calendar/week-view.tsx |
| 1b 10 Progress / 11 Streaks | routine-app/src/components/progress/progress-hero.tsx |
| 14a / 14b / 14c Progress — full feature set + Recap | routine-app/src/app/(tabs)/progress.tsx, src/components/progress/*.tsx, src/utils/progress.ts, src/components/segmented-control.tsx, src/app/recap.tsx |
| 1b 12 Notifications | routine-app/src/lib/notifications.ts (per README), src/components/live-activity-card.tsx |
| 1b 13 Profile / settings | routine-app/src/app/(tabs)/profile.tsx |
| 16a Profile — full feature set, sheets, Edit Profile, widgets | routine-app/src/app/(tabs)/profile.tsx, src/app/edit-profile.tsx, src/components/bottom-sheet.tsx, src/components/widget-preview.tsx, src/constants/theme.ts |
| 1b 04 Sign in | routine-app/src/app/login.tsx, src/components/icon.tsx (Google/Apple marks) |
| 1c Navigation options | routine-app/src/components/tab-bar.tsx |
