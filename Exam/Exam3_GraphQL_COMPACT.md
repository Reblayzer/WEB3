# GraphQL - Quick Reference

## Core Concepts

**GraphQL vs REST:**

- Single endpoint vs multiple endpoints
- Client specifies exact data needed
- Solves over-fetching & under-fetching

## Schema Types

### Scalars

```graphql
String Boolean Int Float ID
```

### Object Type

```graphql
type Game {
  id: ID! # Required
  players: [Player!]! # Required array of required Players
  winner: Player # Optional (nullable)
}
```

- `!` = non-nullable (required)
- `[]` = array

### Operations

```graphql
type Query {
  game(id: ID!): Game # Read
}

type Mutation {
  playCard(gameId: ID!, cardIndex: Int!): Game! # Write
}

type Subscription {
  gameUpdated(gameId: ID!): Game! # Real-time stream
}
```

### Input Types (For Mutation Arguments)

```graphql
input CreateGameInput {
  players: [String!]!
  maxPlayers: Int
}

type Mutation {
  createGame(input: CreateGameInput!): Game!
}
```

### Interfaces & Unions

```graphql
# Interface - shared fields
interface Card {
  id: ID!
  type: String!
}

type NumberedCard implements Card {
  id: ID!
  type: String!
  number: Int!
}

# Union - no shared fields required
union GameEvent = CardPlayed | PlayerJoined | GameEnded
```

## Resolvers

Every field can have a resolver function

### Resolver Parameters

```ts
resolver(parent, args, context, info);
```

- **parent**: Result from parent resolver
- **args**: Field arguments
- **context**: Shared data (DB, user, pubsub)
- **info**: Query metadata (rarely used)

### Query Resolvers

```ts
Query: {
  game: (_, { id }) => gameManager.getGame(id),
  games: (_, __, { user }) => {
    if (!user) throw new Error('Unauthorized')
    return gameManager.getAllGames()
  }
}
```

### Mutation Resolvers

```ts
Mutation: {
  playCard: (_, { gameId, cardIndex }, { pubsub }) => {
    const game = gameManager.playCard(gameId, cardIndex);
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game }); // Notify subscribers
    return game;
  };
}
```

### Subscription Resolvers

```ts
Subscription: {
  gameUpdated: {
    subscribe: (_, { gameId }, { pubsub }) =>
      pubsub.asyncIterator(`GAME_${gameId}`);
  }
}
```

### Type Resolvers (Interfaces/Unions)

```ts
Card: {
  __resolveType(card) {
    if (card.number !== undefined) return 'NumberedCard'
    if (card.action) return 'ActionCard'
    return 'WildCard'
  }
}
```

## Apollo Client Setup

### Split Link (HTTP + WebSocket)

```ts
const httpLink = new HttpLink({ uri: "http://localhost:4000/graphql" });
const wsLink = new GraphQLWsLink(
  createClient({ url: "ws://localhost:4000/graphql" })
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" && def.operation === "subscription"
    );
  },
  wsLink, // Subscriptions → WebSocket
  httpLink // Queries/Mutations → HTTP
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### Query

```ts
const { data } = await client.query({
  query: gql`
    query GetGame($id: ID!) {
      game(id: $id) {
        id
        players {
          name
        }
      }
    }
  `,
  variables: { id: "123" },
});
```

### Mutation

```ts
await client.mutate({
  mutation: gql`
    mutation PlayCard($gameId: ID!, $cardIndex: Int!) {
      playCard(gameId: $gameId, cardIndex: $cardIndex) {
        id
      }
    }
  `,
  variables: { gameId: "123", cardIndex: 2 },
});
```

### Subscription

```ts
const subscription = client
  .subscribe({
    query: gql`
      subscription OnGameUpdate($gameId: ID!) {
        gameUpdated(gameId: $gameId) {
          id
          players
        }
      }
    `,
    variables: { gameId: "123" },
  })
  .subscribe({
    next: ({ data }) => console.log(data),
    error: (err) => console.error(err),
  });

// Cleanup!
subscription.unsubscribe();
```

## WebSocket vs SSE

| Feature   | WebSocket     | SSE                  |
| --------- | ------------- | -------------------- |
| Direction | Bidirectional | Server → Client only |
| Protocol  | Custom        | HTTP                 |
| Reconnect | Manual        | Automatic            |
| Use case  | Games, chat   | Notifications, feeds |

## GraphQL Subscriptions (PubSub Pattern)

```
1. Client subscribes (via WebSocket)
2. Mutation publishes to channel
3. PubSub broadcasts to subscribers
4. All subscribers receive update
```

### PubSub Implementation

```ts
const pubsub = new PubSub();

// Publish from mutation
pubsub.publish("GAME_123", { gameUpdated: game });

// Subscribe
pubsub.asyncIterator("GAME_123");
```

### Filtering Events

```ts
subscribe: withFilter(
  () => pubsub.asyncIterator("EVENTS"),
  (payload, variables) => payload.id === variables.id
);
```

## Zod Validation

Runtime validation (TypeScript types don't exist at runtime)

```ts
const CardSchema = z.object({
  type: z.enum(["NUMBERED", "WILD"]),
  color: z.string().optional(),
  number: z.number().min(0).max(9).optional(),
});

type Card = z.infer<typeof CardSchema>;

const result = CardSchema.safeParse(input);
if (result.success) {
  const card = result.data; // Typed as Card
}
```

### Common Zod Types

```ts
z.string();
z.number();
z.boolean();
z.array(z.string());
z.object({ name: z.string() });
z.enum(["A", "B"]);
z.literal("exact").optional().nullable();
```

## Quick Decisions

**Query vs Mutation vs Subscription?**

- Query → Read data
- Mutation → Write/modify data
- Subscription → Real-time updates

**When resolver needed?**

- Root operations (Query/Mutation/Subscription) → Always
- Fields → Only if needs custom logic (default returns property)

**HTTP vs WebSocket?**

- Queries/Mutations → HTTP
- Subscriptions → WebSocket

## Memory Aid

**GraphQL = 3 Parts:**

1. **Schema** = Contract (what's possible)
2. **Resolvers** = Implementation (how to get data)
3. **Client** = Requester (what you want)

**Subscription Flow:**
Mutation → Publish → PubSub → Subscribers → Update
