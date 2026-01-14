# Exam 5: Redux & RxJS - Assignment 5

**Core Goal:** Predictable state changes and event-driven data flows.

---

## One-Way Data Flow

**Concept:** State flows in a single direction: action → reducer → new state → view. The view never directly modifies state - it dispatches actions describing what happened, and reducers compute the new state. This makes state changes predictable and traceable.

**The Flow:**
```
User clicks → dispatch(action) → reducer → new state → view re-renders

VIEW → ACTION → REDUCER → STORE → VIEW (loop)
```

**Why it matters:**
- **Predictable**: Every state change goes through the same path
- **Traceable**: Log all actions to see exactly how state evolved
- **Debuggable**: Time-travel debugging - step back through previous states
- **Testable**: Dispatch action, check new state

**Assignment 5 Example:**
```ts
// client/src/views/GamePlay.tsx - User plays a card in the view
export default function GamePlayView() {
  const gameState = useGameState();  // Custom hook gets state from Redux
  const { send } = useServerConnection();  // Custom hook for WebSocket
  const { handleCardClick } = useGameActions(send, gameState.round, gameState.canAct);

  // User clicks card → dispatch through custom hook
  return <HandCard onClick={() => handleCardClick(cardIndex, card)} />;
}

// client/src/hooks/useGameActions.ts - Action handler
export function useGameActions(send, round, canAct) {
  const handleCardClick = useCallback((index: number, card: Card) => {
    if (!round || !canAct) return;
    send({ type: 'play', index });  // Send to server via WebSocket
  }, [round, canAct, send]);
  
  return { handleCardClick };
}

// client/src/features/uno/unoSlice.ts - Reducer handles server response
reducers: {
  setGame: (state, action: PayloadAction<Game>) => {
    state.game = action.payload;  // Update game state from server
  }
}

// Store updates, view re-renders with new game state
const { game } = useSelector((state: RootState) => state.uno);
```

---

## Reducers

**Concept:** Reducers are pure functions that compute new state based on the current state and an action: `(state, action) => newState`. They're the only place where state changes happen in Redux.

**Reducer Rules:**
1. **Pure**: No side effects (no API calls, no random values, no Date.now())
2. **Immutable**: Never modify state directly - always return a new object
3. **Deterministic**: Same inputs always produce same output

**Why pure?**
- **Predictable**: State changes are deterministic and traceable
- **Testable**: No mocks needed - just pass state + action, verify new state
- **Time-travel**: Can replay actions to recreate any state
- **Debuggable**: Can log every state change

**Assignment 5 Example:**
```ts
// client/src/features/uno/unoSlice.ts
// Redux Toolkit uses Immer internally - looks like mutation but creates new state
const unoSlice = createSlice({
  name: 'uno',
  initialState: {
    game: sanitizeGame(Uno.createGame({ players: ['Alice', 'Bob'], targetScore: 200 })),
    playerIndex: undefined,
    connected: false,
    roomId: undefined,
    rooms: [],
    playerName: undefined
  },
  reducers: {
    setGame: (state, action: PayloadAction<Game>) => {
      state.game = action.payload as any;  // Immer makes this immutable
    },
    setPlayerIndex: (state, action: PayloadAction<number | undefined>) => {
      state.playerIndex = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;  // Immer handles immutability
    },
    setRoomId: (state, action: PayloadAction<string | undefined>) => {
      state.roomId = action.payload;
    },
    setRooms: (state, action: PayloadAction<RoomSummary[]>) => {
      state.rooms = action.payload;
    },
    setPlayerName: (state, action: PayloadAction<string | undefined>) => {
      state.playerName = action.payload;
    },
    setDisconnected: (state) => {
      state.connected = false;
    }
  }
});

// Without Immer (manual immutability):
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };  // New object
    default:
      return state;
  }
}
```

---

## Slices

**Concept:** A slice bundles related state, reducers, and auto-generated action creators together in one place. Instead of writing actions and reducers separately, you define them together. Redux Toolkit generates action creators automatically.

**Why slices?**
- **Less boilerplate**: No manual action type constants or action creator functions
- **Co-located**: State, reducers, and actions in one file
- **Type-safe**: TypeScript knows action payload types
- **Auto-generated actions**: `createSlice` generates action creators automatically

