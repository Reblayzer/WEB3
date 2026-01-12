# Exam 3: GraphQL

> **Exam Topics:** GraphQL types and queries, resolvers, GraphQL client, web sockets, server-sent events, GraphQL subscriptions

---

## 1. GraphQL Types and Queries

### What is GraphQL?
GraphQL is a query language for APIs that gives clients the power to request exactly the data they need. Unlike REST, where each endpoint returns a fixed structure, GraphQL has a single endpoint where clients specify the shape of the response. This solves the problems of over-fetching (getting more data than needed) and under-fetching (needing multiple requests to get all data).

### Schema Definition Language (SDL)
The schema defines all the types and operations available in your API. It's like a contract between client and server. The server implements the schema, and clients query against it. GraphQL is strongly typed - every field has a defined type.

### Scalar Types
Scalars are the basic primitive types. They represent leaf values in your data - they don't have sub-fields.

```graphql
String    # Text
Int       # Whole number
Float     # Decimal number
Boolean   # true/false
ID        # Unique identifier (serialized as String)
```

### Object Types
Object types define the structure of your data. Each field has a name and type. The `!` means non-nullable (required), and `[]` means an array.

```graphql
type Card {
  type: CardType!     # Required field
  color: Color        # Optional field (can be null)
  number: Int
}

type Game {
  id: ID!
  players: [Player!]!  # Required array of required Players
}
```

### Query, Mutation, and Subscription
These are the three operation types in GraphQL. Query reads data, Mutation writes data, and Subscription streams real-time updates. They're defined just like object types but have special meaning.

```graphql
type Query {
  game(id: ID!): Game          # Read a game
  games: [Game!]!              # Read all games
}

type Mutation {
  playCard(gameId: ID!, cardIndex: Int!): Game!   # Write operation
  createGame(players: [String!]!): Game!
}

type Subscription {
  gameUpdated(gameId: ID!): Game!   # Real-time stream
}
```

### Input Types
Input types define complex parameters for mutations. Unlike object types, input types can only be used as arguments, not returned. They help organize mutation parameters.

```graphql
input CreateGameInput {
  players: [String!]!
  maxPlayers: Int
  isPrivate: Boolean
}

type Mutation {
  createGame(input: CreateGameInput!): Game!
}
```

### Interfaces and Unions
Interfaces define shared fields that multiple types must implement. Unions group types that don't share fields. Both require a `__resolveType` resolver to determine the concrete type.

```graphql
# Interface - shared fields
interface Card {
  id: ID!
  type: String!
}

type NumberedCard implements Card {
  id: ID!
  type: String!
  color: String!
  number: Int!
}

# Union - no shared fields required
union GameEvent = CardPlayed | PlayerJoined | GameEnded
```

---

## 2. Resolvers

### What are they?
Resolvers are the functions that actually fetch or compute data for each field in your schema. When a client makes a query, GraphQL calls the appropriate resolvers to build the response. Every field can have a resolver, though simple fields often use a default resolver that just returns the property with the same name.

### Resolver Parameters
Every resolver receives four parameters. You don't always need all of them, so unused ones are often written as `_`.

```ts
resolver(parent, args, context, info)
```

- **parent**: The result from the parent field's resolver. For root fields, this is undefined.
- **args**: The arguments passed to this field in the query.
- **context**: Shared data available to all resolvers, like database connections or the current user.
- **info**: Metadata about the query structure. Rarely used.

### Query Resolvers
Query resolvers fetch data. They're the entry points for read operations. Each field in your Query type needs a resolver.

```ts
const resolvers = {
  Query: {
    game: (_, { id }) => gameManager.getGame(id),

    games: (_, __, { user }) => {
      if (!user) throw new Error('Unauthorized')
      return gameManager.getAllGames()
    }
  }
}
```

### Mutation Resolvers
Mutation resolvers modify data and often trigger side effects like publishing events for subscriptions. They should return the updated data.

