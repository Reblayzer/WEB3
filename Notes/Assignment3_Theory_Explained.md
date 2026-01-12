# Assignment 3: GraphQL & Real-Time Communication - Theory Explained

## What is GraphQL and Why It Matters

GraphQL is a query language for APIs. It's an alternative to REST that solves several common problems. With REST, you typically have multiple endpoints, each returning a fixed set of data. If you need data from multiple endpoints, you make multiple requests. If an endpoint returns more data than you need, you're downloading unnecessary information. GraphQL solves this with a single endpoint where clients specify exactly what data they want.

When you query GraphQL, you're asking for specific fields on specific types. The server responds with exactly those fields, nothing more, nothing less. This prevents both over-fetching (getting data you don't need) and under-fetching (having to make multiple requests to get related data). You can get data from multiple types in a single request because fields can be nested.

## The GraphQL Schema and Type System

GraphQL APIs are defined by a schema, which is a description of what data is available and what operations you can perform. The schema uses a type system to define the shape of every piece of data.

### Scalar Types

The foundation of the type system is scalar types. These are simple values: strings, integers, floating-point numbers, booleans, and IDs. Scalars are leaf values—you can't query into them further. When the schema says a field is an Int, the server will return an integer, not an object.

### Object Types

Most of your schema consists of object types. Each object type has fields, and each field has a type. An object type represents something in your domain—a Player, a Game, a Card. When you query a field of an object type, you specify what fields of that object you want back.

### Enums

Enums are a special kind of type representing a fixed set of possible values. For a card game, you might define a Color enum with values RED, BLUE, GREEN, and YELLOW. If a schema field is of type Color, the server can only return one of those four values. This makes validation automatic and prevents invalid states.

### Input Types

When clients send data to the server (in mutations), that data has a type too. Input types are like object types, but they're specifically for data coming in. This allows the server to validate that clients are sending the right kind of data.

### Nullability

In GraphQL, by default, any field can be null. But you can mark a field as non-nullable with an exclamation mark. This tells the client "this field will never be null." You can also mark arrays as non-null, either the array itself or the items within it. This explicit nullability in the schema helps clients write safer code because they know what can and can't be null.

## Queries and Mutations: Reading and Writing Data

GraphQL distinguishes between operations that read data (queries) and operations that write or modify data (mutations). This separation makes intent clear.

### Query Operations

A query is a request for data. You specify which root fields you want, and for each one, which nested fields you want. The server's resolver function handles each field, fetching or computing the data and returning it. The response structure mirrors the shape of your query.

### Mutation Operations

A mutation is a request to modify data. Mutations are more explicit than queries because their name makes it clear something might change. You invoke a mutation like a function, passing arguments that specify what to change and how to change it. The mutation resolver does the work and returns the new state.

### Subscriptions

Subscriptions are for real-time updates. Instead of a query that returns once, a subscription is a persistent connection that sends updates whenever something changes. The client subscribes to a subscription, and the server pushes updates as events occur. This is how multiplayer games get real-time updates without constantly polling.

## Resolvers: The Functions Behind the Schema

Every field in a GraphQL schema needs a resolver—a function that returns the value for that field. The resolver receives several arguments: the parent object (the value of the parent field), the arguments passed to this field, a context object shared across the request, and metadata about the query.

### Query Resolvers

A query resolver handles a root query field. It usually fetches data from a database or service and returns it. For example, a `game` query resolver would take a game ID, look up that game in the database, and return the game object.

### Field Resolvers

After a query returns an object, you might ask for fields on that object. Each field needs a resolver. Often these are simple—if you ask for `game.playerCount`, the resolver just returns the length of the players array. But you can have custom logic. Maybe you ask for `game.playerNames` and the resolver maps the players array to just the names.

### Mutation Resolvers

A mutation resolver makes a change and returns the result. It might add a record to the database and return the new record, or apply game logic and return the updated game state. Mutation resolvers are often more complex than query resolvers because they involve side effects.

### Subscription Resolvers

A subscription resolver sets up a stream of updates. Instead of returning a single value, it returns an async iterator that yields values over time. When you publish to a subscription, the resolver sends that value to all subscribers.

## The GraphQL Client and Apollo

