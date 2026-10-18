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

You’ll be prompted for the project name, the template and the rendering syntax.

For the JavaScript and TypeScript Vite templates, the CLI then asks about the app's features:

| Question | Flag | Adds |
| --- | --- | --- |
| Use Inglorious UI? | `--ui` / `--no-ui` | `@inglorious/ui`, its base styles and an app bar |
| Which theme? | `--theme=inglorious\|material\|bootstrap` | The theme's stylesheet and class |
| Is it a mobile app? | `--mobile` / `--no-mobile` | Capacitor for Android and iOS; with Inglorious UI, a bottom tab bar and safe-area spacing |
| Add routing? | `--routing` / `--no-routing` | The Router, a home and an about page, and navigation between them |
| Animate page transitions? | `--transitions` / `--no-transitions` | View transitions between pages (with routing and Inglorious UI) |
| Which icon packs? | `--icons=material,fontawesome,lucide` / `--no-icons` | Iconify icon sets, drawn by Inglorious UI's `Icon` (with Inglorious UI) |
| Translate the app? | `--i18n` / `--no-i18n`, `--languages=en,it` | `@inglorious/i18n`, a catalogue per language and a language picker; the first language is the default |
| Enable PWA support? | `--pwa` / `--no-pwa` | `vite-plugin-pwa`, a manifest, icons and service worker registration |

The app is generated in the syntax you chose: lit-html, JSX or Vue. Every question answered by a flag is skipped:

```bash
npm create @inglorious/app@latest -- --ui --theme=material --routing --transitions --icons=material --languages=en,it --mobile
```

## Templates

- `minimal` — plain HTML/CSS/JS, no bundler
- `js` — Vite + JavaScript
- `ts` — Vite + TypeScript
- `ssx-js` — SSX + JavaScript
- `ssx-ts` — SSX + TypeScript

## After Creation

```bash
cd my-awesome-app
pnpm install
pnpm dev
```