```ts
Mutation: {
  playCard: (_, { gameId, cardIndex }, { pubsub }) => {
    const game = gameManager.playCard(gameId, cardIndex)
    pubsub.publish(`GAME_${gameId}`, { gameUpdated: game })  // Notify subscribers
    return game
  }
}
```

### Subscription Resolvers
Subscription resolvers don't return data directly. Instead, they return an async iterator that yields values over time. The `pubsub.asyncIterator` creates this iterator for a given channel.

```ts
Subscription: {
  gameUpdated: {
    subscribe: (_, { gameId }, { pubsub }) =>
      pubsub.asyncIterator(`GAME_${gameId}`)
  }
}
```

### Field Resolvers
Field resolvers handle nested data. When a type has a field that needs computation or fetching, you define a resolver for that specific field. The `parent` parameter contains the parent object's data.

```ts
const resolvers = {
  Game: {
    // Resolver for the 'players' field on Game type
    players: (parent) => {
      return playerService.getPlayersByGameId(parent.id)
    }
  }
}
```

### Type Resolvers
When using interfaces or unions, GraphQL needs to know which concrete type an object is. The `__resolveType` resolver examines the object and returns the type name as a string.

```ts
Card: {
  __resolveType(card) {
    if (card.number !== undefined) return 'NumberedCard'
    if (card.action) return 'ActionCard'
    return 'WildCard'
  }
}
```

---

## 3. GraphQL Client (Apollo)

### What is it?
Apollo Client is a library for making GraphQL requests from the browser. It handles sending queries and mutations, caching results, and managing subscriptions over WebSocket. It works with any GraphQL server.

### Split Link Setup
The client needs different connections for different operations. HTTP works for queries and mutations, but subscriptions need WebSocket for real-time streaming. The split link routes requests to the appropriate connection based on the operation type.

```ts
const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' })
const wsLink = new GraphQLWsLink(createClient({ url: 'ws://localhost:4000/graphql' }))

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,    // Subscriptions use WebSocket
  httpLink   // Queries and mutations use HTTP
)

const client = new ApolloClient({ link: splitLink, cache: new InMemoryCache() })
```

### Making Queries
Queries read data. You write the query using the `gql` tag, specify what fields you want, and pass any variables. The response contains only the fields you requested.

```ts
const { data } = await client.query({
  query: gql`
    query GetGame($id: ID!) {
      game(id: $id) {
        id
        players { name score }
      }
    }
  `,
  variables: { id: '123' }
})
```

### Making Mutations
Mutations modify data. They work like queries but use `client.mutate()`. You typically return the updated data so the cache stays current.

```ts
await client.mutate({
  mutation: gql`
    mutation PlayCard($gameId: ID!, $cardIndex: Int!) {
      playCard(gameId: $gameId, cardIndex: $cardIndex) {
        id
        currentRound { playerInTurn }
      }
    }
  `,
  variables: { gameId: '123', cardIndex: 2 }
})
```

### Subscribing to Updates
Subscriptions give you a stream of updates. You subscribe and provide callbacks for each event. Don't forget to unsubscribe when you're done to avoid memory leaks.

```ts
const subscription = client.subscribe({
  query: gql`
    subscription OnGameUpdate($gameId: ID!) {
      gameUpdated(gameId: $gameId) { id players }
    }
  `,
  variables: { gameId: '123' }
}).subscribe({
  next: ({ data }) => console.log('Update:', data),
  error: (err) => console.error(err)
})

// Later: subscription.unsubscribe()
```

---

## 4. WebSockets

### What are they?
WebSocket is a protocol for persistent, bidirectional communication between client and server. Unlike HTTP where the client must initiate every request, WebSocket keeps a connection open so either side can send messages at any time. This makes it ideal for real-time features.

### HTTP vs WebSocket
HTTP is request-response: client asks, server answers, connection closes. WebSocket establishes a connection that stays open. The server can push data to the client without the client asking. This is essential for live updates, chat, and multiplayer games.

| HTTP | WebSocket |
|------|-----------|
| Client initiates | Either side can send |
| New connection per request | Persistent connection |
| Stateless | Stateful |
| Higher overhead | Lower overhead |