**Assignment 5 Example:**
```ts
// client/src/features/uno/unoSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const unoSlice = createSlice({
  name: 'uno',  // Prefix for action types: 'uno/setGame', 'uno/cardPlayed'
  
  initialState: {
    game: null as Game | null,
    playerIndex: undefined as number | undefined,
    roomId: undefined as string | undefined,
    rooms: [] as RoomInfo[],
    connected: false,
    playerName: ''
  },
  
  reducers: {
    setGame: (state, action: PayloadAction<Game>) => {
      state.game = action.payload;
    },
    setPlayerIndex: (state, action: PayloadAction<number>) => {
      state.playerIndex = action.payload;
    },
    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },
    setRooms: (state, action: PayloadAction<RoomInfo[]>) => {
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
    }
  }
});

// Auto-generated action creators
export const { 
  setGame, 
  setPlayerIndex, 
  setRoomId, 
  setRooms, 
  setConnected, 
  setDisconnected, 
  setPlayerName 
} = unoSlice.actions;

export default unoSlice.reducer;

// Usage in views with custom hooks
// client/src/views/GamePlay.tsx
export default function GamePlayView() {
  const gameState = useGameState();  // Custom hook encapsulates useSelector
  const { send } = useServerConnection();
  const { handleCardClick } = useGameActions(send, gameState.round, gameState.canAct);
  
  return (
    <div className="game-play-container">
      <GameHeader isMyTurn={gameState.isMyTurn} />
      <PlayersList players={gameState.round?.players} />
    </div>
  );
}

// client/src/hooks/useGameState.ts - Encapsulates Redux selectors
export function useGameState() {
  const { game, playerIndex, connected, roomId, rooms } = useSelector(
    (state: RootState) => state.uno
  );
  const round = game.currentRound;
  
  // Derived state computed here
  const currentPlayer = round?.playerInTurn ?? -1;
  const isMyTurn = playerIndex === currentPlayer;
  
  return { game, round, playerIndex, connected, roomId, rooms, isMyTurn };
}
```

---

## Thunks (Not Used in Assignment 5)

**Concept:** Thunks are functions that return functions, allowing async logic in Redux. However, **Assignment 5 uses RxJS for async operations instead of thunks**.

**Why Assignment 5 uses RxJS instead:**
- **Streaming**: WebSocket requires continuous bidirectional communication
- **Operators**: RxJS provides powerful stream transformations (filter, map, debounce)
- **Cancellation**: Easy to unsubscribe and clean up connections
- **Better fit**: WebSocket is naturally a stream, not a one-time async operation

**Assignment 5 Example (RxJS approach):**
```ts
// client/src/rx/serverBridge.ts
import { webSocket } from 'rxjs/webSocket';
import { filter, tap, catchError } from 'rxjs/operators';

export function connectServerStream(dispatch: AppDispatch, wsUrl: string): ServerConnection {
  const ws$ = webSocket<IncomingMessage>({
    url: wsUrl,
    openObserver: {
      next: () => {
        console.log('WebSocket connected');
        dispatch(setConnected(true));
      }
    },
    closeObserver: {
      next: () => {
        console.log('WebSocket closed');
        dispatch(setDisconnected());
      }
    }
  });

  // Subscribe to WebSocket Observable - dispatches Redux actions
  const subscription = ws$.pipe(
    filter((msg): msg is IncomingMessage => msg !== null),
    tap((msg) => console.log('Received:', msg.type)),
    catchError((error) => {
      console.error('WebSocket error:', error);
      dispatch(setDisconnected());
      throw error;
    })
  ).subscribe({
    next: (msg) => handleIncomingMessage(msg, dispatch),
    error: (err) => console.error('WebSocket error:', err)
  });

  // Helper to handle different message types
  function handleIncomingMessage(msg: IncomingMessage, dispatch: AppDispatch) {
    if (msg.type === 'game-state') {
      dispatch(setGame(sanitizeGame(msg.game)));
      dispatch(setPlayerIndex(msg.playerIndex));
    }
    if (msg.type === 'rooms') {
      dispatch(setRooms(msg.rooms));
    }
    if (msg.type === 'joined') {
      dispatch(setRoomId(msg.roomId));
    }
  }

  return {
    send: (message: OutgoingMessage) => ws$.next(message),
    disconnect: () => subscription.unsubscribe(),
    isConnected: !subscription.closed
  };
}

// client/src/hooks/useServerConnection.ts
// Custom hook wraps RxJS connection
export function useServerConnection() {
  const dispatch = useDispatch<AppDispatch>();
  const [connection, setConnection] = useState<ServerConnection | null>(null);

  useEffect(() => {
    const conn = connectServerStream(dispatch, 'ws://localhost:3001');
    setConnection(conn);
    
    return () => conn.disconnect();  // Cleanup
  }, [dispatch]);

  return {
    send: connection?.send || (() => {}),
    isConnected: connection?.isConnected || false
  };
}
```

