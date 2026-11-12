---
name: create-app
description: Scaffolding new Inglorious Web and SSX projects with create-app and its flags.
---

# @inglorious/create-app

`pnpm create @inglorious/app` (or npm/yarn). Answer everything with flags to skip all prompts; don't pipe keystrokes:

```bash
npm create @inglorious/app@latest -- my-app --template=ts --syntax=jsx --ui --theme=material --routing --transitions --icons=material --languages=en,it --no-mobile --no-analytics --no-push --no-pwa --skills
```

- `--template=minimal|js|ts|ssx-js|ssx-ts`, `--syntax=lit-html|jsx|vue`.
- Vite templates: `--ui`, `--theme=inglorious|material|bootstrap`, `--mobile` (Capacitor), `--routing`, `--transitions`, `--icons=material,fontawesome,lucide`, `--i18n`/`--languages=en,it` (first is default), `--analytics` (Firebase, consent prompt), `--auth`/`--auth-methods=password,code` (Supabase Auth: `src/app/auth` screen shown by `renderApp` in `src/main` until signed in, with routing a `/profile` page (route to the `auth` entity, a link or tab) with Sign out and Delete account, without routing both in the app bar, `erase-account` function, `supabase/templates` with codes), `--push` (FCM + Supabase sending, enables PWA), `--pwa`. Each has a `--no-` form. `--mobile` with `--push` adds mandatory native updates (`app_versions` table, `NativeUpdate` page) and live updates (`watchLiveUpdate` in `src/main`, `live-updates` bucket, `pnpm live:keys` once, `pnpm live:release`; raise `liveUpdate.minBuild` in `package.json` on native changes). With `--ui`, the app registers `Toast` and renders the `toast` entity: `api.notify("#toast:show", { message, color })`. Every template has a `vercel.json` deploying only `main`. Every non-minimal project gets `.github/dependabot.yml` (weekly, grouped: `@inglorious/*` and the rest). `--ui` and `--mobile` call `watchKeyboard`. `--mobile` adds `@capacitor/haptics` and calls `watchSystemBars` and `haptics.use(Haptics)` and, with `--routing`, `watchAppLinks` and `watchBackButton` (back on a top-level page closes the Android app; tabs navigate with `replace: true`).
- `--skills` installs the matching Forge skills via the skills CLI.

## Native projects

Never hand-edit `android/` or `ios/` for something `native` in `package.json` covers: `inglorious-capacitor configure` (`@inglorious/capacitor`, the `capacitor:sync:after` hook) rewrites them on every `cap sync`, idempotently.

```json
"native": {
  "appLinks": { "domain": "app.example.com", "paths": ["/", "/jobs*"], "exclude": ["#*access_token*"] },
  "ios": { "teamId": "ABCDE12345", "swipeBack": true, "infoPlist": { "NSMicrophoneUsageDescription": "…" } },
  "android": { "sha256": ["AA:…"], "permissions": ["android.permission.RECORD_AUDIO"] },
  "assets": { "background": "#ffffff", "backgroundDark": "#121212", "iconScale": 0.6, "splashScale": 0.3 }
}
```

- `appLinks`: Associated Domains + Android intent filter (`/x*` = prefix); with `teamId`/`sha256`, writes `public/.well-known/apple-app-site-association`/`assetlinks.json`. `exclude` (paths or `#` fragments) is iOS only.
- `ios.swipeBack` (on with routing): WebKit's edge-swipe back, via a generated `MainViewController` set in `Main.storyboard`; an existing controller is left alone (warns if it lacks `allowsBackForwardNavigationGestures`).
- Detected from dependencies: `@capacitor-firebase/messaging` → push entitlement, `remote-notification`, AppDelegate methods; `@capacitor-firebase/analytics` → collection off until consent.
- `google-services.json` and `GoogleService-Info.plist` live in the project root; the hook copies them in (and adds the plist to the Xcode target).
- `pnpm mobile:assets` (`inglorious-capacitor assets [--ios] [--android]`) makes icons and light/dark splash screens from `public/logo.svg`/`.png`; `mobile:init:*` run it after `cap add`.

## Generated layout

- `src/app/`: shell (`index`, `style.css`) and its pieces (analytics, push prompts).
- `src/views/<screen>/` with routing; otherwise `src/app/home/`.
- `src/common/`, `src/api/`, `src/store/`, `src/i18n/`: shared code.
- `types/`: type definitions only (`index.d.ts`, `vite-env.d.ts`).

## TypeScript

Two TypeScripts side by side; keep both (pointing `typescript` at 7 breaks lint):

```json
"typescript": "npm:@typescript/typescript6@^6.0.2",
"@typescript/native": "npm:typescript@^7.0.2"
```

Needs `@inglorious/eslint-config` ≥ 1.1.3.

`types/index.d.ts` declares `AppEntity`, `AppState`, `AppApi`, `AppEvents` and a type alias per type (`MessageType`), written `export const Message: MessageType = {...}`. A new entity type goes in `AppEntity`, `AppState` and `AppEvents`; see the [store skill](../store/SKILL.md).
