# WEB3 Comprehensive Exam Notes

## Session 1-2: TypeScript Fundamentals

### Type System Essentials
- **Basic Types**: `string`, `number`, `boolean`, `any`, `unknown`, `never`, `void`
- **Arrays**: `Type[]` or `Array<Type>`
- **Tuples**: `[string, number]` - fixed length, specific types
- **Union Types**: `string | number` - can be one of several types
- **Intersection Types**: `A & B` - must satisfy both types
- **Literal Types**: `"RED" | "BLUE"` - specific values only

### Advanced Types
- **Type Aliases**: `type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW'`
- **Interfaces**: Define object shapes, can be extended
  ```ts
  interface Card {
    readonly type: CardType
    readonly color?: Color
  }
  ```
- **Readonly**: Immutability marker `readonly`, `Readonly<T>`
- **Generics**: `<T>` for reusable, type-safe code
  ```ts
  interface Deck<T> {
    deal(): T | undefined
    filter(pred: (c: T) => boolean): Deck<T>
  }
  ```

### Template Literal Types
```ts
type CardLabel = `${Color} ${Numbered}` | `${Color} ${ActionType}`
```

### Const Assertions
```ts
const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
type Color = (typeof colors)[number]  // union of literal types
```

### Type Guards & Narrowing
- **typeof**: `typeof x === 'string'`
- **in operator**: `'color' in card`
- **Discriminated Unions**: Use a common field to distinguish types
  ```ts
  type Card = NumberedCard | ActionCard | WildCard
  // Each has unique 'type' field
  ```

### Utility Types
- `Partial<T>`: All properties optional
- `Required<T>`: All properties required
- `Pick<T, K>`: Select specific properties
- `Omit<T, K>`: Remove specific properties
- `Extract<T, U>`: Types from T that are assignable to U
- `Exclude<T, U>`: Types from T that are NOT assignable to U
- `ReturnType<T>`: Get function return type

### Functions
- **Function Types**: `(x: number) => string`
- **Optional Parameters**: `function(x?: number)`
- **Default Parameters**: `function(x: number = 10)`
- **Rest Parameters**: `function(...args: number[])`
- **Higher-Order Functions**: Functions that take/return functions

---

## Session 3: MVVM (Model-View-ViewModel)

### Architecture Pattern
- **Model**: Business logic, data structures (domain model)
- **View**: UI presentation (HTML, Vue components, React components)
- **ViewModel**: Bridge between Model and View, manages state & reactivity

### Key Concepts
- **Data Binding**: Automatic synchronization between View and ViewModel
  - One-way: ViewModel → View
  - Two-way: ViewModel ↔ View (`v-model` in Vue)
- **Reactivity**: Changes in ViewModel automatically update View
- **Separation of Concerns**: Business logic separate from UI

### Vue Implementation
```ts
// ViewModel - Pinia Store
export const useGameStore = defineStore('game', () => {
  const round = ref<Round | null>(null)
  
  function playCard(index: number, color?: Color) {
    if (round.value) {
      const card = round.value.play(index, color)
      // Update state
    }
  }
  
  return { round, playCard }
})
```

### Computed Properties
```ts
const canPlay = computed(() => {
  return round.value?.canPlayAny() ?? false
})
```

### Vue Composition API
- `ref()`: Reactive primitive values
- `reactive()`: Reactive objects
- `computed()`: Derived state
- `watch()`, `watchEffect()`: React to changes

---

## Session 4: Components

### Component Design Principles
- **Single Responsibility**: Each component does one thing well
- **Reusability**: Generic, configurable components
- **Props**: Data passed from parent to child (immutable)
- **Events**: Child communicates to parent via emits
- **Slots**: Content projection for flexible composition

### Vue Component Structure
```vue
<template>
  <div :class="['card', colorClass, { playable }]" @click="handleClick">
    {{ card.type }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  card: Card
  playable: boolean
}>()

const emit = defineEmits<{
  'card-clicked': [card: Card]
}>()

const colorClass = computed(() => 
  props.card.color?.toLowerCase() || 'wild'
)
</script>

<style scoped>
/* Component-specific styles */
</style>
```

