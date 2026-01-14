# Exam 6: Next.js and SSR

> **Core Goal:** Design rendering strategies to balance performance, SEO, and user experience.

---

## What This Assignment Is About (Big Picture)

This assignment is about **deciding where rendering happens to balance performance and user experience**. You learn how Next.js lets you choose between static generation, server-side rendering, and client-side rendering - and when to use each. The focus is on understanding the tradeoffs between rendering strategies, preventing hydration errors, and managing state across server and client boundaries.

**Core Focus:** Master rendering strategies (SPA vs SSR vs SSG), component boundaries (server vs client), hydration mechanics, and state synchronization in SSR applications.

---

## Key Idea

**Rendering strategy affects performance, SEO, and user experience. Next.js provides tools to render where it makes the most sense: build time (static), request time (SSR), or browser (SPA). Choose based on data freshness needs and performance requirements.**

---

# Part 1: Theory & Concepts

## 1. SPA vs SSR vs SSG

### What are they?

Three fundamental approaches to rendering web applications:

- **SPA (Single-Page Application)**: JavaScript renders everything in the browser
- **SSR (Server-Side Rendering)**: Server generates HTML on each request
- **SSG (Static Site Generation)**: HTML is pre-built at build/deploy time

### SPA - Renders in the Browser

Server sends an empty HTML shell with JavaScript. Browser downloads JS, executes it, and renders the UI. The entire application runs in the browser.

**Flow:**
```
Browser requests page
    ↓
Server sends empty HTML + JS bundle
    ↓
Browser downloads JS (slow)
    ↓
JS executes, fetches data from API
    ↓
Page renders (delayed)
```

**Pros:**
- Rich interactivity after load
- No server rendering overhead
- Easy deployment (static files)

**Cons:**
- Slow initial load (download + execute JS first)
- Poor SEO (search engines see empty page)
- Requires JavaScript enabled
- Large bundle size

**Use when:** Building admin dashboards or apps behind authentication where SEO doesn't matter.

### SSR - Renders on Server per Request

Server generates full HTML for each request. Browser receives complete page immediately. JavaScript then hydrates the page to add interactivity.

**Flow:**
```
Browser requests page
    ↓
Server fetches data, renders full HTML
    ↓
Browser displays HTML immediately (fast)
    ↓
Browser downloads JS, hydrates (interactive)
```

**Pros:**
- Fast initial content (HTML arrives quickly)
- Perfect SEO (search engines see full content)
- Works without JavaScript
- Personalized content per user

**Cons:**
- Server load (renders every request)
- Slower Time to Interactive (wait for hydration)
- More complex (manage server + client state)

**Use when:** Content changes frequently or is personalized (user dashboards, real-time feeds).

### SSG - Renders at Build Time

Pages are pre-rendered once during build/deployment. Same HTML served to all users from CDN. Extremely fast but content is static until next build.

**Flow:**
```
Build time: Generate all pages as static HTML
    ↓
Deploy static files to CDN
    ↓
Browser requests page → CDN returns pre-built HTML (instant)
    ↓
Browser downloads JS, hydrates (interactive)
```

**Pros:**
- Fastest possible load time (CDN-cached HTML)
- Zero server rendering cost
- Perfect SEO
- Scales infinitely

**Cons:**
- Content stale until rebuild
- Can't personalize per user
- Long build times for many pages

**Use when:** Content rarely changes and is same for all users (blogs, documentation, marketing sites).

### Comparison Table

| Aspect | SPA | SSR | SSG |
|--------|-----|-----|-----|
| **Initial Load** | Slow (download JS first) | Fast (HTML arrives) | Fastest (CDN HTML) |
| **Time to Interactive** | Slow | Medium | Fast |
| **SEO** | Poor | Excellent | Excellent |
| **Personalization** | Yes | Yes | No |
| **Server Cost** | Low | High (per request) | None |
| **Data Freshness** | Real-time | Real-time | Stale until rebuild |
| **Best For** | Admin panels | User dashboards | Blogs, docs |

**🎯 Exam Tip:** Next.js lets you mix strategies. Use SSG for marketing pages, SSR for user pages, and client-side rendering for real-time features.

---

## 2. Static vs Dynamic Pages

### What's the difference?

