---
name: supabase
description: "@inglorious/supabase: realtimeSource for withLiveReload (entities reload when their tables change), createCaptcha for Auth's Turnstile, isNetworkError, and Edge Function helpers in /edge (CORS, errors, caller, IP, Resend)."
---

# @inglorious/supabase

## Live entities

```javascript
import { realtimeSource } from "@inglorious/supabase";
import { withLiveReload } from "@inglorious/web/decorators/with-live-reload";

const live = realtimeSource(supabase);

const types = {
  ApplicationList: [ApplicationList, withLiveReload({ source: live, tables: ["applications", "jobs"] })],
  ApplicationDetail: [
    ApplicationDetail,
    withLiveReload({
      source: live,
      tables: ["applications", "jobs"],
      payload: (entity) => entity.applicationId,
      isLive: (entity, api) => api.getEntity("router").route === entity.id,
    }),
  ],
};
```

`withLiveReload` options: `source`, `tables`, `event` (`"load"`), `payload`, `isLive`, `delay` (300 ms). Also reloads on visibility/online; unsubscribes on destroy. `realtimeSource(client, { schema })`: one channel per table, joined after `getSession()`, notifies on rejoin.

- Reload what the entity shows; don't match changes to rows (RLS deletes carry only the key).
- Never open channels by hand at boot: they join as anonymous.
- Apply your own writes immediately; Realtime is for others' changes.
- Don't overwrite a dirty form on reload: check `entity.isPristine`.
- `alter publication supabase_realtime add table public.<table>;`
- `isNetworkError(error)`: the call never reached the server (any client). Show "offline", not "Failed to fetch".

## CAPTCHA

```javascript
import { createCaptcha, isCaptchaError } from "@inglorious/supabase";

const captcha = createCaptcha({
  siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
  element: "captcha",
  language: () => currentLocale(),
});

captcha.prepare("login");
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: { captchaToken: await captcha.token("login") },
});
if (isCaptchaError(error)) showError("errors.captcha");
```

- Tokens are single use.
- Empty site key locally: tokens are `undefined`.
- Ship builds with the key before turning protection on.
- CSP: `https://challenges.cloudflare.com` in `script-src` and `frame-src`; add `localhost` hostname for Capacitor.

## Edge Functions

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

- `serve`/`handle(handler, { fallbackError })`: CORS preflight, thrown errors become 500 `{ error }`.
- `json(body, status, headers)`, `env(name)` (throws if unset).
- `currentUser(client, req)`: from the token, or `null`.
- `callerRole`/`bearerToken`: unverified JWT role.
- `clientIp(req)`: `cf-connecting-ip`, then first `x-forwarded-for`.
- `upstreamError(service, res)`, `isLocalStack(url)` (skip paid services locally).
- `sendEmail(email, { apiKey, from })`/`sendEmails` (≤100, all or none): throw `EmailError` with `status`; email is `{ to, subject, text, html, headers }`.
