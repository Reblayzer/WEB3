# Assignment 6: Next.js & SSR - Implementation Guide

## File Structure Overview

```
client/
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Root layout (Server Component)
│   │   ├── page.tsx           ← Home page
│   │   ├── globals.css        ← Global styles
│   │   └── game/
│   │       └── [id]/
│   │           └── page.tsx   ← Dynamic route
│   ├── components/
│   │   ├── UnoCard.tsx        ← Client Component
│   │   ├── ColorChooser.tsx   ← Client Component
│   │   └── GameBoard.tsx      ← Client Component
│   ├── lib/
│   │   └── store.ts           ← Redux store
│   ├── features/
│   │   └── uno/
│   │       └── unoSlice.ts    ← Redux slice
│   └── rx/
│       └── serverBridge.ts    ← RxJS WebSocket
```

## Key Concept: Server vs Client Components

### Server Components (Default)

- Run on server only
- Can access DB, files, secrets
- Cannot use hooks, events, browser APIs

### Client Components (`'use client'`)

- Run in browser
- Can use hooks, events, interactivity
- Cannot access server-only features

## Key Implementation: Root Layout (`app/layout.tsx`)

**Server Component wrapping all pages**

```tsx
// Lines 1-14: Metadata (SEO)
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNO Game",
  description: "Play UNO online with friends",
  openGraph: {
    title: "UNO Game",
    description: "Multiplayer UNO game",
  },
};

// Server Component (no 'use client')
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/lobby">Lobby</Link>
        </nav>
        {children} {/* Matched page renders here */}
        <footer>© 2026 UNO Game</footer>
      </body>
    </html>
  );
}
```

**Key:** No `'use client'` = Server Component by default

## Key Implementation: Main Page (`app/page.tsx`)

**Mixing Server and Client Components**

### Pattern: Wrapper Approach

```tsx
// Line 1: Make entire tree client-side
"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectServerStream, sendMessage } from "@/rx/serverBridge";

// This is now a Client Component
export default function Home() {
  return (
    <Provider store={store}>
      <ClientPage />
    </Provider>
  );
}

function ClientPage() {
  const dispatch = useDispatch();
  const { game, playerIndex, connected } = useSelector((state) => state.uno);

  // Lines 34-41: Client-only setup
  useEffect(() => {
    // WebSocket connection only runs on client
    const subscription = connectServerStream(dispatch);

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Rest of component...
}
```

**Why entire tree is client?**

- Needs Redux Provider
- Uses hooks (useState, useEffect)
- Handles events (onClick)
- WebSocket connection

## Key Implementation: Dynamic Routes (`app/game/[id]/page.tsx`)

**URL parameters with Server Components**

```tsx
// This is a Server Component - can fetch data
export default async function GamePage({ params }: { params: { id: string } }) {
  // Can await directly in Server Components!
  const game = await fetchGame(params.id);

  // Pass server data to Client Component
  return <GameBoard initialGame={game} gameId={params.id} />;
}

// Generate metadata dynamically
export async function generateMetadata({ params }: { params: { id: string } }) {
  const game = await fetchGame(params.id);
  return {
    title: `Game ${game.id}`,
    description: `UNO game with ${game.players.length} players`,
  };
}
```

## Key Implementation: Avoiding Hydration Errors

**Client and Server must render same initial HTML**

### Problem: Browser APIs

```tsx
"use client";

// ❌ BAD - window doesn't exist on server
export default function Component() {
  const width = window.innerWidth; // CRASH on server!
  return <div>Width: {width}</div>;
}
```

### Solution: useEffect

```tsx
"use client";
import { useState, useEffect } from "react";

// ✓ GOOD - only access window on client
export default function Component() {
  const [width, setWidth] = useState(0); // Default for SSR

  useEffect(() => {
    // Only runs on client after hydration
    setWidth(window.innerWidth);
  }, []);

  return <div>Width: {width || "Loading..."}</div>;
}
```

### Problem: localStorage

```tsx
// Lines 27-32: localStorage in page.tsx
const [playerName, setPlayerName] = useState<string>("");

useEffect(() => {
  // Read from localStorage only on client
  const saved = localStorage.getItem("playerName");
  if (saved) setPlayerName(saved);
}, []);
```

### Problem: Random Values / Dates

```tsx
// ❌ BAD - different on server vs client
const id = Math.random();
const timestamp = new Date().toISOString();

// ✓ GOOD - generate on client only
const [id, setId] = useState<string>();
useEffect(() => {
  setId(Math.random().toString());
}, []);
```

## Key Implementation: State Management in SSR

**Pattern 1: Props from Server**

```tsx
// Server Component (page.tsx)
export default async function Page() {
  // Fetch on server
  const data = await fetchData();

  // Pass to Client Component
  return <ClientComponent initialData={data} />;
}

// Client Component
("use client");
function ClientComponent({ initialData }) {
  // Initialize client state from server data
  const [data, setData] = useState(initialData);

  // Can now update state on client
  function updateData(newData) {
    setData(newData);
  }

  return <div>{data.name}</div>;
}
```

**Pattern 2: Redux with SSR**

