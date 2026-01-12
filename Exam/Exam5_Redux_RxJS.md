# Exam 5: Redux and RxJS

> **Exam Topics:** one-way data flow, reducers, slices, thunks, observables, subjects, pipes and operators, merge vs concat

---

# Redux

## 1. One-Way Data Flow

### What is it?
One-way data flow is the core pattern of Redux. Data moves in a single direction through your application: from actions to reducers to the store to the view. The view never directly modifies the store - it dispatches actions that describe what happened, and reducers decide how the state changes.

### Why does it matter?
This pattern makes state changes predictable and traceable. Every change goes through the same path, so you can log all actions and see exactly how state evolved. This enables powerful debugging tools like time-travel debugging, where you can step back through previous states.

```
User clicks -> dispatch(action) -> reducer -> new state -> view re-renders

+---------+  dispatch   +--------+   +---------+
|  VIEW   | ----------> | ACTION | -> | REDUCER |
+---------+             +--------+   +----+----+
     ^                                    |
     |          +-------+                 |
     +--------- | STORE | <---------------+
                +-------+
```

### The Flow Steps
1. User interacts with the view (clicks a button)
2. View dispatches an action (an object describing what happened)
3. Reducer receives current state and action, returns new state
4. Store updates with the new state
5. View re-renders with the updated state

---

## 2. Reducers

### What are they?
A reducer is a pure function that takes the current state and an action, then returns the new state. The name comes from the array `reduce` method - it "reduces" a sequence of actions into a single state. Reducers are the only place where state changes happen.

### Why must they be pure?
Reducers must be pure (same input = same output, no side effects) so that state changes are predictable. If a reducer had side effects or was non-deterministic, you couldn't reliably replay actions or debug state changes. The predictability is what enables Redux's powerful dev tools.

```ts
// Reducer signature
(state: State, action: Action) => State
```

### Reducer Rules
1. **Pure**: No side effects like API calls or random values
2. **Immutable**: Never modify state directly, always return a new object
3. **Deterministic**: Same inputs must always produce same outputs

### Basic Reducer
```ts
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }   // New object!
    case 'ADD':
      return { ...state, count: state.count + action.payload }
    default:
      return state  // Return unchanged state for unknown actions
  }
}
```

### Redux Toolkit with Immer
Redux Toolkit uses Immer internally, which lets you write code that looks like mutations but actually produces immutable updates. This makes reducers much easier to write.

```ts
reducers: {
  increment: (state) => {
    state.count += 1  // Looks like mutation, but Immer makes it immutable
  },
  add: (state, action) => {
    state.count += action.payload
  }
}
```

---

## 3. Slices

### What are they?
A slice is a Redux Toolkit concept that bundles related state, reducers, and auto-generated action creators together. Instead of writing actions and reducers separately, you define them in one place. The name "slice" reflects that it's a slice of your overall Redux state.

### Why use them?
Slices reduce boilerplate dramatically. You don't need to define action type constants or write action creator functions - Redux Toolkit generates them automatically. This makes Redux code much more concise and less error-prone.

```ts
const unoSlice = createSlice({
  name: 'uno',  // Prefix for action types: 'uno/setHand', 'uno/cardPlayed'
  initialState: { hand: [], playerInTurn: 0 },
  reducers: {
    setHand: (state, action: PayloadAction<Card[]>) => {
      state.hand = action.payload
    },
    cardPlayed: (state, action: PayloadAction<{ cardIndex: number }>) => {
      state.hand = state.hand.filter((_, i) => i !== action.payload.cardIndex)
    }
  }
})

// Auto-generated action creators
export const { setHand, cardPlayed } = unoSlice.actions
export default unoSlice.reducer
```

### Using in Components
```ts
const hand = useSelector(state => state.uno.hand)  // Read from store
const dispatch = useDispatch()
dispatch(cardPlayed({ cardIndex: 2 }))              // Dispatch action
```

---

## 4. Thunks