---

## Reactive Programming

**Concept:** Reactive programming models data as streams over time. Instead of handling individual events, you work with streams of events that flow through time. You describe transformations on the stream, and the system applies them as values arrive.

**Key ideas:**
- **Streams over time**: Data arrives continuously, not as one-time values
- **Declarative**: Describe WHAT transformations to apply, not HOW to apply them
- **Composable**: Chain operators to build complex transformations
- **Push-based**: Data is pushed to subscribers when available (vs pull-based polling)

**Why reactive?**
- **Event-driven**: Perfect for UI events, WebSocket messages, timers
- **Unified model**: Same API for clicks, HTTP, WebSockets, intervals
- **Powerful operators**: Transform, filter, combine streams easily
- **Cancellable**: Unsubscribe to stop receiving values

**Assignment 5 Example:**
```ts
// client/src/rx/serverBridge.ts
import { webSocket } from 'rxjs/webSocket';

// WebSocket as Observable stream
const ws$ = webSocket<IncomingMessage>('ws://localhost:3001');

// Subscribe to stream - receives values over time
ws$.subscribe({
  next: (msg) => {
    // Handle each message as it arrives
    if (msg.type === 'GAME_STATE') {
      dispatch(setGame(msg.game));
    }
    if (msg.type === 'ROOMS_LIST') {
      dispatch(setRooms(msg.rooms));
    }
  },
  error: (err) => console.error('WebSocket error:', err),
  complete: () => console.log('WebSocket closed')
});

// Send message through stream
ws$.next({ type: 'JOIN_ROOM', roomId: 'abc123' });

// Stream-based thinking: UI events as streams
const clicks$ = fromEvent(button, 'click');
const searchInput$ = fromEvent(input, 'input').pipe(
  map(e => e.target.value),
  debounceTime(300),  // Wait for 300ms pause
  distinctUntilChanged()  // Skip duplicates
);
```

---

## Observables and Subjects

**Concept:** 
- **Observable**: A stream of values over time. Unlike Promises (one value), Observables emit multiple values. They're lazy - don't start until you subscribe.
- **Subject**: Both Observable and Observer - can receive values from outside and broadcast to multiple subscribers (multicasting).

**Observable characteristics:**
- **Multiple values**: Can emit 0, 1, or many values over time
- **Lazy**: Only starts when you subscribe
- **Cancellable**: Unsubscribe to stop receiving values
- **Powerful operators**: Transform, filter, combine streams

**Subject types:**
- **Subject**: Values only to current subscribers
- **BehaviorSubject**: New subscribers get current value immediately
- **ReplaySubject**: New subscribers get buffered previous values

**Assignment 5 Example:**
```ts
// client/src/rx/serverBridge.ts
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

// WebSocket as Observable - emits messages over time
const ws$: WebSocketSubject<IncomingMessage> = webSocket('ws://localhost:3001');

// Subscribe to Observable - handle each message as it arrives
ws$.subscribe({
  next: (msg: IncomingMessage) => {
    // Handle message types
    if (msg.type === 'GAME_STATE') {
      dispatch(setGame(msg.game));
    }
    if (msg.type === 'PLAYER_INDEX') {
      dispatch(setPlayerIndex(msg.playerIndex));
    }
    if (msg.type === 'ROOMS_LIST') {
      dispatch(setRooms(msg.rooms));
    }
    if (msg.type === 'ROOM_CREATED') {
      dispatch(setRoomId(msg.roomId));
    }
    if (msg.type === 'ROOM_JOINED') {
      dispatch(setRoomId(msg.roomId));
    }
  },
  error: (err) => {
    console.error('WebSocket error:', err);
    dispatch(setDisconnected());
  },
  complete: () => {
    console.log('WebSocket connection closed');
    dispatch(setDisconnected());
  }
});

// WebSocketSubject is also a Subject - can send values
ws$.next({ type: 'JOIN_ROOM', roomId: 'abc123' });  // Send message to server
ws$.next({ type: 'PLAY_CARD', cardIndex: 2 });

// Cleanup - unsubscribe to prevent memory leaks
const subscription = ws$.subscribe(...);
subscription.unsubscribe();  // Close WebSocket connection

// Observable vs Promise comparison
const promise = fetch('/api/data');  // Eager - starts immediately, 1 value
const observable = fromEvent(button, 'click');  // Lazy - starts on subscribe, many values
```

