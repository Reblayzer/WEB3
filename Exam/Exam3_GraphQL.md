# Assignment 3: GraphQL & Server-Client Communication - Exam Guide

> **Core Goal:** Design a typed API and communicate efficiently between client and server.

---

## What This Assignment Is About (Big Picture)

This assignment focuses on **typed communication between client and server, including real-time updates**. You learn how GraphQL enforces an API contract through schemas, how resolvers implement server logic, and how subscriptions enable real-time data flow using the Pub/Sub pattern. The emphasis is on type safety across the network boundary and efficient, bidirectional communication.

**Core Focus:** GraphQL schema design, resolver implementation, Apollo Client integration, WebSocket subscriptions, and runtime validation with Zod.

---

## Key Idea

**GraphQL lets the client request exactly the data it needs, while the server enforces a typed contract. The server validates every input at runtime, and real-time features use WebSocket subscriptions to push updates efficiently.**

---

# Part 1: Theory & Concepts

## 1. Same-Origin Policy and CORS

### What is Same-Origin Policy?

Same-Origin Policy is a security restriction: a web page can only make requests to the same origin (protocol + domain + port). This prevents malicious scripts from stealing data.

```
https://game.com → Can access https://game.com/api ✅
https://game.com → Cannot access https://attacker.com ❌
https://game.com:3000 → Cannot access https://game.com:4000 ❌ (different port)
```

### What is CORS?

Cross-Origin Resource Sharing (CORS) relaxes Same-Origin Policy in a controlled way. The server tells the browser which origins are allowed to access it by sending headers.

```
Client (http://localhost:3000)
    ↓ Browser blocks request (different origin)
Server (http://localhost:4000)
    ↑ Server responds with:
      Access-Control-Allow-Origin: http://localhost:3000
    Browser allows request ✅
```

### CORS Headers

```ts
// Server must send these headers for cross-origin requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
```

### GraphQL + CORS

GraphQL typically uses a single POST endpoint, so CORS configuration is straightforward. Apollo Server handles this automatically with proper setup.

```ts
const server = new ApolloServer({
  typeDefs,
  resolvers,
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },
});
```

**🎯 Exam Tip:** Same-Origin Policy protects users; CORS allows controlled access.

---

## 2. GraphQL Schema - Types & Operations

### What is GraphQL Schema?

The schema is a contract between client and server. It defines all available data types and operations. GraphQL enforces the schema at runtime — if a client requests a field that doesn't exist, it's rejected immediately.

```
Client requests shape of data
          ↓
Server validates against schema
          ↓
Server executes resolvers matching schema
          ↓
Response matches client's shape
```

### Scalar Types

Scalars are primitive leaf values:

```graphql
String      # Text
Int         # Whole number
Float       # Decimal
Boolean     # true/false
ID          # Unique identifier (serialized as String)
DateTime    # ISO 8601 timestamp
```

### Object Types

Objects define structure with fields and types. The `!` means non-nullable (required), `[]` means array:

```graphql
type Card {
  type: CardType! # Required enum
  color: String # Optional string
  number: Int # Optional int
}

type Game {
  id: ID! # Required ID
  players: [Player!]! # Required array of required Players
  round: Round # Optional object
}

type Player {
  id: ID!
  name: String!
  hand: [Card!]! # Required array of required Cards
  score: Int!
}
```

### Query, Mutation, Subscription Types

These are the three operation types in GraphQL:

```graphql
# Query - READ data (no side effects)
type Query {
  game(id: ID!): Game # Read one game
  games: [Game!]! # Read all games
  playerHand(gameId: ID!): [Card!]!
}

# Mutation - WRITE data (has side effects)
type Mutation {
  createGame(input: CreateGameInput!): Game!
  playCard(gameId: ID!, cardIndex: Int!): Game!
  drawCard(gameId: ID!): Game!
}

# Subscription - STREAM real-time updates
type Subscription {
  gameUpdated(gameId: ID!): Game! # Notified when game changes
  gamesListUpdated: [AvailableGame!]! # Notified when game list changes
}
```

