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
- Vite templates: `--ui`, `--theme=inglorious|material|bootstrap`, `--mobile` (Capacitor), `--routing`, `--transitions`, `--icons=material,fontawesome,lucide`, `--i18n`/`--languages=en,it` (first is default), `--analytics` (Firebase, consent prompt), `--push` (FCM + Supabase sending, enables PWA), `--pwa`. Each has a `--no-` form. `--mobile` with `--push` adds mandatory native updates (`app_versions` table, `NativeUpdate` page). Every template has a `vercel.json` deploying only `main`. Every non-minimal project gets `.github/dependabot.yml` (weekly, grouped: `@inglorious/*` and the rest). `--mobile` also generates `public/.well-known/apple-app-site-association` (replace `TEAM_ID`) and, with `--routing`, calls `watchAppLinks`.
- `--skills` installs the matching Forge skills via the skills CLI.

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
