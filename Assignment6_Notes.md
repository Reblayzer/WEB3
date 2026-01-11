# Assignment 6: UNO with Next.js (SSR)

## Overview
**Focus:** SSR, Next.js  
**Stack:** Next.js 13+, React Server Components, App Router  
**Goal:** Build UNO with server-side rendering for better performance and SEO

---

## Exam Focus Areas
**The examiner will ask about:**
- Static vs dynamic pages
- Client vs server components
- App routing
- Hydration
- How to avoid hydration errors
- State management in SSR applications

### Quick Explanations with Snippets
- **Static vs dynamic pages** — static builds once; dynamic renders per request.
```tsx
// Static
export default function About() { return <div>About</div> }
// Dynamic
export const dynamic = 'force-dynamic'
```
- **Client vs server components** — server can fetch/secure; client handles interactivity.
```tsx
// app/counter.tsx
'use client'
const [n, setN] = useState(0)
```
- **App routing** — file system maps to URLs; params come from folder names.
```tsx
// app/game/[id]/page.tsx
export default function Game({ params }) { return <div>{params.id}</div> }
```
- **Hydration** — React attaches event handlers to server HTML once JS loads.
```tsx
// Server renders <button>Count: 0</button>, client hydrates to enable onClick
```
- **Avoid hydration errors** — keep server/client markup the same; gate client-only values.
```tsx
const [time, setTime] = useState<string>()
useEffect(() => setTime(new Date().toISOString()), [])
return <div>{time ?? '...'}</div>
```
- **State management in SSR** — initialize state on server, serialize safely to client.
```tsx
const preloaded = await getGame()
return <Hydrate state={dehydrate(queryClient)}>
  <Game initial={preloaded} />
</Hydrate>
```

---

## 1. Static vs Dynamic Pages

### Static Pages (SSG - Static Site Generation)
Pages rendered at **build time**. Same HTML served to all users.

```tsx
// Static by default in Next.js App Router
// app/about/page.tsx
export default function AboutPage() {
  return <div>About Us - Built at compile time</div>
}
```

### When to Use Static
- Content rarely changes
- Same for all users (blog posts, docs, marketing)
- Best performance (CDN cacheable)

### Forcing Static Generation
```tsx
// Fetch data at build time
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    cache: 'force-cache'  // Cache indefinitely (static)
  })
  return res.json()
}

export default async function ProductsPage() {
  const products = await getProducts()  // Runs at BUILD time
  return <ProductList products={products} />
}
```

---

### Dynamic Pages (SSR - Server-Side Rendering)
Pages rendered on **each request**. Fresh data every time.

```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Or use dynamic data fetching
async function getGame(id: string) {
  const res = await fetch(`/api/games/${id}`, {
    cache: 'no-store'  // Never cache (dynamic)
  })
  return res.json()
}

export default async function GamePage({ params }) {
  const game = await getGame(params.id)  // Runs on EACH request
  return <GameBoard game={game} />
}
```

### When to Use Dynamic
- Data changes frequently
- User-specific content
- Real-time requirements

### Comparison

| Static (SSG) | Dynamic (SSR) |
|--------------|---------------|
| Built at compile | Rendered per request |
| Fastest (CDN) | Slower (compute each time) |
| Same for all users | Can be personalized |
| Stale until rebuild | Always fresh |
| Use: blogs, docs | Use: dashboards, games |

### Revalidation (ISR - Incremental Static Regeneration)
```tsx
// Regenerate static page every 60 seconds
async function getData() {
  const res = await fetch('/api/data', {
    next: { revalidate: 60 }  // Revalidate after 60s
  })
  return res.json()
}
```

---

## 2. Client vs Server Components

### Server Components (DEFAULT in App Router)
```tsx
// app/page.tsx - Server Component by default
// NO 'use client' directive

import { db } from '@/lib/database'

export default async function Page() {
  // ✅ Can directly access database
  const data = await db.query('SELECT * FROM games')
  
  // ✅ Can read files
  const config = await fs.readFile('./config.json')
  
  // ✅ Can use secrets
  const apiKey = process.env.SECRET_API_KEY
  
  // ❌ Cannot use useState, useEffect
  // ❌ Cannot use onClick, onChange
  // ❌ Cannot use browser APIs
  
  return <div>{data.map(...)}</div>
}
```

