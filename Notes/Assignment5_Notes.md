# Assignment 5: React + Redux + RxJS

## Overview
**Focus:** Redux, RxJS  
**Stack:** React 18, Redux Toolkit, RxJS, WebSocket, Vite  
**Goal:** Build UNO client with React, manage state with Redux, handle real-time with RxJS

---

## Exam Focus Areas
**The examiner will ask about:**
- One-way data flow
- Reducers
- Slices
- Thunks
- (RxJS) Observables
- Subjects
- Pipes and operators
- Merge vs concat

### Quick Explanations with Snippets
- **One-way data flow** — actions dispatch → reducers → new state → UI.
```ts
dispatch({ type: 'PLAY_CARD', payload: 2 })
```
- **Reducers** — pure functions that immutably return next state.
```ts
const reducer = (s: State, a: Action): State => a.type === 'INC' ? { ...s, n: s.n + 1 } : s
```
- **Slices** — Redux Toolkit bundles state, reducers, and actions per feature.
```ts
const slice = createSlice({ name: 'game', initialState, reducers: { setHand: (s, a) => { s.hand = a.payload } } })
```
- **Thunks** — async functions that dispatch before/after side effects.
```ts
const fetchGame = (id: string) => async (dispatch) => {
  dispatch(start())
  const data = await api.get(id)
  dispatch(success(data))
}
```
- **Observables** — streams of values over time; subscribe to react.
```ts
const ticks$ = interval(1000)
ticks$.subscribe(v => console.log(v))
```
- **Subjects** — observable + observer; multicast manually.
```ts
const subject = new Subject<string>()
subject.subscribe(console.log)
subject.next('hi')
```
- **Pipes and operators** — transform streams declaratively.
```ts
socket$.pipe(map(msg => msg.data), filter(isGameEvent)).subscribe(handle)
```
- **Merge vs concat** — merge interleaves emissions; concat queues until previous completes.
```ts
merge(a$, b$)      // a,b values mixed
concat(a$, b$)     // all a then all b
```

---

## 1. One-Way Data Flow

### The Redux Pattern
```
   ┌─────────────────────────────────────────┐
   │                                         │
   ▼                                         │
┌──────┐    dispatch    ┌─────────┐    ┌─────┴───┐
│ View │ ─────────────► │ Action  │───►│ Reducer │
└──────┘                └─────────┘    └────┬────┘
   ▲                                        │
   │         ┌───────┐                      │
   └─────────┤ Store │◄─────────────────────┘
             └───────┘
                │
    ┌───────────┴───────────┐
    │   Single State Tree   │
    └───────────────────────┘
```

### Data Flow Steps
1. **User** interacts with View (click button)
2. **View** dispatches an Action
3. **Reducer** receives action + current state
4. **Reducer** returns NEW state (immutably)
5. **Store** updates with new state
6. **View** re-renders with new state

### Why One-Way?
- **Predictable**: State changes only through actions
- **Traceable**: Every change is logged
- **Debuggable**: Time-travel debugging
- **Testable**: Pure reducer functions

---

## 2. Reducers

### What is a Reducer?
A **pure function** that takes current state + action, returns new state.

```ts
// Signature
(state: State, action: Action) => State
```

### Reducer Rules
1. **Pure**: No side effects, same input → same output
2. **Immutable**: Never mutate state, return new object
3. **Deterministic**: No randomness, no API calls

### Basic Reducer
```ts
type State = { count: number }
type Action = { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'ADD', payload: number }

function counterReducer(state: State = { count: 0 }, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }  // NEW object
    case 'DECREMENT':
      return { ...state, count: state.count - 1 }
    case 'ADD':
      return { ...state, count: state.count + action.payload }
    default:
      return state  // Return unchanged for unknown actions
  }
}
```

### Redux Toolkit Reducers (with Immer)
```ts
// Redux Toolkit uses Immer internally
// You can "mutate" state, but it's actually immutable!

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1  // Looks like mutation, but Immer makes it immutable
    },
    add: (state, action: PayloadAction<number>) => {
      state.count += action.payload
    }
  }
})
```

---

## 3. Slices

### What is a Slice?
A **collection** of reducer logic + actions for a single feature. Redux Toolkit concept.

### Creating a Slice
```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UnoState {
  gameId: string | null
  hand: Card[]
  playerInTurn: number
  isMyTurn: boolean
  error: string | null
}

const initialState: UnoState = {
  gameId: null,
  hand: [],
  playerInTurn: 0,
  isMyTurn: false,
  error: null
}

const unoSlice = createSlice({
  name: 'uno',  // Prefix for action types
  initialState,
  reducers: {
    // Auto-generates action creators!
    setGameId: (state, action: PayloadAction<string>) => {
      state.gameId = action.payload
    },
    
    setHand: (state, action: PayloadAction<Card[]>) => {
      state.hand = action.payload
    },
    
    cardPlayed: (state, action: PayloadAction<{ playerIndex: number, cardIndex: number }>) => {
      const { playerIndex, cardIndex } = action.payload
      if (playerIndex === 0) {  // Assuming player 0 is us
        state.hand = state.hand.filter((_, i) => i !== cardIndex)
      }
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    }
  }
})

// Export actions (auto-generated)
export const { setGameId, setHand, cardPlayed, setError } = unoSlice.actions

// Export reducer
export default unoSlice.reducer
```