### Input Types

Input types define complex mutation parameters. They can only be used as arguments, not returned:

```graphql
input CreateGameInput {
  players: [String!]! # Required array of player names
  maxPlayers: Int # Optional max player count
  isPrivate: Boolean # Optional private flag
}

type Mutation {
  createGame(input: CreateGameInput!): Game!
}
```

### Enums

Enums restrict values to specific options:

```graphql
enum CardType {
  NUMBERED
  SKIP
  REVERSE
  DRAW
  WILD
  WILD_DRAW
}

enum Color {
  RED
  YELLOW
  GREEN
  BLUE
}

type Card {
  type: CardType!
  color: Color
}
```

**🎯 Exam Tip:** The schema is your API contract. Every field is typed and validated. The `!` means "required."

---

## 3. Resolvers - Mapping Schema to Logic

### What are Resolvers?

Resolvers are functions that execute when a field is requested. They fetch data, compute values, or trigger side effects. Every field in your schema can have a resolver.

```
Client query requests "game" field
          ↓
GraphQL finds Query.game resolver
          ↓
Resolver function executes: (parent, args, context, info) => { ... }
          ↓
Returns data or error
          ↓
Response sent to client
```

### Resolver Parameters

Every resolver receives four parameters (though you don't always need all):

```ts
resolver(parent, args, context, info);
```

- **parent**: The result from the parent field's resolver. For root Query fields, this is undefined/null
- **args**: Arguments passed to this field (from client query)
- **context**: Shared data across all resolvers (database connection, current user, request)
- **info**: Metadata about the query (rarely used)

### Query Resolvers - Reading Data

Query resolvers are entry points for read operations. They don't modify state:

```ts
const resolvers = {
  Query: {
    // Query: game(id: ID!): Game
    game: (_, { id }, { gameManager }) => {
      return gameManager.getGame(id);
    },

    // Query: availableGames: [AvailableGame!]!
    availableGames: (_, __, { gameManager }) => {
      return gameManager.getAvailableGames();
    },

    // Query: playerHand(gameId: ID!): [Card!]!
    playerHand: (_, { gameId }, { gameManager, playerId }) => {
      const game = gameManager.getGame(gameId);
      const player = game.players.find((p) => p.id === playerId);
      return player?.hand || [];
    },
  },
};
```

**Breakdown:**

- First param `_`: Unused parent (null for Query root fields)
- Second param `{ id }`: Destructure arguments from client query
- Third param `{ gameManager }`: Get services from context
- Return: The data matching the schema type

### Mutation Resolvers - Writing Data

Mutation resolvers modify state and usually publish events for subscriptions:

```ts
Mutation: {
  // Mutation: playCard(gameId: ID!, cardIndex: Int!): Game!
  playCard: (_, { gameId, cardIndex }, { gameManager, playerId, pubsub }) => {
    // Modify state
    const game = gameManager.playCard(gameId, playerId, cardIndex);

    // Publish event for subscribers
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game });

    // Return updated data
    return game;
  },

  // Mutation: drawCard(gameId: ID!): Game!
  drawCard: (_, { gameId }, { gameManager, playerId, pubsub }) => {
    const game = gameManager.drawCard(gameId, playerId);
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game });
    return game;
  }
}
```

### Subscription Resolvers - Streaming Updates

Subscription resolvers don't return data directly. They return an async iterator that yields updates over time:

```ts
Subscription: {
  // Subscription: gameUpdated(gameId: ID!): Game!
  gameUpdated: {
    subscribe: (_, { gameId }, { pubsub }) => {
      // Return iterator that yields updates from this channel
      return pubsub.asyncIterator(`GAME_${gameId}`);
    }
  },

  // Subscription: gamesListUpdated: [AvailableGame!]!
  gamesListUpdated: {
    subscribe: (_, __, { pubsub }) => {
      return pubsub.asyncIterator('GAMES_LIST');
    }
  }
}
```

### Field Resolvers - Nested Data

When a type has a field needing computation, you define a resolver for that field. The `parent` parameter contains the parent object:

```ts
const resolvers = {
  Game: {
    // When client requests game.players, this resolver runs
    players: (parent, _, { playerService }) => {
      return playerService.getPlayersByGameId(parent.id);
    },

    // When client requests game.topCard, compute it
    topCard: (parent) => {
      const pile = parent.discardPile;
      return pile[pile.length - 1];
    },
  },

  Player: {
    // When client requests player.score, compute from game
    score: (parent, _, { gameManager }) => {
      return gameManager.getPlayerScore(parent.id);
    },
  },
};
```

**🎯 Exam Tip:** Resolvers are just functions mapping schema fields to data. Parent→Args→Context→Info.

---

## 4. GraphQL Clients - Apollo

### What is Apollo Client?

Apollo Client is a library for consuming GraphQL APIs from the browser. It handles:

- Sending queries and mutations via HTTP
- Subscribing to real-time updates via WebSocket
- Caching results to avoid refetching
- Managing loading and error states

### HTTP + WebSocket Setup (Split Link)

GraphQL uses different protocols for different operation types:

- **Queries & Mutations** → HTTP (stateless, faster)
- **Subscriptions** → WebSocket (persistent, real-time)

```ts
import { HttpLink } from "@apollo/client/link/http";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { split, getMainDefinition } from "@apollo/client/utilities";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
  credentials: "include", // Send cookies
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
  })
);

// Route operations based on type
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" && def.operation === "subscription"
    );
  },
  wsLink, // Use WebSocket for subscriptions
  httpLink // Use HTTP for queries/mutations
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### Making Queries

Queries fetch data. You write the query, specify variables, and receive exactly what you requested:

```ts
const { data, loading, error } = useQuery(
  gql`
    query GetGame($id: ID!) {
      game(id: $id) {
        id
        players {
          name
          score
        }
        topCard {
          type
          color
          number
        }
      }
    }
  `,
  {
    variables: { id: "123" },
  }
);

// data.game.players is typed and cached
```

### Making Mutations

Mutations write data and return the updated state:

```ts
const [playCard] = useMutation(gql`
  mutation PlayCard($gameId: ID!, $cardIndex: Int!) {
    playCard(gameId: $gameId, cardIndex: $cardIndex) {
      id
      topCard {
        type
        color
      }
      players {
        hand
      }
    }
  }
`);

// Call mutation
await playCard({
  variables: { gameId: "123", cardIndex: 2 },
});
```

### Subscribing to Updates

Subscriptions create a persistent connection that streams updates:

```ts
const { data, loading } = useSubscription(
  gql`
    subscription OnGameUpdate($gameId: ID!) {
      gameUpdated(gameId: $gameId) {
        id
        topCard {
          type
        }
        players {
          name
        }
      }
    }
  `,
  {
    variables: { gameId: "123" },
  }
);

// data updates in real-time as server publishes events
```

**🎯 Exam Tip:** Apollo Client handles all transport concerns. You write GraphQL, it routes to right transport.

---

## 5. WebSockets vs Server-Sent Events (SSE)

### What are WebSockets?

WebSocket is a bidirectional protocol for persistent connections. Once established, either side can send messages without waiting for a request:

```
Client initiates WebSocket upgrade
          ↓
Server accepts → Connection open
          ↓
Messages flow both ways until someone closes
```

### What is SSE?

Server-Sent Events provides one-way streaming over HTTP. The client opens a connection, and the server pushes events:

```
Client opens EventSource
          ↓
Server sends events down HTTP stream
          ↓
Only server can send, client receives
```

### Comparison

| Feature         | WebSocket               | SSE                       |
| --------------- | ----------------------- | ------------------------- |
| Direction       | Bidirectional           | Server→Client only        |
| Protocol        | Custom (ws://)          | HTTP                      |
| Overhead        | Lower (persistent)      | Higher (HTTP headers)     |
| Reconnection    | Manual                  | Automatic                 |
| Browser Support | All modern              | All modern                |
| Use Case        | Chat, multiplayer games | Notifications, live feeds |

### When to Use Each

**Use WebSocket when:**

- Client and server both send messages (chat, multiplayer games)
- You need low latency bidirectional communication
- Real-time features are core to the app

**Use SSE when:**

- Server pushes updates, client just listens (notifications)
- You already have HTTP infrastructure
- You want built-in reconnection

**GraphQL Subscriptions typically use WebSocket** because GraphQL needs to handle client requests (re-subscribe, unsubscribe) dynamically.

**🎯 Exam Tip:** WebSocket = bidirectional (games), SSE = server-push only (notifications).

---

## 6. GraphQL Subscriptions & Pub/Sub Pattern

### How GraphQL Subscriptions Work

Subscriptions enable real-time updates through GraphQL. Internally they use the Pub/Sub pattern:

```
1. Client sends subscription query (via WebSocket)
2. Server registers client with PubSub for that channel
3. Client now receives updates whenever that channel publishes
4. Some mutation changes data and publishes event
5. PubSub broadcasts event to all subscribed clients
6. Each client receives update in real-time
```

### PubSub Implementation

PubSub manages channels and subscribers. Every mutation that modifies watched data publishes an event:

```ts
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();

// Mutation publishes when data changes
const resolvers = {
  Mutation: {
    playCard: (_, { gameId, cardIndex }, { gameManager, pubsub }) => {
      const game = gameManager.playCard(gameId, cardIndex);

      // Publish event to channel
      pubsub.publish(`GAME_${gameId}`, {
        gameUpdated: game, // Event payload
      });

      return game;
    },
  },

  Subscription: {
    // Subscription subscribes to the channel
    gameUpdated: {
      subscribe: (_, { gameId }, { pubsub }) => {
        // asyncIterator creates an iterator that yields events from this channel
        return pubsub.asyncIterator(`GAME_${gameId}`);
      },
    },
  },
};
```

**Flow Example:**

```
Player 1 plays card → playCard mutation executes
                   → pubsub.publish('GAME_123', { gameUpdated: {...} })
                   → All subscribed clients receive update in real-time
Player 2's UI updates automatically
Player 3's UI updates automatically
```

### Filtering Subscriptions

Sometimes you only want certain events. Use `withFilter` to add conditions:

```ts
import { withFilter } from "graphql-subscriptions";

Subscription: {
  gameUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator("GAME_EVENTS"),
      (payload, variables) => {
        // Only send to subscribers watching this game
        return payload.gameUpdated.id === variables.gameId;
      }
    );
  }
}
```

**🎯 Exam Tip:** Pub/Sub pattern: mutations publish events, subscriptions listen. WebSocket carries the stream.

---

## 7. Runtime Validation - Why TypeScript Isn't Enough

### The Problem

TypeScript types exist only during development. At runtime, they're compiled away. When external data arrives (user input, API response), you can't trust it matches the expected shape.

```ts
// TypeScript (compile time)
interface Card {
  type: "NUMBERED" | "WILD";
  color: "RED" | "BLUE";
  number?: number;
}

