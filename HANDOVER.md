# Handover — Screentime Buddy

> Last updated: 2026-11-23 · Branch: `master` · Last commit: `6bac421 Suggest night light filters in the bedtime tip` · Uncommitted changes: yes — only this `HANDOVER.md`

## TL;DR
A study project (no release planned): an Expo / React Native app that tracks screen time, lets
you label busy hours, gives tips, and rewards weekly screen-time cuts with hypothetical discount
coupons. The **browser prototype** is the current focus and is **live on GitHub Pages** at
<https://abmaloney-dot.github.io/screentime-buddy/> (deploys automatically on every push to
`master`). Everything requested so far is built and merged. The Android build that reads real
screen time has never been compiled. Next: check the live demo on a phone (especially an
iPhone), then refresh the outdated pitch doc.

## Project overview
- **What it is:** screen-time tracker. Today (hourly chart + activity labels), Trends,
  Tips (recommendations from busy/labelled hours), Goals (weekly −3/−5/−10 % presets),
  Coupons (demo coupon wallet + weekly results), Friends (opt-in leaderboard, simulated
  friends), Theme (mode, 10 colour themes, background designs). Developer **+1 day / +1 week /
  Reset** buttons in every header move the app clock to demo week rollovers.
- **Stack:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6, Expo Router (routes in
  `src/app/`), expo-sqlite (on web: WebAssembly in the browser's OPFS), one local Kotlin module.
- **Repo:** <https://github.com/abmaloney-dot/screentime-buddy> (public). Local copy:
  `D:\Projects\screentime-buddy`.
- **Layout:** `src/app/` screens · `src/lib/` logic (clock, db, weekly, coupons, tips, friends,
  usage source, backgrounds) · `src/components/` · `modules/usage-stats/` Kotlin module ·
  `assets/backgrounds/` design masks · `scripts/` Pages post-build + Android env script ·
  `.github/workflows/deploy-pages.yml`.

## How to build / run / test
Node is at `C:\Program Files\nodejs` and may be missing from PATH in agent shells (prepend it).
```powershell
npm install
npm run web            # dev preview with demo data (browser-pane config "screentime-buddy-web", port 8081)
npm run typecheck
npm run lint
npx expo-doctor
```
No test suite: typecheck + lint + expo-doctor + checking in the browser is the bar.
GitHub Pages build exactly as CI does it (PowerShell):
```powershell
$env:EXPO_BASE_URL = "/screentime-buddy"; $env:EXPO_PUBLIC_DEV_TOOLS = "1"; npm run build:pages
```
Output in `dist/`. Publishing = `git push` to `master`; watch the "Deploy to GitHub Pages" run.
Android (never succeeded yet): see README "Real screen time on Android" — dot-source
`scripts/android-env.ps1` first (SDK, emulator and Gradle cache live in `D:\AndroidDev`).

## Architecture & key files
Conventions and the full architecture are in **CLAUDE.md** — read it before changing code.
The few files you'll open first:
- `src/lib/usage/index.ts` — `UsageSource`: Android native module or deterministic demo data.
- `src/lib/clock.ts` — the only "now"; dev skips go through it. Never use `new Date()` for now.
- `src/lib/weekly.ts` + `src/lib/coupons.ts` — weekly judging, tiers, coupon issuing.
- `src/theme.tsx` — palettes (hue → shades), `makeStyles`, theme/background settings.
- `src/components/ScreenBackdrop.tsx` — per-screen background + design (navigator `screenLayout`).
- `scripts/postbuild-pages.mjs` — 404.html, .nojekyll, service-worker injection for Pages.

## Current state
- **Working (verified in browser):** all seven tabs; weekly goal → coupon via +1 week (both
  "earned" and "no coupon" paths); tips from user labels; opt-in leaderboard on finished days;
  dark/light/system; 10 tinted themes (contrast checked ≥ WCAG AA); 6 background designs that
  recolour with the theme; persistence across reloads.
- **Live site (verified 2026-11-23 in the Chromium-based browser pane):** loads, cross-origin
  isolated via the service worker, SQLite works, dev buttons visible, deep links like `/theme`
  work through `404.html`.
- **Unverified:** the live site on Safari/iPhone and on other people's devices.
- **Not working / never run:** the Android build. The first Gradle build (2026-10-21) failed with
  exit code 4 and its log was lost. The emulator also needed Windows Hypervisor Platform; at that
  point it was enabled but Windows hadn't been restarted. Current state of both is unknown.
- **Stale:** the pitch doc "Screentime Buddy: project pitch"
  (<https://claude.ai/artifact/HuQJ5StuQTEGJgCPikkBWJ>) still describes the old daily
  cat / sad-puppy rewards and none of the later features.

## Next steps
1. **Check the live demo on a phone**, ideally an iPhone (Safari is why the service worker
   uses `require-corp`; untested there). First visit reloads once — expected.
2. **Update the pitch doc** (link above) to the current feature set; the user may share it.
3. **Android, when wanted:** rerun the Gradle build with `scripts/android-env.ps1` dot-sourced,
   capture the full log this time, and confirm the hypervisor with
   `(Get-CimInstance Win32_ComputerSystem).HypervisorPresent`.
4. Housekeeping: delete merged branches
   (`git branch -d browser-prototype theming tinted-themes more-themes background-designs github-pages night-light-tip`).
5. Optional: `actions/configure-pages@v5` logs a Node 20 deprecation warning (harmless);
   bump when a newer major exists.

## Decisions & rationale
- **Expo + Android-first; iOS shows demo data** — iOS Screen Time APIs never expose raw usage
  numbers and need an Apple entitlement, a Mac and a physical iPhone; the user has no Mac.
- **Browser prototype first, Android in mind** (user's direction) — so data sources sit behind
  interfaces (`UsageSource`, `FriendsSource`) and finished-day totals are cached in SQLite
  (Android only keeps ~7 days of events; week-over-week needs 14).
- **Daily cat / sad-puppy rewards were replaced** (user request) by weekly % goals with demo
  coupons: coupon = highest tier reached, only if ≥ the chosen goal; below it, no coupon.
- **Coupons are clearly fake** (`DEMO-` codes, "not a real offer") — brands are named only as
  categories (gym, groceries, Amazon).
- **Leaderboard compares finished days only**, last week's final on Mondays — a half-finished
  today made the viewer look best.
- **Demo data has a per-week factor (0.85–1.15)** — otherwise weeks differ by ~1 % and no goal
  can ever be met.
- **Themes are generated from a hue** (5 shades per mode) with hand-picked `primary`/`onPrimary`;
  pale themes (light pink, light blue, yellow) use dark button text.
- **Background designs are tinted alpha masks** made from the user's screenshots in
  `C:\Users\vfroo\OneDrive\Pictures\anna`; multi-colour ones split into 3 tone layers.
- **GitHub Pages + coi-serviceworker** — expo-sqlite needs COOP/COEP headers Pages can't send.

## Dead ends (don't retry)
- **One shared background layer behind all screens** — navigators keep inactive screens
  rendered; transparent screens showed each other through. Hence per-screen `ScreenBackdrop`.
- **Service worker without guards** — a page outside its scope reloaded forever. Now: registers
  only under the base path, reloads at most once per tab session.
- **`credentialless` COEP** (the coi default) — unsupported in Safari; use `require-corp`.
- **`npx create-expo-module --local`** — hung on an interactive prompt; module files were written
  by hand from the npm template instead.
- **Running the emulator / Gradle from C:** — not enough disk (needs ~12 GB + caches).
- **Clustering mask colours on the strongest ink only** — dropped Blossoms' pale flowers.
- **Averaging labelled time over all 7 days** — buried patterns; average over labelled days.
- **`npx prettier --write`** — no Prettier config here; defaults would rewrite all quotes.

## Gotchas
- Metro's watcher can miss edits made by scripts → restart the preview server if the browser
  runs code that doesn't match the files.
- `git checkout` writes CRLF here; scripted multi-line replacements must normalise line endings.
- Browser-pane screenshots often lag a render; confirm with page text before concluding a click
  failed. RN-web `Switch` clicks must hit the drawn track.
- Old console errors (`@/lib/goals`, `nativeDatabaseId`, WebSocket) survive reloads in the dev
  preview; they're from earlier hot reloads/restarts, not the current code.
- The dev preview's browser storage holds test data (dev clock offset, goals, a coupon); the
  **Reset** button returns to real time and removes simulated-future data.
- Preview configs live in `D:\Projects\.claude\launch.json` (workspace root), including a
  "pages-mimic" server whose script is in a temporary scratchpad (may be gone).
- A first deploy fails if Pages isn't set to **Source: GitHub Actions** before the push (happened
  once; GitHub's branch build then served the raw repo → 404).

## Open questions
- Are the background designs (user's screenshots) OK to publish? The repo and site are public.
- Should the Android build be pursued now, or stay a later phase?

## User preferences
- Commit on a branch, then the user asks to merge into `master` (fast-forward) — offer it.
- Often works over Remote Control: send files with SendUserFile when asked; state results plainly.
- Asks to "run the browser sim" to try features; likes changes verified in the browser first.
- Reviews wording and asks for specific copy (e.g. the night-light sentence in the bedtime tip).

## Session log
- 2026-11-23 — Weekly % goals + coupons, Tips, Friends, dev clock; dark mode, 10 tinted themes,
  background designs; GitHub Pages setup and live deploy; pitch doc; this handover.
- 2026-10-21 — Initial Expo app (daily cat/puppy rewards), browser preview, Android tooling on
  D:, first Android build attempt (failed, log lost).