In Next.js, pages can be **static** (pre-built at compile time) or **dynamic** (generated per request). The choice affects performance, freshness, and server load.

### Static Pages (SSG - Static Site Generation)

Static pages are built once during deployment and served the same to everyone. Since they're pre-built, they load extremely fast and don't require server computation for each request. However, the content is fixed until you rebuild.

**When to use:**
- Content rarely changes (blog posts, documentation)
- Same content for all users
- Doesn't need real-time data

```tsx
// Static by default in Next.js App Router
export default function About() {
  return <div>About Us</div>
}

// Static data fetching - runs at build time
async function getStaticData() {
  const data = await fetch(url, { cache: 'force-cache' })
  return data.json()
}
```

### Dynamic Pages (SSR - Server-Side Rendering)

Dynamic pages are generated on each request. The server fetches fresh data, renders HTML, and sends it to the client. This adds latency but ensures content is always current.

**When to use:**
- Content changes frequently
- Personalized per user
- Requires real-time accuracy

```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Dynamic data fetching - runs on each request
async function getDynamicData() {
  const data = await fetch(url, { cache: 'no-store' })
  return data.json()
}
```

### Incremental Static Regeneration (ISR)

ISR is a middle ground between static and dynamic. Pages are static but automatically regenerate after a specified time. You get static performance with eventual freshness.

```tsx
// Revalidate every 60 seconds
async function getISRData() {
  const data = await fetch(url, { next: { revalidate: 60 } })
  return data.json()
}
```

**How ISR Works:**
```
1. First request: serves cached static page
2. After revalidation time: next request triggers background regeneration
3. Stale page served while regenerating
4. Future requests get the new page
```

This is the **"stale-while-revalidate"** pattern - users always get fast responses, and content eventually updates.

**🎯 Exam Tip:** Use ISR for content that changes occasionally (product listings, blog posts) - you get static speed with automatic updates.

---

## 3. Client vs Server Components

### What are they?

Next.js App Router distinguishes between **Server Components** (run only on the server) and **Client Components** (run in the browser). This separation lets you optimize where code executes.

### Server Components (Default)

By default, components in the `app/` directory are Server Components. They render on the server and send HTML to the client. The component code **never runs in the browser**.

**Can do:**
- Access databases directly
- Read files from the filesystem  
- Use environment secrets safely
- Fetch data without API endpoints
- Reduce client bundle size (code stays on server)

**Cannot do:**
- Use React hooks (useState, useEffect, useContext)
- Handle browser events (onClick, onChange)
- Access browser APIs (window, localStorage, document)
- Use browser-only libraries

```tsx
// Server Component - no directive needed
export default async function ServerPage() {
  // Direct database access - safe because code runs on server
  const data = await db.query('SELECT * FROM games')
  
  return <div>{data.map(game => <GameCard key={game.id} game={game} />)}</div>
}
```

### Client Components

Client Components run in the browser. They're needed for **interactivity**, **state**, and **browser APIs**. Mark them with `'use client'` at the top of the file.

```tsx
'use client'  // This directive is required

import { useState, useEffect } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)  // useState works
  
  const handleClick = () => setCount(count + 1)  // Event handlers work
  
  useEffect(() => {
    // Browser API access works
    localStorage.setItem('count', count.toString())
  }, [count])
  
  return <button onClick={handleClick}>Count: {count}</button>
}
```

### When to use which?

| Use Server Component | Use Client Component |
|---------------------|---------------------|
| Fetching data | Interactive UI (clicks, forms) |
| Accessing backend resources | useState, useEffect, hooks |
| Keeping secrets secure | Browser APIs (window, localStorage) |
| Large dependencies (keep off client) | Event handlers |
| No interactivity needed | Real-time features (WebSocket) |

### Mixing Components

A common pattern: fetch data in a Server Component and pass it to Client Components for interactivity.

```tsx
// ServerPage.tsx - Server Component (no directive)
export default async function Page() {
  const data = await fetchData()  // Fetch on server
  return <InteractiveWidget initialData={data} />  // Pass to client
}

// InteractiveWidget.tsx - Client Component
'use client'
export default function InteractiveWidget({ initialData }) {
  const [data, setData] = useState(initialData)  // Client state
  return <button onClick={() => setData(...)}>Update</button>
}
```