const card: Card = JSON.parse(userInput); // ❌ Trust but don't verify!
// At runtime, userInput could be anything
```

**Scenario: What if server receives:**

```json
{ "type": "INVALID_TYPE", "color": 123 }
 // Wrong types!
```

TypeScript doesn't catch this because the code compiled fine. At runtime, you're working with garbage data.

### Why Validation Matters

GraphQL validates at runtime, but only the GraphQL schema. For complex validation (string length, enum values, nested objects), you need a separate validator:

```ts
// GraphQL schema says: playCard(cardIndex: Int!): Game!
// That only checks: cardIndex is provided and is a number
// It doesn't check: is cardIndex >= 0? Is it < 13?
```

### Validation Layer

Add runtime validation to resolvers:

```ts
const resolvers = {
  Mutation: {
    playCard: (_, { gameId, cardIndex }, { gameManager, pubsub }) => {
      // Validate before using
      if (!gameId) throw new Error("Game ID required");
      if (!Number.isInteger(cardIndex) || cardIndex < 0) {
        throw new Error("Invalid card index");
      }

      // Now safe to use
      const game = gameManager.playCard(gameId, cardIndex);
      pubsub.publish(`GAME_${gameId}`, { gameUpdated: game });
      return game;
    },
  },
};
```

**🎯 Exam Tip:** TypeScript types are compile-time only. Use runtime validators for external data.

---

## 8. Zod - Runtime Validation

### What is Zod?

Zod is a TypeScript-first validation library. You define a schema, Zod validates data at runtime, and automatically generates TypeScript types:

```ts
import { z } from "zod";

