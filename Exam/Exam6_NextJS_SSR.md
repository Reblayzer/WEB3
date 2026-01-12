# Exam 6: Next.js and SSR

> **Exam Topics:** static vs dynamic pages, client vs server components, app routing, hydration, avoiding hydration errors, state management in SSR

---

## 1. Static vs Dynamic Pages

### What's the difference?
Static pages are pre-built at compile time and served the same to everyone. Dynamic pages are generated on each request, so they can show fresh data or personalized content. The choice affects performance, freshness, and server load.

### Static (SSG - Static Site Generation)
Static pages are built once during deployment and served from a CDN. Since they're pre-built, they load extremely fast and don't require server computation for each request. However, the content is fixed until you rebuild.

Use static for content that:
- Rarely changes (blog posts, documentation)
- Is the same for all users
- Doesn't need real-time data

```tsx
// Static by default in Next.js App Router
export default function About() {
  return <div>About Us</div>
}

// Static data fetching - runs at build time
const data = await fetch(url, { cache: 'force-cache' })
```

### Dynamic (SSR - Server-Side Rendering)
Dynamic pages are generated on each request. The server fetches fresh data, renders HTML, and sends it to the client. This adds latency but ensures content is always current.

Use dynamic for content that:
- Changes frequently
- Is personalized per user
- Requires real-time accuracy

```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Dynamic data fetching - runs on each request
const data = await fetch(url, { cache: 'no-store' })
```

### Incremental Static Regeneration (ISR)
ISR is a middle ground. Pages are static but automatically regenerate after a specified time. You get static performance with eventual freshness.

```tsx
// Revalidate every 60 seconds
const data = await fetch(url, { next: { revalidate: 60 } })
```

### How ISR Works
1. First request: serves cached static page
2. After revalidation time: next request triggers background regeneration
3. Stale page served while regenerating
4. Future requests get the new page

This is the "stale-while-revalidate" pattern - users always get fast responses.

---

## 2. Metadata and SEO

### Why SSR helps SEO
Search engines see the full HTML content immediately. With client-side rendering, they'd only see an empty shell until JavaScript runs. SSR ensures all content is indexable.

### Setting Metadata
Server Components can export a `metadata` object or `generateMetadata` function for dynamic values.

```tsx
// Static metadata
export const metadata = {
  title: 'UNO Game',
  description: 'Play UNO online with friends'
}

// Dynamic metadata based on page data
export async function generateMetadata({ params }) {
  const game = await getGame(params.gameId)
  return {
    title: `Game #${game.id}`,
    openGraph: { title: `Join UNO Game #${game.id}` }
  }
}
```

---

## 3. Client vs Server Components

### What are they?
Next.js App Router distinguishes between Server Components (run on the server) and Client Components (run in the browser). Server Components can access server resources directly. Client Components can use browser features and React state.

### Server Components (Default)
By default, components in the `app/` directory are Server Components. They render on the server and send HTML to the client. The component code never runs in the browser.

**Can do:**
- Access databases directly
- Read files from the filesystem
- Use environment secrets safely
- Fetch data without API endpoints

**Cannot do:**
- Use React hooks (useState, useEffect)
- Handle events (onClick, onChange)
- Access browser APIs (window, localStorage)

```tsx
// Server Component - no directive needed
export default async function Page() {
  const data = await db.query('SELECT * FROM games')  // Direct DB access
  const secret = process.env.SECRET_KEY               // Safe to use
  return <div>{data.map(...)}</div>
}
```

### Client Components
Client Components run in the browser. They're needed for interactivity, state, and browser APIs. Mark them with `'use client'` at the top of the file.

```tsx
'use client'  // This directive is required

import { useState, useEffect } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    document.title = `Count: ${count}`  // Browser API
  }, [count])

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

### Mixing Components
A common pattern is to fetch data in a Server Component and pass it to Client Components for interactivity.

```tsx
// Page.tsx - Server Component
export default async function Page() {
  const data = await fetchData()  // Fetch on server
  return <InteractiveWidget initialData={data} />  // Pass to client
}

// InteractiveWidget.tsx - Client Component
'use client'
export default function InteractiveWidget({ initialData }) {
  const [data, setData] = useState(initialData)  // Client state
  return <button onClick={...}>...</button>       // Interactivity
}
```

---

## 4. App Routing

### What is it?
Next.js App Router uses file-system-based routing. The folder structure in `app/` determines your URL structure. Each folder can contain special files that define the UI for that route.

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
Layouts wrap pages and persist across navigation. They're great for shared UI like headers and sidebars. Layouts don't re-render when navigating between pages they wrap.

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
const router = useRouter()
router.push('/game/123')
```

---

## 5. Hydration

### What is it?
Hydration is the process of making server-rendered HTML interactive. The server sends HTML that the user can see immediately. Then JavaScript loads and React "hydrates" the page by attaching event handlers and enabling interactivity.

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

---

## 6. Avoiding Hydration Errors

### What causes them?
Hydration errors occur when the HTML rendered on the server doesn't match what React renders on the client. React expects to hydrate the exact same content, so any difference causes an error or warning.

### Common Causes and Fixes

**Browser-Only APIs**
Server doesn't have `window`, `localStorage`, etc.

```tsx
// BAD - window doesn't exist on server
const width = window.innerWidth

// GOOD - access in useEffect (client only)
const [width, setWidth] = useState(0)
useEffect(() => {
  setWidth(window.innerWidth)
}, [])
```

**Date/Time**
Server and client render at different times.

```tsx
// BAD - different time on server vs client
<div>{new Date().toLocaleString()}</div>

