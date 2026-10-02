---
name: server
description: Server-side guidance for real-time backend patterns and store-backed synchronization.
---

# @inglorious/server - Complete Reference

## Installation

```bash
pnpm install
```

## Core Concept

Real-time, WebSocket-based server for multiplayer games using @inglorious/store as the authoritative state.

## Running

```bash
pnpm dev
pnpm start
```

### Load a Game Module

```bash
pnpm start ./path/to/your-game.js
```

If no path is provided, the server starts with an empty game config.

## How It Works

- Creates a store from the game config, or from an empty config if none is given.
- Tracks connected clients and broadcasts events to them over WebSockets.
- Sends `stateInit` to new clients on connect.

## File Layout

- `src/index.js` — bootstraps HTTP + WebSocket server
- `src/game-loader.js` — loads game config module
- `src/game-loop.js` — server-side tick loop
- `src/ws-handler.js` — WebSocket wiring and broadcast

## Data Flow

1. Client connects → receives `stateInit`.
2. Client notifies an event `{ type, payload }`; the middleware sends it unless it's filtered out.
3. Server dispatches it into the store.
4. Server broadcasts the same event to the other connected clients.
5. Game loop ticks at 60 FPS and calls `store.update()`.

## Notes

- Requires Node 22+.
- Uses `ws` for WebSockets and `pino` for logging.

## Client Middleware

Clients connect with the multiplayer middleware, added to the store's `middlewares` array. It
opens the WebSocket, forwards local events to the server, and applies the events coming back.

```javascript
import { multiplayerMiddleware } from "@inglorious/store/client/multiplayer-middleware";

const store = createStore({
  types,
  entities,
  middlewares: [
    multiplayerMiddleware({
      serverUrl: "ws://localhost:3000",
      reconnectionDelay: 1000,
      blacklist: ["playerInput"],
    }),
  ],
});
```

**Options:**

| Option | Default | Purpose |
| --- | --- | --- |
| `serverUrl` | `ws://<hostname>:3000` | WebSocket URL of the server |
| `reconnectionDelay` | `1000` | ms to wait before reconnecting |
| `blacklist` | `[]` | event types never sent |
| `whitelist` | `[]` | if non-empty, only these types are sent |
| `filter` | `null` | `(event) => boolean`, return false to drop |

**Filtering.** All three are combined with AND, and an empty list means "no restriction":

```javascript
const shouldBeSent =
  (!blacklist.length || !blacklist.includes(event.type)) &&
  (!whitelist.length || whitelist.includes(event.type)) &&
  (!filter || filter(event));
```

So a `whitelist` and a `blacklist` can be combined — an event must be whitelisted *and* not
blacklisted. Keep `playerInput` and other high-frequency local-only events blacklisted; they
would flood the server and the broadcast back to every other client.

**Connection lifecycle:**

- The socket is opened lazily, on the first event that passes the filter. A store whose events are all filtered never connects at all.
- Events raised while the socket isn't open are queued locally and flushed on connect.
- Events arriving from the server carry `fromServer`, and are dispatched without being sent back — otherwise each client would echo to every other client forever.
- `stateInit` is merged into local state with `extend(store.getState(), payload)` via `store.setState()`; any other server event is dispatched normally.
- On close the middleware reconnects after `reconnectionDelay`; an error closes the socket, which triggers the same path.

Events are serialized with `serialize`/`deserialize` from
`@inglorious/utils/data-structures/object.js`, so payloads must be serializable.

