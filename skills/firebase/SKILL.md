---
name: firebase
description: Firebase for Inglorious Web with @inglorious/firebase — firebasePush (FCM) for createPushPrompt and firebaseAnalytics (Google Analytics for Firebase) for createAnalytics, in the browser and in Capacitor apps, with consent before any measuring.
---

# @inglorious/firebase - Complete Reference

Firebase adapters for `@inglorious/web`, working in a browser (the PWA) and in Capacitor's Android and iOS apps alike, through Capawesome's Capacitor Firebase plugins. Each adapter has its own entry point, so an app loads only the plugin it uses.

## Installation

```bash
pnpm add @inglorious/firebase @inglorious/web @capacitor/core firebase@^12
pnpm add @capacitor-firebase/messaging   # push
pnpm add @capacitor-firebase/analytics   # analytics
```

Keep `firebase` on 12.x: the Capacitor plugins require `^12`.

The native apps read the project from `android/app/google-services.json` and `ios/App/GoogleService-Info.plist`. A browser gets it from the `firebase` option, which is the web app's config from the Firebase console. Its values are not secret.

## Push

```javascript
import { firebasePush } from "@inglorious/firebase/push";
import { createPushPrompt } from "@inglorious/web/push";

export const push = firebasePush({
  firebase: firebaseConfig,
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, // public half of the Web Push pair
  saveToken: (token, platform) => saveToken(token, platform), // "web" | "android" | "ios"
  deleteToken: (token) => deleteToken(token),
});

const prompt = createPushPrompt({ adapter: push });
const types = {
  PushPrompt: {
    ...prompt,
    ...renderers,
    sessionStart: prompt.pushStart,
    sessionEnd: prompt.pushStop,
  },
};

// Sign-out: before the session ends, while the user may delete their token.
await push.unregister();
```

- **Browser:** pushes arrive at the PWA's own service worker (`navigator.serviceWorker.ready`) as Web Push whose JSON carries FCM's `data`. The worker shows them and handles their taps; Firebase's own `firebase-messaging-sw.js` is not needed. Send web pushes as data only (`{ token, data: { title, body, url } }`).
- **Native:** send `notification` plus `data.url`. The system shows them, and a tap opens `url` through `#router:navigate`. With the app in the foreground, Android shows nothing.
- **Server:** FCM HTTP v1 (`messages:send`) with a service account. The account needs the **Firebase Cloud Messaging API Admin** role (`roles/firebasecloudmessaging.admin`). "Firebase Cloud Messaging Admin" (`roles/firebasenotifications.admin`) is a different role and cannot send. A 404 means the token is gone: delete it.

## Analytics

```javascript
import { firebaseAnalytics } from "@inglorious/firebase/analytics";
import { createAnalytics } from "@inglorious/web/analytics";

const types = {
  Analytics: [
    createAnalytics({
      adapter: firebaseAnalytics({ firebase: firebaseConfig }),
    }),
    renderers,
  ],
};
```

`firebaseConfig` must include `measurementId`. The PWA reports to the web stream, and the native apps to their own. Do not paste the gtag snippet into `index.html`: inside the Capacitor apps it would report native usage as web visits from `localhost`.

**Rules:**

- **Consent before anything.** `createAnalytics` calls the adapter only after a yes. A refusal loads nothing, even in a browser.
- **Native apps start with collection off**, or they measure from launch. In `AndroidManifest.xml`, inside `<application>`: `<meta-data android:name="firebase_analytics_collection_enabled" android:value="false" />`. In `Info.plist`: `FIREBASE_ANALYTICS_COLLECTION_ENABLED` set to `false`.
- **Advertising consents stay denied.**
- **Page views:** in a browser, Google Analytics counts history changes itself, so `pageView` does nothing there. In the native apps, it logs a screen view named after the route.