### Client Components
```tsx
// components/Counter.tsx
'use client'  // 👈 REQUIRED directive

import { useState, useEffect } from 'react'

export default function Counter() {
  // ✅ Can use React hooks
  const [count, setCount] = useState(0)
  
  // ✅ Can use useEffect
  useEffect(() => {
    document.title = `Count: ${count}`
  }, [count])
  
  // ✅ Can handle events
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

### When to Use Which

| Server Component | Client Component |
|-----------------|------------------|
| Data fetching | Interactivity (onClick) |
| Access backend resources | React hooks (useState, useEffect) |
| Keep sensitive data | Browser APIs (localStorage) |
| Large dependencies | Real-time updates |
| SEO content | Form inputs |

### Mixing Components
```tsx
// app/game/page.tsx - SERVER Component
import GameBoard from '@/components/GameBoard'  // Client
import ScoreBoard from '@/components/ScoreBoard'  // Server

export default async function GamePage({ params }) {
  const game = await getGame(params.id)  // Fetch on server
  
  return (
    <div>
      {/* Server component - static scores */}
      <ScoreBoard players={game.players} />
      
      {/* Client component - interactive */}
      <GameBoard initialState={game} />
    </div>
  )
}
```

### The 'use client' Boundary
```tsx
'use client'

// Everything imported here becomes part of client bundle
import ChildA from './ChildA'  // Now client component!
import ChildB from './ChildB'  // Now client component!
```

---

## 3. App Routing

### File-Based Routing
```
app/
├── page.tsx          → /
├── about/
│   └── page.tsx      → /about
├── game/
│   ├── page.tsx      → /game
│   └── [gameId]/
│       ├── page.tsx  → /game/123, /game/abc
│       └── layout.tsx
├── api/
│   └── games/
│       └── route.ts  → /api/games
└── layout.tsx        → Root layout
```

### Route Segments

#### Static Routes
```
app/about/page.tsx → /about
```

#### Dynamic Routes
```tsx
// app/game/[gameId]/page.tsx → /game/123
export default function GamePage({ params }: { params: { gameId: string } }) {
  return <div>Game ID: {params.gameId}</div>
}
```

#### Catch-All Routes
```tsx
// app/docs/[...slug]/page.tsx → /docs/a/b/c
export default function DocsPage({ params }: { params: { slug: string[] } }) {
  // params.slug = ['a', 'b', 'c']
}
```

### Special Files

| File | Purpose |
|------|---------|
| `page.tsx` | UI for route |
| `layout.tsx` | Shared UI wrapper |
| `loading.tsx` | Loading UI (Suspense) |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 page |
| `route.ts` | API endpoint |

### Layouts
```tsx
// app/layout.tsx - Root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>...</nav>
        <main>{children}</main>  {/* Pages render here */}
        <footer>...</footer>
      </body>
    </html>
  )
}

// app/game/layout.tsx - Nested layout
export default function GameLayout({ children }) {
  return (
    <div className="game-container">
      <Sidebar />
      {children}  {/* /game/* pages render here */}
    </div>
  )
}
```

### Navigation
```tsx
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Declarative
<Link href="/game/123">Join Game</Link>

// Programmatic (in Client Component)
function GameCard({ id }) {
  const router = useRouter()
  
  return (
    <button onClick={() => router.push(`/game/${id}`)}>
      Play
    </button>
  )
}
```

---

## 4. Hydration

### What is Hydration?
The process of making **server-rendered HTML interactive** by attaching React event handlers.

### Hydration Flow
```
1. Server renders HTML
   └── Static HTML string with content

2. HTML sent to browser
   └── User sees content immediately (fast!)

3. JavaScript loads
   └── React bundle downloads

4. Hydration
   └── React attaches event handlers
   └── Components become interactive

5. App is fully interactive
```

### Visual Timeline
```
Server Render ──► HTML to Browser ──► JS Download ──► Hydration ──► Interactive
    │                  │                   │              │
    │              User sees           Loading...      Clicks work!
    │              content
   100ms            200ms              500ms           700ms
```

### Before vs After Hydration
```
BEFORE HYDRATION:
- User can see content ✅
- User can click buttons ❌ (no handlers)
- Forms don't submit ❌
- State doesn't work ❌

AFTER HYDRATION:
- Everything works! ✅
```

---

## 5. How to Avoid Hydration Errors

### What Causes Hydration Errors?
When server-rendered HTML **doesn't match** what React renders on client.

### Common Causes & Fixes

#### 1. Using Browser-Only APIs
```tsx
// ❌ BAD - window doesn't exist on server
function Component() {
  const width = window.innerWidth  // ERROR!
  return <div>Width: {width}</div>
}

// ✅ GOOD - check if on client
function Component() {
  const [width, setWidth] = useState(0)
  
  useEffect(() => {
    setWidth(window.innerWidth)  // Only runs on client
  }, [])
  
  return <div>Width: {width}</div>
}
```

#### 2. Using Date/Time
```tsx
// ❌ BAD - different time on server vs client
function Component() {
  return <div>Time: {new Date().toLocaleString()}</div>  // MISMATCH!
}

