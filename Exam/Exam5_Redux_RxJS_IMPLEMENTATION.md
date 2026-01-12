# Assignment 5: Redux & RxJS - Implementation Guide

## File Structure Overview

```
client/
├── src/
│   ├── store.ts               ← Redux store configuration
│   ├── features/
│   │   └── uno/
│   │       └── unoSlice.ts   ← Redux slice for game state
│   ├── rx/
│   │   └── serverBridge.ts   ← RxJS WebSocket bridge
│   ├── App.tsx                ← Main component using Redux
│   └── components/
```

# REDUX PART

## Key Implementation: Store Setup (`store.ts`)

**Single source of truth**

```ts
// Lines 1-11: Configure Redux store
import { configureStore } from "@reduxjs/toolkit";
import unoReducer from "./features/uno/unoSlice";

export const store = configureStore({
  reducer: {
    uno: unoReducer, // uno slice mounted here
  },
});

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Key Implementation: Slice (`features/uno/unoSlice.ts`)

**State + Reducers + Actions in one place**

### State Type & Initial State

```ts
// Lines 5-37: Define state shape
type UnoState = {
  game: Game | null;
  playerIndex: number;
  roomId: string | null;
  rooms: AvailableRoom[];
  connected: boolean;
  playerName: string | null;
};

const initialState: UnoState = {
  game: null,
  playerIndex: 0,
  roomId: null,
  rooms: [],
  connected: false,
  playerName: null,
};
```

### Create Slice with Reducers

```ts
// Lines 38-69: Redux Toolkit slice
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const unoSlice = createSlice({
  name: "uno",
  initialState,
  reducers: {
    // Reducer: (state, action) => void (Immer makes it look mutable)
    setGame: (state, action: PayloadAction<Game>) => {
      state.game = action.payload; // Immer handles immutability!
    },

    setPlayerIndex: (state, action: PayloadAction<number>) => {
      state.playerIndex = action.payload;
    },

    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },

    setRooms: (state, action: PayloadAction<AvailableRoom[]>) => {
      state.rooms = action.payload;
    },

    setConnected: (state) => {
      state.connected = true;
    },

    setDisconnected: (state) => {
      state.connected = false;
    },

    setPlayerName: (state, action: PayloadAction<string>) => {
      state.playerName = action.payload;
    },
  },
});

// Export auto-generated action creators
export const {
  setGame,
  setPlayerIndex,
  setRoomId,
  setRooms,
  setConnected,
  setDisconnected,
  setPlayerName,
} = unoSlice.actions;

// Export reducer
export default unoSlice.reducer;
```

**Key:** Looks like mutation but Immer makes it immutable!

### Using in Components (`App.tsx`)

```ts
// Lines 2-4: Import hooks
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

function App() {
  // Get dispatch function
  const dispatch = useDispatch<AppDispatch>()

  // Select state from store
  const game = useSelector((state: RootState) => state.uno.game)
  const playerIndex = useSelector((state: RootState) => state.uno.playerIndex)
  const connected = useSelector((state: RootState) => state.uno.connected)
  const rooms = useSelector((state: RootState) => state.uno.rooms)

  // Dispatch actions
  function handleJoinRoom(roomId: string) {
    dispatch(setRoomId(roomId))
  }

  function updateGame(newGame: Game) {
    dispatch(setGame(newGame))
  }

  return <div>...</div>
}
```

## Redux Data Flow

```
┌─────────┐                  ┌─────────┐
│  View   │  dispatch(action) │ Reducer │
│         ├─────────────────→ │         │
│         │                   │         │
│         │                   │ returns │
│         │     new state     │   new   │
│         │ ←─────────────────┤  state  │
│         │                   │         │
│ re-render                   └─────────┘
└─────────┘
```

### Example Flow: Playing a Card

```ts
// 1. User clicks card
<button onClick={() => playCard(2)}>Play</button>

// 2. Component dispatches action
function playCard(index: number) {
  // Send to server via RxJS (see below)
  sendMessage({ type: 'PLAY_CARD', cardIndex: index })
}

// 3. Server responds with new game state
// RxJS receives it