### React Component Structure
```tsx
interface CardProps {
  card: Card
  playable: boolean
  onCardClick: (card: Card) => void
}

function UnoCard({ card, playable, onCardClick }: CardProps) {
  const colorClass = card.color?.toLowerCase() || 'wild'
  
  return (
    <div 
      className={`card ${colorClass} ${playable ? 'playable' : ''}`}
      onClick={() => playable && onCardClick(card)}
    >
      {card.type}
    </div>
  )
}
```

### Component Lifecycle
- **Mounting**: Component created and added to DOM
- **Updating**: Props or state change
- **Unmounting**: Component removed from DOM

---

## Session 5: GraphQL

### Core Concepts
- **Schema**: Type definitions for API
- **Queries**: Read data (like GET)
- **Mutations**: Modify data (like POST/PUT/DELETE)
- **Subscriptions**: Real-time updates via WebSocket
- **Resolvers**: Functions that fetch data for each field

### Schema Definition (SDL)
```graphql
type Query {
  game(id: ID!): Game
  availableGames: [Game!]!
}

type Mutation {
  createGame(playerName: String!, maxPlayers: Int): Game!
  playCard(gameId: ID!, playerId: ID!, cardIndex: Int!): Game!
}

type Subscription {
  gameUpdated(gameId: ID!): Game!
}

type Game {
  id: ID!
  players: [String!]!
  playerInTurn: Int!
  discardTop: Card
}
```

### Resolvers
```ts
export const resolvers = {
  Query: {
    game: (_: any, { id }: { id: string }) => {
      return GameManager.getGame(id)
    }
  },
  
  Mutation: {
    playCard: (_: any, args: MutationArgs) => {
      return GameManager.playCard(args)
    }
  },
  
  Subscription: {
    gameUpdated: {
      subscribe: (_: any, { gameId }: { gameId: string }) => {
        return pubsub.asyncIterator([`GAME_${gameId}`])
      }
    }
  }
}
```

### Client Usage (Apollo)
```ts
// Query
const data = await apolloClient.query({
  query: gql`
    query GetGame($id: ID!) {
      game(id: $id) {
        id
        players
      }
    }
  `,
  variables: { id: '123' }
})

// Mutation
await apolloClient.mutate({
  mutation: gql`
    mutation PlayCard($gameId: ID!, $cardIndex: Int!) {
      playCard(gameId: $gameId, cardIndex: $cardIndex) {
        id
      }
    }
  `,
  variables: { gameId: '123', cardIndex: 0 }
})

// Subscription
apolloClient.subscribe({
  query: gql`
    subscription GameUpdated($gameId: ID!) {
      gameUpdated(gameId: $gameId) {
        id
        players
      }
    }
  `
}).subscribe({
  next({ data }) {
    console.log('Game updated:', data)
  }
})
```

### Advantages
- **Single Endpoint**: One URL for all operations
- **No Over/Under-fetching**: Request exactly what you need
- **Strong Typing**: Schema provides type safety
- **Real-time**: Built-in subscription support
- **Introspection**: Self-documenting API

---

## Session 6: Server-Client Communication

### Communication Patterns

#### REST (HTTP)
- Request/Response model
- Methods: GET, POST, PUT, DELETE
- Stateless
- Multiple endpoints

#### WebSocket
- Bidirectional, persistent connection
- Real-time, low latency
- Server can push to client
- Maintains connection state

#### GraphQL
- Single endpoint with flexible queries
- Subscriptions over WebSocket
- Typed schema

### Implementation Patterns

#### WebSocket Server (Node.js)
```ts
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3001 })

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    // Handle message
    ws.send(JSON.stringify({ type: 'response' }))
  })
  
  // Broadcast to all clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(gameState))
    }
  })
})
```

#### GraphQL with Subscriptions
```ts
import { ApolloServer } from '@apollo/server'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { PubSub } from 'graphql-subscriptions'

const pubsub = new PubSub()

// Publish updates
pubsub.publish('GAME_UPDATED', { gameUpdated: game })
```

### Client-Side

