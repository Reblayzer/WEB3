# Assignment 3: GraphQL - Implementation Guide

## File Structure Overview

```
server/
├── src/
│   ├── schema.ts          ← GraphQL schema definition
│   ├── resolvers.ts       ← Resolver functions
│   ├── gameManager.ts     ← Business logic + PubSub
│   └── server.ts          ← Apollo Server + WebSocket setup

client/
├── src/
│   ├── api/
│   │   └── graphql.ts     ← Apollo Client + queries/mutations
│   ├── components/
│   │   └── GameBoard.vue
│   └── stores/
│       └── game.ts        ← Integrates with GraphQL
```

## Key Implementation: Schema (`server/src/schema.ts`)

**Defines the contract - what clients can request**

### Type Definitions

```graphql
# Lines 3-59: Define all types
type Card {
  type: String! # ! means required
  color: String
  number: Int
}

type Player {
  name: String!
  hand: [Card!]! # Required array of required Cards
  score: Int!
}

type Game {
  id: ID!
  players: [Player!]!
  currentRound: Round
  topCard: Card
  gameState: String!
}

type Round {
  playerInTurn: Int!
  direction: Int!
  discardPile: [Card!]!
}
```

### Operations

```graphql
# Lines 61-76: What clients can do
type Query {
  game(id: ID!): Game
  availableGames: [Game!]!
  playerHand(gameId: ID!): [Card!]!
}

type Mutation {
  createGame(players: [String!]!): Game!
  joinGame(gameId: ID!, playerName: String!): Game!
  playCard(gameId: ID!, cardIndex: Int!): Game!
  drawCard(gameId: ID!): Game!
  sayUno(gameId: ID!): Game!
}

type Subscription {
  gameUpdated(gameId: ID!): Game!
  gamesListUpdated: [Game!]!
}
```

## Key Implementation: Resolvers (`server/src/resolvers.ts`)

**The implementation - how to fetch/compute each field**

### Query Resolvers

```ts
// Lines 7-18: Read operations
const resolvers = {
  Query: {
    game: (_: any, { id }: { id: string }) => {
      return gameManager.getGame(id);
    },

    availableGames: () => {
      return gameManager.getAllGames();
    },

    playerHand: (_: any, { gameId }: { gameId: string }, context: any) => {
      const game = gameManager.getGame(gameId);
      const playerIndex = context.playerIndex;
      return game.currentRound.hands[playerIndex];
    },
  },
};
```

**Pattern:** `(parent, args, context, info) => data`

### Mutation Resolvers

```ts
// Lines 22-57: Write operations
Mutation: {
  createGame: (_: any, { players }: { players: string[] }) => {
    const game = gameManager.createGame(players)
    // Notify subscribers about games list change
    pubsub.publish('GAMES_LIST_UPDATED', {
      gamesListUpdated: gameManager.getAllGames()
    })
    return game
  },

  playCard: (_: any, { gameId, cardIndex }: any, { pubsub }: any) => {
    // Update game state
    const game = gameManager.playCard(gameId, cardIndex)

    // Notify subscribers of this specific game
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game })

    return game
  },

  drawCard: (_: any, { gameId }: { gameId: string }, { pubsub }: any) => {
    const game = gameManager.drawCard(gameId)
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game })
    return game
  }
}
```

**Key:** Mutations publish events → triggers subscriptions

### Subscription Resolvers

```ts
// Lines 61-72: Real-time updates
Subscription: {
  gameUpdated: {
    subscribe: (_: any, { gameId }: { gameId: string }, { pubsub }: any) => {
      // Return async iterator for channel
      return pubsub.asyncIterator(`GAME_${gameId}`)
    }
  },

  gamesListUpdated: {
    subscribe: (_: any, __: any, { pubsub }: any) => {
      return pubsub.asyncIterator('GAMES_LIST_UPDATED')
    }
  }
}
```

**Key:** Returns async iterator that yields values over time

