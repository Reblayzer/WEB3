# Assignment 6: Next.js & Server-Side Rendering - Theory Explained

## The Evolution from Client-Side to Server-Side Rendering

Early web applications were fully client-side: the server sent HTML, CSS, and JavaScript to the browser, and the browser rendered everything. The advantage was simplicity—you only had one execution environment. The disadvantage was that the browser had to do all the work: download JavaScript, parse it, execute it to render the page. This was slow, and search engines couldn't see the content because it didn't exist until JavaScript ran.

Server-side rendering flips this: the server generates the HTML and sends it to the browser. The browser displays it immediately, even before JavaScript arrives. Then, when JavaScript does arrive, it "hydrates" the page—attaching event handlers and making it interactive. This gives you fast initial page loads and good SEO because the content exists in the HTML.

Next.js makes server-side rendering practical by handling the complexity of running React on the server and hydrating it on the client.

## Static vs Dynamic Pages: Build Time vs Request Time

Not all pages need to be rendered on every request. Some content changes rarely or not at all. Those can be built once at deployment time and served to everyone. Others need to be fresh for every request.

### Static Site Generation (SSG)

Static pages are rendered at build time. The build process runs your page's React component, gets its data, and renders it to HTML. That same HTML is served to every user. Static pages are super fast because there's no computation—it's just serving pre-built files. They're CDN-cacheable, so you can serve them from locations all around the world with low latency.

Use static generation for pages that don't change frequently: marketing pages, documentation, blog posts that don't update every minute.

### Server-Side Rendering (SSR)

Dynamic pages are rendered on every request. When a user visits, the server runs the page's React component, fetches fresh data if needed, renders it, and sends the HTML to that user. This means the user always gets current data, but it requires computation per request.

Use SSR for pages where content is personalized or changes frequently: user dashboards, real-time game states, time-sensitive content.

### Choosing Between Them

The key question is: is this content the same for all users? If yes, use static. Does this content change based on the user or the current time? Use dynamic. Some pages are hybrid—mostly static content with some dynamic parts, which Next.js handles through Client Components.

### Revalidation and ISR

Incremental Static Regeneration (ISR) is a middle ground. You statically generate a page but tell Next.js to regenerate it every N seconds. The first user after the timeout gets a newly generated page, subsequent users get the cached version. This gives you the speed of static generation with freshness closer to dynamic.

## Client Components vs Server Components

Next.js's App Router introduces a new concept: Server Components. This is significant because it changes where code runs.

### Server Components: The Default

By default, components in Next.js 13+ are Server Components. They run on the server. This has several advantages: they can directly access databases, they can safely keep secrets (API keys) in the code, and they don't add to the JavaScript bundle sent to the client. For any component that doesn't need interactivity, being a Server Component is better.

A Server Component can be async. You can fetch data directly in the component using `async/await`. You don't need `useEffect` or loaders. The data is there when the component renders.

### Client Components: Interactivity

When a component needs interactivity—forms, click handlers, browser APIs like localStorage—it must be a Client Component. You mark it with `'use client'` at the top. Client Components run in the browser and can use React hooks like `useState` and `useEffect`.

### The Boundary

Here's an important detail: when a component imports another component, if the parent is a Client Component, all its children become Client Components too, even without `'use client'` directives. This is because they're all part of the same JavaScript bundle. If you want a child to be a Server Component while the parent is a Client Component, you pass the Server Component as a child prop.

### Mixing Server and Client Components

The optimal pattern is to push Client Components as deep as the tree as possible. Keep most of your app as Server Components, using them for data fetching and logic. Push Client Components to leaves for interactivity. This minimizes the client JavaScript bundle and maximizes the benefits of Server Components.

## App Routing: File-System-Based Routing

Next.js uses the file system to define routes. Folders become URL segments, and special files handle different concerns.

### How Routes Map to Files

If you have a file at `app/game/page.tsx`, that's the page for the `/game` route. If you have `app/game/[gameId]/page.tsx`, the `[gameId]` part is dynamic—it matches any URL like `/game/123` or `/game/abc`. The matched value becomes available as `params.gameId`.

### Special Files

`page.tsx` defines the UI for a route. `layout.tsx` defines shared UI that wraps pages at that level and below. `loading.tsx` shows while a page is loading (Next.js uses React Suspense under the hood). `error.tsx` is an error boundary. `not-found.tsx` is a 404 page. `route.ts` defines an API endpoint.

### Dynamic Segments

Beyond single parameters, you can have catch-all routes with `[...slug]`, which matches any number of segments. You can also have optional segments with `[[...slug]]`. These give flexibility in URL structure while keeping route organization clear.

### Layouts and Nesting

Layouts are powerful. A layout wraps its pages and nested layouts. This is perfect for things like navigation that should be present on multiple pages. Each layout level has its own layout file. Layouts are Server Components by default and don't re-render when navigating between sibling pages.