---

## Pipes and Operators

**Concept:** Operators transform Observables. Chain them with `pipe()` to build transformation pipelines. Each operator takes an Observable, transforms it, returns a new Observable.

**Why operators?**
- **Declarative**: Describe WHAT transformations, not HOW to implement them
- **Composable**: Chain many operators together
- **Reusable**: Same operators work with any Observable

**Common patterns:**
- **Transformation**: `map`, `scan`
- **Filtering**: `filter`, `take`, `debounceTime`, `distinctUntilChanged`
- **Combination**: `merge` (parallel), `concat` (sequential), `combineLatest`, `zip`
- **Error handling**: `retry`, `catchError`

**Assignment 5 Example:**
```ts
// client/src/rx/serverBridge.ts - Real usage
import { webSocket } from 'rxjs/webSocket';

const ws$ = webSocket('ws://localhost:3001');

// Simple subscription - no operators needed
ws$.subscribe({
  next: (msg) => handleMessage(msg),
  error: (err) => console.error(err)
});

// More complex example with operators (if needed):
import { filter, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Filter only GAME_STATE messages
ws$.pipe(
  filter(msg => msg.type === 'GAME_STATE'),
  map(msg => msg.game)
).subscribe(game => dispatch(setGame(game)));

// Search input example - debounce and filter duplicates
searchInput$.pipe(
  map(e => e.target.value),
  debounceTime(300),  // Wait 300ms after typing stops
  distinctUntilChanged()  // Skip if same as previous
).subscribe(query => searchAPI(query));

// merge vs concat
import { merge, concat, of, interval } from 'rxjs';

// merge - parallel, interleaved output
const fast$ = interval(500).pipe(take(2));
const slow$ = interval(800).pipe(take(2));
merge(fast$, slow$).subscribe(console.log);
// Output: fast0 (500ms), slow0 (800ms), fast1 (1000ms), slow1 (1600ms)

// concat - sequential, ordered output
concat(of('a', 'b'), of('x', 'y')).subscribe(console.log);
// Output: a, b (first completes), then x, y
```

---

## Redux + RxJS Integration

**Concept:** Assignment 5 combines Redux and RxJS for complementary purposes:

- **Redux**: Manages application state (game, players, room info)
- **RxJS**: Handles WebSocket stream (messages over time)
- **Integration**: RxJS dispatches Redux actions when messages arrive
- **Shared Types**: Protocol types centralized in `domain/src/types/messages.ts`

**Why this combination?**
- **Predictable state**: Redux ensures state changes are traceable
- **Stream processing**: RxJS handles continuous WebSocket events
- **Time-travel debugging**: Redux DevTools work with predictable state changes
- **Separation of concerns**: State management vs event handling
- **Type safety**: Centralized protocol types ensure client/server alignment

---

## File Structure

