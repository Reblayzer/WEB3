# Assignment 3: UNO with GraphQL Server

## Overview
**Focus:** GraphQL theory and implementation  
**Stack:** Apollo Server, GraphQL, WebSocket (subscriptions), Vue 3 Client  
**Goal:** Move game state to server, enable real-time multiplayer

---

## Exam Focus Areas
**The examiner will ask about:**
- GraphQL types and queries
- Resolvers
- GraphQL client
- Web sockets
- Server-sent events
- GraphQL subscriptions

### Quick Explanations with Snippets
- **GraphQL types and queries** — SDL defines shapes; clients ask exact fields.
```graphql
type Game { id: ID! players: [Player!]! }
type Query { game(id: ID!): Game }
```
- **Resolvers** — functions that return data for schema fields.
```ts
const resolvers = { Query: { game: (_, { id }) => gameRepo.find(id) } }
```
- **GraphQL client** — Apollo splits HTTP vs WS links, runs operations.
```ts
const client = new ApolloClient({ link: splitLink, cache: new InMemoryCache() })
client.query({ query: GET_GAME, variables: { id } })
```
- **Web sockets** — persistent bidirectional connection (graphql-ws) for live data.
```ts
const wsLink = new GraphQLWsLink(createClient({ url: 'ws://localhost:4000/graphql' }))
```
- **Server-sent events (SSE)** — server pushes one-way stream over HTTP.
```ts
const events = new EventSource('/events')
events.onmessage = (e) => console.log(e.data)
```
- **GraphQL subscriptions** — schema entry + async iterator to push updates.
```ts
const resolvers = { Subscription: { gameUpdated: { subscribe: (_, { id }, { pubsub }) => pubsub.asyncIterator(`GAME_${id}`) } } }
```

---

## 1. GraphQL Types and Queries

### What is GraphQL?
- **Query language** for APIs (alternative to REST)
- **Single endpoint** for all operations
- Client specifies **exactly** what data it needs (no over/under-fetching)
- **Strongly typed** schema

### Schema Definition Language (SDL)

#### Scalar Types
```graphql
# Built-in scalars
String    # UTF-8 string
Int       # 32-bit integer
Float     # Double-precision floating point
Boolean   # true/false
ID        # Unique identifier (serialized as String)
```

#### Object Types
```graphql
type Card {
  type: CardType!       # ! means non-nullable
  color: Color          # nullable (can be null for wild cards)
  number: Int
}

type Player {
  id: ID!
  name: String!
  hand: [Card!]!        # Non-null array of non-null Cards
  score: Int!
}

type Game {
  id: ID!
  players: [Player!]!
  currentRound: Round
  isOver: Boolean!
}
```

#### Enum Types
```graphql
enum Color {
  RED
  YELLOW
  GREEN
  BLUE
}

enum CardType {
  NUMBERED
  SKIP
  REVERSE
  DRAW
  WILD
  WILD_DRAW
}
```

#### Input Types (for arguments)
```graphql
input CreateGameInput {
  playerNames: [String!]!
  targetScore: Int = 500    # Default value
}
```

### Query Type (READ operations)
```graphql
type Query {
  # Get single game by ID
  game(id: ID!): Game
  
  # Get all games
  games: [Game!]!
  
  # Get player's hand
  playerHand(gameId: ID!, playerIndex: Int!): [Card!]!
}
```

### Mutation Type (WRITE operations)
```graphql
type Mutation {
  # Create new game
  createGame(input: CreateGameInput!): Game!
  
  # Play a card
  playCard(gameId: ID!, cardIndex: Int!, color: Color): PlayResult!
  
  # Draw a card
  drawCard(gameId: ID!): Card!
}

type PlayResult {
  success: Boolean!
  error: String
  game: Game
}
```

### Subscription Type (REAL-TIME)
```graphql
type Subscription {
  # Subscribe to game updates
  gameUpdated(gameId: ID!): GameEvent!
  
  # Subscribe to when players join
  playerJoined(gameId: ID!): Player!
}

type GameEvent {
  type: EventType!
  player: Int
  card: Card
  game: Game!
}
```

---

## 2. Resolvers

### What is a Resolver?
A function that **populates data** for a field in the schema. Every field has a resolver.