To use a GraphQL API from a browser, you need a client library. Apollo Client is the most popular choice. Apollo Client handles queries, mutations, and subscriptions. It also provides caching so that repeated queries don't hit the server unnecessarily.

### Connection Setup

Apollo Client needs to know where your GraphQL server is. For queries and mutations, you typically use HTTP. For subscriptions, you need a persistent connection, usually WebSocket. Apollo handles both, splitting requests to the appropriate transport automatically.

### Executing Operations

From your application code, you tell Apollo to execute a query, mutation, or subscription. You provide the operation as a GraphQL string, along with any variables. Apollo sends this to the server and returns a promise (for queries and mutations) or observable (for subscriptions) that resolves with the result.

### Caching Strategy

Apollo Client maintains a cache of query results. When you request data that's already in the cache, Apollo returns the cached version without hitting the server. You can configure cache behavior per query, deciding whether to use the cache, bypass it, or update it after fetching from the server.

## WebSockets and Real-Time Communication

WebSocket is a protocol that enables persistent, bidirectional communication between client and server over a single TCP connection.

### How WebSocket Works

A WebSocket starts as an HTTP request but upgrades to a persistent connection. Once established, either side can send messages at any time without waiting for a request. This is fundamentally different from HTTP, which is request-response: the client asks, the server answers, the connection closes. With WebSocket, the server can push data to the client whenever something happens.

### WebSocket for GraphQL Subscriptions

GraphQL subscriptions typically use WebSocket transport. The client opens a WebSocket, then sends a subscription query. The server acknowledges the subscription and begins sending updates. When the server publishes new data, it sends it to all subscribed clients. The client receives updates in real time.

### Advantages and Trade-offs

WebSocket is efficient for real-time applications because there's no overhead of establishing a new HTTP connection for each message. The connection persists, so latency is low. The trade-off is that WebSockets are stateful—the server must remember which clients are subscribed to what. This makes scaling to multiple servers more complex.

## Server-Sent Events: An Alternative to WebSocket

Server-Sent Events (SSE) is an alternative to WebSocket for real-time updates. Instead of a bidirectional persistent connection, SSE is one-way: the server sends events to the client.

### How SSE Works

The client makes an HTTP request with the special `Accept: text/event-stream` header. The server responds with a stream that stays open indefinitely. The server can then send events at any time by writing them to this stream. The client's browser automatically parses events and delivers them to the application.

### When to Use SSE

SSE is simpler than WebSocket in many ways—it's just HTTP, it auto-reconnects, and it's easier to scale. Use SSE when you need one-way communication from server to client, like notifications or activity feeds. Use WebSocket when you need bidirectional communication, like in real-time games or collaborative editing where clients also send information to the server.

## The Publish-Subscribe Pattern for Real-Time Updates

When you want to push updates to multiple subscribed clients, the publish-subscribe pattern works well. You have a central publish-subscribe system. Subscribers register interest in certain topics. When someone publishes a message to a topic, all subscribers get the message.

### How PubSub Works with GraphQL

In the subscription resolver, you subscribe to a topic. When the resolver function is called, it returns an async iterator that yields messages from that topic. When you want to trigger an update—usually in a mutation resolver—you publish to that topic. The PubSub system delivers the message to all subscribers.

### In-Memory vs Distributed PubSub

For a single server, an in-memory PubSub works fine. But if you scale to multiple servers behind a load balancer, you need a distributed system. Redis PubSub is a common choice. You connect each server instance to Redis, and messages published on one server are delivered to all subscribed clients across all servers.

## Real-Time Multiplayer Architecture

Building a real-time multiplayer game involves coordinating game state across clients. Typically, the server holds the authoritative state. Clients send actions (I want to play this card), the server applies the action, updates the state, and broadcasts the new state to all players via subscriptions.

### Consistency and Latency

There's a trade-off between consistency and latency. If you wait for the server to confirm every action, the game feels responsive only if the latency is low. Optimistically updating the client UI while waiting for server confirmation makes the game feel snappier, but risks inconsistency if the server rejects the action.

### Handling Disconnections

Real-time communication over the network isn't guaranteed. Connections can drop. Good applications handle this gracefully: they notice disconnection, attempt to reconnect, queue actions sent while disconnected, and resynchronize state when reconnection happens.
