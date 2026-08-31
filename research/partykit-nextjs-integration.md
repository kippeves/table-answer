# PartyKit + Next.js App Router Integration Research

## TL;DR

PartyKit integrates with Next.js App Router cleanly. The server code lives in a separate `party/` directory and runs as Cloudflare Durable Objects. The Next.js client connects via `usePartySocket` from `partysocket/react`. PartyKit and Vercel are deployed independently — PartyKit via `npx partykit deploy`, Next.js via Vercel.

---

## 1. Initializing a PartyKit Room from a Next.js Page

There are two patterns: **HTTP requests** (for server-side data fetching) and **WebSocket connections** (for real-time).

### HTTP (Server Components / Server Actions)

Use `fetch` to hit PartyKit's REST endpoint. Every room is accessible at `/party/{roomId}`:

```ts
// In a Server Component or Server Action
const PARTYKIT_URL = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

// Create room / POST data
await fetch(`http://${PARTYKIT_URL}/party/${roomId}`, {
  method: "POST",
  body: JSON.stringify({ /* initial state */ }),
  headers: { "Content-Type": "application/json" },
});

// Read room state / GET
const res = await fetch(`http://${PARTYKIT_URL}/party/${roomId}`, {
  method: "GET",
  next: { revalidate: 0 }, // disable Next.js caching
});
const state = await res.json();
```

### WebSocket (Client Components)

Use `usePartySocket` from `partysocket/react` in a `"use client"` component:

```tsx
"use client";
import usePartySocket from "partysocket/react";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export function RealtimeComponent({ roomId }: { roomId: string }) {
  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    onOpen() {
      console.log("Connected to PartyKit room");
    },
    onMessage(event) {
      const data = JSON.parse(event.data);
      // handle incoming messages
    },
  });

  const sendMessage = (msg: object) => {
    socket.send(JSON.stringify(msg));
  };

  // ...
}
```

For named parties (not the default `main`), add the `party` option:

```ts
const socket = usePartySocket({
  host: PARTYKIT_HOST,
  party: "chatroom",  // matches parties key in partykit.json
  room: roomId,
  // ...
});
```

---

## 2. PartyKit Server File Structure

Running `npx partykit init` in your Next.js project creates:

```
your-project/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── [roomId]/
│       └── page.tsx
├── party/                  # PartyKit server code
│   ├── index.ts            # Main server (default party)
│   └── ...                 # Additional party files
├── partykit.json           # PartyKit configuration
├── next.config.js
├── package.json
├── .env                    # NEXT_PUBLIC_PARTYKIT_HOST
└── tailwind.config.js      # (if using Tailwind)
```

### partykit.json

```jsonc
{
  "$schema": "https://www.partykit.io/schema.json",
  "name": "my-classroom-tool",
  "main": "party/index.ts",           // default party entry
  "parties": {                         // optional named parties
    "chatroom": "party/chatRoom.ts",
    "cursors": "party/cursors.ts"
  },
  "compatibilityDate": "2024-11-01"
}
```

- **`main`** — default party, accessible at `/party/:roomId`
- **`parties`** — named parties, accessible at `/parties/:party/:roomId`
- Each file is a separate Durable Object class

---

## 3. PartyKit Storage (Durable Objects) API

PartyKit uses Cloudflare Durable Objects under the hood. Each room gets a `storage` key-value store.

### API Methods

```ts
export default class Server implements Party.Server {
  constructor(public room: Party.Room) {}

  // Read
  const data = await this.room.storage.get<T>("key");

  // Write
  await this.room.storage.put("key", value);

  // Bulk write (atomic)
  await this.room.storage.put({ "key1": val1, "key2": val2 });

  // Delete
  await this.room.storage.delete("key");

  // List all keys (use sparingly)
  const items = await this.room.storage.list();
  const itemsWithPrefix = await this.room.storage.list({ prefix: "session:" });

  // Schedule alarm
  await this.room.storage.setAlarm(Date.now() + 5 * 60 * 1000);
}
```

### Limits

- **Key**: string, max 2,048 bytes
- **Value**: any structured-cloneable type, max 128 KiB per value
- **Total RAM per room**: 128 MiB
- **No practical limit** on number of keys (shard across keys for large data)

### Recommended Patterns

**Load upfront in `onStart`** (frequent reads, infrequent writes):

```ts
export default class Server implements Party.Server {
  messages: Message[] = [];

  async onStart() {
    this.messages = (await this.room.storage.get<Message[]>("messages")) ?? [];
  }

  async onConnect(connection: Party.Connection) {
    connection.send(JSON.stringify(this.messages));
  }

  async onMessage(message: string) {
    this.messages.push(JSON.parse(message));
    await this.room.storage.put("messages", this.messages);
  }
}
```

**Read on demand** (frequent writes, hibernation-friendly):

```ts
async onMessage(message: string) {
  const item = (await this.room.storage.get(`item:${id}`)) ?? {};
  const updated = { ...item, ...JSON.parse(message) };
  await this.room.storage.put(`item:${id}`, updated);
}
```

### Alarms for Cleanup

```ts
async onAlarm() {
  const id = await this.room.storage.get<string>("id");
  // clean up room data after inactivity
  await this.room.storage.deleteAll();
}
```

---

## 4. Deploying PartyKit Separately from Vercel

PartyKit and Next.js are **independent deployments**:

### Deploy PartyKit

```bash
npx partykit deploy
```

This deploys to `my-project.my-username.partykit.dev`. Note the hostname.

### Deploy Next.js to Vercel

In your Vercel project settings, set:

```
NEXT_PUBLIC_PARTYKIT_HOST=my-project.my-username.partykit.dev
```

### Set PartyKit Secrets

```bash
npx partykit env add OPENAI_API_KEY   # example
npx partykit env pull                  # sync .env to partykit.json
npx partykit env push                  # push partykit.json env to platform
```

### Development

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: PartyKit dev server (port 1999)
npx partykit dev
```