// GOOD - render time on client only
const [time, setTime] = useState<string>()
useEffect(() => {
  setTime(new Date().toLocaleString())
}, [])
return <div>{time ?? 'Loading...'}</div>
```

**Random Values**
Random values differ between server and client.

```tsx
// BAD - different random on each render
<div>{Math.random()}</div>

// GOOD - generate on client
const [random, setRandom] = useState(0)
useEffect(() => {
  setRandom(Math.random())
}, [])
```

**localStorage**
Doesn't exist on server.

```tsx
// BAD - localStorage doesn't exist on server
const theme = localStorage.getItem('theme')

// GOOD - access in useEffect
const [theme, setTheme] = useState('light')  // Default for SSR
useEffect(() => {
  const saved = localStorage.getItem('theme')
  if (saved) setTheme(saved)
}, [])
```

### The Pattern
The fix is always the same: use `useEffect` for client-only code. Server render shows a default/placeholder, client updates after hydration.

```tsx
const [isClient, setIsClient] = useState(false)

useEffect(() => {
  setIsClient(true)
}, [])

if (!isClient) return <div>Loading...</div>  // Server render
return <div>{/* Client-only content */}</div>  // After hydration
```

---

## 7. State Management in SSR

### The Challenge
In SSR, your app runs in two environments: server (for initial render) and client (for interactivity). State needs to be consistent between them, or you'll get hydration errors.

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

### Code Splitting
Dynamic imports also split your bundle. The component code only downloads when the component is rendered, improving initial load time.

```tsx
// Heavy charting library - only loads when needed
const Chart = dynamic(() => import('./HeavyChart'))
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| Static vs Dynamic? | Static: built once, fast, same for all users. Dynamic: per-request, always fresh |
| What is ISR? | Incremental Static Regeneration - static pages that auto-refresh after a time interval |
| When use Server vs Client component? | Server: data fetching, secrets. Client: interactivity, hooks, browser APIs |
| What is hydration? | React attaching event handlers to server-rendered HTML to make it interactive |
| What causes hydration errors? | Server HTML differs from client render (Date, Math.random, window, localStorage) |
| How to fix hydration errors? | Use `useEffect` for client-only code, show placeholder during SSR |
| How to handle state in SSR? | Fetch on server, pass as props, initialize client state from props |
| Why use layout.tsx? | Shared UI wrapper that persists between route navigations |
| Why SSR? | SEO, fast initial paint, works without JavaScript, social sharing previews |
| When use dynamic() with ssr: false? | For browser-only libraries (maps, charts) that crash during server render |

---

## Where It's Applied in Assignment 6

| Concept | File | Location |
|---------|------|----------|
| **File-based Routing** | `client/src/app/` | App directory structure with `page.tsx` and `layout.tsx` |
| **Root Layout** | `client/src/app/layout.tsx:9-14` | `RootLayout` wrapping all pages with `<html>` and `<body>` tags |
| **Metadata Export** | `client/src/app/layout.tsx:1,4-7` | `export const metadata: Metadata = { title: 'UNO', description: '...' }` |
| **`'use client'` Directive** | `client/src/app/page.tsx:1` | Marks entire component tree as client-side |
| **Redux Provider Pattern** | `client/src/app/page.tsx:4,17-19` | `<Provider store={store}>` wraps ClientPage component |
| **useState with SSR-safe Defaults** | `client/src/app/page.tsx:27-32` | `useState<string>(playerName ?? '')`, `useState<boolean>(Boolean(...))` - default values prevent hydration mismatch |
| **useEffect for Client-only Code** | `client/src/app/page.tsx:34-41` | WebSocket connection only runs on client after hydration |
| **useEffect Cleanup Pattern** | `client/src/app/page.tsx:34-41` | Returns cleanup function to disconnect WebSocket on unmount |
| **useDispatch** | `client/src/app/page.tsx:3-4,24` | `const dispatch = useDispatch<AppDispatch>()` |
| **useSelector** | `client/src/app/page.tsx:4,25` | Selects `game`, `playerIndex`, `connected`, `rooms`, `roomId`, `playerName` from store |
| **useMemo** | `client/src/app/page.tsx:3,66-69` | Memoizes player name calculation based on dependencies |
| **Redux Store Setup** | `client/src/lib/store.ts:1-11` | `configureStore` with uno reducer, exports `RootState` and `AppDispatch` types |
| **Redux Slice** | `client/src/features/uno/unoSlice.ts:1-71` | State type, initial state, and reducers (setGame, setPlayerIndex, etc.) |
| **Props-based Data Passing** | `client/src/app/page.tsx:134-164` | Server-fetched or state data passed to `<LoginView>`, `<LobbyView>`, `<GameView>` |
| **Callback Props Pattern** | `client/src/app/page.tsx:71-110` | Event handlers like `handleCardClick`, `handleLogin` passed to child components |
| **Component Composition** | `client/src/app/page.tsx:15-20` | Page exports wrapper containing ClientPage with conditional views |
| **Child Client Components** | `client/src/components/UnoCard.tsx`, `ColorChooser.tsx` | Client components via parent's `'use client'` context |
| **Global CSS** | `client/src/app/globals.css` | Imported in layout.tsx for app-level styles |
| **RxJS WebSocket Bridge** | `client/src/rx/serverBridge.ts:41-85` | `connectServerStream(dispatch)` bridges RxJS WebSocket to Redux actions |
