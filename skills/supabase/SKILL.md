---
name: supabase
description: Supabase for Inglorious Web with @inglorious/supabase — realtimeSource feeds withLiveReload from @inglorious/web so entities reload when a table they read changes, with one channel per table, joined after the session is restored; createCaptcha gives Supabase Auth's CAPTCHA protection its Turnstile tokens; @inglorious/supabase/edge has the helpers for Edge Functions (CORS, errors, the caller and their IP, Resend email).
---

# @inglorious/supabase - Complete Reference

Supabase integration for `@inglorious/web`. `realtimeSource(client)` tells entities that a table changed, and the `withLiveReload` decorator from `@inglorious/web` reloads them. `createCaptcha` makes the Turnstile tokens Supabase Auth's CAPTCHA protection asks for. `@inglorious/supabase/edge` holds the helpers every Edge Function needs.

## Installation

```bash
pnpm add @inglorious/supabase @inglorious/web @supabase/supabase-js
```

## Live entities

```javascript
import { realtimeSource } from "@inglorious/supabase";
import { withLiveReload } from "@inglorious/web/decorators/with-live-reload";

const live = realtimeSource(supabase);

const types = {
  // Reloads on any change to its tables, by notifying `#id:load`.
  ApplicationList: [
    ApplicationList,
    withLiveReload({ source: live, tables: ["applications", "events"] }),
  ],
  // A page that shows one record: the event carries its id, and changes
  // while the page is closed are skipped.
  ApplicationDetail: [
    ApplicationDetail,
    withLiveReload({
      source: live,
      tables: ["applications", "events"],
      payload: (entity) => entity.applicationId,
      isLive: (entity, api) => api.getEntity("router").route === entity.id,
    }),
  ],
};
```

`withLiveReload({ source, tables, event, payload, isLive, delay })`:

| Option    | Default  | Meaning                                                     |
| --------- | -------- | ----------------------------------------------------------- |
| `source`  | required | `subscribe(table, onChange)` returning an unsubscribe       |
| `tables`  | required | The tables the entity reads                                 |
| `event`   | `"load"` | The entity's own event that reloads it                      |
| `payload` | none     | `(entity, api) => value` the event carries                  |
| `isLive`  | always   | `(entity, api) => boolean`; changes are skipped while false |
| `delay`   | `300`    | Milliseconds that gather a burst of changes into one reload |

It also reloads every live entity when the page comes back into view or the browser comes back online, since a backgrounded or offline phone may have dropped the connection. Subscriptions end when the entity is destroyed.

## Rules

- **Do not match changes to rows.** Reload what the entity shows. Under RLS a delete carries only the primary key, so `change.old.event_id` and the like are null on deletes: matching on them silently drops changes.
- **Do not open channels by hand** with `supabase.channel(...).subscribe()` at boot. A channel joined while the saved session is being restored joins as anonymous and stays that way: it gets deletes (which skip RLS) and no inserts or updates. `realtimeSource` waits for the session.
- **Show your own writes without waiting for Realtime.** After a successful write, update the entity from what was written, or reload it. Realtime is for other people's changes.
- **Keep what the user is typing.** A reload's `success` should not overwrite a dirty form: check `entity.isPristine` before copying loaded values into `entity.values`.
- **Publish each table**: `alter publication supabase_realtime add table public.<table>;`
- **Tell a lost connection from a refusal** with `isNetworkError(error)`, and show an "offline" message instead of the browser's raw "Failed to fetch". The `NetworkStatus` sensor of `@inglorious/web` says when the device is offline.

## isNetworkError

`isNetworkError(error)` is true when a call never reached the server: PostgREST's `{ message: "TypeError: Failed to fetch" }` (worded differently in every browser), Functions' `FunctionsFetchError`, Auth's `AuthRetryableFetchError`, and Storage's `originalError`. A row-level security refusal or any other server answer is false.

## CAPTCHA

With CAPTCHA protection on in the Supabase dashboard (Attack Protection, provider Turnstile, with the secret key), Auth refuses signups, password logins, magic links and resends without a token.

```javascript
import { createCaptcha, isCaptchaError } from "@inglorious/supabase";

const captcha = createCaptcha({
  siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
  element: "captcha", // <div id="captcha"></div>, kept on the page across steps
  language: () => currentLocale(),
});

captcha.prepare("login"); // when the form shows: solves it while they type

const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: { captchaToken: await captcha.token("login") },
});
if (isCaptchaError(error)) showError("errors.captcha");
```

- **Never reuse a token**: each `token(action)` is new, or the prepared one for that action, used once and only within its lifetime.
- **Leave the site key empty locally**: tokens are then `undefined` and nothing loads, which Auth accepts while protection is off.
- **Ship before switching on**: store builds without the site key can't sign in once protection is on.
- **Allow it in the CSP**: `https://challenges.cloudflare.com` in `script-src` and `frame-src`. The widget's hostnames need `localhost` for Capacitor apps.
- `isCaptchaError(error)` covers the widget's `CaptchaError` (`code` is Turnstile's) and Auth's `captcha_failed`.

## realtimeSource

`realtimeSource(client, { schema = "public" })`:

- One channel per table, shared by every subscriber, closed with the last.
- Joins only after `client.auth.getSession()` resolves.
- Rejoining after a dropped connection notifies the subscribers.
- Sign-in and sign-out later need nothing: supabase-js hands every channel the new token.

## Edge Functions

`@inglorious/supabase/edge`, for Supabase's Deno runtime. It imports nothing, supabase-js included: pass your own client.

```ts
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { STATUS_CODE } from "jsr:@std/http@1/status";
import { currentUser, env, json, serve } from "npm:@inglorious/supabase@^0.2.0/edge";
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

serve(
  async (req) => {
    const user = await currentUser(admin(), req);
    if (!user) return json({ error: "Not signed in" }, STATUS_CODE.Unauthorized);
    return json({ id: user.id });
  },
  { fallbackError: "profile failed" },
);
```

| Export | Use |
| --- | --- |
| `serve(handler, { fallbackError })` / `handle(...)` | Answers the CORS preflight; a thrown error becomes `{ error }`, status 500, with CORS headers. `handle` returns the wrapped handler, for tests |
| `json(body, status, headers)` | JSON response with CORS headers, errors included |
| `env(name)` | A variable that must be set; throws naming it |
| `currentUser(client, req)` | The caller from their access token, never from the body; `null` without one |
| `callerRole(req)` / `bearerToken(req)` | The JWT's `role` (`"service_role"` for a call from the database), unverified: the platform verifies it unless `verify_jwt` is off. Only legacy JWT keys carry it |
| `clientIp(req)` | The caller's IP for per-address limits, or `null`: Cloudflare's `cf-connecting-ip` before the first `x-forwarded-for` entry, which the caller writes |
| `upstreamError(service, res)` | An error with the start of another API's answer |
| `isLocalStack(url)` | Whether `SUPABASE_URL` is local: skip paid and outside services there |
| `sendEmail(email, { apiKey, from })` / `sendEmails(emails, …)` | Resend; the batch sends up to 100 in one request, all or none. Throws `EmailError` with Resend's `status` (429: rate or daily limit). An email is `{ to, subject, text, html, headers }` |