#### WebSocket with RxJS
```ts
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'

const socket$: WebSocketSubject<Message> = webSocket(url)

socket$.subscribe({
  next: msg => console.log('Received:', msg),
  error: err => console.error(err),
  complete: () => console.log('Connection closed')
})

// Send message
socket$.next({ type: 'play', cardIndex: 0 })
```

---

## Session 7-8: Functional Programming

### Core Principles
1. **Pure Functions**: Same input → same output, no side effects
2. **Immutability**: Never mutate data, always create new copies
3. **First-Class Functions**: Functions as values
4. **Higher-Order Functions**: Functions that take/return functions
5. **Function Composition**: Combine small functions into larger ones

### Immutability Patterns
```ts
// Array operations (non-mutating)
const newArray = [...oldArray, newItem]
const filtered = oldArray.filter(pred)
const mapped = oldArray.map(transform)
const sliced = oldArray.slice(1)  // remove first

// Object operations
const updated = { ...oldObject, field: newValue }
const { removed, ...rest } = oldObject  // remove property
```

### Pure Function Examples
```ts
// Pure - no side effects
function add(a: number, b: number): number {
  return a + b
}

// Pure - creates new object
function updatePlayer(game: Game, index: number): Game {
  return {
    ...game,
    scores: game.scores.map((s, i) => 
      i === index ? s + 10 : s
    )
  }
}

// Impure - mutates argument
function badUpdate(game: Game) {
  game.scores[0] += 10  // ❌ Mutation!
  return game
}
```

### Higher-Order Functions
```ts
// Function that returns a function
function multiplier(factor: number) {
  return (x: number) => x * factor
}
const double = multiplier(2)

// Function that takes a function
function applyTwice<T>(fn: (x: T) => T, value: T): T {
  return fn(fn(value))
}
```

### Function Composition
```ts
// Lodash/Ramda style
import * as _ from 'lodash/fp'

const transform = _.flow([
  _.filter(card => card.color === 'RED'),
  _.map(card => card.number),
  _.sum
])

// Pipe pattern
const result = pipe(
  data,
  filter(predicate),
  map(transform),
  reduce(accumulator)
)
```

### Functional Data Structures
```ts
// Immutable deck implementation
export function createDeck(cards: readonly Card[]): Deck {
  return {
    cards: [...cards],
    
    deal(): [Card | undefined, Deck] {
      if (this.cards.length === 0) return [undefined, this]
      const [first, ...rest] = this.cards
      return [first, createDeck(rest)]
    },
    
    shuffle(shuffler: Shuffler<Card>): Deck {
      const shuffled = [...this.cards]
      shuffler(shuffled)
      return createDeck(shuffled)
    }
  }
}
```

### Functional Patterns in Assignments

#### Round State Management (Assignment 4)
```ts
// Pure function approach
export function play(
  cardIndex: number, 
  color: Color | undefined,
  round: Round
): Round {
  const card = round.hands[round.playerInTurn][cardIndex]
  const newHands = round.hands.map((hand, i) =>
    i === round.playerInTurn 
      ? hand.filter((_, idx) => idx !== cardIndex)
      : hand
  )
  
  return {
    ...round,
    hands: newHands,
    discardPile: [card, ...round.discardPile],
    playerInTurn: nextPlayer(round)
  }
}
```

### Currying & Partial Application
```ts
// Curried function
const add = (a: number) => (b: number) => a + b
const add5 = add(5)
add5(3)  // 8

// Partial application with lodash
import { partial } from 'lodash'
const playRed = partial(playCard, _, 'RED')
```

---

## Session 9: Redux

### Core Concepts
- **Store**: Single source of truth for application state
- **Actions**: Plain objects describing "what happened"
- **Reducers**: Pure functions that specify how state changes
- **Dispatch**: Send actions to the store
- **Selectors**: Extract data from store state

### Redux Principles
1. **Single Source of Truth**: One store for entire app
2. **State is Read-Only**: Only way to change state is to dispatch an action
3. **Changes Made with Pure Functions**: Reducers must be pure