### What are they?
A thunk is a function that wraps async logic and can dispatch multiple actions. Since reducers must be pure, they can't do async operations like API calls. Thunks provide a way to handle side effects while keeping reducers pure.

### Why use them?
Real applications need to fetch data, send requests, and handle async operations. Thunks let you write this logic in a way that integrates cleanly with Redux. You can dispatch actions before, during, and after async operations.

### Basic Thunk
A thunk is a function that returns a function. The inner function receives `dispatch` and `getState`, giving it full access to dispatch actions and read current state.

```ts
const playCardThunk = (cardIndex: number) => {
  return async (dispatch, getState) => {
    const { gameId } = getState().uno

    // Optimistic update - update UI immediately
    dispatch(cardPlayed({ cardIndex }))

    try {
      await api.playCard(gameId, cardIndex)
    } catch (error) {
      // Rollback on error
      dispatch(setError(error.message))
    }
  }
}

// Usage
dispatch(playCardThunk(2))
```

### createAsyncThunk
Redux Toolkit's `createAsyncThunk` handles the common pattern of pending/fulfilled/rejected states automatically.

```ts
const fetchGame = createAsyncThunk('uno/fetchGame',
  async (gameId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/games/${gameId}`)
      return response.json()  // Becomes action.payload
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Handle all three states in the slice
extraReducers: (builder) => {
  builder
    .addCase(fetchGame.pending, (state) => { state.loading = true })
    .addCase(fetchGame.fulfilled, (state, action) => {
      state.loading = false
      state.game = action.payload
    })
    .addCase(fetchGame.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })
}
```

---

# RxJS

## 5. Observables

### What are they?
An Observable is a stream of values over time. Unlike a Promise which resolves once, an Observable can emit multiple values. You subscribe to an Observable to receive values as they arrive. Observables are lazy - they don't start emitting until you subscribe.

### Why use them?
Observables excel at handling sequences of events over time: user input, WebSocket messages, timers, etc. They provide a unified way to work with async data streams and powerful operators to transform and combine them.

```ts
const numbers$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  setTimeout(() => {
    subscriber.next(3)
    subscriber.complete()
  }, 1000)
})