// Define validation schema
const CardSchema = z.object({
  type: z.enum(["NUMBERED", "SKIP", "WILD"]),
  color: z.string().optional(),
  number: z.number().int().min(0).max(9).optional(),
});

// Infer TypeScript type from schema (automatically!)
type Card = z.infer<typeof CardSchema>;
```

### Common Zod Methods

```ts
z.string(); // String type
z.number(); // Number type
z.boolean(); // Boolean type
z.array(z.string()); // Array of strings
z.object({ name: z.string() }); // Object shape
z.enum(["A", "B", "C"]); // Enum values
z.literal("exact"); // Exact value
z.union([z.string(), z.number()]) // Union type

  // Modifiers
  .optional() // Field can be undefined
  .nullable() // Field can be null
  .default(value) // Default value
  .refine(predicate); // Custom validation
z.coerce.number(); // Convert string to number
```

### Validating in Resolvers

Validate mutation input before using:

```ts
const CreateGameInputSchema = z.object({
  players: z.array(z.string().min(1)).min(2),
  maxPlayers: z.number().int().min(2).max(10).optional(),
});

const resolvers = {
  Mutation: {
    createGame: (_, { input }, { gameManager, pubsub }) => {
      // Validate input
      const validated = CreateGameInputSchema.parse(input);
      // If invalid, throws ZodError automatically

      // Safe to use
      const game = gameManager.createGame(
        validated.players,
        validated.maxPlayers
      );

      pubsub.publish("GAMES_LIST", {
        gamesListUpdated: gameManager.getAvailableGames(),
      });
      return game;
    },
  },
};
```

### Error Handling

```ts
const result = CreateGameInputSchema.safeParse(input);

