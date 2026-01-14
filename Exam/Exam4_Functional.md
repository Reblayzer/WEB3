# Exam 4: Functional Programming

> **Assignment 4 - Core Goal:** Write predictable, testable logic using functional principles.

**You must understand:**

- Pure vs impure functions
- Immutability
- Higher-order functions (map, filter, reduce, flatMap)
- Function composition and pipelines
- Currying and partial application
- Persistent data structures (immutable.js)
- Side effects and how to isolate them (sandwich model)

**Key Idea:** Functional programming minimizes bugs by avoiding mutation and separating computation from side effects.

---

## Table of Contents

1. [Pure vs Impure Functions](#1-pure-vs-impure-functions)
2. [Immutability](#2-immutability)
3. [Higher-Order Functions](#3-higher-order-functions)
4. [Function Composition and Pipelines](#4-function-composition-and-pipelines)
5. [Currying and Partial Application](#5-currying-and-partial-application)
6. [Persistent Data Structures](#6-persistent-data-structures)
7. [Side Effects and Isolation (Sandwich Model)](#7-side-effects-and-isolation-sandwich-model)
8. [Functors and Monads](#8-functors-and-monads)
9. [Assignment 4 Implementation](#9-assignment-4-implementation)
10. [Exam Questions & Answers](#10-exam-questions--answers)

---

## 1. Pure vs Impure Functions

### What is a Pure Function?

A **pure function** has two properties:

1. **Deterministic**: Same inputs always produce the same output
2. **No side effects**: Doesn't modify external state, no I/O, no randomness

```ts
// ✅ PURE - deterministic, no side effects
function add(a: number, b: number): number {
  return a + b;
}

// ✅ PURE - only depends on parameters
function canPlay(index: number, round: Round): boolean {
  const card = round.hands[round.playerInTurn!][index];
  const top = round.discardPile[0];
  return card.color === top.color || card.type === top.type;
}

// ✅ PURE - creates new array, doesn't modify input
function addCard(hand: Card[], card: Card): Card[] {
  return [...hand, card];
}
```

### What is an Impure Function?

```ts
// ❌ IMPURE - modifies external state
let total = 0;
function addToTotal(n: number): number {
  total += n; // Side effect!
  return total;
}

// ❌ IMPURE - non-deterministic (random)
function getRandomCard(deck: Card[]): Card {
  return deck[Math.floor(Math.random() * deck.length)];
}

// ❌ IMPURE - I/O side effect
function logCard(card: Card): void {
  console.log(card); // Side effect!
}

// ❌ IMPURE - mutates parameter
function addCardMutating(hand: Card[], card: Card): Card[] {
  hand.push(card); // Mutates input!
  return hand;
}
```

### Why Pure Functions Matter

- **Testable**: No mocks, no setup - just input → output
- **Predictable**: Easy to reason about
- **Composable**: Can combine without worrying about state
- **Parallelizable**: Safe to run concurrently
- **Memoizable**: Can cache results (same input → same output)

### Assignment 4 Examples

```ts
// Pure: pointsFor in deck.ts
export const pointsFor = (c: Card): number => {
  switch (c.type) {
    case "NUMBERED":
      return c.number;
    case "SKIP":
    case "REVERSE":
    case "DRAW":
      return 20;
    case "WILD":
    case "WILD DRAW":
      return 50;
    default:
      return 0;
  }
};

// Pure: canPlay in round.ts
export const canPlay = (index: number, round: Round): boolean => {
  if (round.ended || round.playerInTurn === undefined) return false;
  // ... pure logic based only on inputs
};
```

---

## 2. Immutability

### What is Immutability?

**Immutability** means data cannot be changed after it's created. Instead of modifying existing data, you create new data with the changes.

### Why Immutability Matters

- **Predictability**: Data can't change unexpectedly
- **Easy debugging**: Can trace when/where new data was created
- **Time travel**: Keep old versions (undo/redo)
- **Change detection**: Compare object references (React/Vue optimizations)
- **Thread safety**: No race conditions

### Mutable (Imperative - ❌ Avoid)

```ts
// BAD: Mutates the array
function playCard(round: Round, index: number): Round {
  round.hands[round.playerInTurn!].splice(index, 1); // Mutates!
  return round;
}

const round = createRound(["A", "B"], 0);
playCard(round, 0);
// round is now modified - original lost!
```

### Immutable (Functional - ✅ Prefer)

```ts
// GOOD: Returns new Round, original unchanged
export const play = (
  index: number,
  color: Color | undefined,
  round: Round
): Round => {
  const hands = round.hands.map(
    (h, i) =>
      i === round.playerInTurn
        ? h.filter((_, j) => j !== index) // New array
        : h // Reuse existing
  );

  return {
    ...round, // Shallow copy
    hands, // New hands array
    discardPile: [card, ...round.discardPile], // New discard pile
  };
};
```

### Common Immutable Patterns

```ts
// Add to array
const added = [...array, item];

// Remove from array by index
const removed = array.filter((_, i) => i !== index);

// Update at index
const updated = array.map((item, i) => (i === index ? newValue : item));

// Update object property
const updated = { ...obj, property: newValue };

// Nested update
const updated = {
  ...state,
  round: {
    ...state.round,
    turn: newTurn,
  },
};

// Add to object
const added = { ...obj, newKey: newValue };
```

### Assignment 4: readonly Types

```ts
// All Round fields are readonly - enforced by TypeScript
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly Card[][];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly currentColor: Color;
  readonly ended: boolean;
  // ... all readonly
};
```

---

## 3. Higher-Order Functions

### What are Higher-Order Functions?

**Higher-order functions (HOFs)** are functions that:

- Take functions as arguments, OR
- Return functions

They're the foundation of functional programming.

### Why Higher-Order Functions?

- **Abstract patterns**: Don't repeat loops, abstract the iteration
- **Code reuse**: Pass different behaviors to same HOF
- **Composition**: Build complex operations from simple ones
- **Declarative**: Describe what you want, not how to do it

### Built-in Array HOFs

```ts
// map - transform each element
[1, 2, 3]
  .map((x) => x * 2) // [2, 4, 6]

  [
    // filter - keep matching elements
    (1, 2, 3, 4)
  ].filter((x) => x % 2 === 0) // [2, 4]

  [
    // reduce - accumulate to single value
    (1, 2, 3)
  ].reduce((sum, n) => sum + n, 0) // 6

  [
    // flatMap - map then flatten
    ([1, 2], [3, 4])
  ].flatMap((arr) => arr.map((x) => x * 2)) // [2, 4, 6, 8]

  [
    // some - at least one matches
    (1, 2, 3)
  ].some((x) => x > 2) // true

  [
    // every - all match
    (1, 2, 3)
  ].every((x) => x > 0) // true

  [
    // find - first matching element
    (1, 2, 3)
  ].find((x) => x > 1) // 2

  [
    // findIndex - index of first match
    (1, 2, 3)
  ].findIndex((x) => x > 1); // 1
```

### Functions Returning Functions

```ts
// Curried function (returns function)
const multiply = (a: number) => (b: number) => a * b;
const double = multiply(2); // Returns function
double(5); // 10

// Factory function
const createPlayerAction = (playerIndex: number) => ({
  sayUno: () => (round: Round) => sayUno(playerIndex)(round),
  playCard: (cardIndex: number) => (round: Round) => playCard(cardIndex)(round),
});
```

### Assignment 4 Examples

```ts
// HOF: play takes a round-transforming function
export const play = (f: (r: Round) => Round, game: Game): Game => {
  if (!game.currentRound) return game;
  const updatedRound = f(game.currentRound); // Apply function
  // ... handle round completion
};

// Usage:
play(draw, game); // Apply draw function
play(playCard(0), game); // Apply play function
play((r) => sayUno(0, r), game); // Apply sayUno

// map usage - transform each hand
const handSizes = round.hands.map((hand) => hand.length);

// filter usage - get playable cards
const playableCards = round.hands[round.playerInTurn!].filter((_, i) =>
  canPlay(i, round)
);

// reduce usage - calculate total points
const totalPoints = round.hands
  .flatMap((hand) => hand)
  .reduce((sum, card) => sum + pointsFor(card), 0);

// flatMap usage - get all cards from all hands
const allCards = round.hands.flatMap((hand) => hand);
```

---

## 4. Function Composition and Pipelines

### What is Function Composition?

**Composition** combines multiple functions into a single function. Data flows through a series of transformations.

### pipe vs compose

```ts
// pipe: left-to-right (how we read)
const process = pipe(
  filterByColor("RED"), // Step 1
  sortByNumber, // Step 2
  take(3) // Step 3
);

// compose: right-to-left (mathematical notation)
const process = compose(take(3), sortByNumber, filterByColor("RED"));

// Both produce same result:
process(cards); // 3 red cards, sorted
```

### Implementing pipe

```ts
// pipe implementation
export const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

// Usage:
const playTurn = pipe<Round>(
  sayUno(0), // Say UNO first
  playCard(2), // Then play card
  checkWinner // Then check if won
);

const newRound = playTurn(round);
```

### Array Method Chains (Built-in Pipeline)

```ts
// Array methods chain naturally - each returns new array
const result = cards
  .filter((card) => card.color === "RED") // Step 1: filter
  .map((card) => card.number) // Step 2: transform
  .filter((num) => num !== undefined) // Step 3: filter nulls
  .sort((a, b) => a - b) // Step 4: sort
  .slice(0, 3); // Step 5: take first 3

// Same as pipe(
//   filter(isRed),
//   map(getNumber),
//   filter(isDefined),
//   sort(compareNumbers),
//   take(3)
// )(cards)
```

### Lodash Flow (Composition Library)

```ts
import _ from "lodash";

// _.flow is like pipe - left to right
const processCards = _.flow([
  _.partial(_.filter, _, { color: "RED" }),
  _.partial(_.map, _, "number"),
  _.partial(_.take, _, 3),
]);

processCards(cards);
```

### Assignment 4 Examples

```ts
// Composition with pipe in round-functional.ts
export const sayUnoAndPlay = (player: number, cardIndex: number) =>
  pipe<Round>(sayUno(player), playCard(cardIndex));

// Array method chaining for score calculation
export const score = (round: Round): number | undefined => {
  if (!round.ended || round.winner === undefined) return undefined;
  return _.sum(
    round.hands.flatMap((h, idx) =>
      idx === round.winner ? [] : h.map(pointsFor)
    )
  );
};

// Lodash flow in tests
const playSequence = _.flow([draw, _.partial(play, 2, undefined), draw]);
```

---

## 5. Currying and Partial Application

### What is Currying?

**Currying** transforms a function taking multiple arguments into a sequence of functions each taking one argument.

```ts
// Normal function
function add(a: number, b: number): number {
  return a + b;
}
add(2, 3); // 5

// Curried version
const addCurried = (a: number) => (b: number) => a + b;
addCurried(2)(3); // 5
```

### Why Curry?

- **Partial application**: Fix some arguments, supply others later
- **Specialized functions**: Create variations from general functions
- **Composition**: Easier to compose single-argument functions
- **Data-last style**: Put data as last parameter for better composition

### Partial Application

**Partial application** fixes some arguments of a function, returning a new function that takes the remaining arguments.

```ts
// General function
const canPlay = (index: number, round: Round): boolean => {
  /* ... */
};

// Curry it
const canPlayCurried =
  (index: number) =>
  (round: Round): boolean =>
    canPlay(index, round);

// Partial application - fix first argument
const canPlayFirst = canPlayCurried(0);
const canPlaySecond = canPlayCurried(1);

// Use specialized functions
canPlayFirst(round1); // Check if card 0 is playable
canPlayFirst(round2); // Same function, different round
canPlaySecond(round1); // Check if card 1 is playable
```

### curry2 and curry3 Helpers

```ts
// Curry a 2-parameter function
export const curry2 =
  <A, B, R>(fn: (a: A, b: B) => R) =>
  (a: A) =>
  (b: B): R =>
    fn(a, b);

// Curry a 3-parameter function
export const curry3 =
  <A, B, C, R>(fn: (a: A, b: B, c: C) => R) =>
  (a: A) =>
  (b: B) =>
  (c: C): R =>
    fn(a, b, c);

// Usage:
const canPlay = curry2(canPlayUncurried);
const play = curry3(playUncurried);
```

### Point-Free Style

When functions are curried, you can write code without mentioning the data parameter.

```ts
// With explicit parameter
const getPlayableCards = (round: Round) =>
  round.hands[round.playerInTurn!].filter((_, i) => canPlay(i, round));

// Point-free (no 'round' parameter mentioned)
const getPlayableCards = filter(isPlayable); // if properly curried
```

### Assignment 4 Examples

```ts
// Curried API in round-functional.ts
export const canPlay = curry2(canPlayUncurried);
export const sayUno = curry2(sayUnoUncurried);
export const play = curry3(playUncurried);

// Partial application examples
const canPlayFirst = canPlay(0); // Fix index, round comes later
const sayUnoForAlice = sayUno(0); // Fix player, round comes later

// Create specialized functions
const filterByColor = (color: Color) => (cards: Card[]) =>
  cards.filter((c) => "color" in c && c.color === color);

const filterRed = filterByColor("RED");
const filterBlue = filterByColor("BLUE");

// Use them
filterRed(hand); // All red cards
filterBlue(hand); // All blue cards

// Player action factory
const aliceActions = createPlayerAction(0);
round = aliceActions.playCard(2)(round);
round = aliceActions.sayUno()(round);
```

---

## 6. Persistent Data Structures

### What are Persistent Data Structures?

**Persistent data structures** are immutable structures that efficiently share unchanged parts between versions using **structural sharing**.

### The Problem with Plain Immutability

```ts
// Plain JavaScript immutable update - copies everything!
const newState = {
  ...state,
  players: [...state.players],
  scores: [...state.scores],
  rounds: [...state.rounds],
};

// For large data, this is expensive (O(n))
```

### Structural Sharing

When you "update" a persistent structure, only the path from root to changed node is copied. Everything else is shared.

```
Original tree:      Updated tree:
     A                  A'
    / \                / \
   B   C              B'  C  (shared!)
  / \                / \
 D   E              D'  E  (shared!)

Only A, B, D are copied. C and E are reused.
```

### Immutable.js Basics

```ts
import { Map, List, fromJS } from "immutable";

// Map - immutable object
const player = Map({ name: "Alice", score: 0 });
const updated = player.set("score", 10);

player.get("score"); // 0 - original unchanged
updated.get("score"); // 10 - new version

// List - immutable array
const cards = List([card1, card2, card3]);
const withCard = cards.push(card4); // Returns new List
const withoutFirst = cards.shift(); // Returns new List

// Deep updates with setIn
const game = fromJS({
  round: {
    players: ["A", "B"],
    turn: 0,
  },
});

const newGame = game.setIn(["round", "turn"], 1);
```

### Performance

| Operation | Plain JS  | Immutable.js       |
| --------- | --------- | ------------------ |
| Update    | O(n)      | O(log n)           |
| Access    | O(1)      | O(log n)           |
| Memory    | Full copy | Structural sharing |

### Lazy Sequences (Seq)

**Seq** provides lazy evaluation - operations don't execute until you request the result.

```ts
import { Seq, Range } from "immutable";

// Eager (List) - creates intermediate arrays
List([1, 2, 3, 4, 5])
  .map((x) => x * 2) // [2, 4, 6, 8, 10] created
  .filter((x) => x > 5) // [6, 8, 10] created
  .toArray(); // [6, 8, 10]

// Lazy (Seq) - single pass, no intermediate arrays
Seq([1, 2, 3, 4, 5])
  .map((x) => x * 2) // Not executed yet
  .filter((x) => x > 5) // Still not executed
  .toArray(); // NOW executes in single pass: [6, 8, 10]

// Infinite sequences (only possible with lazy evaluation)
Range(1, Infinity)
  .filter((x) => x % 2 === 0)
  .map((x) => x * x)
  .take(5) // Only computes first 5
  .toArray(); // [4, 16, 36, 64, 100]
```

### Assignment 4: Spread Operator Structural Sharing

While Assignment 4 doesn't use Immutable.js, the spread operator provides lightweight structural sharing:

```ts
// Shallow copy - shares nested objects/arrays
const newRound = {
  ...round, // Top level copied
  hands: newHands, // New hands array
  // But unchanged fields still reference same data
};

// Only changed parts are new, rest is shared
```

---

## 7. Side Effects and Isolation (Sandwich Model)

### What are Side Effects?

**Side effects** are any operation that affects the outside world:

- Modifying variables outside function scope
- I/O operations (console.log, file access, network requests)
- Randomness (Math.random, Date.now)
- DOM manipulation
- Throwing exceptions

### The Sandwich Model

**Pure core, impure shell**: Keep side effects at the boundaries, pure logic in the center.

```
┌─────────────────────────────┐
│   IMPURE SHELL (I/O)        │  ← User input, API calls
├─────────────────────────────┤
│   PURE CORE (Logic)         │  ← Business logic, transformations
├─────────────────────────────┤
│   IMPURE SHELL (I/O)        │  ← Database, logging, rendering
└─────────────────────────────┘
```

### Isolating Randomness (Dependency Injection)

```ts
// ❌ IMPURE: Randomness inside function
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.floor(Math.random() * (i + 1))[(copy[i], copy[j])] =
      // Impure!
      [copy[j], copy[i]]);
  }
  return copy;
}

// ✅ PURE: Inject randomness as dependency
type Shuffler<T> = (array: readonly T[]) => T[];

function createRound(players: string[], shuffler: Shuffler<Card>): Round {
  const deck = shuffler(createInitialDeck()); // Injected behavior
  // ... rest is pure transformation
}

// In production: inject real randomness
createRound(["A", "B"], standardShuffler);

// In tests: inject predictable "randomness"
createRound(["A", "B"], (arr) => arr); // Identity shuffler
```

### Isolating I/O

```ts
// ❌ IMPURE: Logging inside business logic
function playCard(round: Round, index: number): Round {
  console.log(`Playing card ${index}`); // Side effect!
  const newRound = {
    /* ... */
  };
  return newRound;
}

// ✅ PURE: Return data, caller handles logging
function playCard(
  round: Round,
  index: number
): { round: Round; message: string } {
  const card = round.hands[round.playerInTurn!][index];
  const newRound = {
    /* ... */
  };

  return {
    round: newRound,
    message: `Player played ${card.color} ${card.number}`,
  };
}

// Caller does the side effect
const { round: newRound, message } = playCard(round, 0);
console.log(message); // Side effect at the boundary
```

### Assignment 4 Examples

```ts
// Shuffler type - randomness abstraction
export type Shuffler<T> = (ts: readonly T[]) => T[];

// Standard shuffler (impure) - used at boundaries
export const standardShuffler: Shuffler<any> = <T>(ts: readonly T[]): T[] => {
  const copy = [...ts];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.floor(Math.random() * (i + 1))[(copy[i], copy[j])] = [
      copy[j],
      copy[i],
    ]);
  }
  return copy;
};

// Pure function accepts shuffler
const initialState = (args: RoundArgs): Round => {
  const { shuffler = standardShuffler } = args; // Injected
  const deck = shuffler(createInitialDeck()); // Used here
  // ... rest is pure
};

// Tests inject predictable shuffler
const testShuffler = <T>(arr: readonly T[]): T[] => [...arr];
const round = createRound({
  players: ["A", "B"],
  dealer: 0,
  shuffler: testShuffler,
});
```

---

## 8. Functors and Monads

### What is a Functor?

A **functor** is a data structure with a `map` method that:

- Applies a function to wrapped value(s)
- Preserves the structure

```ts
// Array is a functor
[1, 2, 3].map((x) => x * 2); // [2, 4, 6]
// Structure preserved: array in → array out

// Type signature:
// F<T>.map(fn: T => U): F<U>
```

### What is a Monad?

A **monad** is a functor with `flatMap` (also called `bind` or `chain`) that:

- Applies a function returning a wrapped value
- Flattens the result (prevents nesting)

```ts
// Without flatMap - nested arrays
[
  [1, 2],
  [3, 4],
]
  .map((arr) => arr.map((x) => x * 2))
  [
    // [[2, 4], [6, 8]] - nested!

    // With flatMap - flattened
    ([1, 2], [3, 4])
  ].flatMap((arr) => arr.map((x) => x * 2));
// [2, 4, 6, 8] - flat!

// Type signature:
// M<T>.flatMap(fn: T => M<U>): M<U>
```

### Common Monads

#### Promise (Async Monad)

```ts
// .then() is like flatMap - flattens nested Promises
fetchUser(id) // Promise<User>
  .then((user) => fetchOrders(user.id)) // Promise<Order[]> (not Promise<Promise<Order[]>>)
  .then((orders) => processOrders(orders)); // Promise<Result>
```

#### Maybe/Optional (Null Safety Monad)

```ts
// Maybe monad - safe null handling
export type Maybe<T> = { readonly value: T | undefined };

export const Maybe = {
  of: <T>(value: T | undefined): Maybe<T> => ({ value }),

  map:
    <T, U>(fn: (x: T) => U) =>
    (maybe: Maybe<T>): Maybe<U> => ({
      value: maybe.value !== undefined ? fn(maybe.value) : undefined,
    }),

  flatMap:
    <T, U>(fn: (x: T) => Maybe<U>) =>
    (maybe: Maybe<T>): Maybe<U> =>
      maybe.value !== undefined ? fn(maybe.value) : { value: undefined },

  getOrElse:
    <T>(defaultValue: T) =>
    (maybe: Maybe<T>): T =>
      maybe.value !== undefined ? maybe.value : defaultValue,
};

// Usage:
const maybeUser = Maybe.of(getUser());
const city = pipe(
  maybeUser,
  Maybe.map((u) => u.address), // Maybe<Address>
  Maybe.map((a) => a.city), // Maybe<string>
  Maybe.getOrElse("Unknown") // string
);
```

#### Either/Result (Error Handling Monad)

```ts
type Either<L, R> =
  | { type: "Left"; value: L } // Error case
  | { type: "Right"; value: R }; // Success case

// Chain operations that might fail
const result = pipe(
  parseInput(data), // Either<Error, Input>
  flatMap(validate), // Either<Error, Valid>
  flatMap(process), // Either<Error, Result>
  getOrElse(defaultValue)
);
```

### Assignment 4 Examples

```ts
// Maybe monad in round-functional.ts
export const getCurrentHand = (round: Round): Maybe<readonly Card[]> =>
  Maybe.of(
    round.playerInTurn !== undefined
      ? round.hands[round.playerInTurn]
      : undefined
  );

// Using Maybe monad
const handSize = pipe(
  getCurrentHand(round),
  Maybe.map((hand) => hand.length),
  Maybe.getOrElse(0)
);

// Array as monad (flatMap)
const allCards = round.hands.flatMap((hand) => hand); // Flattens

// Array in score calculation
export const score = (round: Round): number | undefined => {
  if (!round.ended || round.winner === undefined) return undefined;
  return _.sum(
    round.hands.flatMap((h, idx) =>
      idx === round.winner ? [] : h.map(pointsFor)
    )
  );
};
```

---

## 9. Assignment 4 Implementation

### File Structure

```
uno-functional/
├── src/
│   ├── model/
│   │   ├── deck.ts              # Card types, deck creation (pure)
│   │   ├── round.ts             # Core round logic (pure functions)
│   │   ├── round-functional.ts  # Curried API, composition
│   │   └── uno.ts               # Game orchestration (pure)
│   └── utils/
│       ├── functional.ts        # FP utilities (pipe, curry, Maybe)
│       └── random_utils.ts      # Randomness abstraction
└── __test__/                    # 185 tests
```

### Key Patterns Used

#### 1. Immutability with readonly

```ts
// All types use readonly
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly Card[][];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  // ... all readonly
};
```

#### 2. Pure Functions

```ts
// All game logic is pure
export const play = (
  index: number,
  color: Color | undefined,
  round: Round
): Round => {
  // Returns new Round, doesn't mutate parameter
  return { ...round /* changes */ };
};

export const canPlay = (index: number, round: Round): boolean => {
  // Deterministic, no side effects
  return; /* pure logic */
};
```

#### 3. Higher-Order Functions

```ts
// Game.play accepts round transformer
export const play = (f: (r: Round) => Round, game: Game): Game => {
  const updatedRound = f(game.currentRound);
  // ...
};

// Usage:
play(draw, game);
play((r) => playCard(0, r), game);
```

#### 4. Currying

```ts
// Curried API in round-functional.ts
export const canPlay = curry2((index: number, round: Round) => {
  /* ... */
});
export const sayUno = curry2((player: number, round: Round) => {
  /* ... */
});
export const play = curry3(
  (index: number, color: Color | undefined, round: Round) => {
    /* ... */
  }
);

// Partial application
const canPlayFirst = canPlay(0);
canPlayFirst(round1); // Check different rounds
canPlayFirst(round2);
```

#### 5. Function Composition

```ts
// Pipe utility
export const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

// Composed operations
export const sayUnoAndPlay = (player: number, cardIndex: number) =>
  pipe<Round>(sayUno(player), playCard(cardIndex));
```

#### 6. Side Effect Isolation

```ts
// Shuffler type - inject randomness
type Shuffler<T> = (array: readonly T[]) => T[];

// Pure function accepts shuffler
const initialState = (args: { shuffler?: Shuffler<Card> }): Round => {
  const { shuffler = standardShuffler } = args;
  const deck = shuffler(createInitialDeck());
  // ...
};

// Tests use predictable shuffler
const testShuffler = <T>(arr: readonly T[]): T[] => [...arr];
```

#### 7. Array Methods (HOFs)

```ts
// map - transform
const handSizes = round.hands.map((hand) => hand.length);

// filter - select
const playableCards = hand.filter((_, i) => canPlay(i, round));

// reduce - accumulate
const total = cards.reduce((sum, card) => sum + pointsFor(card), 0);

// flatMap - map and flatten
const allCards = round.hands.flatMap((hand) => hand);
```

### Theory Checklist

✅ **Pure Functions**: All game logic is pure, deterministic  
✅ **Immutability**: All types `readonly`, spread operators, no mutations  
✅ **Higher-Order Functions**: `map`, `filter`, `reduce`, `flatMap`, `play(f, game)`  
✅ **Function Composition**: `pipe` utility, composed operations  
✅ **Currying**: Curried API in `round-functional.ts`  
✅ **Partial Application**: Specialized functions via currying  
✅ **Persistent Data Structures**: Structural sharing via spread  
✅ **Side Effect Isolation**: Shuffler injection (sandwich model)  
✅ **Functors**: Arrays, Maybe monad  
✅ **Monads**: Maybe monad, Array flatMap

---

## 10. Exam Questions & Answers

### Pure vs Impure Functions

**Q: What makes a function pure?**

A: A pure function has two properties:

1. **Deterministic**: Same inputs always produce same outputs
2. **No side effects**: Doesn't modify external state, no I/O, no randomness

**Q: Why are pure functions easier to test?**

A: No mocks or setup needed - just pass inputs and assert outputs. They're predictable and isolated.

**Q: How do you make a function with randomness pure?**

A: Inject the randomness as a dependency (parameter). The function is pure - it just uses the injected behavior.

```ts
// Instead of: Math.random() inside
// Do: type Shuffler<T> = (arr: T[]) => T[]
//     function create(shuffler: Shuffler) { ... }
```

### Immutability

**Q: What is immutability?**

A: Data cannot be changed after creation. Instead of modifying, you create new data with the changes.

**Q: How do you update an immutable array?**

A:

```ts
// Add: [...array, item]
// Remove: array.filter((_, i) => i !== index)
// Update: array.map((item, i) => i === index ? newValue : item)
```

**Q: How do you update a nested immutable object?**

A:

```ts
const updated = {
  ...state,
  round: {
    ...state.round,
    turn: newTurn,
  },
};
```

**Q: What are the benefits of immutability?**

A:

- Predictable - data can't change unexpectedly
- Easy debugging - trace when/where data was created
- Time travel - keep old versions (undo/redo)
- Change detection - compare object references
- Thread safe - no race conditions

### Higher-Order Functions

**Q: What is a higher-order function?**

A: A function that takes functions as arguments OR returns functions.

**Q: Give examples of built-in HOFs.**

A: `map`, `filter`, `reduce`, `flatMap`, `some`, `every`, `find`

**Q: What's the difference between map and flatMap?**

A:

- `map`: Transforms each element, preserves structure
- `flatMap`: Transforms each element to array, then flattens one level

```ts
[
  [1, 2],
  [3, 4],
]
  .map((arr) => arr.map((x) => x * 2)) // [[2,4], [6,8]]
  [([1, 2], [3, 4])].flatMap((arr) => arr.map((x) => x * 2)); // [2,4,6,8]
```

### Function Composition

**Q: What is function composition?**

A: Combining multiple functions into a single function. Data flows through a series of transformations.

**Q: What's the difference between pipe and compose?**

A:

- `pipe`: Left-to-right (how we read): `pipe(f, g, h)(x)` = `h(g(f(x)))`
- `compose`: Right-to-left (mathematical): `compose(h, g, f)(x)` = `h(g(f(x)))`

**Q: Show a pipe implementation.**

A:

```ts
export const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);
```

### Currying

**Q: What is currying?**

A: Transforming a function taking multiple arguments into a sequence of functions each taking one argument.

```ts
// Normal: add(2, 3)
// Curried: add(2)(3)
```

**Q: What is partial application?**

A: Fixing some arguments of a function, returning a new function that takes the remaining arguments.

```ts
const canPlay = (index: number) => (round: Round) => {
  /* ... */
};
const canPlayFirst = canPlay(0); // Partial application
```

**Q: Why curry functions?**

A:

- Enables partial application (specialized functions)
- Easier function composition
- Data-last parameter order for better composition

### Persistent Data Structures

**Q: What are persistent data structures?**

A: Immutable structures that efficiently share unchanged parts between versions (structural sharing).

**Q: What is structural sharing?**

A: When updating, only the path from root to changed node is copied. Everything else is shared between old and new versions.

**Q: What's the performance difference?**

A:

- Plain JS immutable update: O(n) - copies everything
- Persistent structure: O(log n) - only copies changed path

**Q: What is lazy evaluation (Seq)?**

A: Operations don't execute immediately - they're recorded and only run when you need the result. Avoids intermediate arrays, enables infinite sequences.

### Side Effects

**Q: What are side effects?**

A:

- Modifying variables outside function scope
- I/O operations (console.log, file, network)
- Randomness (Math.random, Date.now)
- DOM manipulation
- Throwing exceptions

**Q: What is the sandwich model?**

A: Pure core, impure shell. Keep side effects at the boundaries, pure logic in the center.

```
Impure Shell (I/O) ← Input
Pure Core (Logic)  ← Business logic
Impure Shell (I/O) ← Output
```

**Q: How do you isolate randomness?**

A: Dependency injection - pass a shuffler/randomizer function as a parameter.

```ts
type Shuffler<T> = (arr: T[]) => T[];
function create(shuffler: Shuffler) {
  /* pure */
}
```

### Functors and Monads

**Q: What is a functor?**

A: Data structure with a `map` method that preserves structure. Array is a functor.

**Q: What is a monad?**

A: Functor with `flatMap` that applies a function returning a wrapped value, then flattens the result.

**Q: Why use flatMap instead of map?**

A: Prevents nesting. `map` with function returning array gives nested array. `flatMap` flattens it.

**Q: Give examples of monads.**

A:

- **Promise**: `.then()` is flatMap for async
- **Maybe/Optional**: Safe null handling
- **Either/Result**: Error handling
- **Array**: Has both map and flatMap

### Assignment 4 Specific

**Q: How is randomness handled in Assignment 4?**

A: Shuffler type injected as parameter - pure function, impure behavior injected at boundaries.

**Q: Why are all fields readonly in Assignment 4?**

A: TypeScript compiler enforces immutability - prevents accidental mutations.

**Q: Show a pure function from Assignment 4.**

A:

```ts
export const pointsFor = (c: Card): number => {
  switch (c.type) {
    case "NUMBERED":
      return c.number;
    case "SKIP":
    case "REVERSE":
    case "DRAW":
      return 20;
    case "WILD":
    case "WILD DRAW":
      return 50;
    default:
      return 0;
  }
};
```

**Q: Show an immutable update from Assignment 4.**

A:

```ts
export const play = (
  index: number,
  color: Color | undefined,
  round: Round
): Round => {
  const hands = round.hands.map((h, i) =>
    i === round.playerInTurn ? h.filter((_, j) => j !== index) : h
  );

  return {
    ...round,
    hands,
    discardPile: [card, ...round.discardPile],
  };
};
```

**Q: Show a higher-order function from Assignment 4.**

A:

```ts
export const play = (f: (r: Round) => Round, game: Game): Game => {
  const updatedRound = f(game.currentRound);
  // ...
};

// Usage:
play(draw, game);
play((r) => sayUno(0, r), game);
```

**Q: Show currying from Assignment 4.**

A:

```ts
// Curried versions
export const canPlay = curry2(canPlayUncurried);
export const sayUno = curry2(sayUnoUncurried);

// Partial application
const canPlayFirst = canPlay(0);
canPlayFirst(round1);
canPlayFirst(round2);
```
