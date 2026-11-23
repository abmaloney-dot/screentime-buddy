# Screentime Buddy

A study project: track your screen time, see when you use your phone most, label
those hours ("Meal time", "Commute", …), get tips based on them, and pick a **weekly
goal** to cut screen time by 3, 5 or 10 % vs. last week. Reaching it earns a
**hypothetical discount coupon** (gym, groceries, Amazon). An opt-in **friends
leaderboard** compares daily averages. A **Theme** tab sets light/dark/system mode and
a colour theme (red, orange, yellow, green, teal, light blue, blue, purple, pink, light pink). Each theme tints
the whole app with five shades of its colour (background, cards, borders, highlights, chart
bars), or only the accents if you switch tinting off.

The browser version is the current focus (prototype with demo data and simulated
friends); everything is built so the Android app can plug in real data later.

Built with Expo SDK 58 (React Native + TypeScript), Expo Router and expo-sqlite.
All data stays on the device.

## Running it

### Quick look, no phone needed (demo data)

```bash
npm install
npx expo start --web
```

Anywhere the native module isn't compiled in (web, Expo Go, iOS), the app uses a
deterministic **demo data source**, so the whole UI works.

**Developer time travel:** in dev builds every tab header has **+1 day**, **+1 week**
and **Reset**. They move the app clock, so weekly goals get judged and coupons issued
exactly as if the time had passed. Reset returns to real time and deletes whatever
was created in the simulated future.

### Real screen time on Android

On this machine the SDK, emulator and Gradle cache live in `D:\AndroidDev` (C: is too
full for them). `scripts/android-env.ps1` points the tools there for one PowerShell session:

1. Set up the session and boot the emulator (leave this window open):
   ```powershell
   . .\scripts\android-env.ps1
   emulator -avd Medium_Phone_API_37.0
   ```
2. In a second PowerShell window, build and install the development build:
   ```powershell
   . .\scripts\android-env.ps1
   npm run android
   ```
   The first build takes several minutes; later ones are much faster.
3. In the app, tap **Open Usage access settings**, switch Screentime Buddy on, and go back.

On an emulator there's little real usage at first. Use it for a while, or try it on a real phone.

## How it fits together

```
modules/usage-stats/          Local Expo module (Kotlin): reads Android UsageStatsManager
src/lib/usage/index.ts        UsageSource interface → Android implementation or demo data
src/lib/clock.ts              The app clock ("now"), movable by the dev buttons
src/lib/db.ts                 SQLite schema + queries (tags, weekly goals, coupons, settings)
src/lib/days.ts               Daily totals, cached for finished days on real devices
src/lib/weekly.ts             Judges finished weeks → result + coupon; this week's progress
src/lib/coupons.ts            Goal tiers, coupon categories and codes
src/lib/tips.ts               Recommendations from busy hours and labels
src/lib/friends.ts            FriendsSource interface → simulated friends for now
src/app/                      Screens: Today, Trends, Tips, Goals, Coupons, Friends, result modal
```

- **Screen time** = time the screen was on *and unlocked*. The module replays
  `SCREEN_INTERACTIVE` / `KEYGUARD_HIDDEN` events, so Android 9+ is required.
- JS passes **time boundaries** to native code and gets minutes per window back, so
  daylight-saving days are handled in one place.
- **Weeks run Monday–Sunday** and each is compared with the week before. The coupon is
  the highest tier reached, as long as it's at least the chosen goal.
- **Goals are versioned** by start week: switching goals never re-judges past weeks.
- Weeks are checked on launch, on return to the foreground and after a dev skip; the
  newest result pops up as a modal.
- Coupons are **demo only**: clearly labelled, with `DEMO-` codes that can't be redeemed.
- The leaderboard loads only after the user opts in, and compares finished days only.

## iOS

Not implemented. iOS doesn't let apps read screen-time numbers. Apple's
FamilyControls/DeviceActivity APIs only allow threshold callbacks and sandboxed report
views, and they need a special entitlement, Xcode on a Mac, and a physical iPhone.
The `UsageSource` interface is where an iOS implementation would plug in.