## Key Implementation: PubSub (`server/src/gameManager.ts`)

**Publish-Subscribe pattern for real-time updates**

### Setup

```ts
// Line 8: Create PubSub instance
import { PubSub } from "graphql-subscriptions";
export const pubsub = new PubSub();
```

### Publishing Events

```ts
// Lines 401-418: When game changes, notify subscribers
class GameManager {
  playCard(gameId: string, cardIndex: number) {
    const game = this.games.get(gameId);
    const newRound = game.currentRound.play(cardIndex);
    game.currentRound = newRound;

    // Publish to channel
    pubsub.publish(`GAME_${gameId}`, {
      gameUpdated: game,
    });

    // Check if game over
    if (newRound.hasWinner()) {
      game.gameState = "FINISHED";
      pubsub.publish(`GAME_${gameId}`, { gameUpdated: game });
    }

    return game;
  }
}
```

## Key Implementation: Apollo Server (`server/src/server.ts`)

**HTTP + WebSocket for queries/mutations/subscriptions**

### Server Setup

```ts
// Lines 8-52: Dual protocol setup
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";

// Create HTTP server
const app = express();
const httpServer = createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// Set up GraphQL over WebSocket
useServer(
  {
    schema,
    context: () => ({ pubsub }),
  },
  wsServer
);

// Apollo Server for HTTP (queries & mutations)
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

await apolloServer.start();

app.use(
  "/graphql",
  cors(),
  express.json(),
  expressMiddleware(apolloServer, {
    context: ({ req }) => ({
      pubsub,
      userId: req.headers.authorization,
    }),
  })
);

httpServer.listen(4000);
```

## Key Implementation: Apollo Client (`client/src/api/graphql.ts`)

**Client-side GraphQL integration**

### Split Link Setup

```ts
// Lines 10-38: Route operations to correct transport
import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// HTTP for queries & mutations
const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

// WebSocket for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
  })
);

// Split based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink, // Send subscriptions to WebSocket
  httpLink // Send queries & mutations to HTTP
);

// Create client
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### Making Queries

```ts
// Lines 62-88: Read data
import { gql } from "@apollo/client";

const GET_GAME = gql`
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
      }
      gameState
    }
  }
`;

export async function fetchGame(gameId: string) {
  const { data } = await client.query({
    query: GET_GAME,
    variables: { id: gameId },
  });
  return data.game;
}
```

### Making Mutations

```ts
// Lines 136-200: Write data
const PLAY_CARD = gql`
  mutation PlayCard($gameId: ID!, $cardIndex: Int!) {
    playCard(gameId: $gameId, cardIndex: $cardIndex) {
      id
      currentRound {
        playerInTurn
        discardPile {
          type
          color
        }
      }
    }
  }
`;

export async function playCard(gameId: string, cardIndex: number) {
  const { data } = await client.mutate({
    mutation: PLAY_CARD,
    variables: { gameId, cardIndex },
  });
  return data.playCard;
}
```

### Subscriptions

```ts
// Lines 348-376: Real-time updates
const GAME_UPDATED = gql`
  subscription OnGameUpdate($gameId: ID!) {
    gameUpdated(gameId: $gameId) {
      id
      players {
        name
        score
      }
      topCard {
        type
        color
      }
    }
  }
`;

export function subscribeToGameUpdates(
  gameId: string,
  callback: (game: Game) => void
) {
  const subscription = client
    .subscribe({
      query: GAME_UPDATED,
      variables: { gameId },
    })
    .subscribe({
      next: ({ data }) => {
        callback(data.gameUpdated);
      },
      error: (error) => {
        console.error("Subscription error:", error);
      },
    });

  // Return unsubscribe function
  return () => subscription.unsubscribe();
}
```

### Integration with Vue

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import {
  subscribeToGameUpdates,
  playCard as playCardMutation,
} from "@/api/graphql";

const game = ref(null);
let unsubscribe;

onMounted(() => {
  // Subscribe to updates
  unsubscribe = subscribeToGameUpdates("game123", (updatedGame) => {
    game.value = updatedGame; // Reactivity updates UI
  });
});

onUnmounted(() => {
  // Clean up subscription
  if (unsubscribe) unsubscribe();
});

async function handlePlayCard(index) {
  await playCardMutation("game123", index);
  // Subscription will receive update automatically
}
</script>
```