**🎯 Exam Tip:** Default to Server Components. Only add `'use client'` when you need interactivity, hooks, or browser APIs. This reduces JavaScript sent to the browser.

---

## 4. Routing

### What is it?

Next.js App Router uses **file-system-based routing**. The folder structure in `app/` determines your URL structure. Each folder can contain special files that define the UI for that route.

### File-Based Routes

Create folders to create URL segments. A `page.tsx` file makes the route accessible.

```
app/
├── page.tsx           -> /
├── about/
│   └── page.tsx       -> /about
├── game/
│   ├── page.tsx       -> /game
│   └── [gameId]/
│       └── page.tsx   -> /game/123, /game/abc
└── layout.tsx         -> Wraps all pages
```

### Dynamic Routes

Square brackets create dynamic segments. The value becomes a parameter you can access in the component.

```tsx
// app/game/[gameId]/page.tsx
export default function GamePage({ params }: { params: { gameId: string } }) {
  return <div>Game ID: {params.gameId}</div>
}
// /game/123 -> params.gameId = '123'
```

### Special Files

Next.js looks for specific file names to build the UI:

| File | Purpose |
|------|---------|
| `page.tsx` | The UI for this route |
| `layout.tsx` | Wrapper that persists across navigation |
| `loading.tsx` | Loading UI while page loads |
| `error.tsx` | Error boundary for this route |
| `not-found.tsx` | 404 page |

### Layouts

Layouts wrap pages and persist across navigation. They're great for shared UI like headers and sidebars. Layouts **don't re-render** when navigating between pages they wrap.

```tsx
// app/layout.tsx - Root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>Navigation</nav>
        {children}
        <footer>Footer</footer>
      </body>
    </html>
  )
}
```

### Navigation

Use `Link` for declarative navigation and `useRouter` for programmatic navigation.

```tsx
import Link from 'next/link'

<Link href="/game/123">Play Game</Link>

// Programmatic navigation (Client Components only)
'use client'
import { useRouter } from 'next/navigation'

function Component() {
  const router = useRouter()
  router.push('/game/123')
}
```

**🎯 Exam Tip:** Layouts are Server Components by default. Only make them Client Components if you need interactivity.

---

## 5. Hydration

### What is it?

Hydration is the process of **making server-rendered HTML interactive**. The server sends HTML that the user can see immediately. Then JavaScript loads and React "hydrates" the page by attaching event handlers and enabling interactivity.

### Why does it matter?
Hydration gives users the best of both worlds: fast initial content (from server HTML) and full interactivity (from client JavaScript). Users see content immediately and can interact once JavaScript loads.

### The Hydration Process
```
1. Server renders HTML
   └── Complete page content, but static

2. HTML sent to browser
   └── User sees content immediately

3. JavaScript downloads
   └── React code loads

4. Hydration
   └── React attaches event handlers to existing HTML
   └── State becomes active

5. Page is fully interactive
```

### Before vs After Hydration

| Before Hydration | After Hydration |
|------------------|-----------------|
| Content visible | Content visible |
| Clicks don't work | Clicks work |
| Forms don't submit | Forms work |
| No state | State active |

**🎯 Exam Tip:** Hydration is the bridge between SSR (fast initial content) and SPA (full interactivity). Users get both benefits.

---

## 6. Avoiding Hydration Errors

### What causes them?

Hydration errors occur when the HTML rendered on the server **doesn't match** what React renders on the client. React expects to hydrate the exact same content, so any difference causes an error or warning.

**Common scenarios:**
- Browser APIs that don't exist on server (`window`, `localStorage`)
- Time-dependent values (`Date.now()`)
- Random values (`Math.random()`)
- Conditional rendering based on client-only state

### The Fix Pattern

**Always use `useEffect` for client-only code.** Server renders a safe default, client updates after hydration.

```tsx
const [clientValue, setClientValue] = useState<Type>(DEFAULT)

useEffect(() => {
  // This only runs on client
  setClientValue(/* client-only computation */)
}, [])

// Render uses clientValue - safe on both server and client
```

### Common Causes and Fixes

**1. Browser-Only APIs**

```tsx
// ❌ BAD - window doesn't exist on server
const width = window.innerWidth

// ✅ GOOD - access in useEffect (client only)
const [width, setWidth] = useState(0)
useEffect(() => {
  setWidth(window.innerWidth)
}, [])
```