### WebSocket Lifecycle
The connection goes through several states: connecting, open, and closed. Once open, both sides can send messages freely until one side closes the connection.

```
1. Client initiates connection
2. Server accepts (handshake)
3. Connection is open - messages flow both ways
4. Either side closes connection
```

---

## 5. Server-Sent Events (SSE)

### What are they?
Server-Sent Events provide one-way streaming from server to client over HTTP. The client opens a connection, and the server pushes events through it. Unlike WebSocket, SSE is simpler and uses standard HTTP, but only supports server-to-client messages.

### SSE vs WebSocket
SSE is simpler to implement and works over regular HTTP, making it easier to use with existing infrastructure. It has built-in reconnection if the connection drops. However, it's one-way only - the client can't send messages back through the same connection.

| SSE | WebSocket |
|-----|-----------|
| Server to client only | Bidirectional |
| Uses HTTP | Custom protocol |
| Auto-reconnect | Manual reconnect |
| Simpler setup | More complex |

### When to Use Each
Use SSE for notifications, live feeds, or any scenario where the server pushes updates but doesn't need responses through the same channel. Use WebSocket when you need true bidirectional communication, like chat or real-time games.

```ts
// Server sends events
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.write(`data: ${JSON.stringify({ type: 'update' })}\n\n`)
})

// Client receives events
const events = new EventSource('/events')
events.onmessage = (e) => console.log(JSON.parse(e.data))
```

---

## 6. GraphQL Subscriptions

### What are they?
GraphQL subscriptions enable real-time updates through the GraphQL API. When a client subscribes, they receive updates whenever the data they're watching changes. Under the hood, this typically uses WebSocket, but the GraphQL layer provides a consistent API.

### How They Work
Subscriptions use the publish-subscribe (PubSub) pattern. When data changes (usually in a mutation), the server publishes an event to a channel. All clients subscribed to that channel receive the update.

```
1. Client sends subscription query (via WebSocket)
2. Server registers client with PubSub for that channel
3. Some mutation changes data
4. Mutation publishes event to PubSub
5. PubSub broadcasts to all subscribers
6. Each client receives the update
```

### PubSub Implementation
PubSub manages channels and subscribers. The mutation publishes events, and the subscription resolver creates an iterator that yields events from the channel.

```ts
const pubsub = new PubSub()

// Mutation publishes when data changes
Mutation: {
  playCard: (_, args, { pubsub }) => {
    const result = gameManager.playCard(args)
    pubsub.publish(`GAME_${args.gameId}`, { gameUpdated: result.game })
    return result
  }
}

// Subscription subscribes to the channel
Subscription: {
  gameUpdated: {
    subscribe: (_, { gameId }, { pubsub }) =>
      pubsub.asyncIterator(`GAME_${gameId}`)
  }
}
```

### Filtering
Sometimes you want to filter which events reach which subscribers. The `withFilter` helper lets you add a predicate that determines if an event should be sent to a particular subscriber.

```ts
subscribe: withFilter(
  () => pubsub.asyncIterator('GAME_EVENTS'),
  (payload, variables) => payload.gameId === variables.gameId  // Only matching games
)
```

---

## 7. Data Validation with Zod

### What is it?
Zod is a runtime validation library. TypeScript types disappear at runtime, so you can't trust data from users or external APIs. Zod validates data at runtime and can generate TypeScript types from validators.

### Why use it?
User input and API responses can be anything at runtime. Zod ensures data matches expected shapes before your code uses it, preventing runtime errors.

```ts
import { z } from 'zod'

// Define a schema
const CardSchema = z.object({
  type: z.enum(['NUMBERED', 'WILD', 'ACTION']),
  color: z.string().optional(),
  number: z.number().min(0).max(9).optional()
})

// Infer TypeScript type from schema
type Card = z.infer<typeof CardSchema>

// Validate data
const result = CardSchema.safeParse(userInput)
if (result.success) {
  const card = result.data  // Typed as Card
} else {
  console.error(result.error)
}
```