if (!result.success) {
  // result.error has detailed validation errors
  console.error("Validation failed:", result.error.flatten());
} else {
  // result.data is typed and validated
  const game = gameManager.createGame(result.data.players);
}
```

**🎯 Exam Tip:** Zod validates at runtime AND generates types. One definition = validation + TypeScript.

---

## Quick Answers

| Question                           | Answer                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| What is Same-Origin Policy?        | Security restriction: can only request same origin. CORS relaxes it with headers          |
| What is GraphQL?                   | Query language for APIs. Client specifies exact data needed, server enforces typed schema |
| What is a resolver?                | Function that executes for a field. Gets parent, args, context, info                      |
| Query vs Mutation vs Subscription? | Query reads (no side effects), Mutation writes (side effects), Subscription streams       |
| How do subscriptions work?         | Pub/Sub pattern: mutations publish events, clients subscribe to channels via WebSocket    |
| WebSocket vs SSE?                  | WebSocket is bidirectional (games), SSE is server→client only (notifications)             |
| Why validate at runtime?           | TypeScript is compile-time only. Runtime data can be anything.                            |
| What does Zod do?                  | Runtime validation that also generates TypeScript types                                   |
| Why split link?                    | Route subscriptions to WebSocket (persistent), queries to HTTP (stateless)                |

---

# Part 2: Server Implementation (High-Level)

## What the Server Does

The server wraps the Assignment 1 domain model and exposes it via GraphQL API:

1. **Schema**: Defines Card, Player, Game types and operations (Query/Mutation/Subscription)
2. **Resolvers**: Functions that execute mutations (create game, play card, draw card) and publish events via PubSub
3. **GameManager**: Manages in-memory games collection, calls domain logic
4. **WebSocket**: Apollo Server with WebSocket support for real-time subscriptions

## Key Flow: When a Card is Played

```
Client: PLAY_CARD mutation
    ↓