The client defaults to `127.0.0.1:1999` when `NEXT_PUBLIC_PARTYKIT_HOST` is unset.

### CI/CD

PartyKit has a [GitHub Actions guide](https://docs.partykit.io/guides/setting-up-ci-cd-with-github-actions/). Typical flow:

1. Deploy PartyKit on push to `main`
2. Set `NEXT_PUBLIC_PARTYKIT_HOST` in Vercel env vars (once)
3. Vercel auto-deploys the Next.js app on push

---

## 5. Official Templates / Examples for Next.js App Router

### Official PartyKit + Next.js Chat Template

**Repo**: [partykit/partykit-nextjs-chat-template](https://github.com/partykit/partykit-nextjs-chat-template)

This is the most complete official example. Key features:
- Next.js App Router (13+)
- Tailwind CSS
- Multiple PartyKit parties (chatroom, cursors, AI bot, presence)
- Authentication (NextAuth)
- Server-side rendering with PartyKit HTTP endpoints
- Deploy to Vercel + PartyKit

**File structure:**
```
partykit-nextjs-chat-template/
├── app/                          # Next.js App Router
│   ├── chat/
│   │   ├── page.tsx              # RSC: fetches rooms from PartyKit
│   │   └── [roomId]/
│   │       └── Room.tsx          # Client component with usePartySocket
│   └── (home)/
│       └── Cursors.tsx           # Live cursors example
├── party/
│   ├── chatRoom.ts               # Chat room server
│   ├── chatRooms.ts              # Room listing/presence
│   ├── ai.ts                     # AI NPC participant
│   └── cursors.ts                # Cursor sharing
├── partykit.json
├── next.config.js
└── .env.example
```

### Official Next.js Tutorial (Live Polls)

**Docs**: https://docs.partykit.io/tutorials/add-partykit-to-a-nextjs-app/

Step-by-step tutorial covering:
1. Setting up PartyKit server
2. HTTP endpoints for room creation
3. WebSocket connections for real-time
4. Broadcast pattern
5. Storage for persistence
6. Deployment

### Quiplash (Community Example)

**Repo**: [Purv-Kabaria/Quiplash](https://github.com/Purv-Kabaria/Quiplash)

A real multiplayer game using Next.js 16 (App Router) + PartyKit + Tailwind CSS 4. Shows:
- Room-based gameplay with host/player separation
- WebSocket state machine pattern
- Shared types between client and server
- Environment variable management for both platforms

---

## Gotchas & Version Requirements

### Gotchas

1. **Two separate deployments** — PartyKit and Vercel are independent. Set `NEXT_PUBLIC_PARTYKIT_HOST` on Vercel to point at your deployed PartyKit URL.

2. **`NEXT_PUBLIC_` prefix required** — The PartyKit host must be exposed to the client. Without this env var, connections fail silently.

3. **Next.js caches server fetches** — Use `next: { revalidate: 0 }` on fetches to PartyKit from Server Components to avoid stale data.

4. **WebSocket cannot be opened from Server Components** — Use `"use client"` components for `usePartySocket`. Server Components can only use HTTP (`fetch`) to communicate with PartyKit.

5. **Hibernation trade-offs** — Enabling `hibernate: true` saves memory but means `onStart` runs on every wake. Load only what you need from storage.

6. **Storage value limit is 128 KiB** — Shard large state across multiple keys.

7. **Port 1999 in dev** — PartyKit dev server runs on 1999 by default. Make sure it's not blocked.

8. **`compatibilityDate`** — Set this in `partykit.json` to pin your Cloudflare Workers runtime compatibility date.

### Version Requirements

| Package | Minimum | Notes |
|---------|---------|-------|
| `partykit` | latest | CLI + server runtime |
| `partysocket` | latest | Client WebSocket library |
| `partysocket/react` | latest | React hooks (`usePartySocket`) |
| `next` | 13+ (App Router) | 14/15/16 all work |
| `react` | 18+ | |
| `tailwindcss` | 3+ | No special PartyKit requirements |

---

## Recommendation

**Best approach for a collaborative classroom tool:**

1. **Start from the [official chat template](https://github.com/partykit/partykit-nextjs-chat-template)** — it already has the file structure, Tailwind, multiple parties, and auth patterns you need.

2. **Use a named party** (not just `main`) for your classroom-specific logic — e.g., `parties.classroom` in `partykit.json`. This keeps your server code organized and lets you add separate parties for cursors, presence, etc.

3. **Load room state from storage in `onStart`** — classroom sessions will be read-heavy (students viewing content) and write-light (submitting answers). This pattern fits perfectly.

4. **Use `usePartySocket` in client components** — wrap collaborative features in `"use client"` components. Server Components can fetch initial state via HTTP.

5. **Deploy PartyKit first, then Vercel** — set `NEXT_PUBLIC_PARTYKIT_HOST` once on Vercel and it works across all deployments.

6. **Consider Yjs** — if you need true CRDT-based co-editing (like Google Docs), PartyKit has first-class [Yjs integration](https://docs.partykit.io/reference/y-partykit-api/) via `y-partykit`. The text-editor template shows this pattern.
