# Assignment 3: UNO Multiplayer - Full Stack GraphQL + Vue 3

> **Overview:** Real-time multiplayer UNO game with GraphQL API, WebSocket subscriptions, and Vue 3 UI. Builds on Assignment 1 (domain model) and Assignment 2 (client UI) with server infrastructure.

## Architecture

### Three-Tier Stack

- **Domain** (Pure game rules) → Game, Round, Card types; UNO logic
- **Server** (GraphQL + Node) → Apollo Server, context-based auth, Zod validation, Pub/Sub
- **Client** (Vue 3 + Apollo) → Split link (HTTP + WebSocket), real-time subscriptions

### Key Features

✅ **Real-time multiplayer** — WebSocket subscriptions push updates to all players  
✅ **Player identity via headers** — x-player-id sent by client, extracted by server context  
✅ **Authorization checks** — Prevents impersonation, hand viewing, invalid plays  
✅ **Input validation** — Zod schemas for all mutations (UUIDs, enums, ranges)  
✅ **Response validation** — Client validates all API responses  
✅ **Error handling** — GraphQLError with structured codes (UNAUTHENTICATED, FORBIDDEN, etc.)  
✅ **Subscription lifecycle** — Auto-cleanup on unmount, debounced updates

## Getting Started

```bash
# Root workspace
npm install                      # Install all packages

# Start server
npm run dev -w server           # Runs on http://localhost:4000/graphql
                                # GraphQL playground available
                                # WebSocket ready at ws://localhost:4000/graphql

# Start client (in another terminal)
npm run dev -w client           # Runs on http://localhost:5173
```

## API Contract

### Queries (HTTP)

```graphql
# Get game state (requires authentication)
query Game($id: ID!) {
  game(id: $id) {
    id, players, currentPlayerIndex, topCard, status, ...
  }
}

# List available games (public)
query AvailableGames {
  availableGames {
    id, createdBy, playerCount, maxPlayers, status
  }
}

# Get own hand (requires auth + hand ownership)
query PlayerHand($gameId: ID!, $playerId: ID!) {
  playerHand(gameId: $gameId, playerId: $playerId) {
    cards [{ type, color, number }]
  }
}
```

### Mutations (HTTP)

```graphql
# Create game
mutation CreateGame($playerName: String!, $maxPlayers: Int) {
  createGame(...) { id, players, status, ... }
}

# Join game
mutation JoinGame($gameId: ID!, $playerName: String!) {
  joinGame(...) { ... }
}

# Start game (creator only)
mutation StartGame($gameId: ID!, $playerId: ID!) {
  startGame(...) { ... }
}

# Play card (current player only)
mutation PlayCard($gameId: ID!, $playerId: ID!, $cardIndex: Int!, $chosenColor: String) {
  playCard(...) { ... }
}

# Draw card
mutation DrawCard($gameId: ID!, $playerId: ID!) {
  drawCard(...) { ... }
}

# Call UNO
mutation SayUno($gameId: ID!, $playerId: ID!) {
  sayUno(...): Boolean!
}

# Catch UNO failure
mutation CatchUnoFailure($gameId: ID!, $accuserId: ID!, $accusedId: ID!) {
  catchUnoFailure(...): Boolean!
}

# Leave game
mutation LeaveGame($gameId: ID!, $playerId: ID!) {
  leaveGame(...): Boolean!
}
```

### Subscriptions (WebSocket)

```graphql
# Real-time game updates
subscription GameUpdated($gameId: ID!) {
  gameUpdated(gameId: $gameId) {
    gameId, eventType, data, timestamp
  }
}

# Real-time lobby updates
subscription GamesListUpdated {
  gamesListUpdated { [AvailableGame!]! }
}
```

## Authentication Flow