### Common Zod Methods
```ts
z.string()                    // String type
z.number()                    // Number type
z.boolean()                   // Boolean type
z.array(z.string())          // Array of strings
z.object({ name: z.string() }) // Object shape
z.enum(['A', 'B', 'C'])       // Enum values
z.literal('specific')         // Exact value
.optional()                   // Makes field optional
.nullable()                   // Allows null
z.coerce.number()             // Convert string to number
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| What is a resolver? | A function that returns data for a field. Parameters: parent, args, context, info |
| Query vs Mutation vs Subscription? | Query reads data, Mutation writes data, Subscription streams real-time updates |
| How do subscriptions work? | PubSub pattern over WebSocket - mutations publish events, subscriptions listen for them |
| WebSocket vs SSE? | WebSocket is bidirectional and more complex; SSE is server-to-client only but simpler |
| What does the split link do? | Routes subscriptions to WebSocket and queries/mutations to HTTP |
| Why GraphQL over REST? | Client specifies exactly what data it needs, single endpoint, strongly typed schema |
| Input type vs Object type? | Input types are for mutation arguments only; object types are for return values |
| What is __resolveType? | Resolver that tells GraphQL which concrete type an interface/union object is |
| Why use Zod? | Runtime validation because TypeScript types don't exist at runtime |

---

## Where It's Applied in Assignment 3

| Concept | File | Location |
|---------|------|----------|
| **Schema Types** | `server/src/schema.ts:3-59` | `Card`, `Player`, `Game`, `AvailableGame`, `PlayerHand`, `GameEvent` |
| **Scalar Types** | `server/src/schema.ts` | String, Int, Boolean, ID throughout schema |
| **`!` and `[]` syntax** | `server/src/schema.ts:25` | `players: [Player!]!` - required array of required Players |
| **Query Type** | `server/src/schema.ts:61-65` | `game`, `availableGames`, `playerHand` queries |
| **Mutation Type** | `server/src/schema.ts:67-76` | `createGame`, `joinGame`, `startGame`, `playCard`, `drawCard`, `sayUno`, etc. |
| **Subscription Type** | `server/src/schema.ts:78-81` | `gameUpdated`, `gamesListUpdated` |
| **Query Resolvers** | `server/src/resolvers.ts:7-18` | `game`, `availableGames`, `playerHand` resolver functions |
| **Mutation Resolvers** | `server/src/resolvers.ts:22-57` | 8 mutation handlers calling GameManager |
| **Subscription Resolvers** | `server/src/resolvers.ts:61-72` | `pubsub.asyncIterator(['GAME_${gameId}'])` |
| **Resolver Args** | `server/src/resolvers.ts` | `(_: any, { id }, { gameId, playerId })` destructuring |
| **Apollo Client** | `client/src/api/graphql.ts:35-38` | `new ApolloClient({ link: splitLink, cache })` |
| **Split Link** | `client/src/api/graphql.ts:22-32` | Routes subscriptions to WebSocket, queries to HTTP |
| **GraphQL Queries** | `client/src/api/graphql.ts:62-130` | `GetAvailableGames`, `GetGame`, `GetPlayerHand` with `gql` tag |
| **GraphQL Mutations** | `client/src/api/graphql.ts:136-343` | `createGame`, `joinGame`, `playCard`, etc. with `client.mutate()` |
| **Subscriptions** | `client/src/api/graphql.ts:348-400` | `subscribeToGameUpdates`, `subscribeToGamesListUpdates` |
| **PubSub** | `server/src/gameManager.ts:8` | `export const pubsub = new PubSub()` |
| **PubSub Publish** | `server/src/gameManager.ts:401-418` | `pubsub.publish('GAME_${gameId}', { gameUpdated: ... })` |
| **WebSocket Server** | `server/src/server.ts:8-30` | `WebSocketServer` with `graphql-ws` |
| **WebSocket Client** | `client/src/api/graphql.ts:10-14` | `GraphQLWsLink` connecting to `ws://localhost:4000/graphql` |