```
Assignment5/
├── client/
│   └── src/
│       ├── App.tsx                     # Layout wrapper with <Outlet />
│       ├── main.tsx                    # RouterProvider with Redux Provider
│       ├── store.ts                    # configureStore with uno reducer
│       ├── router/
│       │   └── index.tsx              # createBrowserRouter with routes
│       ├── views/                     # Page-level components
│       │   ├── Login.tsx              # Login with useServerConnection
│       │   ├── Lobby.tsx              # Room list with useSelector
│       │   ├── GameRouter.tsx         # Game state router
│       │   ├── GamePlay.tsx           # Active gameplay
│       │   ├── GameWaiting.tsx        # Waiting room
│       │   └── GameOver.tsx           # Results screen
│       ├── components/                # Reusable UI
│       │   ├── ColorChooser.tsx
│       │   ├── GameBoard.tsx
│       │   ├── GameHeader.tsx
│       │   ├── HandCard.tsx
│       │   ├── PlayerCard.tsx
│       │   ├── PlayersList.tsx
│       │   └── UnoCard.tsx
│       ├── hooks/                     # Custom React hooks
│       │   ├── useServerConnection.ts # WebSocket lifecycle
│       │   ├── useGameState.ts        # Derived state from Redux
│       │   └── useGameActions.ts      # Game action handlers
│       ├── features/
│       │   └── uno/
│       │       └── unoSlice.ts        # createSlice with reducers
│       ├── rx/
│       │   └── serverBridge.ts        # WebSocket Observable
│       ├── types/
│       │   └── serverTypes.ts         # Re-exports from domain
│       └── utils/
│           ├── gameUtils.ts
│           └── colorUtils.ts
├── server/
│   └── src/
│       ├── index.ts                   # WebSocket server setup (45 lines)
│       ├── types.ts                   # Type definitions (Room, ClientInfo)
│       ├── utils.ts                   # Pure utilities (newId, sanitizeGame)
│       ├── game.ts                    # Game creation logic
│       ├── broadcast.ts               # Broadcasting functions
│       ├── roomManager.ts             # RoomManager class (SOLID)
│       └── messageHandler.ts          # MessageHandler class (SOLID)
└── domain/
    ├── src/
    │   ├── model/                     # Functional game model (from Assignment 4)
    │   │   ├── deck.ts
    │   │   ├── round.ts
    │   │   └── uno.ts
    │   ├── types/
    │   │   └── messages.ts            # Centralized protocol types
    │   └── utils/
    │       └── random_utils.ts
    └── package.json
```

---

## Server Architecture (SOLID Principles)

**Refactored Structure:** Assignment 5 server follows SOLID principles with modular architecture:

**Before:** 255-line monolithic `index.ts` with multiple responsibilities

**After:** 7 focused modules (45-138 lines each):

1. **index.ts** (45 lines) - WebSocket server setup only
2. **types.ts** (21 lines) - Type definitions and constants
3. **utils.ts** (17 lines) - Pure utility functions
4. **game.ts** (26 lines) - Game creation logic
5. **broadcast.ts** (34 lines) - Broadcasting functions (stateless)
6. **roomManager.ts** (110 lines) - Room lifecycle management (Single Responsibility)
7. **messageHandler.ts** (138 lines) - Message routing (Dependency Injection)

**Benefits:**
- ✅ **Single Responsibility**: Each module has one clear purpose
- ✅ **Open/Closed**: Can extend without modifying existing code
- ✅ **Dependency Inversion**: `MessageHandler` depends on `RoomManager` abstraction
- ✅ **Testability**: Pure functions and injectable dependencies
- ✅ **Maintainability**: 82% code reduction in main file

**Example - RoomManager Class:**
```ts
// server/src/roomManager.ts
export class RoomManager {
  private rooms = new Map<string, Room>()
  private clients = new Map<string, ClientInfo>()

  createRoom(creator: ClientInfo, maxPlayers: number): void {
    const room: Room = {
      id: newId('room'),
      game: waitingGame([creator.name]),
      sockets: [creator],
      maxPlayers,
      creatorId: creator.id,
    }
    this.rooms.set(room.id, room)
    broadcastRoomsList(this.rooms, this.clients)
  }
  
  joinRoom(client: ClientInfo, roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) {
      client.socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Room not found' 
      }))
      return
    }
    room.sockets.push(client)
    broadcastRoom(room)
  }
}
```

**Example - Dependency Injection:**
```ts
// server/src/messageHandler.ts
export class MessageHandler {
  constructor(private roomManager: RoomManager) {}  // Dependency injection

  handleMessage(client: ClientInfo, parsed: ClientMessage): void {
    switch (parsed.type) {
      case 'create-room':
        this.roomManager.createRoom(client, parsed.maxPlayers)
        break
      case 'join-room':
        this.roomManager.joinRoom(client, parsed.roomId)
        break
    }
  }
}

// server/src/index.ts - Composition
const roomManager = new RoomManager()
const messageHandler = new MessageHandler(roomManager)  // Inject dependency
```

