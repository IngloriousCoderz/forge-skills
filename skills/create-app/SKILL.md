---
name: create-app
description: Guidance for scaffolding new Inglorious Web and game projects with the create-app tool.
---

# @inglorious/create-app - Complete Reference

## Installation

```bash
npm create @inglorious/app@latest
```

## Core Concept

Scaffolding tool for @inglorious/web and @inglorious/ssx projects. It creates a new project directory from a template and sets the `package.json` name.

**Default renderer:** lit-html (via @inglorious/web).

Optional template choices let you use different template syntaxes:

- **JSX/TSX** via `@inglorious/vite-plugin-jsx`
- **Vue-style templates** via `@inglorious/vite-plugin-vue`

## Usage

```bash
# npm
npm create @inglorious/app@latest

# yarn
yarn create @inglorious/app

# pnpm
pnpm create @inglorious/app
```

You’ll be prompted for the project name, the template and the rendering syntax, unless the command line answers them:

| Question                    | Argument or flag                             |
| --------------------------- | -------------------------------------------- |
| What is your project named? | The first argument, such as `my-app`         |
| Select a template           | `--template=minimal\|js\|ts\|ssx-js\|ssx-ts` |
| Select a rendering syntax   | `--syntax=lit-html\|jsx\|vue`                |

For the JavaScript and TypeScript Vite templates, the CLI then asks about the app's features:

| Question                  | Flag                                                 | Adds                                                                                                  |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Use Inglorious UI?        | `--ui` / `--no-ui`                                   | `@inglorious/ui`, its base styles and an app bar                                                      |
| Which theme?              | `--theme=inglorious\|material\|bootstrap`            | The theme's stylesheet and class                                                                      |
| Is it a mobile app?       | `--mobile` / `--no-mobile`                           | Capacitor for Android and iOS; with Inglorious UI, a bottom tab bar and safe-area spacing             |
| Add routing?              | `--routing` / `--no-routing`                         | The Router, a home and an about page, and navigation between them                                     |
| Animate page transitions? | `--transitions` / `--no-transitions`                 | View transitions between pages (with routing and Inglorious UI)                                       |
| Which icon packs?         | `--icons=material,fontawesome,lucide` / `--no-icons` | Iconify icon sets, drawn by Inglorious UI's `Icon` (with Inglorious UI)                               |
| Translate the app?        | `--i18n` / `--no-i18n`, `--languages=en,it`          | `@inglorious/i18n`, a catalogue per language and a language picker; the first language is the default |
| Enable PWA support?       | `--pwa` / `--no-pwa`                                 | `vite-plugin-pwa`, a manifest, icons, and a service worker that keeps installed apps on the latest version |

The app is generated in the syntax you chose: lit-html, JSX or Vue. Every question answered on the command line is skipped, so answering them all creates a project without any prompt. Prefer this over piping keystrokes into the prompts:

```bash
npm create @inglorious/app@latest -- my-app --template=ts --syntax=jsx --ui --theme=material --routing --transitions --icons=material --languages=en,it --no-mobile --no-pwa
```

An unknown template, syntax, theme, icon pack or language stops with the valid choices.

## Templates

- `minimal` — plain HTML/CSS/JS, no bundler
- `js` — Vite + JavaScript
- `ts` — Vite + TypeScript
- `ssx-js` — SSX + JavaScript
- `ssx-ts` — SSX + TypeScript

## TypeScript

TypeScript 7 has no JavaScript API, which typescript-eslint and the Capacitor CLI need. So the TypeScript templates install two TypeScripts side by side:

```json
"typescript": "npm:@typescript/typescript6@^6.0.2",
"@typescript/native": "npm:typescript@^7.0.2"
```

`tsc` is TypeScript 7, and tools importing `typescript` get the TypeScript 6 API. Keep both when upgrading: pointing `typescript` at 7 breaks `pnpm lint`. A JavaScript app with `--mobile` gets only the first, for `capacitor.config.ts`.

Linting a TypeScript app needs `@inglorious/eslint-config` 1.1.3 or later: 1.1.2 declares `./typescript` but does not ship it.

A generated TypeScript app types itself in `types/index.d.ts`: `AppEntity`, `AppState`, `AppApi`, a `type` alias per type listing its events and payloads (`MessageType`), and the `AppType<TEntity>` shorthand. Each type is written `export const Message: MessageType = { ... }`, and the store takes `types: { Message, ... }` with no cast. Add an entity by declaring its interface, adding it to `AppEntity` and `AppState`, and declaring its type alias the same way (see the store skill's TypeScript section).

## After Creation

```bash
cd my-awesome-app
pnpm install
pnpm dev
```
