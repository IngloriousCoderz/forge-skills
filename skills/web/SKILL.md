---
name: web
description: "@inglorious/web: lit-html rendering over @inglorious/store - mount, api, directives, router, forms, sensors, PWA, native and live updates, app links, back button, system bars, keyboard, haptics, analytics, push, testing."
---

# @inglorious/web

Conventions: [web-best-practices](../web-best-practices/SKILL.md). Store, events and handlers: [store](../store/SKILL.md).

The whole tree re-renders; lit-html patches the DOM. All state lives in entities; change it only in handlers via `api.notify`. Prefer `#id:event` with a bare event name.

```javascript
import { createStore } from "@inglorious/store";
import { html, mount } from "@inglorious/web";

const types = {
  Counter: {
    increment(entity) {
      entity.value++;
    },
    render(entity, api) {
      return html`<button @click=${() => api.notify(`#${entity.id}:increment`)}>${entity.value}</button>`;
    },
  },
};

const store = createStore({ types, entities: { counter1: { type: "Counter", value: 0 } } });
mount(store, (api) => html`${api.render("counter1")}`, document.getElementById("root"));
```

- `mount(store, renderFn, element)` returns an unsubscribe.
- `autoCreateEntities: true` creates one entity per type (init in `create`); list several instances in `entities`.
- `api`: `render(id)`, `getEntity(id)`, `getEntities()`, `select(fn)`, `notify(event, payload)`, `dispatch`, `getTypes`, `getType`.
- `withDebounce(delay, ["saveData"])` from `@inglorious/web/decorators/with-debounce`: the debounced handler gets a read-only snapshot; write by notifying a non-debounced event.

```javascript
import { html, nothing, svg } from "@inglorious/web"; // id=${id || nothing} omits the attribute
import { choose } from "@inglorious/web/directives/choose";
import { classMap } from "@inglorious/web/directives/class-map";
import { ref } from "@inglorious/web/directives/ref";
import { repeat } from "@inglorious/web/directives/repeat";
import { styleMap } from "@inglorious/web/directives/style-map";
import { unsafeHTML } from "@inglorious/web/directives/unsafe-html";
import { when } from "@inglorious/web/directives/when";
```

## Router

```javascript
import { Router, setRoutes, pageRouteChange, safePath } from "@inglorious/web/router";

const entities = { router: { type: "Router" } };
setRoutes({ "/": "homePage", "/users/:id": "userPage", "/clients": () => import("./pages/clients.js"), "*": "notFoundPage" });

const renderApp = (api) => {
  const { route } = api.getEntity("router");
  return html`<main>${route ? api.render(route) : ""}</main>`;
};

api.notify("#router:navigate", "/users/456"); // or { to, replace: true }
```

- Lazy routes register every named export with an entity and route to the default (or first rendering) export; `isLoading`, `loadingPath`. Lazy pages missed earlier broadcasts: read what they need in `create`.
- `mount` announces navigation and moves focus; `data-is-focus-kept` or `state: { isFocusKept: true }` keeps it; `getPageName`, `hasAccessibleNavigation: false` options.
- In `routeChange` read the route from the payload; the router entity still names the old one.
- Page loads: `routeChange: pageRouteChange({ select: (p) => p.params.jobId, open: (entity, id, api) => ..., close: (entity) => ... })`.
- Guards: a decorator whose `routeChange` checks `payload.route !== entity.id`, redirects with `replace: true`, else calls `type.routeChange?.(...)`. Keep the user in the guard's own entity via a `sessionChange` event (getEntity reads pre-update state). Redirect back with `safePath(router.query.from) ?? "/"`.

## Form

```javascript
import { Form, getFieldValue, getFieldError, isFieldTouched } from "@inglorious/web/form";
const entities = { loginForm: { type: "Form", initialValues: { username: "", password: "" } } };
```

Events: `fieldChange` `{ path, value, validate? }`, `fieldBlur` `{ path, validate? }`, `fieldArrayAppend|Remove|Insert|Move`, `reset`, `validate`/`validateAsync` `{ validate }`, your own `submit`.

## Sensors

- `Compass` (`@inglorious/web/sensors/compass`): `isSupported`, `isLoading`, `isCompassPermissionGranted`, `isCompassActive`, `heading`, `error`, `manualOffset`; events `compassPermissionsRequest`, `compassWatch`, `compassUnwatch`.
- `Geolocation` (`@inglorious/web/sensors/geolocation`): `isSupported`, `isLoading`, `isWatching`, `position`, `error`, `watchId`; events `geolocationRequest` (options), `geolocationWatch`, `geolocationUnwatch`.
- `NetworkStatus` tells when the device is offline.

## PWA updates

```javascript
import { isNative } from "@inglorious/web/mobile";
import { applyPwaUpdate, PwaUpdate, watchPwaUpdate } from "@inglorious/web/pwa";
import { registerSW } from "virtual:pwa-register";

if (!isNative()) registerSW({ onRegisteredSW: (url, reg) => reg && watchPwaUpdate(reg, store) });
```

Needs `registerType: "prompt"`, `injectRegister: false`. Checks hourly and on foreground; applies at launch and background transitions. Optional store, `{ id, checkEveryMs }`; returns a stop function. Entity `isUpdateReady`; events `pwaUpdateReady`, `pwaUpdateApply`.

## Native updates

```javascript
import { App } from "@capacitor/app";
import { createNativeUpdate, watchNativeUpdate } from "@inglorious/web/native-update";

const types = { NativeUpdate: [createNativeUpdate({ adapter }), template] };
watchNativeUpdate(App, store); // launch and every resume; no-op outside native
```