### Redux Toolkit (Modern Redux)
```ts
import { createSlice, PayloadAction, configureStore } from '@reduxjs/toolkit'

// Define slice
const unoSlice = createSlice({
  name: 'uno',
  initialState: {
    game: createGame({ players: ['Alice', 'Bob'] }),
    playerIndex: 0,
    connected: false
  },
  reducers: {
    setGame(state, action: PayloadAction<Game>) {
      state.game = action.payload
    },
    setPlayerIndex(state, action: PayloadAction<number>) {
      state.playerIndex = action.payload
    },
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload
    }
  }
})

// Export actions
export const { setGame, setPlayerIndex, setConnected } = unoSlice.actions

// Create store
export const store = configureStore({
  reducer: {
    uno: unoSlice.reducer
  }
})

// TypeScript types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Using Redux in React
```tsx
import { useDispatch, useSelector } from 'react-redux'

function GameComponent() {
  const dispatch = useDispatch<AppDispatch>()
  const game = useSelector((state: RootState) => state.uno.game)
  const playerIndex = useSelector((state: RootState) => state.uno.playerIndex)
  
  const handlePlay = (index: number) => {
    const newGame = playCard(game, index)
    dispatch(setGame(newGame))
  }
  
  return <div>{/* UI */}</div>
}
```

### Provider Setup
```tsx
import { Provider } from 'react-redux'
import { store } from './store'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>
)
```

### Middleware & Thunks
```ts
// Async actions with thunks
const fetchGame = (gameId: string) => {
  return async (dispatch: AppDispatch) => {
    const game = await api.getGame(gameId)
    dispatch(setGame(game))
  }
}

// Usage
dispatch(fetchGame('123'))
```

### Redux with RxJS (Assignment 5)
```ts
// Bridge RxJS to Redux
export function connectServerStream(dispatch: AppDispatch, url: string) {
  const socket$ = webSocket<IncomingMessage>(url)
  
  socket$.subscribe({
    next: msg => {
      switch (msg.type) {
        case 'state':
          dispatch(setGame(msg.game))
          dispatch(setPlayerIndex(msg.playerIndex))
          break
        case 'room-list':
          dispatch(setRooms(msg.rooms))
          break
      }
    },
    error: err => dispatch(setConnected(false))
  })
  
  return {
    send: (msg: OutgoingMessage) => socket$.next(msg),
    disconnect: () => socket$.complete()
  }
}
```

---

## Session 10: Reactive Programming & RxJS

### Core Concepts
- **Observable**: Stream of values over time
- **Observer**: Subscribes to an Observable
- **Operators**: Transform, filter, combine streams
- **Subscription**: Connection between Observable and Observer
- **Subject**: Both Observable and Observer

### Creating Observables
```ts
import { Observable, Subject, from, of, interval } from 'rxjs'

// From array
const obs$ = from([1, 2, 3, 4])

// Single value
const single$ = of('hello')

// Over time
const timer$ = interval(1000)

// Custom
const custom$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
})

// Subject (hot observable)
const subject$ = new Subject<string>()
```

### Subscribing
```ts
const subscription = observable$.subscribe({
  next: value => console.log('Received:', value),
  error: err => console.error('Error:', err),
  complete: () => console.log('Complete')
})

// Unsubscribe
subscription.unsubscribe()
```

### Essential Operators

#### Transformation
```ts
import { map, scan, switchMap, mergeMap } from 'rxjs'

// map: Transform each value
numbers$.pipe(
  map(x => x * 2)
)

// scan: Accumulate (like reduce)
clicks$.pipe(
  scan((acc, click) => acc + 1, 0)
)

// switchMap: Cancel previous, switch to new observable
searchInput$.pipe(
  switchMap(query => apiCall(query))
)