```tsx
// page.tsx
"use client";
import { Provider } from "react-redux";
import { store } from "@/lib/store";

export default function Page() {
  // Create store once for this request
  return (
    <Provider store={store}>
      <ClientPage />
    </Provider>
  );
}
```

**Important:** Each request should get fresh store (don't share between users!)

## Key Implementation: Navigation

### File-Based Routing

```
app/
  page.tsx              → /
  about/page.tsx        → /about
  game/[id]/page.tsx    → /game/123
  layout.tsx            → Wraps all pages
```

### Link Component (Client-Side Navigation)

```tsx
import Link from 'next/link'

<Link href="/game/123">Play Game</Link>
<Link href={{ pathname: '/game/[id]', query: { id: '123' } }}>
  Play Game
</Link>
```

### Programmatic Navigation

```tsx
"use client";
import { useRouter } from "next/navigation";

function Component() {
  const router = useRouter();

  function handleClick() {
    router.push("/game/123");
  }

  return <button onClick={handleClick}>Start Game</button>;
}
```

## Static vs Dynamic Pages

### Static (SSG) - Build Time

```tsx
// Server Component with cached fetch
export default async function Page() {
  // Cached forever (static)
  const data = await fetch("https://api.example.com/data", {
    cache: "force-cache", // Default behavior
  });

  return <div>{data.name}</div>;
}
```

### Dynamic (SSR) - Per Request

```tsx
// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function Page() {
  // Fetched on every request
  const data = await fetch("https://api.example.com/data", {
    cache: "no-store",
  });

  return <div>{data.name}</div>;
}
```

### ISR - Hybrid

```tsx
export default async function Page() {
  // Revalidate every 60 seconds
  const data = await fetch("https://api.example.com/data", {
    next: { revalidate: 60 },
  });

  return <div>{data.name}</div>;
}
```

## Hydration Process

```
1. Server renders HTML
   └─ Full page with content

2. HTML sent to browser
   └─ User sees page immediately (fast!)

3. JavaScript downloads
   └─ React code loads

4. Hydration
   └─ React attaches event handlers to existing HTML
   └─ State becomes active

5. Page fully interactive
   └─ Clicks work, state updates
```

## Common Exam Questions for Assignment 6

**Q: "What's the difference between Server and Client Components?"**

| Server Component       | Client Component    |
| ---------------------- | ------------------- |
| Default                | Need `'use client'` |
| Runs on server         | Runs in browser     |
| Can access DB directly | Cannot access DB    |
| Cannot use hooks       | Can use hooks       |
| Cannot handle events   | Can handle events   |

- **Show:** `layout.tsx` (no directive = Server)
- **Show:** `page.tsx` (has `'use client'` = Client)

**Q: "Why do you need `'use client'` in page.tsx?"**

- **Show:** Lines using hooks, Redux Provider, event handlers
- **Explain:** "This component needs useState, useEffect, Redux, and WebSocket connection. All of these require browser environment. Marking `'use client'` tells Next.js to make this component interactive."

**Q: "How do you avoid hydration errors?"**

- **Problem:** Server renders different HTML than client
- **Solution:** Use `useEffect` for browser-only code
- **Show:** localStorage access in `useEffect`
- **Explain:** "localStorage doesn't exist on server. useEffect only runs on client after hydration, so server and client render same initial HTML."

**Q: "Explain Static vs Dynamic pages"**

- **Static:** Built once at build time, served from CDN
  - Fast, but stale until rebuild
  - Use for: blogs, docs, rarely-changing content
- **Dynamic:** Built on each request
  - Fresh data, but slower
  - Use for: user-specific content, real-time data
- **ISR:** Hybrid - static with periodic regeneration

**Q: "Walk through the hydration process"**

1. Server renders full HTML → user sees content instantly
2. JavaScript downloads while user reads
3. React "hydrates" - attaches events to existing HTML
4. Page becomes interactive

- **Benefit:** Fast initial paint + full interactivity

**Q: "How do you pass data from Server to Client Component?"**

```tsx
// Server Component
export default async function Page() {
  const data = await fetchData(); // Server fetch
  return <ClientComponent initialData={data} />;
}

// Client Component
("use client");
function ClientComponent({ initialData }) {
  const [data, setData] = useState(initialData); // Client state
  // ...
}
```

**Q: "Why separate layout from page?"**

- **Layout:** Wraps multiple pages, persists across navigation
- **Page:** Specific to route, re-renders on navigation
- **Benefit:** Shared UI (nav, footer) doesn't re-render

## Memory Aid for Oral Exam

**File Tour:**

1. **Start with `layout.tsx`** - "Root layout, Server Component"
2. **Show `page.tsx`** - "Has `'use client'` because uses hooks and Redux"
3. **Point to useEffect** - "Browser-only code here to avoid hydration errors"
4. **Show component structure** - "Server fetches data, Client handles interactivity"

**Key Decisions:**

- Need hooks/events/Redux? → `'use client'`
- Fetch data? → Server Component (can await directly)
- Browser APIs? → `useEffect` in Client Component
- Fast initial paint? → SSR/SSG
- Real-time data? → Dynamic

**Hydration Mantra:**
"Server renders static HTML (fast!) → JavaScript loads → React hydrates (interactive!)"

**Props Down, Events Up:**

- Server fetches → Props down to Client
- Client manages state → Events stay in Client