Adapter: `requirement(platform)` → `{ minBuild, storeUrl }` or `null` (`supabaseNativeUpdate` from [supabase](../supabase/SKILL.md)). Entity `isUpdateRequired`, `storeUrl`; events `nativeUpdateCheck` `{ platform, build }`, `nativeUpdateApply` (opens the store). Failed checks keep the last answer. Render only the update page while `isUpdateRequired`.

## Live updates

```javascript
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { createLiveUpdate, watchLiveUpdate } from "@inglorious/web/live-update";

const types = { LiveUpdate: createLiveUpdate({ plugin: LiveUpdate }) };
const release = Number(import.meta.env.VITE_LIVE_UPDATE_RELEASE);
if (release) watchLiveUpdate({ plugin: LiveUpdate, app: App, store, manifestUrl, release });
```

Replaces a Capacitor app's web code without the stores. Manifest `{ release, minBuild, url, checksum, signature }` (published by `publishLiveUpdate`, [supabase](../supabase/SKILL.md)); wanted when `release` is newer than the running one and the build ≥ `minBuild`. Downloads in the background, applies on pause; entity `isUpdateReady`, events `liveUpdateReady`, `liveUpdateApply`. Stamp only release builds with `release` (a timestamp). Plugin config: `publicKey` (one line), `readyTimeout`, `autoBlockRolledBackBundles`. Raise `minBuild` when anything native changes.

## App links

```javascript
import { App } from "@capacitor/app";
import { watchAppLinks } from "@inglorious/web/app-links";

watchAppLinks(App, store); // launch URL and appUrlOpen → #router:navigate; no-op outside native
```

`{ id }` names another router; returns a stop function. The domain must vouch for the app with `/.well-known/apple-app-site-association` (iOS) and `/.well-known/assetlinks.json` (Android): `native.appLinks` in `package.json` generates both, plus the Associated Domains entitlement and the intent filter ([create-app](../create-app/SKILL.md)). Exclude links carrying auth tokens so sign-in stays in the browser.

## Back button

```javascript
import { watchBackButton } from "@inglorious/web/back-button";

watchBackButton(App, { rootPaths: ["/", "/profile"] }); // Android back: history.back(), or exitApp() on a root path or empty history
```

Navigate between root paths (tabs, drawer) with `{ to, replace: true }` so they don't pile up history. No-op outside native; iOS has no back button.

## System bars

```javascript
import { SystemBars } from "@capacitor/core";
import { watchSystemBars } from "@inglorious/web/system-bars";

watchSystemBars(SystemBars); // bar style from the app's color-scheme, follows theme class changes
```

Without it, Android's bars follow the device's dark mode: white icons on a light app. `color-scheme: light dark` keeps the device's style. Returns a stop function; no-op outside native.

## Keyboard

```javascript
import { watchKeyboard } from "@inglorious/web/keyboard";

watchKeyboard(); // --iw-keyboard-height on <html>, .iw-keyboard-open while up
```

From `visualViewport`, no plugin, browser and native alike. Where the page shrinks for the keyboard (Android app), the class is set and the height is `0px`: hide bottom chrome on `.iw-keyboard-open`. Inglorious UI sheets, snackbars and toasts move above it, bottom navigation hides. Own fixed elements: `bottom: var(--iw-keyboard-height, 0px)`. Opens only with a text field focused, closes only when the viewport grows back (not on blur, so a tapped button doesn't move before its click). Returns a stop function.

## Haptics

```javascript
import { Haptics } from "@capacitor/haptics";
import { haptics } from "@inglorious/web/haptics";

haptics.use(Haptics); // native app: system haptics
haptics.selection(); // toggle flipped, threshold crossed
haptics.impact("heavy"); // light | medium (default) | heavy
haptics.notification("error"); // success (default) | warning | error
```

Each call returns whether it played. Without the plugin: `navigator.vibrate` (Chrome on Android, after the user's first tap); iOS browsers stay silent. Plugin failures are swallowed. `PullToRefresh` ticks via `haptics.selection()` when it arms.

## Analytics

```javascript
import { createAnalytics } from "@inglorious/web/analytics";
const types = { Analytics: [createAnalytics({ adapter, consentKey }), template] };
api.notify("#analytics:analyticsTrack", { name: "sign_up", params: { method: "email" } });
```

Adapter: `setConsent(isGranted)`, `pageView({ route, path })`, `event(name, params)`. Nothing before consent; `routeChange` is a page view. Entity `consent` (`granted|denied|null`), `isAsking`. Events `analyticsConsent` (boolean), `analyticsAsk`, `analyticsTrack`.

## Push

```javascript
import { createPushPrompt } from "@inglorious/web/push";
const prompt = createPushPrompt({ adapter, declineKey, onTap });
const types = { PushPrompt: { ...prompt, ...template, sessionStart: prompt.pushStart, sessionEnd: prompt.pushStop } };
```

Adapter: `isSupported()`, `permission()`/`request()` → `granted|denied|prompt` (browser `request` calls `Notification.requestPermission()` before any await), `register()`, optional `onTap(listener)`. App unregisters at sign-out. Entity `isOpen`, `isActive`; events `pushStart`, `pushStop`, `pushAsk` (from the tap), `pushDecline`. Taps navigate unless `onTap(url, api)`.

## Testing

```javascript
import { trigger, render } from "@inglorious/web/test";

const { entity, events } = trigger({ type: "Counter", id: "c", value: 10 }, Counter.increment, { amount: 5 });

const root = document.createElement("div");
render(Counter.render({ id: "c", value: 42 }, api), root);
```

DevTools: `createDevtools().middleware` from `@inglorious/store/client/devtools` in dev.