numbers$.subscribe({
  next: (v) => console.log(v),     // Called for each value
  error: (e) => console.error(e),  // Called on error
  complete: () => console.log('done')  // Called when stream ends
})
```

### Observable vs Promise

| Observable | Promise |
|------------|---------|
| Multiple values | Single value |
| Lazy (starts on subscribe) | Eager (starts immediately) |
| Cancellable (unsubscribe) | Not cancellable |
| Rich operators | Limited (then, catch) |

### Creating Observables
```ts
of(1, 2, 3)                  // Emit these values then complete
from([1, 2, 3])              // From array
interval(1000)               // Emit 0, 1, 2... every second
fromEvent(btn, 'click')      // From DOM events
webSocket('ws://...')        // From WebSocket
```

---

## 6. Subjects

### What are they?
A Subject is both an Observable and an Observer - it can receive values and broadcast them to subscribers. Unlike regular Observables that produce values internally, Subjects let you push values from outside. This makes them useful for multicasting - multiple subscribers share the same execution.

### Types of Subjects

**Subject** - Basic subject. Values are only received by subscribers who subscribed before the value was emitted.
```ts
const subject = new Subject<number>()
subject.subscribe(v => console.log('A:', v))
subject.next(1)  // A: 1
subject.next(2)  // A: 2
```

**BehaviorSubject** - Has a "current value" concept. New subscribers immediately receive the current value, then subsequent values. Useful when you always need the latest state.
```ts
const subject = new BehaviorSubject(0)  // Initial value required
subject.getValue()  // 0
subject.subscribe(v => console.log(v))  // Immediately logs: 0
subject.next(1)  // logs: 1
```

**ReplaySubject** - Replays a buffer of previous values to new subscribers. Useful when subscribers might miss values.
```ts
const subject = new ReplaySubject(2)  // Buffer last 2 values
subject.next(1)
subject.next(2)
subject.next(3)
subject.subscribe(v => console.log(v))  // Logs: 2, 3 (replays last 2)
```

---

## 7. Pipes and Operators

### What are they?
Operators are functions that transform Observables. You chain them using the `pipe()` method. Each operator takes an Observable, transforms it somehow, and returns a new Observable. This lets you build complex data transformation pipelines.

### Why use them?
Operators provide a declarative way to handle common async patterns: filtering, transforming, combining, error handling, etc. Instead of writing imperative code with callbacks, you describe the transformations you want.

```ts
of(1, 2, 3, 4, 5).pipe(
  filter(x => x % 2 === 0),      // Keep even: 2, 4
  map(x => x * 10),               // Transform: 20, 40
  tap(x => console.log('Got:', x))  // Side effect for debugging
).subscribe(console.log)
```

### Common Operators

**Transformation:**
```ts
map(x => x * 2)              // Transform each value
scan((acc, x) => acc + x, 0) // Accumulate like reduce, but emit each step
```

**Filtering:**
```ts
filter(x => x > 10)          // Keep values matching condition
take(5)                      // Take first 5 values, then complete
takeUntil(stop$)             // Take until another Observable emits
debounceTime(300)            // Wait for 300ms of silence before emitting
distinctUntilChanged()       // Skip consecutive duplicate values
```

**Error Handling:**
```ts
retry(3)                         // Retry up to 3 times on error
catchError(err => of(fallback))  // Catch error, return fallback Observable
```

---

## 8. Merge vs Concat

### What's the difference?
Both combine multiple Observables into one, but they handle timing differently. `merge` subscribes to all sources simultaneously and emits values as they arrive from any source. `concat` waits for each source to complete before subscribing to the next.

### merge - Parallel, Interleaved
Merge subscribes to all Observables at once. Values interleave based on when they're emitted. Use merge when you want to handle multiple streams in parallel and don't care about order.

```ts
const fast$ = interval(500).pipe(take(3), map(x => 'fast ' + x))
const slow$ = interval(800).pipe(take(3), map(x => 'slow ' + x))

merge(fast$, slow$).subscribe(console.log)
// fast 0  (500ms)
// slow 0  (800ms)
// fast 1  (1000ms)
// fast 2  (1500ms)
// slow 1  (1600ms)
// slow 2  (2400ms)
```

### concat - Sequential, Ordered
Concat waits for the first Observable to complete before subscribing to the second. Values come out in source order. Use concat when order matters or when you need to process things sequentially.

```ts
const first$ = of('a', 'b', 'c')
const second$ = of('x', 'y', 'z')

concat(first$, second$).subscribe(console.log)
// a, b, c (first completes)
// x, y, z (then second)
```

### Comparison

| merge | concat |
|-------|--------|
| Subscribes to all at once | One at a time |
| Values interleave | Values in order |
| Use for parallel operations | Use for sequential operations |

### Other Combination Operators
```ts
combineLatest([a$, b$])  // Emit array of latest from each, when any emits
zip(a$, b$)              // Pair values by index: [a1,b1], [a2,b2]...
forkJoin([a$, b$])       // Wait for all to complete, emit array of final values
```

---

## 9. Higher-Order Mapping Operators

### What are they?
When your `map` function returns an Observable, you get nested Observables. Higher-order mapping operators flatten these automatically. Each handles the inner Observables differently.

### mergeMap (flatMap)
Subscribes to all inner Observables in parallel. Values interleave. Use when order doesn't matter and you want maximum concurrency.

```ts
clicks$.pipe(
  mergeMap(click => fetchData(click.id))  // Multiple fetches run in parallel
)
```

### concatMap
Waits for each inner Observable to complete before subscribing to the next. Values stay in order. Use when order matters.

```ts
ids$.pipe(
  concatMap(id => saveToServer(id))  // Saves happen one at a time, in order
)
```

### switchMap
Cancels the previous inner Observable when a new one starts. Only the latest matters. Use for search/autocomplete where old results are irrelevant.

```ts
searchInput$.pipe(
  debounceTime(300),
  switchMap(query => searchAPI(query))  // Cancels previous search when new query comes
)
```

---

## 10. Subscription Management

### Why it matters
Subscriptions that aren't cleaned up cause memory leaks. Always unsubscribe when you're done, especially in components that mount/unmount.

```ts
// Store subscription reference
const subscription = observable$.subscribe(value => console.log(value))