### Using Slices
```ts
// Store setup
import { configureStore } from '@reduxjs/toolkit'
import unoReducer from './features/uno/unoSlice'

export const store = configureStore({
  reducer: {
    uno: unoReducer  // Mounted at state.uno
  }
})

// In components
import { useSelector, useDispatch } from 'react-redux'
import { cardPlayed } from './unoSlice'

function Hand() {
  const hand = useSelector(state => state.uno.hand)
  const dispatch = useDispatch()
  
  const playCard = (index: number) => {
    dispatch(cardPlayed({ playerIndex: 0, cardIndex: index }))
  }
}
```

---

## 4. Thunks

### What is a Thunk?
A function that **wraps async logic** and can dispatch actions. Allows side effects in Redux.

### Why Thunks?
Reducers must be pure, but we need:
- API calls
- WebSocket messages
- Delays/timeouts
- Access to current state

### Creating Thunks
```ts
import { createAsyncThunk } from '@reduxjs/toolkit'

// Async thunk for API call
export const fetchGame = createAsyncThunk(
  'uno/fetchGame',  // Action type prefix
  async (gameId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/games/${gameId}`)
      if (!response.ok) throw new Error('Game not found')
      return await response.json()  // Becomes action.payload
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Handle in slice
const unoSlice = createSlice({
  name: 'uno',
  initialState,
  reducers: { /* ... */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGame.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchGame.fulfilled, (state, action) => {
        state.loading = false
        state.game = action.payload
      })
      .addCase(fetchGame.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})
```

### Manual Thunks
```ts
// For more control, write thunk manually
const playCardThunk = (cardIndex: number, color?: string) => {
  return async (dispatch, getState) => {
    const { gameId } = getState().uno
    
    // Optimistic update
    dispatch(cardPlayed({ cardIndex }))
    
    try {
      await api.playCard(gameId, cardIndex, color)
    } catch (error) {
      // Rollback on error
      dispatch(cardPlayFailed({ cardIndex, error: error.message }))
    }
  }
}

// Dispatch it
dispatch(playCardThunk(2, 'RED'))
```

---

## 5. RxJS Observables

### What is an Observable?
A **lazy push collection** of multiple values over time.

```ts
import { Observable } from 'rxjs'

// Create observable
const numbers$ = new Observable<number>(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)
  setTimeout(() => {
    subscriber.next(4)
    subscriber.complete()
  }, 1000)
})

// Subscribe to receive values
const subscription = numbers$.subscribe({
  next: (value) => console.log('Value:', value),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Done!')
})

// Later: unsubscribe to stop
subscription.unsubscribe()
```

### Observable vs Promise
| Observable | Promise |
|------------|---------|
| Multiple values | Single value |
| Lazy (starts on subscribe) | Eager (starts immediately) |
| Cancellable (unsubscribe) | Not cancellable |
| Operators (map, filter, etc.) | Limited (then, catch) |

### Creating Observables
```ts
import { of, from, interval, fromEvent, timer } from 'rxjs'

// From static values
const nums$ = of(1, 2, 3)

// From array/promise
const arr$ = from([1, 2, 3])
const promise$ = from(fetch('/api'))

// Interval (emits 0, 1, 2, ... every 1s)
const tick$ = interval(1000)

// From DOM events
const clicks$ = fromEvent(document, 'click')

// Timer (emit after delay)
const delayed$ = timer(3000)  // Emit 0 after 3 seconds
```

### WebSocket Observable
```ts
import { webSocket } from 'rxjs/webSocket'

const socket$ = webSocket('ws://localhost:4000')

// Receive messages
socket$.subscribe({
  next: (msg) => console.log('Received:', msg),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Connection closed')
})

// Send messages
socket$.next({ type: 'PLAY_CARD', cardIndex: 2 })

// Close connection
socket$.complete()
```

---

## 6. Subjects

### What is a Subject?
An Observable that is also an Observer. Can **both emit and receive** values.

### Types of Subjects

#### Subject (Basic)
```ts
import { Subject } from 'rxjs'

const subject = new Subject<number>()

// Subscribe BEFORE values are emitted
subject.subscribe(v => console.log('A:', v))
subject.subscribe(v => console.log('B:', v))

subject.next(1)  // A: 1, B: 1
subject.next(2)  // A: 2, B: 2
```

#### BehaviorSubject (Has current value)
```ts
import { BehaviorSubject } from 'rxjs'

// Must have initial value
const subject = new BehaviorSubject<number>(0)

console.log(subject.getValue())  // 0

subject.subscribe(v => console.log('A:', v))  // Immediately gets: A: 0

subject.next(1)  // A: 1
subject.subscribe(v => console.log('B:', v))  // Immediately gets: B: 1
```

#### ReplaySubject (Replays past values)
```ts
import { ReplaySubject } from 'rxjs'

// Replay last 2 values to new subscribers
const subject = new ReplaySubject<number>(2)

subject.next(1)
subject.next(2)
subject.next(3)