// mergeMap: Flatten multiple observables
ids$.pipe(
  mergeMap(id => fetchData(id))
)
```

#### Filtering
```ts
import { filter, take, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs'

// filter: Only matching values
numbers$.pipe(
  filter(x => x > 10)
)

// take: First N values
stream$.pipe(take(5))

// takeUntil: Until another observable emits
stream$.pipe(takeUntil(stopSignal$))

// debounceTime: Wait for pause in events
input$.pipe(debounceTime(300))

// distinctUntilChanged: Skip duplicates
values$.pipe(distinctUntilChanged())
```

#### Combination
```ts
import { combineLatest, merge, concat } from 'rxjs'

// combineLatest: Latest from each
combineLatest([stream1$, stream2$]).pipe(
  map(([val1, val2]) => val1 + val2)
)

// merge: Interleave multiple streams
merge(stream1$, stream2$)

// concat: Sequential
concat(first$, second$, third$)
```

### WebSocket with RxJS
```ts
import { webSocket } from 'rxjs/webSocket'

const socket$ = webSocket<Message>({
  url: 'ws://localhost:3001',
  deserializer: e => JSON.parse(e.data)
})

socket$.pipe(
  filter(msg => msg.type === 'game-update'),
  map(msg => msg.payload)
).subscribe(game => {
  // Update UI with game state
})

// Send messages
socket$.next({ type: 'play-card', cardIndex: 2 })
```

### GraphQL Subscriptions with RxJS (Assignment 5)
```ts
import { Subject } from 'rxjs'

async function subscriptionsRxJS<T>(
  apolloClient: ApolloClient, 
  subscriptionQuery: DocumentNode, 
  extractor: (data: any) => T
): Promise<Subject<T>> {
  const subject = new Subject<T>()
  
  const observable = apolloClient.subscribe({ 
    query: subscriptionQuery 
  })
  
  observable.subscribe({
    next({ data }) {
      if (data) {
        subject.next(extractor(data))
      }
    },
    error(err) {
      subject.error(err)
    },
    complete() {
      subject.complete()
    }
  })
  
  return subject
}

// Usage
const gameStream$ = await gameRxJS()
gameStream$.pipe(
  map(game => ongoing_games_slice.actions.upsert(game))
).subscribe(dispatch)
```

### Subjects
```ts
import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs'

// Subject: No initial value
const subject$ = new Subject<number>()
subject$.next(1)

// BehaviorSubject: Has current value
const behavior$ = new BehaviorSubject<number>(0)
console.log(behavior$.value)  // 0

// ReplaySubject: Replays N previous values to new subscribers
const replay$ = new ReplaySubject<number>(3)
```

---

## Session 11: Next.js & Server-Side Rendering

### Core Concepts

#### Rendering Strategies
1. **SSR (Server-Side Rendering)**: Render on server for each request
2. **SSG (Static Site Generation)**: Pre-render at build time
3. **CSR (Client-Side Rendering)**: Render in browser
4. **ISR (Incremental Static Regeneration)**: Re-generate static pages

#### App Router (Next.js 13+)
- File-based routing in `app/` directory
- `page.tsx`: Route component
- `layout.tsx`: Shared layout wrapper
- `loading.tsx`: Loading UI
- `error.tsx`: Error boundary

### Server vs Client Components

#### Server Components (Default)
```tsx
// app/layout.tsx - Server Component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UNO Game',
  description: 'Multiplayer UNO'
}

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**Advantages:**
- Access to server resources (databases, files)
- Reduced bundle size (code stays on server)
- Better SEO
- Direct data fetching

**Limitations:**
- No browser APIs
- No hooks (useState, useEffect)
- No event handlers

#### Client Components
```tsx
// app/page.tsx - Client Component
'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

export default function Page() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    // Client-side only
  }, [])
  
  return <div onClick={() => setCount(c => c + 1)}>
    Clicks: {count}
  </div>
}
```

**Use client components for:**
- Interactivity (onClick, onChange)
- State management (useState, Redux)
- Browser APIs (localStorage, WebSocket)
- Effect hooks (useEffect)
- Custom hooks

### Hybrid Approach (Assignment 6)
```tsx
// layout.tsx - Server Component
export default function RootLayout({ children }) {
  // Can fetch data server-side
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}

// page.tsx - Client Component with Redux
'use client'

import { Provider } from 'react-redux'
import { store } from './store'

export default function Page() {
  return (
    <Provider store={store}>
      <GameUI />
    </Provider>
  )
}
```

### Data Fetching

#### Server Component (async/await)
```tsx
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

#### Client Component (useEffect)
```tsx
'use client'

