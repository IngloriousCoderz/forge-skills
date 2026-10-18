---
name: i18n
description: Internationalization for Inglorious Web with @inglorious/i18n — translations, plurals, formatting and markup in translations, with the locale in a store entity.
---

# @inglorious/i18n - Complete Reference

An i18next binding for `@inglorious/store` / `@inglorious/web`. i18next translates; the package keeps the active locale in an entity, so changing language is an event and the next render reads the new language.

## Installation

```bash
npm install @inglorious/i18n
```

## Setup

```javascript
// src/i18n.js — one JSON per language in ./locales, named after it
import { createI18n } from "@inglorious/i18n"

export const {
  I18n,
  t,
  trans,
  ready,
  currentLocale,
  labelled,
  translatedLabel,
} = createI18n({
  catalogues: import.meta.glob("./locales/*.json"),
  defaultLocale: "en",
  storageKey: "my-app-locale", // omit to not remember the choice
})
```

```javascript
// src/main.js — mount after the starting language and the fallback load
ready.then(() => mount(store, renderApp, document.getElementById("root")))
```

Register `I18n` in `types` and add an entity `i18n: { type: "I18n" }`.

- Starting locale: saved choice → first supported device language (base match: `it-CH` → `it`) → `defaultLocale`.
- `<html lang>` and `<html dir>` follow the active locale (`entity.dir`: `rtl` for Arabic, Hebrew…). Write styles with logical properties (`margin-inline-start`, `inset-inline-end`, `text-align: start`); for sideways motion multiply by `var(--iw-dir-sign)` from Inglorious UI; give icons that point along the line `Icon`'s `direction: entity.dir`.
- A lazy glob makes each catalogue its own chunk; `{ eager: true }` bundles them all. A new language is a new file.
- A switch to an unloaded locale loads it first (`entity.loadingLocale`); only the latest choice applies; a failed load keeps the current language.
- `resources` / `loadLocale` are the lower-level alternative to `catalogues`.
- Language picker: `entity.languages` = `[{ value: "it", label: "Italiano" }, …]` (names from `Intl.DisplayNames`). `localeChange` accepts `"it"` or `{ value: "it" }`, so a select notifies it directly.
- User's language across devices: `saveUserLocale: (locale, api) => api.notify("#profile:localeSave", locale)`, then `#i18n:userLocaleLoad` with `{ userId, locale }` when the user's data arrives and `#i18n:userLocaleClear` on sign-out. Changes while signed in save at once; a choice made before signing in wins and is saved; otherwise the saved locale applies; once per user.

## API

| Export                                              | Use                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`                                             | Promise: the starting locale and the fallback are loaded. Mount after it                                                                                                                                                                       |
| `I18n`                                              | Type. `create` sets `entity.locale` / `entity.locales` / `entity.languages`; `localeChange(entity, locale)` switches, remembers, sets `<html lang>`, ignores unsupported locales; `userLocaleLoad` / `userLocaleClear` for the user's language |
| `languages`                                         | The picker options, as on the entity                                                                                                                                                                                                           |
| `currentLocale()`                                   | The active locale, for `Intl` formatters                                                                                                                                                                                                       |
| `labelled(key, fields)` / `translatedLabel(option)` | Data items whose label translates on every read, keeping `labelKey` in state                                                                                                                                                                   |
| `t(key, options)`                                   | i18next's `t`: interpolation `{{name}}`, plurals `key_one` / `key_other` with `{ count }`, formatting `{{date, datetime}}`                                                                                                                     |
| `trans(key, { values, components })`                | Translation with tags rendered by components; returns an array of parts for lit                                                                                                                                                                |
| `i18next`                                           | The instance, for anything the adapter does not cover                                                                                                                                                                                          |
| `detectLocale(options)`                             | The detection used at startup                                                                                                                                                                                                                  |

Switch language: `api.notify("#i18n:localeChange", "it")`.

## Rules

- **Never store translated text in state.** Store the key and translate in `render`; stored text stays in the old language.
- **Labels in module-level data use `labelled("periods.week", { value: "week" })`** and are read with `translatedLabel`. A plain string freezes at import time.
- **Keep a sentence with markup as one key** and render it with `trans`; never split it around the markup, so each language can order it freely.
- **Plurals: give `_many` keys in languages that have the form** (Italian, French): `Intl.PluralRules` selects it for large numbers.
- **Interpolated values are not HTML-escaped by i18next**: lit escapes text bindings. Never pass a `t()` result to `unsafeHTML`; use `trans` for markup.
- **Format dates and numbers with `Intl` in `currentLocale()`**, not with hard-coded month names or `toLocaleString(undefined, …)` (that is the device language, not the app's).

## `trans`

```javascript
// "Logging in as <strong>{{email}}</strong>."
trans("loggedInAs", {
  values: { email },
  components: { strong: (children) => html`<strong>${children}</strong>` },
})
```

- Tags are placeholders: only names in `components` are rendered; anything else (including `<script>`, typos, stray or unclosed tags) shows as written.
- Values are interpolated after parsing, as text: user data cannot inject markup.
- Nested (`<link>terms of <em>service</em></link>`) and self-closing (`<br/>`) tags work.
- Plurals and formatters work as in `t`.

## Testing

In Vitest without a DOM, stub `navigator` (and `localStorage` if a `storageKey` is used) before calling `createI18n`; `document` is optional. With no stub the default locale is used.

## With SSX

SSX owns the locale per route (`entity.locale`). Translate strings with this package and sync it: `api.notify("#i18n:localeChange", entity.locale)`.
