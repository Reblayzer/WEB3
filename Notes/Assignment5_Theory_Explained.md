# Assignment 5: React, Redux & RxJS - Theory Explained

## Understanding React and One-Way Data Flow

React is a JavaScript library for building user interfaces. Its core idea is that your UI is a function of your state. When state changes, you call the function again to get the new UI. React then figures out what changed and updates the DOM efficiently.

One-way data flow means information flows in a single direction: from parent to child through props, and from child to parent through callbacks. This makes applications predictable. You can trace how data influences the UI by following the props and callbacks. You can't have confusing situations where changes in the child mysteriously affect the parent.

## Redux: State Management Architecture

As React applications grow, managing state becomes complex. Multiple components might need the same data. Components get deeply nested, requiring "prop drilling" where you pass the same prop through many layers. Redux solves this by providing a central store where all state lives.

### The Redux Loop

Redux codifies a specific pattern for managing state: actions describe what happened, reducers describe how state changes, and the store holds the state. When something happens in your app, you dispatch an action. The store sends the action and current state to the reducer. The reducer returns the new state. The store notifies all subscribers that state changed. React components re-render with the new state.

This loop is predictable and debuggable. Every state change is initiated by an action, which is a simple object describing what happened. You can log all actions and replay them to recreate any state. This is incredibly valuable for debugging.

### Why Dispatch Instead of Modifying State?

You might wonder why you don't just modify the state directly. The answer is that this pattern creates a clear record of changes. Each action is a fact about something that happened. By dispatching an action rather than modifying state directly, you create a log of all changes. You also enable features like undo/redo and time-travel debugging. Additionally, it's a single point to validate changes—the reducer can refuse to apply an invalid action rather than the validation being scattered throughout your code.

## Reducers: Pure Functions Transforming State

A reducer is a function that takes the current state and an action, and returns the new state. The name comes from `Array.reduce`, which accumulates values using a similar pattern.

### The Reducer Contract

Reducers must be pure functions. Given the same state and action, they must always return the same new state. They can't have side effects. They can't make API calls. This constraint is intentional—it keeps reducers testable and makes the data flow predictable.

### Immutable Updates

Reducers must never mutate the state argument. Even though you're returning a new state, you must create new objects/arrays rather than modifying the original. This is how React detects changes: it uses reference equality, so `newState === oldState` being false tells React something changed.

### Handling Different Actions

A reducer typically uses a switch statement to handle different action types. Each case calculates the new state appropriate for that action. It's important to always have a default case that returns the state unchanged—this handles unknown action types gracefully.

## Redux Toolkit Slices: Modern Redux

Redux Toolkit simplifies Redux by automating boilerplate. A slice bundles together a reducer, action creators, and initial state for a feature.

### What Slices Provide

When you create a slice, you define the initial state and reducer logic. Redux Toolkit uses Immer internally, so you can write code that looks like you're mutating state, but actually creates new state immutably. It auto-generates action creators, so you don't write those manually. It auto-generates action type strings that follow conventions.

### Organizing by Feature

Each slice typically corresponds to a feature of your application. You might have a game slice for game-related state, a player slice for player state, etc. This keeps code organized and makes it clear where to find logic for a particular feature.

### Using Multiple Slices

In a large app, you combine multiple slices into a store. Each slice's reducer handles its portion of state. When an action is dispatched, Redux applies it to all slices (each reducer gets the full action) so different slices can respond to the same action if needed.

## Thunks: Handling Asynchronous Logic

Reducers must be pure, so they can't make API calls or other async operations. Thunks are the Redux way to handle async logic. A thunk is a function that's delayed—it's called later to perform some work.

### Creating and Using Thunks

A thunk is a function that receives `dispatch` and `getState` as arguments. You call getState to access the current state. You dispatch actions to trigger state changes. Redux Toolkit provides `createAsyncThunk` which handles the common pattern of async work (loading, success, error states). You define what the async work is and what the success/error payloads are, and Redux Toolkit generates the thunk and handles dispatching the appropriate actions.

### Handling Loading and Error States

Good UIs show loading states while data is fetching and error states if something goes wrong. With Redux Toolkit, when you create an async thunk, it automatically creates pending, fulfilled, and rejected action types. You handle each in the slice's reducers, typically setting a loading flag or error message.

### Access to State

Because thunks receive getState, you can access the current state before making requests. This is useful for conditional logic: maybe you don't fetch data if it's already in the store.