### Resolver Function Signature
```ts
resolver(parent, args, context, info)
```
- **parent**: Result from parent resolver (for nested fields)
- **args**: Arguments passed to the field
- **context**: Shared data across all resolvers (auth, database, etc.)
- **info**: Query AST information (rarely used)

### Query Resolvers
```ts
const resolvers = {
  Query: {
    // Simple: return from data source
    game: (_, { id }) => {
      return gameManager.getGame(id)
    },
    
    // With context (e.g., authentication)
    games: (_, __, context) => {
      if (!context.user) throw new Error('Unauthorized')
      return gameManager.getAllGames()
    },
    
    playerHand: (_, { gameId, playerIndex }) => {
      const game = gameManager.getGame(gameId)
      return game.currentRound().playerHand(playerIndex)
    }
  }
}
```

### Mutation Resolvers
```ts
const resolvers = {
  Mutation: {
    createGame: (_, { input }) => {
      const game = gameManager.createGame(input.playerNames, input.targetScore)
      return game
    },
    
    playCard: (_, { gameId, cardIndex, color }, { pubsub }) => {
      try {
        const game = gameManager.playCard(gameId, cardIndex, color)
        
        // Publish event for subscriptions
        pubsub.publish(`GAME_${gameId}`, { 
          gameUpdated: { type: 'CARD_PLAYED', game } 
        })
        
        return { success: true, game }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
  }
}
```

### Field Resolvers (Nested Objects)
```ts
const resolvers = {
  // Resolvers for Game type fields
  Game: {
    // Called when 'currentRound' field is requested
    currentRound: (game) => game.currentRound(),
    
    // Called when 'isOver' field is requested
    isOver: (game) => game.isOver(),
    
    // Transform data
    players: (game) => game.players.map((name, i) => ({
      id: i,
      name,
      score: game.score(i)
    }))
  }
}
```

### Subscription Resolvers
```ts
const resolvers = {
  Subscription: {
    gameUpdated: {
      // subscribe returns an AsyncIterator
      subscribe: (_, { gameId }, { pubsub }) => {
        return pubsub.asyncIterator(`GAME_${gameId}`)
      }
    }
  }
}
```

---

## 3. GraphQL Client

### Apollo Client Setup
```ts
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
})

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({ url: 'ws://localhost:4000/graphql' })
)

// Split: route to correct link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,   // Subscriptions → WebSocket
  httpLink  // Queries/Mutations → HTTP
)

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
})
```

### Making Queries
```ts
import { gql } from '@apollo/client'

const GET_GAME = gql`
  query GetGame($gameId: ID!) {
    game(id: $gameId) {
      id
      players {
        name
        score
      }
      currentRound {
        playerInTurn
        topCard {
          type
          color
        }
      }
    }
  }
`

// Execute query
const { data } = await client.query({
  query: GET_GAME,
  variables: { gameId: '123' },
  fetchPolicy: 'network-only'  // Skip cache
})
```

### Making Mutations
```ts
const PLAY_CARD = gql`
  mutation PlayCard($gameId: ID!, $cardIndex: Int!, $color: Color) {
    playCard(gameId: $gameId, cardIndex: $cardIndex, color: $color) {
      success
      error
      game {
        currentRound {
          playerInTurn
        }
      }
    }
  }
`

const { data } = await client.mutate({
  mutation: PLAY_CARD,
  variables: { gameId: '123', cardIndex: 2, color: 'RED' }
})
```

### Subscribing to Updates
```ts
const GAME_UPDATED = gql`
  subscription GameUpdated($gameId: ID!) {
    gameUpdated(gameId: $gameId) {
      type
      player
      card {
        type
        color
      }
    }
  }
`

const subscription = client.subscribe({
  query: GAME_UPDATED,
  variables: { gameId: '123' }
}).subscribe({
  next: ({ data }) => {
    console.log('Game updated:', data.gameUpdated)
  },
  error: (err) => console.error('Subscription error:', err)
})

// Later: cleanup
subscription.unsubscribe()
```

---

## 4. WebSockets

### What is WebSocket?
- **Persistent, bidirectional** connection between client and server
- Unlike HTTP (request-response), server can **push** data anytime
- Lower overhead than HTTP polling