## Subscription Flow Diagram

```
1. Client subscribes via WebSocket
   client.subscribe({ query: GAME_UPDATED })

2. Resolver returns async iterator
   pubsub.asyncIterator('GAME_123')

3. Client plays card (mutation)
   playCard(gameId: '123', cardIndex: 2)

4. Mutation updates game & publishes event
   pubsub.publish('GAME_123', { gameUpdated: game })

5. PubSub broadcasts to all subscribers
   → All clients listening to GAME_123 get update

6. Client's subscription callback fires
   next: ({ data }) => updateUI(data.gameUpdated)
```

## Common Exam Questions for Assignment 3

**Q: "Explain the difference between Query, Mutation, and Subscription"**

- **Query:** Read data (HTTP GET-like)
  - Show: `resolvers.ts` lines 7-18
- **Mutation:** Write/modify data (HTTP POST-like)
  - Show: `resolvers.ts` lines 22-57
- **Subscription:** Real-time stream (WebSocket)
  - Show: `resolvers.ts` lines 61-72

**Q: "Walk through what happens when a card is played"**

1. Client calls mutation: `playCard(gameId, cardIndex)`
2. Apollo routes to HTTP (not a subscription)
3. Mutation resolver runs: `gameManager.playCard()`
4. Game state updates
5. Resolver publishes event: `pubsub.publish('GAME_123', ...)`
6. All clients subscribed to that game receive update
7. Their subscription callbacks fire → UI updates

**Q: "Why do you need both HTTP and WebSocket?"**

- **HTTP:** Queries & mutations - request/response pattern
- **WebSocket:** Subscriptions - persistent connection for server push
- **Split link** routes operations to correct transport based on operation type

**Q: "Show me the schema and explain the types"**

- **Show:** `schema.ts` lines 3-59
- **Explain:** "Schema defines what data exists and what operations are possible. `!` means required, `[]` means array. This is the contract between client and server."

**Q: "What's the resolver signature?"**

```ts
(parent, args, context, info) => data;
```

- **parent:** Result from parent field's resolver
- **args:** Arguments passed in query
- **context:** Shared across all resolvers (db, user, pubsub)
- **info:** Query structure metadata (rarely used)

**Q: "How does PubSub work?"**

- **Show:** `gameManager.ts` lines 401-418
- **Explain:** "Publish-subscribe pattern. Mutations publish events to channels. Subscriptions listen to channels. PubSub manages the connections and broadcasts to all listeners."

## Memory Aid for Oral Exam

**Start with the flow:**

1. **"First, let me show the schema"** → `schema.ts`
   - "This defines what clients can request"
2. **"Here are the resolvers"** → `resolvers.ts`
   - "This is the implementation"
3. **"For real-time, we use subscriptions"** → Point to subscription resolver
4. **"When mutations happen, they publish events"** → Show pubsub.publish
5. **"Clients subscribe via WebSocket"** → `client/api/graphql.ts`
6. **"Split link routes operations"** → Show split logic

**Quick Architecture:**

```
Client
  ├─ HTTP → Queries & Mutations
  └─ WebSocket → Subscriptions

Server
  ├─ Apollo Server (HTTP)
  ├─ WebSocket Server
  └─ PubSub (broadcast events)
```

**Key Files:**

- `schema.ts` ← The contract
- `resolvers.ts` ← The implementation
- `gameManager.ts` ← Business logic + PubSub
- `client/api/graphql.ts` ← Client setup & operations