export default function Page() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
  }, [])
  
  return <div>{data?.title}</div>
}
```

### Benefits of SSR
1. **SEO**: Search engines see fully rendered HTML
2. **Performance**: Faster initial page load
3. **Social Sharing**: Preview cards show actual content
4. **Accessibility**: Works without JavaScript

### Hydration
- Server renders HTML
- Client "hydrates" with JavaScript
- Makes page interactive

---

## Assignments Overview

### Assignment 1: UNO Domain Model
**Focus:** TypeScript, OOP, Interfaces
- Implemented Card types (Numbered, Action, Wild)
- Round interface with game logic
- Deck management with shuffling
- Testing with Jest
- **Key Pattern:** Interface-based design with readonly types

### Assignment 2: UNO Browser Client
**Focus:** Vue 3, Pinia, MVVM
- Vue components (UnoCard, ColorChooser)
- Pinia stores for state management
- Two-way data binding with v-model
- Computed properties and reactivity
- **Key Pattern:** MVVM with Vue Composition API

### Assignment 3: UNO with GraphQL
**Focus:** GraphQL, Apollo Server/Client, Subscriptions
- GraphQL schema with queries, mutations, subscriptions
- Apollo Server with WebSocket support
- Real-time game updates via subscriptions
- PubSub for broadcasting changes
- **Key Pattern:** GraphQL API with real-time updates

### Assignment 4: Functional UNO
**Focus:** Pure Functional Programming
- Immutable data structures
- Pure functions only (no classes)
- Function composition with lodash/ramda
- All state transformations return new objects
- **Key Pattern:** Functional programming with immutability

### Assignment 5: React + Redux + RxJS
**Focus:** Redux, RxJS, WebSockets
- Redux Toolkit for state management
- RxJS for WebSocket stream handling
- React functional components with hooks
- Server-client synchronization
- Multiple game rooms
- **Key Pattern:** Redux state + RxJS reactive streams

### Assignment 6: Next.js SSR
**Focus:** Server-Side Rendering, Next.js
- Next.js App Router
- Server components (layout) + Client components (page)
- Redux + RxJS from Assignment 5
- Works in both dev and production modes
- **Key Pattern:** Hybrid SSR/CSR with Next.js

---

## Common Patterns Across Assignments

### Domain Model Structure
```ts
// types/card-types.ts
export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW'
export type NumberedCard = Readonly<{
  type: 'NUMBERED'
  color: Color
  number: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
}>
export type Card = NumberedCard | ActionCard | WildCard

// round.ts
export interface Round {
  readonly playerCount: number
  player(i: number): string
  playerHand(i: number): Readonly<Card[]>
  play(index: number, color?: Color): Card
  draw(): void
  hasEnded(): boolean
}
```

### Testing Pattern
```ts
import { shuffleBuilder } from './__test__/utils/shuffling'

