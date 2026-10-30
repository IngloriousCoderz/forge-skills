---
name: supabase
description: Supabase for Inglorious Web with @inglorious/supabase — realtimeSource feeds withLiveReload from @inglorious/web so entities reload when a table they read changes, with one channel per table, joined after the session is restored.
---

# @inglorious/supabase - Complete Reference

Supabase integration for `@inglorious/web`. It starts with Realtime: `realtimeSource(client)` tells entities that a table changed, and the `withLiveReload` decorator from `@inglorious/web` reloads them.

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

It also reloads every live entity when the page comes back into view, since a backgrounded phone may have dropped the connection. Subscriptions end when the entity is destroyed.

## Rules

- **Do not match changes to rows.** Reload what the entity shows. Under RLS a delete carries only the primary key, so `change.old.event_id` and the like are null on deletes: matching on them silently drops changes.
- **Do not open channels by hand** with `supabase.channel(...).subscribe()` at boot. A channel joined while the saved session is being restored joins as anonymous and stays that way: it gets deletes (which skip RLS) and no inserts or updates. `realtimeSource` waits for the session.
- **Show your own writes without waiting for Realtime.** After a successful write, update the entity from what was written, or reload it. Realtime is for other people's changes.
- **Keep what the user is typing.** A reload's `success` should not overwrite a dirty form: check `entity.isPristine` before copying loaded values into `entity.values`.
- **Publish each table**: `alter publication supabase_realtime add table public.<table>;`

## realtimeSource

`realtimeSource(client, { schema = "public" })`:

- One channel per table, shared by every subscriber, closed with the last.
- Joins only after `client.auth.getSession()` resolves.
- Rejoining after a dropped connection notifies the subscribers.
- Sign-in and sign-out later need nothing: supabase-js hands every channel the new token.
