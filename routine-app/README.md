# Routine (Expo app)

A React Native (Expo) port of the `planner-app-prototype.html` prototype one level up in
`reminder-app/`. Today, Calendar, Progress, and Settings (the Profile tab) are all built out;
see the roadmap table below for what's still prototype-only.

**Backend:** Supabase (project `routine-app`, see `supabase/migrations/`). Email/password
sign-in and sign-up work; Guest mode is preserved as a fallback with local-only data. `src/lib/sync.ts`
pushes/pulls `Plan`/`Group`/`Profile`/`Settings` between the local Zustand store
(`src/store/use-planner-store.ts`) and Supabase on sign-in and on every mutation. **Google OAuth
is currently broken** (Supabase hands back the app's Site URL instead of the requested `exp://`
redirect — see the "Known issues" section below) and **Apple Sign-In isn't built yet** (blocked
on enrolling in the Apple Developer Program).

A hosted privacy policy lives at `docs/privacy.html` in the repo root (served via GitHub Pages at
https://maywalan.github.io/reminder/privacy.html) and is linked from Profile → Data Privacy in-app.

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
      index.tsx         Today screen (route "/") — fully built
      calendar.tsx       Calendar screen (Week/Month/Year) — fully built
      progress.tsx        Progress screen (hero/trend/by-color breakdown) — fully built
      profile.tsx          Settings/Profile screen (auth, sync, data privacy) — fully built
    add-plan.tsx        Modal route for creating/editing a plan (?id=... to edit)
  components/
    icon.tsx             SVG icons, ported path-for-path from the prototype's inline <svg>s
    todo-item.tsx          A task row
    live-activity-card.tsx  The home-screen countdown card
    tab-bar.tsx              Custom bottom bar: 4 tabs + raised gradient FAB
    placeholder-screen.tsx    Shared "coming soon" screen used by Calendar/Progress/Profile
  store/
    use-planner-store.ts  Zustand store: plans, groups, profile + actions, persisted to
                          AsyncStorage, seeded with demo data on first launch, write-throughs
                          to Supabase via sync.ts when signed in
    types.ts               Plan / Group / Profile shapes
  lib/
    supabase.ts             Supabase client + auth helpers (sign-in/up, Google OAuth, guest)
    sync.ts                  Maps local store rows <-> Supabase tables, push/pull on sign-in
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
details, optional location with OpenStreetMap autocomplete, optional photo, live-toggle),
Calendar (Week/Month/Year), Progress (hero/trend/by-color breakdown, prev/next period nav),
Recap sheet, full Settings screen (profile avatar/name editing, email/password + Google OAuth +
guest sign-in, sync status, notifications + notification options + alert style, appearance,
language picker, data privacy with hosted policy link, Home Screen Widgets preview), custom tab
bar, light/dark theming, local persistence + Supabase sync.

**Not yet ported** (each row names its source section in the prototype file):

| Feature | Where to look in `planner-app-prototype.html` |
|---|---|
| Group creation flow | `openNewGroupSheet()` |
| Apple Sign-In | blocked on enrolling in the Apple Developer Program ($99/yr) — email/password and (broken) Google OAuth are the only sign-in methods right now |
| Actual in-app translation | the Language sheet persists a choice, but text isn't retranslated yet — see the `LANG` object and `applyLanguage()` |
| Real iOS Home Screen widgets | the Settings widgets sheet is a preview mockup (matching the prototype's own mock); a working WidgetKit widget needs a native dev build, which Expo Go can't provide |
| Calendar customize sheet (background/font/colors) | `#overlay-cal-customize` |

Suggested order: fix Google OAuth or drop it in favor of Apple Sign-In (Apple requires offering
Sign in with Apple alongside any other third-party login), then group creation.

## Known issues

- **Google OAuth redirect fails in Expo Go** ("Safari cannot open the page") — **fixed in a real
  dev-client build.** Root cause confirmed: it was an Expo-Go-only limitation (every Expo Go
  project on a device shares the `exp://` scheme, which the redirect hand-back mishandled). A
  standalone dev-client build using the app's own registered `routineapp://` scheme (`npx expo
  install expo-dev-client`, `eas build --profile development --platform ios`) resolves it —
  verified by completing Google sign-in in that build on the iOS Simulator. Expo Go itself will
  still show the old failure, since that's inherent to Expo Go's shared scheme, not something
  this project can fix. Building via `eas.json`'s `development` profile needs the Supabase env
  vars set on EAS too (`eas env:set --name EXPO_PUBLIC_SUPABASE_URL ...` etc. for the
  `development` environment), since `.env` is gitignored and excluded from what EAS uploads.
- Old local plans created before the switch to `expo-crypto` UUIDs use `'p_...'`-style ids and
  will fail to push to Supabase until Settings → Clear All Data is run once.
- No retry/offline queue for failed Supabase writes, no merge UI (first account to touch an
  empty cloud wins), no realtime — a second device's edits need a fresh sign-in to appear.

## Deploying to the App Store

Not ready yet. What's in place vs. still needed:

- ✅ `ios.bundleIdentifier` / `android.package` set to `com.maywalan.routineapp` in `app.json`.
- ✅ `eas.json` build profiles configured (development/preview/production).
- ✅ Hosted privacy policy, linked in-app.
- ❌ Apple Developer Program enrollment — not done yet; nothing below can ship without it.
- ✅ EAS project linked — `@maywalan/routine-app`, https://expo.dev/accounts/maywalan/projects/routine-app
  (`extra.eas.projectId` in `app.json`).
- ✅ Google OAuth fixed — works in a real dev-client/standalone build (see Known Issues above).
  Still needed before submitting: Apple Sign-In alongside it, since Apple requires offering Sign
  in with Apple whenever another third-party login is offered (Guideline 4.8) — blocked on Apple
  Developer Program enrollment above.
- ❌ App Store Connect's "App Privacy" questionnaire still needs to be filled out (separate from
  the hosted privacy policy page) — covers what Supabase collects: account email, user-generated
  reminder content.
- ❌ No App Store listing assets yet (screenshots, description, keywords, support URL).

## Location autocomplete

The Location field on Add/Edit Plan gets autocomplete suggestions from OpenStreetMap's Nominatim
search API (`src/utils/places.ts`) — free, no API key, no signup. It works out of the box. The
public instance rate-limits to ~1 request/sec, which the 300ms debounce in
`src/hooks/use-place-search.ts` already respects; if that ever becomes a problem, Nominatim can be
self-hosted or swapped for a paid provider (Google Places, Mapbox) behind the same
`searchPlaces()`/`PlaceSuggestion` interface.

## Notes on a couple of implementation choices

- **Tab bar:** the SDK 57 default template uses `NativeTabs` (the OS's real tab bar), which
  can't host arbitrary custom children like the prototype's raised center "+" button. This
  project uses the classic `Tabs` from `expo-router/js-tabs` with a fully custom `tabBar` render
  prop instead (`src/components/tab-bar.tsx`), which can.
- **Date/time inputs** on the Add Plan sheet use `@react-native-community/datetimepicker` — a
  compact inline native picker on iOS, and a tap-to-open native dialog on Android.
- **Verified:** `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (18/18), and
  `npx expo export --platform ios` all pass cleanly as of this writing.
