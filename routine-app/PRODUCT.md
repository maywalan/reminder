# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

Android is planned for later but is not designed for yet (open decision: whether it follows Material conventions or mirrors iOS). An `android/` folder exists from Expo prebuild only.

## Users

Students and young workers juggling classes, deadlines, shifts and appointments. They open Tickle many times a day for a few seconds to see what's next and how long they have, and less often to add or edit a plan. Much of the use happens without opening the app at all, through widgets, the lock screen and the Live Activity. Thai is the first language for most users, with English as the second.

## Product Purpose

Tickle is a personal planner and reminder app. It shows what's coming up and how long until it starts, reminds you at the right moment, and shows afterwards how well you kept up. It succeeds when users rely on Tickle's glanceable surfaces to know what's next, and when they come back to the recaps to check their progress.

## Positioning

- **Live countdowns:** a Live Activity and the Home countdown card show exactly how long until the next plan.
- **Glanceable widgets:** Calendar, Today, Next 3 days and lock-screen widgets are free and don't expire.
- **Native Thai:** Thai copy written the way people actually speak, plus Thai public holidays, including royal memorial days.
- **Recaps and streaks:** weekly (free), monthly and yearly (Premium) recaps that show how you're keeping up.

## Operating Context

- Quick glances between classes or tasks, often one-handed.
- iOS surfaces beyond the app: home-screen widgets, lock-screen widgets, Live Activity and Dynamic Island, local notifications, and a daily recap notification.
- Plans can be signed-in and synced through Supabase, or guest-mode and stored only on the device.

## Capabilities and Constraints

- Plans have a date and time, a time zone, up to 5 alerts, a color, a group, repeat rules (presets or custom), an optional location, photo and details, and a live toggle.
- Tabs: Today (Home timeline), Calendar (Week/Month/Year), Progress, and Profile/Settings.
- Free: 5 active plans, the Today view and streak, the weekly recap, and widgets. Premium (monthly or annual, 7-day trial, StoreKit): unlimited plans plus monthly and yearly recaps. Only list a feature that really exists and is really gated.
- Built with Expo SDK 57, React Native, Expo Router and Reanimated. Widgets are in `targets/widget/`.
- Open: Apple Sign-In (blocked on Apple Developer enrollment), Google OAuth only works in dev-client builds, in-app notifications UI is still being designed, and calendar sync was floated but not decided.

## Brand Commitments

- Name: **Tickle**. URL scheme `tickle://`, bundle ID `com.maywalan.tickle`.
- Voice: Thai must sound native, never machine-translated or "AI" (e.g. เลยเวลา, ทำใหม่). Avoid a single orphaned word on the last line.
- Holidays are shown respectfully: no celebratory emoji, and the Thai list includes royal memorial days.
- Premium copy is honest and specific: no invented features or superlatives.

## Evidence on Hand

- Privacy policy: https://maywalan.github.io/reminder/privacy.html. Terms: `../docs/terms.html`.
- No testimonials, reviews, user counts, press or App Store ratings exist yet. Future work must not invent them.

## Product Principles

1. Glance first: the answer to "what's next and how long?" should be readable in about a second, in the app or out of it.
2. Native to iOS: use the system patterns users already know (sheets, menus, widgets, Live Activities) before inventing custom ones.
3. Two languages as equals: every surface must work in Thai and English, and Thai is not a translation afterthought.
4. Honest Premium: the free tier is genuinely useful, and the paywall only describes what is really gated.
5. Encourage without nagging: recaps and streaks motivate, and missed plans are stated plainly, never as a scolding.

## Accessibility & Inclusion

- Has an in-app font size setting (`fontScale`) and light/dark appearance. Layouts must hold up at larger sizes and in both themes.
- Thai script needs extra line height and must not be clipped by fixed-height rows.