// 4. Dispatch Redux action
dispatch(setGame(newGameFromServer))

// 5. Reducer updates state (Immer makes it immutable)
setGame: (state, action) => {
  state.game = action.payload
}

// 6. Component re-renders with new game
const game = useSelector(state => state.uno.game)
```

# RxJS PART

## Key Implementation: WebSocket Bridge (`rx/serverBridge.ts`)

**Connecting Redux with RxJS WebSocket**

### Setup WebSocketSubject

```ts
// Lines 1-42: Import and create WebSocket
import { webSocket } from "rxjs/webSocket";
import type { AppDispatch } from "../store";
import {
  setGame,
  setRooms,
  setConnected,
  setDisconnected,
} from "../features/uno/unoSlice";

type OutgoingMessage =
  | { type: "CREATE_ROOM"; playerName: string }
  | { type: "JOIN_ROOM"; roomId: string; playerName: string }
  | { type: "PLAY_CARD"; cardIndex: number }
  | { type: "DRAW_CARD" }
  | { type: "SAY_UNO" };

type IncomingMessage =
  | { type: "GAME_STATE"; game: Game }
  | { type: "ROOMS_LIST"; rooms: AvailableRoom[] }
  | { type: "ERROR"; message: string };

// Create WebSocketSubject
const ws$ = webSocket<OutgoingMessage | IncomingMessage>({
  url: "ws://localhost:3001",
});
```

### Connect Stream to Redux

```ts
// Lines 44-71: Subscribe and dispatch to Redux
export function connectServerStream(dispatch: AppDispatch) {
  const subscription = ws$.subscribe({
    next: (message: IncomingMessage) => {
      // Handle incoming messages by dispatching Redux actions
      switch (message.type) {
        case "GAME_STATE":
          dispatch(setGame(message.game));
          break;

        case "ROOMS_LIST":
          dispatch(setRooms(message.rooms));
          break;

        case "ERROR":
          console.error("Server error:", message.message);
          break;
      }
    },

    error: (err) => {
      console.error("WebSocket error:", err);
      dispatch(setDisconnected());
    },

    complete: () => {
      console.log("WebSocket closed");
      dispatch(setDisconnected());
    },
  });

  dispatch(setConnected());

  return subscription;
}
```

### Send Messages

```ts
// Lines 73-76: Send to server
export function sendMessage(message: OutgoingMessage) {
  ws$.next(message); // Subject.next() sends data
}

// Usage in component:
function handlePlayCard(index: number) {
  sendMessage({ type: "PLAY_CARD", cardIndex: index });
}
```

### Cleanup

```ts
// Lines 77-80: Unsubscribe
export function disconnectServerStream(subscription: any) {
  subscription.unsubscribe();
  ws$.complete();
}
```

## Observable Concepts

### Observable = Stream of Values

```ts
// Create observable that emits 3 values
const numbers$ = new Observable((subscriber) => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

// Subscribe to receive values
numbers$.subscribe({
  next: (value) => console.log(value), // Called 3 times
  complete: () => console.log("Done"),
});
```

### WebSocketSubject = Both Observable & Observer

```ts
const ws$ = webSocket("ws://localhost:3001");

// Can subscribe (it's an Observable)
ws$.subscribe((message) => console.log(message));

// Can send (it's an Observer/Subject)
ws$.next({ type: "PING" });
```

## RxJS Operators (If Used)

### Common Operators

```ts
import { map, filter, debounceTime } from "rxjs/operators";

// Transform values
ws$
  .pipe(
    filter((msg) => msg.type === "GAME_STATE"), // Only game states
    map((msg) => msg.game), // Extract game
    debounceTime(300) // Wait 300ms between updates
  )
  .subscribe((game) => {
    dispatch(setGame(game));
  });
```

### Merge vs Concat

```ts
import { merge, concat } from 'rxjs'

// Merge: Parallel, interleaved
merge(stream1$, stream2$).subscribe(...)
// Emits from both as they arrive

// Concat: Sequential
concat(stream1$, stream2$).subscribe(...)
// Wait for stream1 to complete before stream2
```

## Integration: Redux + RxJS Flow

```
┌─────────────┐
│ Component   │
│             │
│ dispatches  │
│  actions    │
└──────┬──────┘
       │
       ↓
┌──────────────┐     ┌─────────────┐
│ Redux Store  │     │ RxJS Stream │
│              │     │             │
│ State:       │←────│ ws$.next()  │
│   game       │ new │  sends      │
│   rooms      │state│             │
│   connected  │     │ ws$.subscribe()
└──────────────┘     │  receives   │
                     └─────────────┘
                            ↕
                      WebSocket Server
```

### Example: Full Flow

```tsx
// App.tsx: Setup
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectServerStream, sendMessage } from "./rx/serverBridge";