Server: Mutation resolver receives gameId, cardIndex
    ↓
GameManager.playCard() calls domain model
    ↓
pubsub.publish('GAME_123', { gameUpdated: game })
    ↓
All WebSocket subscribers of GAME_123 receive update
```

## Simple Example: PlayCard Resolver

```ts
Mutation: {
  playCard: (_, { gameId, cardIndex }, { gameManager, pubsub }) => {
    // 1. Call domain logic
    const game = gameManager.playCard(gameId, cardIndex);

    // 2. Publish event so subscribers see update in real-time
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game });

    // 3. Return updated game
    return game;
  };
}
```

The mutation **publishes an event** so that all other players subscribed to `GAME_123` get the update instantly via WebSocket.

---

# Part 3: Client Implementation (High-Level)

## What the Client Does

The client is a Vue 3 app that connects to the GraphQL server via HTTP and WebSocket:

1. **Login**: Enter player name
2. **Lobby**: Create or join a multiplayer game (subscription updates game list in real-time)
3. **GamePlayNetwork**: Play game with other players (subscription receives card plays in real-time)

## Apollo Client Setup

The client uses a **split link** to route operations:

- **Queries & Mutations** → HTTP (request-response, stateless)
- **Subscriptions** → WebSocket (persistent, real-time)

```ts
// HTTP for queries/mutations
const httpLink = new HttpLink({ uri: "http://localhost:4000/graphql" });

// WebSocket for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({ url: "ws://localhost:4000/graphql" })
);

