# Redux & RxJS - Quick Reference

# REDUX

## One-Way Data Flow

```
View → dispatch(action) → Reducer → Store → View
```

Data moves in single direction - predictable & traceable

## Reducers

**Signature:** `(state, action) => newState`

**Rules:**

1. Pure (no side effects)
2. Immutable (never modify state)
3. Deterministic (same inputs = same output)

```ts
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + 1 }; // New object!
    default:
      return state;
  }
}
```

## Slices (Redux Toolkit)

Bundle state + reducers + action creators

```ts
const unoSlice = createSlice({
  name: "uno",
  initialState: { hand: [], turn: 0 },
  reducers: {
    setHand: (state, action) => {
      state.hand = action.payload; // Immer makes this immutable
    },
    playCard: (state, action) => {
      state.hand = state.hand.filter((_, i) => i !== action.payload);
    },
  },
});

// Auto-generated action creators
export const { setHand, playCard } = unoSlice.actions;
```

### Using in Components

```ts
const hand = useSelector((state) => state.uno.hand); // Read
const dispatch = useDispatch();
dispatch(playCard(2)); // Write
```

## Thunks

Handle async operations (reducers must be pure)

### Basic Thunk

```ts
const playCardThunk = (index) => {
  return async (dispatch, getState) => {
    dispatch(playCard(index)); // Optimistic update
    try {
      await api.playCard(getState().gameId, index);
    } catch (error) {
      dispatch(setError(error)); // Rollback
    }
  };
};
```

### createAsyncThunk

```ts
const fetchGame = createAsyncThunk("uno/fetchGame", async (gameId) => {
  const response = await fetch(`/api/games/${gameId}`);
  return response.json();
});

// Handle in slice
extraReducers: (builder) => {
  builder
    .addCase(fetchGame.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchGame.fulfilled, (state, action) => {
      state.game = action.payload;
    })
    .addCase(fetchGame.rejected, (state, action) => {
      state.error = action.payload;
    });
};
```

# RxJS

## Observables

Stream of values over time (lazy, cancellable)

```ts
const numbers$ = new Observable((subscriber) => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
});

numbers$.subscribe({
  next: (v) => console.log(v),
  error: (e) => console.error(e),
  complete: () => console.log("done"),
});
```

### Observable vs Promise

| Observable      | Promise         |
| --------------- | --------------- |
| Multiple values | Single value    |
| Lazy            | Eager           |
| Cancellable     | Not cancellable |

### Creating Observables

```ts
of(1, 2, 3); // Emit values
from([1, 2, 3]); // From array
interval(1000); // Every second
fromEvent(btn, "click"); // From events
webSocket("ws://..."); // WebSocket stream
```

## Subjects

Both Observable (can be subscribed) and Observer (can emit values)

### Subject

```ts
const subject = new Subject();
subject.subscribe((v) => console.log(v));
subject.next(1); // Broadcasts to all subscribers
```

### BehaviorSubject

Has "current value" - new subscribers get it immediately

```ts
const subject = new BehaviorSubject(0); // Initial value required
subject.getValue(); // Get current value
```

### ReplaySubject

Replays buffer of previous values to new subscribers

```ts
const subject = new ReplaySubject(2); // Buffer last 2
subject.next(1);
subject.next(2);
subject.next(3);
// New subscriber gets: 2, 3
```

## Operators

Transform Observables using `pipe()`

### Transformation

```ts
map((x) => x * 2); // Transform each
scan((acc, x) => acc + x, 0); // Accumulate (like reduce)
```

### Filtering

```ts
filter((x) => x > 10); // Keep matching
take(5); // Take first 5
takeUntil(stop$); // Until signal
debounceTime(300); // Wait for silence
distinctUntilChanged(); // Skip duplicates
```

### Error Handling

```ts
retry(3); // Retry on error
catchError((err) => of(0)); // Fallback
```

### Example Pipeline

```ts
clicks$.pipe(
  debounceTime(300),           // Wait for pause
  map(e => e.target.value),    // Extract value
  distinctUntilChanged(),      // Skip duplicates
  switchMap(q => searchAPI(q)) // Cancel old searches
).subscribe(results => ...)
```

## Combination Operators

### merge - Parallel (Interleaved)

```ts
merge(fast$, slow$);
// Outputs: fast0, slow0, fast1, fast2, slow1, slow2
```

### concat - Sequential (Ordered)

```ts
concat(first$, second$);
// Outputs: a, b, c (first completes), x, y, z
```

### Others

```ts
combineLatest([a$, b$]); // Latest from each when any emits
zip(a$, b$); // Pair by index: [a1,b1], [a2,b2]
forkJoin([a$, b$]); // Wait for all, emit final values
```

## Higher-Order Mapping

When `map` returns Observable, use these to flatten:

### mergeMap - Parallel

```ts
clicks$.pipe(
  mergeMap((c) => fetchData(c.id)) // Multiple fetches in parallel
);
```

### concatMap - Sequential

```ts
ids$.pipe(
  concatMap((id) => save(id)) // One at a time, ordered
);
```

### switchMap - Cancel Previous

```ts
search$.pipe(
  debounceTime(300),
  switchMap((q) => searchAPI(q)) // Cancels old searches
);
```

## Subscription Management

Always unsubscribe to prevent memory leaks

```ts
const sub = observable$.subscribe(...)
sub.unsubscribe()  // Cleanup

// In components
onUnmounted(() => sub.unsubscribe())
```

### takeUntil Pattern

```ts
const destroy$ = new Subject()

observable$.pipe(
  takeUntil(destroy$)
).subscribe(...)

// On destroy
destroy$.next()
destroy$.complete()
```

## Quick Decisions

**State management?**

- Actions → dispatch
- Async → thunks
- Side effects → NOT in reducers

**Which Subject?**

- Just broadcast → Subject
- Need current value → BehaviorSubject
- Replay history → ReplaySubject

**Which combinator?**

- Parallel, any order → merge / mergeMap
- Sequential, ordered → concat / concatMap
- Cancel previous → switchMap

**Operators?**

- Transform values → map
- Filter values → filter, take, debounce
- Handle errors → retry, catchError
- Combine streams → merge, concat, combineLatest

## Memory Aid

**Redux Flow:**

```
Action → Reducer → State → View → Action
(one-way circle)
```

**RxJS Core:**

1. **Observable** = Stream of values
2. **Operators** = Transform streams
3. **Subscribe** = Consume values
4. **Unsubscribe** = Cleanup!

**Hot vs Cold:**

- Cold (Observable): Starts on subscribe
- Hot (Subject): Always running