subject.subscribe(v => console.log('A:', v))  // A: 2, A: 3 (replays last 2)
```

#### AsyncSubject (Only last value on complete)
```ts
import { AsyncSubject } from 'rxjs'

const subject = new AsyncSubject<number>()

subject.subscribe(v => console.log('A:', v))

subject.next(1)  // Nothing yet
subject.next(2)  // Nothing yet
subject.next(3)  // Nothing yet
subject.complete()  // A: 3 (only now, only last value)
```

---

## 7. Pipes and Operators

### What are Operators?
Functions that **transform** observables. Chained with `.pipe()`.

### Using Pipe
```ts
import { of } from 'rxjs'
import { map, filter, tap } from 'rxjs/operators'

of(1, 2, 3, 4, 5).pipe(
  filter(x => x % 2 === 0),     // Keep even: 2, 4
  map(x => x * 10),              // Transform: 20, 40
  tap(x => console.log('Value:', x))  // Side effect (logging)
).subscribe(result => console.log('Final:', result))
// Value: 20, Final: 20
// Value: 40, Final: 40
```

### Common Operators

#### Transformation
```ts
import { map, pluck, scan } from 'rxjs/operators'

// map: transform each value
source$.pipe(map(x => x * 2))

// pluck: extract property (deprecated, use map)
source$.pipe(map(event => event.target.value))

// scan: accumulate (like reduce, but emits each step)
clicks$.pipe(scan(count => count + 1, 0))  // 1, 2, 3, ...
```

#### Filtering
```ts
import { filter, take, takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators'

// filter: keep matching values
source$.pipe(filter(x => x > 10))

// take: take first n values, then complete
source$.pipe(take(5))

// takeUntil: take until another observable emits
source$.pipe(takeUntil(stopSignal$))

// distinctUntilChanged: only emit when value changes
source$.pipe(distinctUntilChanged())

// debounceTime: wait for pause in emissions
input$.pipe(debounceTime(300))  // Wait 300ms of silence
```

#### Error Handling
```ts
import { catchError, retry } from 'rxjs/operators'

source$.pipe(
  retry(3),  // Retry up to 3 times on error
  catchError(err => {
    console.error('Error:', err)
    return of(defaultValue)  // Return fallback observable
  })
)
```

---

## 8. Merge vs Concat

### merge - Combine, interleaved
Subscribes to **all sources simultaneously**. Emits values as they arrive.

```ts
import { merge, interval } from 'rxjs'
import { take, map } from 'rxjs/operators'

const fast$ = interval(500).pipe(take(3), map(x => `Fast ${x}`))
const slow$ = interval(800).pipe(take(3), map(x => `Slow ${x}`))

merge(fast$, slow$).subscribe(console.log)
// Fast 0 (500ms)
// Slow 0 (800ms)
// Fast 1 (1000ms)
// Fast 2 (1500ms)
// Slow 1 (1600ms)
// Slow 2 (2400ms)
```

### concat - Combine, sequential
Subscribes to sources **one at a time**. Waits for each to complete before starting next.

```ts
import { concat, interval } from 'rxjs'
import { take, map } from 'rxjs/operators'

const first$ = interval(500).pipe(take(3), map(x => `First ${x}`))
const second$ = interval(500).pipe(take(3), map(x => `Second ${x}`))

concat(first$, second$).subscribe(console.log)
// First 0 (500ms)
// First 1 (1000ms)
// First 2 (1500ms) - first$ completes
// Second 0 (2000ms) - second$ starts
// Second 1 (2500ms)
// Second 2 (3000ms)
```

### Comparison
| merge | concat |
|-------|--------|
| All at once | One at a time |
| Interleaved output | Sequential output |
| Race condition possible | Guaranteed order |
| Use for: parallel requests | Use for: ordered sequences |

### Other Combination Operators
```ts
import { combineLatest, zip, forkJoin } from 'rxjs'

// combineLatest: emit when ANY source emits (after all have emitted once)
combineLatest([a$, b$]).subscribe(([a, b]) => console.log(a, b))

// zip: pair up emissions by index
zip(a$, b$).subscribe(([a, b]) => console.log(a, b))

// forkJoin: wait for all to complete, emit last values
forkJoin([request1$, request2$]).subscribe(([r1, r2]) => console.log(r1, r2))
```

---

## Quick Reference for Exam

| Topic | Key Points |
|-------|------------|
| **One-way flow** | Action → Reducer → Store → View |
| **Reducer** | Pure function: `(state, action) => newState` |
| **Slice** | Redux Toolkit: reducer + actions for a feature |
| **Thunk** | Async middleware: API calls, side effects |
| **Observable** | Lazy push collection, cancellable |
| **Subject** | Observable + Observer, multicast |
| **BehaviorSubject** | Holds current value, new subscribers get it |
| **pipe()** | Chain operators to transform observables |
| **map/filter** | Transform/filter values in stream |
| **merge** | Combine sources, interleaved (parallel) |
| **concat** | Combine sources, sequential (one after other) |
| **takeUntil** | Complete when signal observable emits |
| **catchError** | Handle errors, return fallback observable |