---

## Exam Checklist

✅ **One-Way Data Flow**: Action → Reducer → Store → View  
✅ **Reducers**: Pure functions `(state, action) => newState`, Immer for immutability  
✅ **Slices**: Bundle state + reducers + auto-generated actions  
✅ **Thunks**: Handle async operations (though Assignment 5 uses RxJS instead)  
✅ **Reactive Programming**: Model data as streams over time  
✅ **Observables**: Multiple values, lazy, cancellable  
✅ **Subjects**: Observable + Observer, multicasting (WebSocketSubject)  
✅ **Operators**: Transform streams with `pipe()`, `filter`, `map`, etc.  
✅ **merge vs concat**: Parallel interleaved vs sequential ordered  

---

## Quick Q&A

**Q: What is one-way data flow?**  
A: Data flows: Action → Reducer → Store → View. Changes only happen through actions.

**Q: What is a reducer?**  
A: Pure function `(state, action) => newState` that calculates new state.

**Q: What is a slice?**  
A: Redux Toolkit bundle of state + reducers + auto-generated actions for one feature.

**Q: When use thunks?**  
A: For async operations (API calls, delays) since reducers must be pure. Assignment 5 uses RxJS instead.

**Q: merge vs concat?**  
A: merge runs parallel (interleaved output), concat runs sequential (ordered output).

**Q: Why use operators?**  
A: Transform Observable streams declaratively - filter, map, debounce, combine, etc.

**Q: Why unsubscribe?**  
A: Prevent memory leaks - subscriptions persist until explicitly unsubscribed.

---

## Where It's Applied in Assignment 5

| Concept | File | Example |
|---------|------|---------|
| **configureStore** | `client/src/store.ts` | Creates Redux store with `uno` reducer |
| **createSlice** | `client/src/features/uno/unoSlice.ts` | Defines uno slice with 7 reducers |
| **PayloadAction** | `client/src/features/uno/unoSlice.ts` | Type annotations for action payloads |
| **Immer** | `client/src/features/uno/unoSlice.ts` | `state.game = action.payload` - looks like mutation |
| **useDispatch** | `client/src/hooks/useServerConnection.ts` | Dispatches actions from WebSocket messages |
| **useSelector** | `client/src/hooks/useGameState.ts` | Selects `game`, `playerIndex`, `connected`, `rooms` |
| **Provider** | `client/src/main.tsx` | Wraps RouterProvider to provide Redux store |
| **RouterProvider** | `client/src/main.tsx` | Uses router from `router/index.tsx` |
| **createBrowserRouter** | `client/src/router/index.tsx` | Defines routes with nested children |
| **Outlet** | `client/src/App.tsx` | Renders child routes in layout |
| **Views** | `client/src/views/` | Page-level: Login, Lobby, GamePlay, GameWaiting, GameOver |
| **Components** | `client/src/components/` | Reusable: GameBoard, PlayerCard, HandCard, UnoCard |
| **Custom Hooks** | `client/src/hooks/` | `useServerConnection`, `useGameState`, `useGameActions` |
| **webSocket** | `client/src/rx/serverBridge.ts` | Creates WebSocketSubject Observable |
| **RxJS Operators** | `client/src/rx/serverBridge.ts` | `filter`, `tap`, `catchError` for stream processing |
| **subscribe** | `client/src/rx/serverBridge.ts` | Handles `next`, `error` with dispatch calls |
| **unsubscribe** | `client/src/hooks/useServerConnection.ts` | Cleanup in useEffect return |
| **Subject .next()** | `client/src/rx/serverBridge.ts` | `send()` method sends messages to server |
| **Redux + RxJS** | `client/src/rx/serverBridge.ts` | `handleIncomingMessage()` dispatches Redux actions |
| **Centralized Types** | `domain/src/types/messages.ts` | `ClientMessage`, `ServerMessage`, `RoomSummary` |
| **SOLID Server** | `server/src/roomManager.ts` | Room lifecycle management (Single Responsibility) |
| **SOLID Server** | `server/src/messageHandler.ts` | Message routing with dependency injection |