## RxJS Observables: Streams of Values Over Time

RxJS brings functional reactive programming to JavaScript. The core concept is the observable: a stream of values that arrive over time.

### Observables vs Promises

A promise represents a single future value. An observable represents multiple values arriving over time. Promises auto-start—when you create one, it begins executing. Observables are lazy—nothing happens until someone subscribes. Promises can't be cancelled once started. Observables can be unsubscribed.

### Creating Observables

You can create observables from events, timers, promises, arrays, or from scratch using the Observable constructor. RxJS provides factory functions like `interval()` that emits 0, 1, 2... every N milliseconds, `fromEvent()` that creates an observable from DOM events, and `timer()` that emits after a delay.

### Subscribing

To use an observable, you subscribe. You provide handlers for `next` (new value), `error` (something went wrong), and `complete` (stream is done). The subscription object that's returned has an `unsubscribe()` method to stop receiving values.

### WebSocket Observables

RxJS provides `webSocket()` which creates an observable from a WebSocket connection. It handles connection setup, reconnection on failure, and message parsing. This is valuable for real-time multiplayer games where you need continuous server updates.

## Subjects: Observables That Are Also Observers

A Subject is an observable that you can also push values to. It's like a multicast channel: multiple subscribers receive each value.

### Different Subject Types

`Subject` is the basic type. New subscribers only get values from the point they subscribe forward. `BehaviorSubject` always has a current value and immediately gives that to new subscribers. `ReplaySubject` remembers the last N values and replays them to new subscribers. `AsyncSubject` only emits the last value when the subject completes.

### Using Subjects for Event Broadcasting

Subjects are useful for making custom events. You can create a subject and have different parts of your app publish to it and subscribe to it. This decouples the parts because they don't need to know about each other, just about the subject.

### BehaviorSubject for Current State

BehaviorSubject is particularly useful for state in RxJS-heavy apps. It represents the current state and pushes new state values whenever they change. Components subscribe to receive current state and updates automatically.

## RxJS Operators: Transforming Streams

Operators let you transform observables. They take an observable and return a new observable with transformed values. You chain operators using `pipe()`.

### Transformation Operators

`map()` transforms each value. `flatMap()` lets you switch to a different observable for each value. `scan()` accumulates like reduce. `pluck()` extracts a property from each value.

### Filtering Operators

`filter()` keeps only values matching a predicate. `take()` takes the first N values then completes. `takeUntil()` takes values until another observable emits. `distinctUntilChanged()` skips values that are the same as the previous value. `debounceTime()` waits for silence before emitting.

### Error Handling

`catchError()` catches errors and returns an alternative observable. `retry()` resubscribes to the source on error. These operators make your streams resilient.

### Combining Streams

`merge()` combines multiple observables, emitting from each as they produce values. `concat()` chains observables: waits for the first to complete before starting the second. `combineLatest()` combines multiple streams, emitting whenever any input emits (with the latest value from each).

## Merge vs Concat: Combining Observables

When you have multiple streams, you often need to combine them. The choice between merge and concat depends on the semantics you want.

### Merge: Interleaved Values

Merge subscribes to all sources simultaneously. Values from any source are passed through. Think of merging two streams of chat messages from different users—you want to see all messages as they arrive, interleaved.

### Concat: Sequential Processing

Concat subscribes to the first source and waits for it to complete before subscribing to the next. If you concat a stream that fetches users, then a stream that fetches posts, you get all users first, then all posts, in sequence.

### RaceCondition vs RaceToFirst

Merge means all sources are active—good for parallel operations. Concat means sources are sequential—good when one depends on the other. For competitive scenarios (whichever completes first), use `race()`.

## Bringing It Together: React + Redux + RxJS

A mature React application might use Redux for state management and RxJS for real-time operations. Redux Thunks dispatch actions to update state. RxJS observables handle real-time streams like WebSockets. Components use react-redux hooks to access Redux state and dispatch actions. Side effects (API calls, WebSocket subscription) happen in thunks or dedicated effect handlers.

### Integration Pattern

A thunk might open a WebSocket observable, subscribe to it, and dispatch actions as data arrives. Redux state holds the current game state. Components re-render when Redux state changes. User interactions dispatch actions or emit to subjects. The data flows in a loop: UI → dispatch → reducer → new state → re-render.

This combination is powerful because Redux provides a single, auditable source of truth for state, while RxJS handles the complexity of real-time streams. Each library does what it does best.