// ✅ GOOD - render on client only
function Component() {
  const [time, setTime] = useState<string>()
  
  useEffect(() => {
    setTime(new Date().toLocaleString())
  }, [])
  
  return <div>Time: {time ?? 'Loading...'}</div>
}
```

#### 3. Random Values
```tsx
// ❌ BAD - different random on server vs client
function Component() {
  return <div>Random: {Math.random()}</div>  // MISMATCH!
}

// ✅ GOOD - use consistent ID or client-only
function Component() {
  const [random, setRandom] = useState(0)
  
  useEffect(() => {
    setRandom(Math.random())
  }, [])
  
  return <div>Random: {random}</div>
}
```

#### 4. User-Specific Data
```tsx
// ❌ BAD - localStorage doesn't exist on server
function Component() {
  const theme = localStorage.getItem('theme')  // ERROR!
}

// ✅ GOOD - access in useEffect
function Component() {
  const [theme, setTheme] = useState('light')  // Default for SSR
  
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setTheme(saved)
  }, [])
}
```

#### 5. Using suppressHydrationWarning
```tsx
// For cases where mismatch is intentional (e.g., timestamps)
<time suppressHydrationWarning>
  {new Date().toISOString()}
</time>
```

### The `useEffect` Pattern
```tsx
// Pattern: Client-only rendering
const [isClient, setIsClient] = useState(false)

useEffect(() => {
  setIsClient(true)
}, [])

if (!isClient) {
  return <div>Loading...</div>  // Server render
}

return <div>{/* Client-only content */}</div>
```

---

## 6. State Management in SSR Applications

### Challenge
State must be **consistent** between server and client renders.

### Server State (React Server Components)
```tsx
// Server component - fetch data directly
async function GamePage({ params }) {
  const game = await db.games.findById(params.id)  // Server-side
  
  return <GameBoard game={game} />  // Pass as props
}
```

### Client State (useState, useReducer)
```tsx
'use client'

function GameBoard({ initialGame }) {
  // Initialize from server-provided data
  const [game, setGame] = useState(initialGame)
  
  // Updates happen on client
  const playCard = (index) => {
    setGame(prev => ({ ...prev, /* update */ }))
  }
}
```

### Context in SSR
```tsx
// Providers must be Client Components
// app/providers.tsx
'use client'

import { createContext, useState } from 'react'

export const GameContext = createContext(null)

export function GameProvider({ children, initialGame }) {
  const [game, setGame] = useState(initialGame)
  
  return (
    <GameContext.Provider value={{ game, setGame }}>
      {children}
    </GameContext.Provider>
  )
}

// app/layout.tsx - Server Component
import { GameProvider } from './providers'

export default async function Layout({ children }) {
  const initialData = await getInitialData()
  
  return (
    <GameProvider initialGame={initialData}>
      {children}
    </GameProvider>
  )
}
```

### Redux with SSR
```tsx
// 1. Create store factory (new store per request)
function makeStore() {
  return configureStore({
    reducer: rootReducer
  })
}

// 2. Hydrate with server state
'use client'
function Providers({ children, preloadedState }) {
  const [store] = useState(() => 
    configureStore({
      reducer: rootReducer,
      preloadedState  // From server
    })
  )
  
  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}
```

### Best Practices
1. **Fetch on server** when possible
2. **Pass as props** to client components
3. **Initialize state** from server props
4. **Use useEffect** for client-only data
5. **Avoid global stores** that persist between requests

---

## Quick Reference for Exam

| Topic | Key Points |
|-------|------------|
| **Static (SSG)** | Built at compile time, CDN cacheable, same for all |
| **Dynamic (SSR)** | Rendered per request, always fresh |
| **Revalidate** | ISR: `next: { revalidate: 60 }` |
| **Server Component** | Default, can access DB/files, no hooks/events |
| **Client Component** | `'use client'`, has interactivity, hooks, events |
| **App Router** | File-based: `app/path/page.tsx` → `/path` |
| **layout.tsx** | Shared wrapper, persists between routes |
| **Hydration** | Attach React to server HTML, make interactive |
| **Hydration Error** | Server HTML ≠ Client render (mismatch) |
| **Fix Mismatch** | Use useEffect for browser-only code |
| **SSR State** | Initialize client state from server props |

---

## SSR Benefits

1. **SEO**: Search engines see full content
2. **Performance**: Fast initial render (no JS needed for content)
3. **Accessibility**: Works without JavaScript
4. **Social Sharing**: Meta tags render correctly

## SSR Challenges

1. **Hydration mismatches**: Server/client content must match
2. **No browser APIs on server**: window, localStorage unavailable
3. **State synchronization**: Server → Client state handoff
4. **Complexity**: Two execution environments