### WebSocket vs HTTP
| HTTP | WebSocket |
|------|-----------|
| Request → Response | Persistent connection |
| Client initiates | Either side can send |
| New connection per request | Single long-lived connection |
| Stateless | Stateful |

### WebSocket Server Setup
```ts
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { createServer } from 'http'

const httpServer = createServer(app)

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
})

// Attach GraphQL subscription handling
useServer({ schema }, wsServer)
```

### WebSocket Lifecycle
```
1. Client: new WebSocket('ws://server/graphql')
2. Server: Connection established
3. Client: Send subscription message
4. Server: Acknowledge subscription
5. Server: Push data when events occur
6. Client: Receive updates in real-time
7. Either: Close connection
```

---

## 5. Server-Sent Events (SSE)

### What is SSE?
- **One-way** stream: Server → Client only
- Uses standard HTTP (simpler than WebSocket)
- Auto-reconnect built-in
- Text-based (typically JSON)

### SSE vs WebSocket
| SSE | WebSocket |
|-----|-----------|
| Server → Client only | Bidirectional |
| HTTP-based | Custom protocol |
| Auto-reconnect | Manual reconnect |
| Simpler | More complex |
| Use for: notifications, feeds | Use for: chat, games |

### SSE Implementation
```ts
// Server (Express)
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  
  // Send event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
  
  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`)
  }, 1000)
  
  req.on('close', () => clearInterval(interval))
})

// Client
const eventSource = new EventSource('/events')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}
```

---

## 6. GraphQL Subscriptions

### How Subscriptions Work
```
1. Client sends subscription query via WebSocket
2. Server registers subscription with PubSub
3. When event occurs, mutation publishes to PubSub
4. PubSub broadcasts to all subscribed clients
5. Clients receive update via WebSocket
```

### PubSub Pattern
```ts
import { PubSub } from 'graphql-subscriptions'

const pubsub = new PubSub()

// In mutation resolver: PUBLISH
playCard: (_, { gameId, cardIndex }) => {
  const result = gameManager.playCard(gameId, cardIndex)
  
  // Publish to channel
  pubsub.publish(`GAME_UPDATED_${gameId}`, {
    gameUpdated: {
      type: 'CARD_PLAYED',
      game: result.game
    }
  })
  
  return result
}

// In subscription resolver: SUBSCRIBE
gameUpdated: {
  subscribe: (_, { gameId }) => {
    return pubsub.asyncIterator(`GAME_UPDATED_${gameId}`)
  }
}
```

### Subscription with Filter
```ts
import { withFilter } from 'graphql-subscriptions'

gameUpdated: {
  subscribe: withFilter(
    () => pubsub.asyncIterator('GAME_EVENTS'),
    (payload, variables) => {
      // Only send to subscribers watching this game
      return payload.gameUpdated.gameId === variables.gameId
    }
  )
}
```

### Production PubSub (Redis)
```ts
// In-memory PubSub only works for single server
// For multiple servers, use Redis

import { RedisPubSub } from 'graphql-redis-subscriptions'

const pubsub = new RedisPubSub({
  connection: {
    host: 'localhost',
    port: 6379
  }
})
```

---

## Quick Reference for Exam

| Topic | Key Points |
|-------|------------|
| **GraphQL Types** | Object, Scalar, Enum, Input, ! = non-null, [] = array |
| **Query** | READ operations, like GET |
| **Mutation** | WRITE operations, like POST/PUT/DELETE |
| **Subscription** | Real-time updates via WebSocket |
| **Resolver** | `(parent, args, context, info)` → returns data |
| **PubSub** | Publish-Subscribe pattern for real-time |
| **WebSocket** | Persistent bidirectional connection |
| **SSE** | Server → Client one-way stream |
| **Apollo Client** | GraphQL client with caching |
| **split link** | Route subscriptions to WebSocket, rest to HTTP |

---

## GraphQL vs REST

| REST | GraphQL |
|------|---------|
| Multiple endpoints | Single endpoint |
| Fixed response shape | Client specifies shape |
| Over-fetching common | Only requested data |
| Multiple requests for related data | Single request |
| HTTP verbs (GET, POST...) | Query, Mutation, Subscription |