**2. Date/Time**

```tsx
// ❌ BAD - different time on server vs client
<div>{new Date().toLocaleString()}</div>

// ✅ GOOD - render time on client only
const [time, setTime] = useState<string>()
useEffect(() => {
  setTime(new Date().toLocaleString())
}, [])
return <div>{time ?? 'Loading...'}</div>
```

**3. Random Values**

```tsx
// ❌ BAD - different random on each render
<div>{Math.random()}</div>

// ✅ GOOD - generate on client
const [random, setRandom] = useState(0)
useEffect(() => {
  setRandom(Math.random())
}, [])
```

**4. localStorage**

```tsx
// ❌ BAD - localStorage doesn't exist on server
const theme = localStorage.getItem('theme')

// ✅ GOOD - access in useEffect
const [theme, setTheme] = useState('light')  // Default for SSR
useEffect(() => {
  const saved = localStorage.getItem('theme')
  if (saved) setTheme(saved)
}, [])
```

**🎯 Exam Tip:** The pattern is always the same - `useEffect` for client-only code, safe defaults for server rendering.

---

## 7. State Management in SSR

### The Challenge

In SSR, your app runs in **two environments**: server (for initial render) and client (for interactivity). State needs to be consistent between them, or you'll get hydration errors.

**Key principle:** Initialize client state with data from the server to ensure consistency.

### Pattern 1: Fetch on Server, Initialize on Client

Fetch data in a Server Component and pass it as props. The Client Component initializes its state from those props.

```tsx
// Server Component - fetches data
export default async function Page() {
  const game = await getGame()
  return <GameBoard initialGame={game} />
}

// Client Component - initializes state from props
'use client'
function GameBoard({ initialGame }) {
  const [game, setGame] = useState(initialGame)
  // State starts with server data, can be updated on client
}
```

### Pattern 2: Context Providers
If you need state accessible throughout the app, create a Client Component provider that receives initial data from the server.

```tsx
// providers.tsx - Client Component
'use client'
export function GameProvider({ children, initialGame }) {
  const [game, setGame] = useState(initialGame)
  return (
    <GameContext.Provider value={{ game, setGame }}>
      {children}
    </GameContext.Provider>
  )
}

// layout.tsx - Server Component
export default async function Layout({ children }) {
  const data = await getInitialData()  // Fetch on server
  return (
    <GameProvider initialGame={data}>
      {children}
    </GameProvider>
  )
}
```

### Pattern 3: Redux with SSR
Create the store with preloaded state from the server. Each request should get a fresh store to avoid sharing state between users.

```tsx
'use client'
function Providers({ children, preloadedState }) {
  // Create store once with server state
  const [store] = useState(() =>
    configureStore({
      reducer: rootReducer,
      preloadedState
    })
  )

  return <Provider store={store}>{children}</Provider>
}
```