// Route based on operation type
const splitLink = split(
  ({ query }) => getMainDefinition(query).operation === "subscription",
  wsLink, // subscriptions → WebSocket
  httpLink // queries/mutations → HTTP
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

## Real-Time Flow

```
Player 1: Click "Play Card 2"
    ↓
Client: client.mutate({ mutation: PLAY_CARD, variables: { gameId, cardIndex } })
    ↓
Server: Resolver executes, publishes event
    ↓
pubsub.publish('GAME_123', { gameUpdated: {...} })
    ↓
WebSocket sends to all subscribers (Player 2, 3, etc.)
    ↓
Player 2 & 3 receive subscription update
    ↓
Apollo cache updates, Vue reactivity triggers
    ↓
All players see card played in real-time
```

## Network Game Store (Pinia)

Simple store that:

1. Uses `client.mutate()` for mutations (create game, play card, etc.)
2. Uses `client.subscribe()` to listen for game updates via WebSocket
3. Automatically unsubscribes when component unmounts (prevents memory leaks)

## Three Views

| View                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| Login.vue           | Enter player name → playerStore                               |
| Lobby.vue           | List available games, create/join (subscription updates list) |
| GamePlayNetwork.vue | Play game with others (subscription receives play updates)    |

---

## 🎯 Exam Strategy: 7-Minute Demo Path

If showing code, open these files:

**1. schema.ts** (50 lines) - Shows:

- Object types (Card, Player, Game)
- Enums (GameStatus)
- Query, Mutation, Subscription definitions
- Non-nullable `!` and array `[]` syntax

**2. resolvers.ts** (60 lines) - Shows:

- Query resolvers (game, availableGames, playerHand)
- Mutation resolvers (playCard, startGame) with pubsub.publish()
- Subscription resolvers with pubsub.asyncIterator()
- Context usage (gameManager, pubsub)

**3. graphql.ts** (client) (200 lines) - Shows:

- Apollo Client setup with split link (HTTP + WebSocket)
- GraphQL queries with `gql` tag and variables
- GraphQL mutations returning updated data
- GraphQL subscriptions with real-time updates

**4. networkGame.ts** (client store) (100 lines) - Shows:

- Pinia store for network state
- client.mutate() for mutations
- client.subscribe() with .subscribe() callbacks
- Subscription lifecycle (cleanup)

**Demo Flow (7 minutes):**

1. Show `schema.ts` → Types, operations, non-nullable (2 min)
2. Show `resolvers.ts` → Context, pubsub.publish/asyncIterator (2 min)
3. Show `graphql.ts` → Split link, queries, mutations (2 min)
4. Show `networkGame.ts` → Subscribe callbacks, unsubscribe cleanup (1 min)

---

## Quick Reference: Exam Trap Checklist

✅ **Same-Origin Policy?** → Security restriction; CORS relaxes it with headers

✅ **GraphQL vs REST?** → GraphQL: client specifies shape, single endpoint; REST: fixed shapes per endpoint

✅ **`!` and `[]` in schema?** → `!` = required/non-null, `[]` = array, `[String!]!` = required array of required strings

✅ **Resolver parameters?** → parent, args, context, info (don't always need all)

✅ **pubsub.publish vs asyncIterator?** → publish() sends event, asyncIterator() receives events

✅ **WebSocket vs HTTP?** → WebSocket: subscriptions (persistent), HTTP: queries/mutations (stateless)

✅ **Split link purpose?** → Route subscriptions to WebSocket, queries to HTTP

✅ **Why unsubscribe?** → Prevent memory leaks; listener receives updates even after component unmounts

✅ **Zod validation?** → Validate mutation input at runtime before using

✅ **Context in resolvers?** → Shared across all resolvers (gameManager, pubsub, userId)

---

## Common Exam Questions

**Q: "Walk through real-time game update when a card is played"**

A: Player 1 calls `playCard()` mutation → Client sends to server via HTTP → Server's `playCard` resolver calls `gameManager.playCard()` → Domain model updates → Resolver calls `pubsub.publish('GAME_123', { gameUpdated: game })` → Server sends event to all WebSocket subscribers → Player 2 and Player 3's subscriptions receive `gameUpdated` → Their Apollo cache updates → Vue reactivity triggers → UIs show new game state in real-time

**Q: "Why use subscriptions instead of polling?"**

A: Polling means client constantly asks "any updates?" → HTTP requests every 1-2 seconds → High bandwidth, high latency, high server load. Subscriptions mean server pushes updates → Only network traffic when data actually changes → Lower latency (instant vs 1-2 second delay) → Lower bandwidth → Lower server load.

**Q: "What's the purpose of the split link?"**

A: GraphQL supports three operation types (Query, Mutation, Subscription). Queries/Mutations are request-response (use HTTP), subscriptions are streaming (use WebSocket). Split link examines each operation, routes subscriptions to WebSocket, queries/mutations to HTTP. This gives you the best protocol for each use case.

**Q: "How do you validate mutation input?"**

A: Server-side, use Zod to validate before executing resolver logic. Example: `CreateGameInputSchema.parse(input)` throws error if invalid. This prevents bad data from entering gameManager. Client-side, Apollo validates against schema (field types, required fields) but not business logic (string length, number ranges, custom rules) — that's what Zod is for.

**Q: "Why does resolver need context?"**

A: Resolvers are just functions — they need access to shared services. Context passes gameManager, pubsub, userId, database connection, etc. to all resolvers. Without context, you'd have to pass these as parameters through every function, creating tight coupling.

**Q: "What happens if subscription client doesn't unsubscribe?"**

A: Memory leak. Subscription listener stays active even after component unmounts. When component remounts, new listener created. Original listener still listening. After 10 remounts, you have 10 listeners for same channel. All receive every update, wasting CPU and bandwidth. Always unsubscribe in `onUnmounted()`.

---

## Memory Aid: GraphQL Operation Types

```
Query       READ only        HTTP       No side effects
Mutation    WRITE           HTTP       Has side effects, publishes events
Subscription STREAM          WebSocket  Receives events in real-time
```

**Real-time flow:**

```
Mutation (Player A plays card)
    ↓
pubsub.publish('GAME_123', { gameUpdated: ... })
    ↓
WebSocket broadcasts to all subscribers
    ↓
Subscriptions (Player B & C watching GAME_123)
    ↓
Their UIs update automatically
```