// Clean up when done
subscription.unsubscribe()

// In Vue/React - clean up on unmount
onUnmounted(() => {
  subscription.unsubscribe()
})
```

### takeUntil Pattern
A common pattern is using `takeUntil` with a destroy signal. When the signal emits, the subscription automatically completes.

```ts
const destroy$ = new Subject<void>()

observable$.pipe(
  takeUntil(destroy$)
).subscribe(...)

// On component destroy
destroy$.next()
destroy$.complete()
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| What is one-way data flow? | Data flows: Action -> Reducer -> Store -> View. Changes only happen through actions |
| What is a reducer? | Pure function `(state, action) => newState` that calculates new state from current state and action |
| What is a slice? | Redux Toolkit bundle of state + reducers + auto-generated actions for one feature |
| When use thunks? | For async operations (API calls, delays) since reducers must be pure |
| Observable vs Promise? | Observable: multiple values, lazy, cancellable. Promise: single value, eager |
| Subject vs Observable? | Subject can both receive and emit values. Observable only emits |
| BehaviorSubject vs Subject? | BehaviorSubject holds current value, new subscribers get it immediately |
| merge vs concat? | merge runs parallel (interleaved output), concat runs sequential (ordered output) |
| mergeMap vs switchMap? | mergeMap keeps all inner Observables; switchMap cancels previous when new one starts |
| Why unsubscribe? | Prevent memory leaks - subscriptions persist until explicitly unsubscribed |

---

## Where It's Applied in Assignment 5

| Concept | File | Location |
|---------|------|----------|
| **`configureStore`** | `client/src/store.ts:1,4` | Creates Redux store with `uno` reducer |
| **`createSlice`** | `client/src/features/uno/unoSlice.ts:38` | Defines uno slice with name, initialState, and reducers |
| **`PayloadAction`** | `client/src/features/uno/unoSlice.ts:1,42-57` | Type annotations for all reducer action payloads |
| **Immer Mutations** | `client/src/features/uno/unoSlice.ts:41-67` | `state.game = action.payload`, `state.connected = true` - looks like mutation but Immer handles immutability |
| **Action Creators** | `client/src/features/uno/unoSlice.ts:69` | Exported: `setGame`, `setPlayerIndex`, `setRoomId`, `setRooms`, `setConnected`, `setDisconnected`, `setPlayerName` |
| **`useDispatch`** | `client/src/App.tsx:2,15` | Gets dispatch function to send actions to store |
| **`useSelector`** | `client/src/App.tsx:2,16` | Selects `game`, `playerIndex`, `connected`, `rooms`, `roomId`, `playerName` from `state.uno` |
| **`Provider`** | `client/src/main.tsx:3,12` | Wraps app to provide Redux store to all components |
| **`webSocket`** | `client/src/rx/serverBridge.ts:1,42` | Creates WebSocketSubject connecting to `ws://localhost:3001` |
| **Observable `subscribe`** | `client/src/rx/serverBridge.ts:44-71` | Subscribes with `next`, `error`, and `complete` handlers |
| **`unsubscribe`** | `client/src/rx/serverBridge.ts:76` | Cleanup to close WebSocket subscription |
| **Subject `.next()`** | `client/src/rx/serverBridge.ts:74` | Sends OutgoingMessage to server via WebSocketSubject |
| **Subject `.complete()`** | `client/src/rx/serverBridge.ts:77` | Completes the observable stream on disconnect |
| **Redux + RxJS Bridge** | `client/src/rx/serverBridge.ts:44-71` | `connectServerStream` dispatches Redux actions from RxJS websocket messages |