1. **Login (Client)**

   - User enters player name
   - NO playerId generated yet (it's game-specific)
   - Store playerName in localStorage + Pinia store

2. **Create/Join Game (Client)**

   - POST createGame or joinGame mutation
   - NO x-player-id header (playerId is undefined)
   - Server assigns playerId from its player list
   - Client stores the returned playerId

3. **Request (Client)**

   - For game operations: Add header to every HTTP request: `x-player-id: <uuid>`
   - Apollo authLink does this automatically when playerId exists
   - For non-game operations (availableGames): No header needed

4. **Context (Server)**

   - Express middleware extracts `x-player-id` header (if present)
   - Apollo context: `{ playerId: string | undefined, req }`
   - Operations without header: `playerId` is undefined

5. **Authorization (Resolvers)**

   - **Public operations** (getAvailableGames, createGame, joinGame): No auth needed
   - **Authenticated operations** (playCard, startGame, etc.):
     - Validate `context.playerId` is present (UNAUTHENTICATED error)
     - Validate `context.playerId === args.playerId` (FORBIDDEN error)
     - Prevents: viewing others' hands, playing as others, unauthorized actions

6. **Logout (Client)**
   - Clear store + localStorage
   - Redirect to login
   - Subsequent game-specific requests have no x-player-id (because playerId cleared)

## Folder Structure

```
Assignment3/
├── client/                           # Vue 3 + Apollo
│   ├── src/
│   │   ├── api/
│   │   │   ├── graphql.ts           # Split link (HTTP + WebSocket)
│   │   │   ├── schemas.ts           # Zod response validation
│   │   │   └── types.ts
│   │   ├── composables/
│   │   │   ├── useGameSubscription.ts    # WebSocket subscription lifecycle
│   │   │   ├── useGameUI.ts              # Turn indicator, scores display
│   │   │   ├── useGamePlay.ts            # Local game logic
│   │   │   ├── useNotification.ts        # Toast notifications
│   │   │   └── useBotWorkers.ts          # Web worker bots
│   │   ├── services/
│   │   │   └── networkGameService.ts     # API calls + Zod validation
│   │   ├── stores/
│   │   │   ├── player.ts            # playerName, playerId
│   │   │   ├── networkGame.ts       # Game state + mutations
│   │   │   └── game.ts              # Local bot game
│   │   ├── router/
│   │   │   └── index.ts             # Guards: requireAuth, requireLogout
│   │   └── views/
│   │       ├── Login.vue            # playerName + playerId entry
│   │       ├── Lobby.vue            # Create/join games
│   │       └── GamePlayNetwork.vue  # Real-time multiplayer play
│   └── package.json
│
├── server/                           # Apollo Server
│   ├── src/
│   │   ├── context.ts               # Extract playerId from x-player-id header
│   │   ├── resolvers.ts             # Safe mutations + auth checks
│   │   ├── schema.ts                # GraphQL schema
│   │   ├── validation.ts            # Zod input schemas
│   │   ├── gameManager.ts           # Game state + Pub/Sub
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── server.ts                # Express + Apollo setup
│   └── package.json
│
└── domain/                           # Pure game rules
    ├── src/
    │   ├── model/
    │   │   ├── game.ts              # Game (rounds, scoring)
    │   │   ├── round.ts             # Round (plays, UNO window)
    │   │   ├── deck.ts              # Deck (shuffle, deal)
    │   │   ├── card.ts              # Card utilities
    │   │   └── types/
    │   │       ├── card-types.ts    # Card types, enums
    │   │       ├── game-types.ts    # GameMemento, GameConfig
    │   │       └── round-types.ts   # RoundMemento, EndEvent
    │   └── index.ts
    └── package.json
```

## Testing (Multi-Player Flow)

### With 2 Browser Tabs

1. **Tab 1 (Player A):**

   - Navigate to http://localhost:5173
   - Login as "Alice" → generates playerId UUID
   - Click "Create Game"

2. **Tab 2 (Player B):**

   - Navigate to http://localhost:5173
   - Login as "Bob" → generates different playerId UUID
   - Click "Join Game" → paste game ID from Tab 1
   - Both see each other in player list

3. **Tab 1 (Creator starts):**

   - Click "Start Game"
   - Domain initializes: deals 7 cards, sets currentPlayer to dealer
   - pubsub.publish('GAME_X', { gameUpdated: {...} })

4. **Tab 2 (Auto-updates):**

   - WebSocket subscription receives event instantly
   - fetchGame() loads fresh state
   - Vue reactivity triggers: game board renders

5. **Tab 1 (Alice plays):**

   - Click a card from hand
   - playCard mutation (HTTP)
   - Server: validates, executes, publishes event
   - pubsub.publish('GAME_X', { gameUpdated: {...} })

6. **Tab 2 (Bob sees update):**
   - WebSocket receives event
   - Game state updates
   - Turn indicator changes to "Your Turn"
   - Notification: "Alice played RED 5"

### Verify Authorization Errors

- **Bob tries to play** (not his turn):

  - Client prevents (disabled button)
  - If bypassed: Server returns `GAME_ERROR: Not your turn`

- **Try to view Alice's hand:**

  - playerHandQuery with Bob's playerId = FORBIDDEN error

- **Missing authentication:**
  - Close app, clear localStorage, make request
  - No x-player-id header = UNAUTHENTICATED error

## Error Handling

### Server-Side

All mutations wrapped in `safeMutation()`:

```typescript
function safeMutation<T>(mutationFn: () => T, operationName: string): T {
  try {
    return mutationFn();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new GraphQLError(`Invalid ${operationName} arguments: ...`, {
        extensions: { code: "BAD_INPUT" },
      });
    }
    if (error instanceof Error && error.message.includes("not authenticated")) {
      throw new GraphQLError("Unauthorized: Player not authenticated", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }
    // ... FORBIDDEN, GAME_ERROR, INTERNAL_SERVER_ERROR
  }
}
```

### Client-Side

**networkGameService** validates responses:

```typescript
const game = GameSchema.parse(raw); // Zod validation
// If invalid: ApiValidationError
```

**useNotification** shows feedback:

```typescript
useNotification().error("Game error: Not your turn", 5000);
```

## Key Design Decisions

### Why x-player-id Header?

- **Stateless:** No server-side sessions
- **Simple:** Client always includes after login
- **Secure:** Validated at resolver level
- **Matches GraphQL:** Each operation carries context

### Why Pub/Sub?

- **Real-time:** Events published immediately
- **Scalable:** Can move to Redis PubSub
- **Flexible:** Different channels per game
- **Clean:** Decoupled from resolver logic

### Why Zod (Both Sides)?

- **Input:** Server validates before executing
- **Output:** Client validates before storing
- **Safety:** Prevents bad data entering domain
- **Single source:** Schema = validation + types

### Why WebSocket (Not polling)?

- **Low latency:** Updates instantly (not 1-2s delay)
- **Bandwidth:** Only traffic when data changes (not constant requests)
- **Scalability:** Fewer requests per player
- **UX:** Feels real-time (multiplayer games need this)

## Exam 3 (GraphQL) Theory Coverage

This implementation covers all key topics from [Exam/Exam3_GraphQL.md](../Exam/Exam3_GraphQL.md):

- ✅ **Same-Origin Policy & CORS** — Apollo Server CORS config
- ✅ **GraphQL Schema** — Card, Player, Game types; Query/Mutation/Subscription
- ✅ **Resolvers** — Safe mutation wrapper, auth checks, error handling
- ✅ **Apollo Client** — Split link routing (HTTP vs WebSocket)
- ✅ **WebSocket vs SSE** — WebSocket chosen (bidirectional, low latency)
- ✅ **Subscriptions & Pub/Sub** — publish() on mutations, asyncIterator() in resolvers
- ✅ **Runtime Validation** — Zod at API boundaries (server inputs + client responses)
- ✅ **Context** — playerId extracted from headers, passed to all resolvers

## Building on Prior Assignments

- **Assignment 1 (Domain):** Game, Round, Card types reused; added UNO state getters
- **Assignment 2 (UI):** Vue components, Pinia stores, utils reused; added network mutations + subscriptions
- **Assignment 3 (Server):** GraphQL API, auth, validation, real-time updates

## Common Issues

| Issue                | Cause                                  | Fix                                                                  |
| -------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| 401 Unauthenticated  | Missing x-player-id for game operation | Check playerStore.playerId is set (only needed after joining a game) |
| FORBIDDEN: Cannot... | playerId mismatch                      | Auth guard validates context.playerId === args.playerId              |
| Game not updating    | WebSocket not connected                | Check wsLink URL; verify subscription is active                      |
| Zod validation error | Invalid arg type                       | Check types match schema (UUID, enum, int, etc.)                     |
| CORS error           | Origin not allowed                     | Server config allows: cors({ origin: '\*' })                         |
| Can't create game    | playerId required but not yet set      | createGame doesn't need playerId - only needs playerName             |

## Next Steps

1. **Run tests:** `npm test -w domain`
2. **Add styling:** Tailwind CSS for notifications, turn indicator
3. **Database:** PostgreSQL instead of in-memory games
4. **Real auth:** JWT tokens instead of UUID
5. **Deployment:** Heroku or Vercel