### Best Practices
1. Fetch data on the server when possible
2. Pass data as props to Client Components
3. Initialize client state from server-provided props
4. Use `useEffect` for data that can only exist on the client
5. Create new stores per request (don't share between users)

---

## 8. Dynamic Imports

### What are they?
Dynamic imports let you load components only when needed, reducing initial bundle size. In Next.js, use `dynamic()` for components that should only load on the client or need code splitting.

### Client-Only Components
Some libraries only work in the browser. Use `ssr: false` to skip server rendering entirely for that component.

```tsx
import dynamic from 'next/dynamic'

// This component only loads on the client
const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,  // Skip server rendering
  loading: () => <p>Loading map...</p>  // Show while loading
})
```

**🎯 Exam Tip:** Dynamic imports with `ssr: false` are essential for browser-only libraries that would crash during server rendering.

---

# Part 2: Implementation in Assignment 6

## Project Structure

```
client/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Server Component - metadata, HTML wrapper
│   │   ├── page.tsx            # Client Component - main app logic
│   │   └── globals.css         # Global styles
│   ├── views/
│   │   ├── LoginView.tsx       # Login form
│   │   ├── LobbyView.tsx       # Room list/creation
│   │   └── GameView.tsx        # Game UI
│   ├── components/
│   │   ├── UnoCard.tsx         # Card component
│   │   └── ColorChooser.tsx    # Color picker
│   ├── features/
│   │   └── uno/
│   │       └── unoSlice.ts     # Redux slice
│   ├── lib/
│   │   └── store.ts            # Redux store configuration
│   └── rx/
│       └── serverBridge.ts     # RxJS WebSocket bridge
```

---

## 1. Server Component - Layout (SEO & Structure)

**Demonstrates: Server Component, Metadata, SSR HTML structure**

**[layout.tsx](Assignment6/client/src/app/layout.tsx#L1-L16)**

```tsx
import type { Metadata } from 'next'
import './globals.css'

// Metadata - only works in Server Components
export const metadata: Metadata = {
  title: 'UNO',
  description: 'UNO with Next.js (Redux + RxJS)',
}

// Server Component by default (no 'use client' directive)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**Key Points:**
- ✅ **Server Component** - No `'use client'` directive
- ✅ **Metadata export** - SEO optimization, social sharing
- ✅ **HTML structure** - Rendered on server, sent as HTML
- ✅ **Static** - Same for all users, perfect for layout
- This HTML is sent immediately - user sees structure before JS loads

---

## 2. Client Component - Main Page (Interactivity)

**Demonstrates: Client Component, Redux Provider, useEffect for WebSocket, SSR-safe defaults**

**[page.tsx](Assignment6/client/src/app/page.tsx#L1-L45)**

```tsx
'use client'  // ← Required for Redux, hooks, WebSocket

import { useEffect, useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { connectServerStream } from '../rx/serverBridge'
import { store, type RootState, type AppDispatch } from '../lib/store'

export default function Page() {
  return (
    <Provider store={store}>
      <ClientPage />
    </Provider>
  )
}

function ClientPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { game, playerIndex, connected, rooms, roomId, playerName } = useSelector(
    (state: RootState) => state.uno
  )
  
  // SSR-safe defaults - prevent hydration errors
  const [inputName, setInputName] = useState<string>(playerName ?? '')
  const [loggedIn, setLoggedIn] = useState<boolean>(Boolean(playerName))
  const [conn, setConn] = useState<ConnectionHandle | null>(null)

  // WebSocket connection - only runs on client
  useEffect(() => {
    const connection = connectServerStream(dispatch)
    setConn(connection)
    return () => {
      connection.disconnect()  // Cleanup on unmount
      dispatch(setDisconnected())
    }
  }, [dispatch])

  // Conditional view rendering based on state
  const view = !loggedIn ? 'login' : roomId ? 'play' : 'lobby'
  
  return (
    <div id="app">
      {view === 'login' && <LoginView ... />}
      {view === 'lobby' && <LobbyView ... />}
      {view === 'play' && <GameView ... />}
    </div>
  )
}
```

**Key Points:**
- ✅ **'use client' directive** - Required for Redux, hooks, WebSocket
- ✅ **Redux Provider** - Wraps app for global state access
- ✅ **SSR-safe defaults** - `playerName ?? ''`, `Boolean(playerName)` prevent hydration errors
- ✅ **useEffect for WebSocket** - Browser-only code runs after hydration
- ✅ **Cleanup function** - `return () => connection.disconnect()` prevents memory leaks
- ✅ **useSelector** - Accesses Redux state (reactive)
- ✅ **Conditional rendering** - Shows different views based on state

---

## 3. Hydration-Safe State Pattern

**Demonstrates: Avoiding hydration errors with useEffect**

**[page.tsx](Assignment6/client/src/app/page.tsx#L27-L32)**

```tsx
// ✅ CORRECT - SSR-safe defaults
const [inputName, setInputName] = useState<string>(playerName ?? '')  // Fallback to ''
const [loggedIn, setLoggedIn] = useState<boolean>(Boolean(playerName))  // Convert to boolean
const [conn, setConn] = useState<ConnectionHandle | null>(null)  // null is safe

// ❌ WRONG - Would cause hydration error
// const [inputName, setInputName] = useState<string>(localStorage.getItem('name'))  // localStorage doesn't exist on server!
```

**Why this works:**
- Server renders with safe default (`playerName ?? ''`)
- Client hydrates with **same value** (no mismatch)
- After hydration, `useEffect` updates state if needed

---

## 4. useEffect for Client-Only Code

**Demonstrates: WebSocket connection only on client**

**[page.tsx](Assignment6/client/src/app/page.tsx#L34-L41)**

```tsx
// Only runs AFTER hydration (client-side only)
useEffect(() => {
  const connection = connectServerStream(dispatch)  // WebSocket - browser only
  setConn(connection)
  
  return () => {
    connection.disconnect()  // Cleanup when component unmounts
    dispatch(setDisconnected())
  }
}, [dispatch])
```

**Why useEffect:**
- Server renders component **without** running this code
- Browser receives HTML, hydrates, **then** runs useEffect
- WebSocket APIs only exist in browser - safe to use here

---

## 5. Redux State Management in SSR

**Demonstrates: Redux slice with proper initial state**

**[unoSlice.ts](Assignment6/client/src/features/uno/unoSlice.ts)**

```tsx
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const initialState: UnoState = {
  game: {
    players: [],
    scores: [],
    currentRound: null,
    winner: undefined,
  },
  playerIndex: undefined,
  connected: false,
  rooms: [],
  roomId: null,
  playerName: null,
}

const unoSlice = createSlice({
  name: 'uno',
  initialState,
  reducers: {
    setGame: (state, action: PayloadAction<Game>) => {
      state.game = action.payload
    },
    setPlayerIndex: (state, action: PayloadAction<number>) => {
      state.playerIndex = action.payload
    },
    setConnected: (state) => {
      state.connected = true
    },
    setDisconnected: (state) => {
      state.connected = false
    },
    // ... more reducers
  },
})

export const { setGame, setPlayerIndex, setConnected, setDisconnected } = unoSlice.actions
export default unoSlice.reducer
```

**Key Points:**
- ✅ **Initial state** - Safe defaults for SSR (no undefined errors)
- ✅ **Reducers** - Pure functions (no side effects)
- ✅ **Action creators** - Auto-generated by createSlice
- Redux Toolkit uses Immer - write "mutating" code, get immutable updates

---

## 6. Component Separation (View Components)

**Demonstrates: Presentational components receiving props**

**[LoginView.tsx](Assignment6/client/src/components/views/LoginView.tsx)**

```tsx
type LoginProps = {
  connected: boolean
  name: string
  setName: (v: string) => void
  onLogin: () => void
}

export default function LoginView({ connected, name, setName, onLogin }: LoginProps) {
  return (
    <div className="login-container">
      <h1>UNO Multiplayer</h1>
      {!connected && <p className="alert">Connecting to server...</p>}
      <form onSubmit={e => {
        e.preventDefault()
        if (name.trim()) {
          setName(name.trim())
          onLogin()
        }
      }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          type="text"
          placeholder="Enter your name"
          required
        />
        <button type="submit" disabled={!name.trim() || !connected}>
          Play UNO
        </button>
      </form>
    </div>
  )
}
```

**Key Points:**
- ✅ **Props-based** - All data comes from parent
- ✅ **Presentational** - No Redux, no business logic
- ✅ **Reusable** - Can be tested independently
- ✅ **Single Responsibility** - Only handles login UI

---

## 7. RxJS WebSocket Bridge

**Demonstrates: WebSocket Observable with Redux integration**

**[serverBridge.ts](Assignment6/client/src/rx/serverBridge.ts)**

```tsx
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { setGame, setPlayerIndex, setConnected, setDisconnected, setRooms } from '../features/uno/unoSlice'
import type { ClientMessage, ServerMessage } from 'domain/src/types/messages'

export function connectServerStream(dispatch: AppDispatch): ConnectionHandle {
  const ws$: WebSocketSubject<ServerMessage> = webSocket({
    url: 'ws://localhost:3001',
    deserializer: msg => JSON.parse(msg.data)
  })

  // Subscribe to incoming messages
  const subscription = ws$.subscribe({
    next: (msg: ServerMessage) => {
      switch (msg.type) {
        case 'welcome':
          dispatch(setConnected())
          dispatch(setPlayerIndex(msg.playerIndex))
          break
        case 'state':
          dispatch(setGame(msg.game))
          break
        case 'room-list':
          dispatch(setRooms(msg.rooms))
          break
        case 'error':
          console.error(msg.message)
          break
      }
    },
    error: err => {
      console.error('WebSocket error:', err)
      dispatch(setDisconnected())
    },
    complete: () => {
      console.log('WebSocket closed')
      dispatch(setDisconnected())
    }
  })

  return {
    send: (msg: ClientMessage) => ws$.next(msg),
    disconnect: () => subscription.unsubscribe()
  }
}
```

**Key Points:**
- ✅ **RxJS Observable** - WebSocket as stream of messages
- ✅ **Type-safe** - Uses centralized `ClientMessage`/`ServerMessage` types
- ✅ **Redux integration** - Dispatches actions on message receipt
- ✅ **Error handling** - Updates `connected` state on errors
- ✅ **Cleanup** - Returns unsubscribe function for useEffect cleanup

---

## Assignment 6 Rendering Strategy

**Assignment 6 uses a hybrid approach:**

1. **Initial Load** (SSR):
   - Server renders `layout.tsx` → HTML with metadata
   - Sends complete HTML structure to browser
   - User sees page structure immediately

2. **Hydration**:
   - Browser downloads JavaScript bundle
   - React hydrates the HTML
   - `'use client'` components become interactive

3. **Runtime** (SPA-like):
   - WebSocket connects via `useEffect`
   - Redux manages all game state
   - Client-side routing (view switching)
   - Real-time updates via RxJS

**Why this approach:**
- ✅ **Fast initial load** - SSR HTML arrives quickly
- ✅ **SEO** - Metadata in server component
- ✅ **Rich interactivity** - Redux + WebSocket on client
- ✅ **Real-time** - WebSocket for live game updates

**🎯 Exam Tip:** Assignment 6 optimizes for **real-time multiplayer** (needs WebSocket) while still getting SSR benefits (fast load, SEO).

---

## Quick Reference

| Concept | File | What It Shows |
|---------|------|--------------|
| **Server Component** | [layout.tsx](Assignment6/client/src/app/layout.tsx) | No 'use client', metadata export, SSR HTML |
| **Client Component** | [page.tsx](Assignment6/client/src/app/page.tsx#L1) | 'use client' directive, hooks, Redux |
| **SSR-Safe Defaults** | [page.tsx](Assignment6/client/src/app/page.tsx#L27-L32) | `playerName ?? ''`, `Boolean(...)` |
| **useEffect for Client Code** | [page.tsx](Assignment6/client/src/app/page.tsx#L34-L41) | WebSocket connection after hydration |
| **Redux Slice** | [unoSlice.ts](Assignment6/client/src/features/uno/unoSlice.ts) | State, reducers, actions |
| **View Components** | [LoginView.tsx](Assignment6/client/src/views/LoginView.tsx) | Presentational, props-based |
| **RxJS WebSocket** | [serverBridge.ts](Assignment6/client/src/rx/serverBridge.ts) | Observable stream, Redux dispatch |

---

## Common Exam Questions

| Question | Answer |
|----------|--------|
| **Why is layout.tsx a Server Component?** | No interactivity needed. Just provides metadata and HTML structure. Stays on server = smaller client bundle. |
| **Why is page.tsx a Client Component?** | Needs Redux (hooks), WebSocket (browser API), and interactive state management. |
| **How to avoid hydration errors?** | Use `useEffect` for client-only code (WebSocket, localStorage). Provide SSR-safe defaults (`?? ''`, `Boolean(...)`). |
| **Where does WebSocket connect?** | In `useEffect` inside page.tsx. Only runs after hydration (client-only). |
| **Why use Redux in Assignment 6?** | Centralized state for game, players, rooms. Easy to debug with DevTools. Integrates with RxJS WebSocket. |
| **What's the rendering flow?** | Server renders layout.tsx → sends HTML → browser hydrates → useEffect runs → WebSocket connects → Redux updates. |
| **Why separate view components?** | Single Responsibility. Easier to test, reuse, and maintain. Parent handles logic, views handle UI. |
| **What if JavaScript fails to load?** | User sees initial SSR HTML (structure, metadata) but no interactivity. Game won't work (needs WebSocket). |
| **SPA vs SSR vs SSG?** | SPA: browser renders all. SSR: server renders per request. SSG: pre-built at deploy time. |
| **When to use each?** | SPA: admin panels. SSR: user dashboards, personalized content. SSG: blogs, docs, marketing. |