describe('UNO Game', () => {
  it('should play a matching card', () => {
    const shuffle = shuffleBuilder()
      .discard().is({ type: 'NUMBERED', color: 'RED', number: 5 })
      .hand(0).is({ type: 'NUMBERED', color: 'RED', number: 7 })
      .build()
    
    const round = createRound({ shuffler: shuffle })
    const card = round.play(0)
    
    expect(card.color).toBe('RED')
    expect(round.discardPile().top()).toEqual(card)
  })
})
```

### State Management Evolution
1. **Local State** (Assignment 2): Vue reactive refs
2. **Centralized Store** (Assignment 2-3): Pinia for Vue
3. **Redux** (Assignment 5-6): Redux Toolkit for React
4. **Reactive Streams** (Assignment 5-6): RxJS for real-time updates

### Communication Evolution
1. **Local only** (Assignment 1-2): No server
2. **GraphQL** (Assignment 3): Query, Mutation, Subscription
3. **WebSocket** (Assignment 5-6): Binary protocol, lower overhead

---

## Key Exam Topics Summary

### TypeScript Mastery
- Type aliases, interfaces, generics
- Union/intersection types
- Template literals
- Utility types (Partial, Pick, Omit, etc.)
- Type guards and narrowing
- Readonly and immutability

### Architecture Patterns
- **MVVM**: Model-View-ViewModel separation
- **Component-based**: Reusable UI components
- **Functional**: Pure functions, immutability
- **Reactive**: Streams and observables

### State Management
- Local state (ref, useState)
- Centralized stores (Pinia, Redux)
- Actions, reducers, selectors
- Middleware and side effects

### API Communication
- REST: Simple request/response
- GraphQL: Flexible queries, real-time subscriptions
- WebSocket: Persistent bidirectional connection
- Real-time updates with PubSub

### Functional Programming
- Pure functions (no side effects)
- Immutability (never mutate)
- Higher-order functions
- Function composition
- Declarative over imperative

### Reactive Programming (RxJS)
- Observables as event streams
- Operators: map, filter, switchMap, mergeMap
- Combining streams: combineLatest, merge
- Subjects for bidirectional communication
- Integration with Redux

### Next.js & SSR
- Server vs Client components
- When to use each type
- Hydration process
- SEO benefits
- File-based routing

### Testing
- Jest for unit tests
- Test utilities for controlled scenarios
- Builder pattern for test setup
- Pure functions make testing easy

---

## Oral Exam Tips

### Be Ready to Explain
1. **Why functional programming?** → Predictable, testable, concurrent-safe
2. **Why Redux?** → Single source of truth, time-travel debugging, predictable state
3. **Why RxJS?** → Declarative async handling, composable, backpressure management
4. **Why GraphQL?** → Flexible queries, strong typing, real-time subscriptions
5. **Why Next.js?** → SEO, performance, hybrid rendering, great DX

### Common Questions
- "Walk me through the data flow in Assignment 5"
- "Explain the difference between server and client components"
- "How does immutability help in functional programming?"
- "What's the advantage of GraphQL subscriptions over polling?"
- "How do you handle side effects in Redux?"
- "Explain how RxJS operators transform streams"

### Code Examples to Know
- Creating a Redux slice
- Setting up a GraphQL resolver
- Using RxJS operators (map, filter, switchMap)
- Writing pure vs impure functions
- Implementing a client component in Next.js

### Assignment Connections
- All assignments build on UNO domain model
- Evolution: Local → GraphQL → WebSocket
- State: Local → Store → Redux
- Rendering: CSR → SSR

---

## Quick Reference Cards

### TypeScript Quick Ref
```ts
// Union
type Status = 'active' | 'inactive'

// Intersection
type Player = User & { score: number }

// Generic
function first<T>(arr: T[]): T | undefined

// Utility
Partial<T>, Required<T>, Pick<T, K>, Omit<T, K>

// Readonly
Readonly<T>, readonly property: Type
```

### Redux Quick Ref
```ts
// Slice
const slice = createSlice({
  name: 'feature',
  initialState,
  reducers: { action(state, action) {} }
})

// Store
const store = configureStore({ reducer: { feature: slice.reducer } })

// Usage
const dispatch = useDispatch()
const data = useSelector(state => state.feature.data)
dispatch(slice.actions.action(payload))
```

### RxJS Quick Ref
```ts
// Create
of(1, 2, 3), from([1, 2, 3]), interval(1000)

// Transform
map(x => x * 2), scan((acc, x) => acc + x)

// Filter
filter(x => x > 0), take(5), debounceTime(300)

// Combine
merge, combineLatest, concat, switchMap

// Subscribe
obs$.subscribe({ next, error, complete })
```

### GraphQL Quick Ref
```graphql
# Query
query GetGame($id: ID!) { game(id: $id) { players } }

# Mutation
mutation Play($id: ID!) { playCard(gameId: $id) { id } }

# Subscription
subscription OnUpdate($id: ID!) { gameUpdated(gameId: $id) { players } }
```

### Next.js Quick Ref
```tsx
// Server Component (default)
export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}

// Client Component
'use client'
export default function Page() {
  const [state, setState] = useState(0)
  return <button onClick={() => setState(s => s + 1)}>{state}</button>
}

// Layout
export const metadata = { title: 'App' }
export default function Layout({ children }) { return children }
```

---

**Good luck with your exam! Focus on understanding the concepts and how they connect across assignments.**