function App() {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.uno.game);

  useEffect(() => {
    // Connect RxJS to Redux
    const subscription = connectServerStream(dispatch);

    // Cleanup on unmount
    return () => subscription.unsubscribe();
  }, [dispatch]);

  function playCard(index: number) {
    // Send via RxJS
    sendMessage({ type: "PLAY_CARD", cardIndex: index });

    // Server responds → ws$ receives → dispatches to Redux → UI updates
  }

  return (
    <div>
      {game?.currentRound.hands[game.playerIndex].map((card, i) => (
        <Card key={i} card={card} onClick={() => playCard(i)} />
      ))}
    </div>
  );
}
```

## Common Exam Questions for Assignment 5

**Q: "Explain Redux one-way data flow"**

```
View → dispatch(action) → Reducer → new State → View re-renders
```

- **Show:** `App.tsx` dispatch calls
- **Show:** `unoSlice.ts` reducers
- **Explain:** "Actions describe what happened. Reducers calculate new state. Store notifies components. They re-render."

**Q: "What's a reducer and why must it be pure?"**

- **Show:** `unoSlice.ts` reducers
- **Explain:** "Reducer is `(state, action) => newState`. Must be pure (no side effects, deterministic) so Redux can time-travel, hot-reload, and make state changes predictable."

**Q: "Show me how Redux Toolkit simplifies Redux"**

- **Before:** Separate action types, action creators, reducer switch
- **After (RTK):** `createSlice` generates actions automatically, Immer lets you write 'mutations'
- **Show:** `unoSlice.ts` - looks like mutation but produces immutable updates

**Q: "What's the difference between Observable and Promise?"**
| Observable | Promise |
|------------|---------|
| Multiple values over time | Single value |
| Lazy (starts on subscribe) | Eager (starts immediately) |
| Cancellable (unsubscribe) | Not cancellable |

**Q: "How do you connect RxJS WebSocket to Redux?"**

- **Show:** `serverBridge.ts` lines 44-71
- **Explain:** "WebSocket is an Observable. Subscribe to it and dispatch Redux actions when messages arrive. This bridges reactive streams with Redux state."

**Q: "Why unsubscribe from Observables?"**

- **Show:** `App.tsx` cleanup in useEffect
- **Explain:** "Subscriptions keep running until unsubscribed. Without cleanup, you get memory leaks - multiple subscriptions, event listeners pile up."

**Q: "What's a Subject?"**

- **Explain:** "Subject is both Observable (can subscribe to it) and Observer (can send values to it). WebSocketSubject uses this - we subscribe to receive messages AND call .next() to send messages."

## Memory Aid for Oral Exam

**Redux Flow:**

1. **Show store setup** - `store.ts`
2. **Show slice** - `unoSlice.ts` with reducers
3. **Show component** - `App.tsx` using `useSelector` and `useDispatch`
4. **Trace an action:** Click → dispatch → reducer → new state → re-render

**RxJS Flow:**

1. **Show WebSocket setup** - `serverBridge.ts`
2. **Show subscription** - dispatches to Redux
3. **Show sending** - `ws$.next(message)`
4. **Explain:** "Bridge between reactive streams and Redux"

**Key Principles:**

- **Redux:** One-way flow, pure reducers, immutable state
- **RxJS:** Streams of values, operators transform streams, must unsubscribe
- **Integration:** RxJS receives → dispatch Redux → components update
