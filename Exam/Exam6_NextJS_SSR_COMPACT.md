# Next.js & SSR - Quick Reference

## Static vs Dynamic

### Static (SSG) - Build Time

Pre-built, fast, same for everyone

```tsx
// Static by default
export default function About() {
  return <div>About</div>;
}

// Force cache
const data = await fetch(url, { cache: "force-cache" });
```

**Use for:** Blog posts, docs, rarely changing content

### Dynamic (SSR) - Per Request

Fresh data, personalized, slower

```tsx
export const dynamic = "force-dynamic";

// No cache
const data = await fetch(url, { cache: "no-store" });
```

**Use for:** Real-time data, user-specific content

### ISR - Hybrid

Static + auto-refresh after time

```tsx
const data = await fetch(url, { next: { revalidate: 60 } });
```

Stale-while-revalidate: serve cached, rebuild in background

## Client vs Server Components

### Server Components (Default)

Run on server, send HTML

```tsx
// No directive needed
export default async function Page() {
  const data = await db.query('...')  // ✓ Direct DB
  const secret = process.env.SECRET   // ✓ Safe secrets
  return <div>{data.map(...)}</div>
}
```

**Can:**

- Access DB/files directly
- Use secrets safely
- Fetch without API endpoints

**Cannot:**

- Use hooks (useState, useEffect)
- Handle events (onClick)
- Access browser APIs (window)

### Client Components

Run in browser, interactive

```tsx
"use client"; // Required!

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### Mixing Pattern

```tsx
// Page.tsx - Server Component
export default async function Page() {
  const data = await fetchData()  // Server
  return <InteractiveWidget initialData={data} />  // Pass to client
}

// Widget.tsx - Client Component
'use client'
export default function InteractiveWidget({ initialData }) {
  const [data, setData] = useState(initialData)
  return <button onClick={...}>{data}</button>
}
```

## App Routing

### File-Based Routes

```
app/
  page.tsx              → /
  about/page.tsx        → /about
  game/[id]/page.tsx    → /game/123
  layout.tsx            → Wraps all
```

### Dynamic Routes

```tsx
// app/game/[gameId]/page.tsx
export default function GamePage({ params }) {
  return <div>Game: {params.gameId}</div>;
}
```

### Special Files

| File            | Purpose                              |
| --------------- | ------------------------------------ |
| `page.tsx`      | Route UI                             |
| `layout.tsx`    | Wrapper (persists across navigation) |
| `loading.tsx`   | Loading state                        |
| `error.tsx`     | Error boundary                       |
| `not-found.tsx` | 404 page                             |

### Navigation

```tsx
import Link from "next/link";
<Link href="/game/123">Play</Link>;

// Programmatic (Client Components only)
const router = useRouter();
router.push("/game/123");
```

## Metadata & SEO

```tsx
// Static
export const metadata = {
  title: "UNO Game",
  description: "Play online",
};

// Dynamic
export async function generateMetadata({ params }) {
  const game = await getGame(params.id);
  return { title: `Game #${game.id}` };
}
```

## Hydration

### Process

```
1. Server renders HTML (visible immediately)
2. HTML sent to browser
3. JavaScript loads
4. React "hydrates" (attaches events)
5. Page fully interactive
```

### Avoiding Hydration Errors

Server & client must render same HTML initially

**Problem:** Browser APIs, random, dates
**Solution:** Use `useEffect` for client-only code

```tsx
// ✗ BAD - different on server/client
const width = window.innerWidth;
const rand = Math.random();
const time = new Date().toISOString();

// ✓ GOOD - client-only
const [width, setWidth] = useState(0);
useEffect(() => {
  setWidth(window.innerWidth); // Runs only on client
}, []);
```

### Pattern for Client-Only

```tsx
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient) return <div>Loading...</div>; // Server render
return <div>{/* Client-only content */}</div>;
```

### localStorage Example

```tsx
const [theme, setTheme] = useState("light"); // Default for SSR
useEffect(() => {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);
}, []);
```

## State Management in SSR

### Pattern 1: Props from Server

```tsx
// Server Component
export default async function Page() {
  const game = await getGame();
  return <GameBoard initialGame={game} />;
}

// Client Component
("use client");
function GameBoard({ initialGame }) {
  const [game, setGame] = useState(initialGame); // Initialize from server data
}
```

### Pattern 2: Context Provider

```tsx
// providers.tsx - Client Component
"use client";
export function Provider({ children, initialData }) {
  const [data, setData] = useState(initialData);
  return (
    <Context.Provider value={{ data, setData }}>{children}</Context.Provider>
  );
}

// layout.tsx - Server Component
export default async function Layout({ children }) {
  const data = await fetchData();
  return <Provider initialData={data}>{children}</Provider>;
}
```

### Pattern 3: Redux with SSR

```tsx
"use client";
function Providers({ children, preloadedState }) {
  const [store] = useState(() =>
    configureStore({
      reducer: rootReducer,
      preloadedState, // From server
    })
  );
  return <Provider store={store}>{children}</Provider>;
}
```

**Key:** Create fresh store per request (don't share between users!)

## Dynamic Imports

### Client-Only Components

```tsx
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false, // Skip server render
  loading: () => <p>Loading...</p>,
});
```

**Use for:** Browser-only libraries (maps, charts)

### Code Splitting

```tsx
const HeavyChart = dynamic(() => import("./Chart"));
```

Downloads only when rendered

## Quick Decisions

**Static or Dynamic?**

- Same for all users, rarely changes → Static
- User-specific, real-time → Dynamic
- Middle ground → ISR

**Server or Client Component?**

- Data fetching, DB access → Server
- Interactivity, hooks, events → Client

**How to avoid hydration errors?**

- `useEffect` for client-only code
- Default/placeholder for SSR
- No window/localStorage/Math.random on server

## Memory Aid

**SSR Benefits:**

1. **SEO** - Search engines see content
2. **Fast Initial Paint** - HTML arrives immediately
3. **Works without JS** - Content visible before hydration

**Hydration = 2 Stages:**

1. Server HTML (visible, static)
2. Client JS (interactive)

**Component Rule:**

- Server = Data fetching, secrets, DB
- Client = Hooks, events, browser APIs

**State in SSR:**
Server fetches → Pass as props → Client initializes state