## Hydration: The Bridge Between Server and Client

Hydration is the process where React takes the static HTML the server sent and makes it interactive by attaching event handlers.

### Why Hydration Is Necessary

The server renders React to HTML. HTML is static—it's just text. When JavaScript reaches the browser, React needs to attach event handlers to those elements so they respond to clicks, input, etc. React also needs to resume its internal state. Hydration is React saying "I'm now in charge of this HTML and will keep it up to date."

### The Hydration Timeline

First, the server renders your components to HTML. This happens very quickly. That HTML is sent to the browser and displayed immediately. The user sees content. Then, the JavaScript bundle downloads and executes. React hydrates the page. Now the page is fully interactive. If the user clicks something before hydration completes, their click doesn't work, but this window is usually small.

### Hydration Mismatch

Here's the catch: the HTML the server generates must match what React generates on the client. If they don't match, React will either replace the mismatched content (bad for performance) or just give up. This mismatch is what causes "hydration errors."

### Why Mismatches Happen

The server renders with no user input. The client might use `window.innerWidth`, which doesn't exist on the server, so it renders something different. The server and client might have different times, so timestamps differ. Random values differ. The solution is to keep server and client rendering the same.

## Avoiding Hydration Errors

Hydration errors are tricky because sometimes the error message doesn't clearly indicate the problem. The key is understanding when server and client rendering might differ.

### The Pattern: Render Placeholder, Fill on Client

A safe pattern is to render a placeholder on the server and fill in client-specific data on the client. For example, don't render the current time on the server—render "..." or an empty space. Then in `useEffect`, set the time. The server-rendered HTML and client-rendered HTML match, so no mismatch.

### Browser-Only APIs

Code using `window`, `document`, `localStorage`, or other browser APIs won't work on the server. Wrap these in `useEffect` or conditions that check `typeof window !== 'undefined'`. Remember that Server Components never have access to these APIs, so this is mainly for Client Components.

### Random and Time-Based Values

Don't call `Math.random()` or `new Date()` in the main render path. Use `useEffect` to set them. Or, seed your random number generator with a value the server knows about. For time, the server can send its time to the client, and the client uses that as a baseline.

### Dynamic Imports

If you need a library that only works in the browser, use dynamic imports with `ssr: false`. This prevents it from being included in the server build.

### suppressHydrationWarning

As a last resort, you can add `suppressHydrationWarning` to an element. This tells Next.js "I know there's a mismatch here and I'm okay with it." Use this sparingly and only when you understand why the mismatch is happening and it's acceptable.

## State Management in SSR Applications

State in SSR apps has to bridge server and client. The server generates initial state, sends it to the client, and the client continues from there.

### Server State: React Server Components

Server Components can fetch data directly. You don't need a state management library for this. The data is fetched during server rendering and passed as props to Client Components.

```tsx
async function GamePage({ params }) {
  const game = await getGame(params.id)
  return <ClientGameBoard initialGame={game} />
}
```

The server fetched the game; the Client Component receives it as a prop.

### Client State: useState and Context

Client Components use `useState` and `useContext` for state that changes in the browser. If you're using Redux or another state management library, it works the same way: the Client Component uses it.

### Hydrating with Initial State

If you're using a Client-side state management library, you need to hydrate it with initial state from the server. Libraries like Redux and TanStack Query provide ways to do this. You render the page on the server, serialize the state, send it with the HTML, and the Client Component initializes its state from that serialized data.

### Query Client and Data Fetching Libraries

Libraries like TanStack Query (React Query) provide `dehydrate()` and `Hydrate` components for exactly this use case. The server uses the query client to fetch data, dehydrates it, sends it with the HTML, and the client hydrates it to skip refetching the same data.

## The Role of getStaticProps and getServerSideProps

In Next.js Pages Router (the older system), these functions explicitly told Next.js whether to statically generate or dynamically render. In the App Router, this is determined by whether components are async and whether they use dynamic functions. But the concepts are the same: `getStaticProps` runs at build time, `getServerSideProps` runs per request.

## Performance Implications

SSR is powerful but has trade-offs. Server rendering takes time, so the Time to First Byte (TTFB) might be longer than purely static HTML. However, the page content arrives before JavaScript, so First Contentful Paint (FCP) is faster. Hydration is fast because React is just attaching handlers to existing elements.

The optimal strategy depends on your application. Marketing pages should be static. Dynamic content like dashboards should be SSR. Interactive features should be Client Components to minimize the JavaScript bundle.

## SEO and Meta Tags

A major advantage of SSR is that content exists in HTML, so search engines can see it and index it. You can set title, description, and other meta tags dynamically based on the page content. Next.js provides ways to set these from Server Components.

For a game page, you might set the title to "UNO Game #123", which is much better for SEO than a static title that's the same for every game.
