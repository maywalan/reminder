# Routine (Expo app)

A React Native (Expo) port of the `planner-app-prototype.html` prototype one level up in
`reminder-app/`. Today, Calendar, Progress, and Settings (the Profile tab) are all built out;
see the roadmap table below for what's still prototype-only.

Data is **local-only** — everything is stored on-device via AsyncStorage (no backend/auth),
matching the prototype's current guest-mode behavior. This can be swapped for a real backend
(e.g. Supabase or Firebase) later without touching the screens, by changing what's inside
`src/store/use-planner-store.ts`.

## Run it

You do **not** need Xcode, a simulator, CocoaPods, or Java to see this running — just Node
(already installed) and the free **Expo Go** app on your phone.

1. Install the **Expo Go** app from the App Store (iOS) or Play Store (Android).
2. From this folder:
   ```bash
   npm install      # only needed the first time, or after pulling new deps
   npx expo start
   ```
3. Scan the QR code that appears in the terminal with your phone's camera (iOS) or the Expo Go
   app itself (Android). The app opens live on your phone — edits you make to the code hot-reload
   there in real time.

Optional, once you have full Xcode / Android Studio installed:
- Press `i` in the terminal to open the iOS Simulator.
- Press `a` to open an Android emulator.

Optional, for smoother file-watching on macOS: `brew install watchman`.

## Project structure

Expo Router (SDK 57's `create-expo-app` default) looks for routes under `src/app/` and resolves
`@/*` imports to `src/*` (see `tsconfig.json`).

```
src/
  app/
    _layout.tsx        Root layout — loads fonts, wraps navigation theme, defines the Stack
                        (the (tabs) group + the add-plan modal)
    (tabs)/
      _layout.tsx       Tab navigator — uses our custom TabBar (not Expo's native NativeTabs,
                        which can't host a custom raised center button)
      index.tsx         Today screen (route "/") — the fully-built screen
      calendar.tsx       placeholder
      progress.tsx        placeholder
      profile.tsx          placeholder
    add-plan.tsx        Modal route for creating/editing a plan (?id=... to edit)
  components/
    icon.tsx             SVG icons, ported path-for-path from the prototype's inline <svg>s
    todo-item.tsx          A task row
    live-activity-card.tsx  The home-screen countdown card
    tab-bar.tsx              Custom bottom bar: 4 tabs + raised gradient FAB
    placeholder-screen.tsx    Shared "coming soon" screen used by Calendar/Progress/Profile
  store/
    use-planner-store.ts  Zustand store: plans, groups, profile + actions, persisted to
                          AsyncStorage, seeded with demo data on first launch
    types.ts               Plan / Group / Profile shapes
  utils/
    dates.ts               toISO/fromISO/pad/fmtTime12 — ported verbatim from the prototype
    countdown.ts             The multi-tier Live Activity countdown formatter (mm:ss under 1h,
                            "Xh Ym" under 24h, "Xd Xh" under 30 days, "Xmo" beyond) — same logic
                            that's in the prototype's Today screen
  constants/theme.ts      Colors (light/dark), radii, spacing, swatch palette — ported from the
                          prototype's `:root` / `body.dark-mode` CSS variables
  hooks/use-theme.ts       useTheme() — returns the right palette for the current system
                          light/dark setting
```

## What's already ported vs. what's next

**Done:** Today screen (greeting/date header, group filter chips, Filter/Share icon buttons and
sheets, Live Activity card, Past Activity list, task list with swipe-to-delete, "Edit" →
multi-select → bulk delete with undo, tap a task to edit), Add/Edit Plan sheet (name, native
date/time pickers, up to 5 alerts, color, group, repeat rules with "repeat until", free-text
details, optional location with Google Places autocomplete, optional photo, live-toggle),
Calendar (Week/Month/Year), Progress (hero/trend/categories), Recap sheet, full Settings screen
(profile avatar/name editing, guest banner, notifications + notification options + alert style,
appearance, language picker, data privacy, Home Screen Widgets preview), custom tab bar, light/dark
theming, local persistence.

**Not yet ported** (each row names its source section in the prototype file):

| Feature | Where to look in `planner-app-prototype.html` |
|---|---|
| Group creation flow | `openNewGroupSheet()` |
| Real login / switch-account flow | `#logged-out-screen`, `#overlay-guest-confirm` — the Settings guest banner and its "Log In" button are UI-only for now since there's no backend/auth yet |
| Actual in-app translation | the Language sheet persists a choice, but text isn't retranslated yet — see the `LANG` object and `applyLanguage()` |
| Real iOS Home Screen widgets | the Settings widgets sheet is a preview mockup (matching the prototype's own mock); a working WidgetKit widget needs a native dev build, which Expo Go can't provide |
| Calendar customize sheet (background/font/colors) | `#overlay-cal-customize` |

Suggested order: group creation, then decide on a backend before tackling real login/sync.

## Location autocomplete (optional)

The Location field on Add/Edit Plan works as plain free text out of the box. To turn on
Google-Places-style suggestions as you type:

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a project, enable
   **"Places API (New)"**, then create an API key under Credentials.
2. Restrict that key to the Places API (Application restrictions can stay "None" for Expo Go
   testing, since the key ships inside the JS bundle either way — see step 3).
3. Copy `.env.example` to `.env` and paste the key into `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, then
   restart `npx expo start`. `.env` is gitignored so the key won't get committed.

Without a key, the field just stays free text — no errors, no broken UI.

## Notes on a couple of implementation choices

- **Tab bar:** the SDK 57 default template uses `NativeTabs` (the OS's real tab bar), which
  can't host arbitrary custom children like the prototype's raised center "+" button. This
  project uses the classic `Tabs` from `expo-router/js-tabs` with a fully custom `tabBar` render
  prop instead (`src/components/tab-bar.tsx`), which can.
- **Date/time inputs** on the Add Plan sheet use `@react-native-community/datetimepicker` — a
  compact inline native picker on iOS, and a tap-to-open native dialog on Android.
- **Verified:** `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (18/18), and
  `npx expo export --platform ios` all pass cleanly as of this writing.
