# Assignment 4 - Functional Programming Patterns

## Overview

This document explains the functional programming (FP) patterns implemented in Assignment 4's UNO game domain. The codebase demonstrates key FP concepts from the course theory.

## Core Functional Programming Principles

### 1. Immutability

**Theory**: Data cannot be changed after creation. Instead of modifying existing data, create new data with desired changes.

**Implementation**:

- All data types use `readonly` modifiers
- Round and Game states are immutable value objects
- Functions return new objects instead of mutating parameters

```typescript
// Round type - all fields are readonly
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly Card[][];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  // ... all readonly
};

// Functions return new Round instead of modifying
export const play = (
  index: number,
  chosenColor: Color | undefined,
  round: Round
): Round => {
  // Create new round with updated state
  return {
    ...round, // Spread operator for shallow copy
    hands: hands.map((h) => [...h]), // Deep copy arrays
    // ... other updated fields
  };
};
```

**Benefits**:

- No unexpected side effects
- Easy to reason about code
- Enables time-travel debugging (keep old states)
- Thread-safe (important for concurrent programming)

---

### 2. Pure Functions

**Theory**: A function is pure if:

1. Same inputs always produce same outputs (deterministic)
2. No side effects (doesn't change anything outside itself)

**Implementation**:

```typescript
// PURE: canPlay only depends on its parameters
export const canPlay = (index: number, round: Round): boolean => {
  if (round.ended || round.playerInTurn === undefined) return false;
  if (index < 0 || index >= round.hands[round.playerInTurn].length)
    return false;
  const card = round.hands[round.playerInTurn][index];
  const top = topOfDiscard(round);
  // ... pure logic based only on inputs
};

// PURE: pointsFor is a mathematical function
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

**Isolating Impurity (Sandwich Model)**:
Side effects (randomness, I/O) are isolated at boundaries:

```typescript
// Impure: randomness injected as dependency
export type Shuffler<T> = (array: readonly T[]) => readonly T[];

// Pure: accepts shuffler as parameter
const initialState = (args: RoundArgs): Round => {
  const { shuffler = standardShuffler } = args; // Impurity isolated
  const deck = shuffler(createInitialDeck()); // Used here
  // ... rest is pure transformation
};
```

---

### 3. Higher-Order Functions

**Theory**: Functions that take functions as parameters or return functions.

**Implementation**:

```typescript
// HOF: takes a function that transforms rounds
export const play = (f: (r: Round) => Round, game: Game): Game => {
  if (!game.currentRound) return game;
  const updatedRound = f(game.currentRound); // Apply the transformation
  // ... handle round completion
};

// HOF: returns a function
export const curry2 =
  <A, B, R>(fn: (a: A, b: B) => R) =>
  (a: A) =>
  (b: B): R =>
    fn(a, b);

// HOF: Array methods (map, filter, reduce)
const newScores = game.scores.map((s, i) =>
  i === scoringWinner ? s + addScore : s
);
const playableCards = round.hands[round.playerInTurn].filter((_, i) =>
  canPlay(i, round)
);
const totalScore = round.hands
  .flatMap((h) => h.map(pointsFor))
  .reduce((a, b) => a + b, 0);
```

---

### 4. Currying

**Theory**: Transform a function taking multiple parameters into a sequence of functions each taking one parameter.

**Implementation**:

```typescript
// Original function: (number, Round) => boolean
const canPlayOriginal = (index: number, round: Round): boolean => {
  /* ... */
};

// Curried version: number => (Round => boolean)
export const canPlay = curry2(canPlayOriginal);

// Usage:
const canPlayFirst = canPlay(0); // Partial application
const result1 = canPlayFirst(round1); // true
const result2 = canPlayFirst(round2); // false

// Check if card 2 is playable across multiple rounds
const rounds = [round1, round2, round3];
const canPlayCardTwo = canPlay(2);
const results = rounds.map(canPlayCardTwo); // Point-free style
```

**Benefits**:

- Enables partial application (fix some arguments, supply others later)
- Creates specialized functions from general ones
- Facilitates function composition

---

### 5. Function Composition and Pipelines

**Theory**: Combine small functions into larger functions. Data flows through a series of transformations.

**Implementation**:

```typescript
// Pipe: left-to-right composition
export const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

// Usage: player says UNO then plays card
export const sayUnoAndPlay = (player: number, cardIndex: number) =>
  pipe<Round>(sayUno(player), playCard(cardIndex));

// Array pipeline example
export const score = (round: Round): number | undefined => {
  if (!round.ended || round.winner === undefined) return undefined;
  return _.sum(
    round.hands.flatMap((h, idx) =>
      idx === round.winner ? [] : h.map(pointsFor)
    )
  );
};

// Step by step what's happening:
// 1. round.hands - get all hands
// 2. flatMap - transform each hand to points, flatten result
// 3. _.sum - add all points together
```

**Point-Free Style** (functions defined without explicit parameters):

```typescript
// With explicit parameter
const getEmptyHands = (round: Round) =>
  round.hands.filter((hand) => hand.length === 0);

// Point-free (parameter implicit in composition)
const isEmpty = (hand: Card[]) => hand.length === 0;
const getEmptyHands = pipe((round: Round) => round.hands, filter(isEmpty));
```

---

### 6. Functors and Monads

**Theory**:

- **Functor**: Container with `map` method that preserves structure
- **Monad**: Functor with `flatMap` that applies a function returning a wrapped value, then flattens

**Implementation**:

```typescript
// Maybe monad - handles optional values safely
export type Maybe<T> = { readonly value: T | undefined };

export const Maybe = {
  of: <T>(value: T | undefined): Maybe<T> => ({ value }),

  // Functor: map over the wrapped value
  map:
    <T, U>(fn: (x: T) => U) =>
    (maybe: Maybe<T>): Maybe<U> => ({
      value: maybe.value !== undefined ? fn(maybe.value) : undefined,
    }),

  // Monad: flatMap to avoid nested Maybe<Maybe<T>>
  flatMap:
    <T, U>(fn: (x: T) => Maybe<U>) =>
    (maybe: Maybe<T>): Maybe<U> =>
      maybe.value !== undefined ? fn(maybe.value) : { value: undefined },

  getOrElse:
    <T>(defaultValue: T) =>
    (maybe: Maybe<T>): T =>
      maybe.value !== undefined ? maybe.value : defaultValue,
};

// Usage: safely chain operations that might fail
const getWinnerScore = (round: Round): number => {
  return pipe(
    Maybe.of(winner(round)), // Maybe<number>
    Maybe.map((w) => round.hands[w]), // Maybe<Card[]>
    Maybe.map((hand) => hand.map(pointsFor)), // Maybe<number[]>
    Maybe.map((points) => _.sum(points)), // Maybe<number>
    Maybe.getOrElse(0) // number
  )(undefined as any);
};
```

**Array as Functor/Monad**:

```typescript
// Arrays are functors - map preserves array structure
[1, 2, 3]
  .map((x) => x * 2) // [2, 4, 6]

  [
    // Arrays are monads - flatMap flattens nested arrays
    ([1, 2], [3, 4])
  ].flatMap((arr) => arr.map((x) => x * 2)); // [2, 4, 6, 8]
// Without flatMap: [[2, 4], [6, 8]] - nested!
```

---

### 7. Persistent Data Structures

**Theory**: Immutable data structures that efficiently share structure between versions.

**Implementation**:

In JavaScript/TypeScript, we use:

- Spread operator (`...`) for shallow copies
- Array methods that return new arrays (map, filter, concat)
- Structural sharing (unchanged parts reference same memory)

```typescript
// Efficient immutable update - only changed parts are copied
export const play = (
  index: number,
  chosenColor: Color | undefined,
  round: Round
): Round => {
  const hands = round.hands.map(
    (h, i) =>
      i === round.playerInTurn
        ? h.filter((_, j) => j !== index) // Only this hand is copied
        : h // Other hands reuse same reference
  );

  return {
    ...round, // Shallow copy of round
    hands, // New hands array
    discardPile: [card, ...round.discardPile], // New discard pile
    // Unchanged fields still reference old data
  };
};
```

**Libraries**: For larger apps, use `immutable.js` or `immer`:

```typescript
// With immutable.js (not used in this assignment but good to know)
import { Map, List } from "immutable";

const round = Map({
  players: List(["A", "B", "C"]),
  hands: List([List([card1, card2]), List([card3, card4])]),
});

const newRound = round.setIn(["hands", 0], List([card1])); // Structural sharing
```

---

### 8. Declarative vs Imperative

**Imperative** (how to do it - step by step):

```typescript
// Imperative: explicit loops and mutations
function countPlayableCards(round: Round): number {
  let count = 0;
  for (let i = 0; i < round.hands[round.playerInTurn].length; i++) {
    if (canPlay(i, round)) {
      count++;
    }
  }
  return count;
}
```

**Declarative** (what to do - describe the result):

```typescript
// Declarative: describe what you want
const countPlayableCards = (round: Round): number =>
  round.hands[round.playerInTurn].filter((_, i) => canPlay(i, round)).length;
```

---

## Functional Patterns Summary

### Pattern Checklist

✅ **Immutability**

- All types use `readonly`
- Functions return new objects
- No mutations anywhere

✅ **Pure Functions**

- Deterministic (same input → same output)
- No side effects
- Impurity isolated at boundaries (shuffler injection)

✅ **Higher-Order Functions**

- Functions taking functions: `play(f, game)`, `map`, `filter`
- Functions returning functions: `curry2`, `partial`
- Array methods used extensively

✅ **Currying & Partial Application**

- Curried versions in `round-functional.ts`
- Enables specialized functions: `canPlay(0)`, `sayUno(2)`

✅ **Function Composition**

- `pipe` and `compose` utilities
- Chained transformations: `flatMap`, `map`, `filter`
- Point-free style examples

✅ **Functors & Monads**

- Maybe monad for safe null handling
- Arrays used as functors/monads
- Chain operations safely

✅ **Persistent Data Structures**

- Structural sharing via spread operator
- Efficient immutable updates
- No deep cloning (only changed parts copied)

✅ **Declarative Programming**

- Describe what, not how
- Array methods instead of loops
- Predicate functions for clarity

---

## SOLID Principles in Functional Context

While SOLID is typically associated with OOP, functional programming naturally satisfies many of these principles:

### Single Responsibility Principle

Each function does one thing:

- `canPlay` - checks if card is playable
- `play` - executes a play
- `draw` - draws a card
- `sayUno` - says UNO

### Open/Closed Principle

Functions are closed for modification but open for extension through composition:

```typescript
// Extend behavior by composing
const playWithUno = pipe(sayUno(player), playCard(index));
```

### Liskov Substitution Principle

Functions with compatible types can be substituted:

```typescript
// Any (Round => Round) function works here
export const play = (f: (r: Round) => Round, game: Game): Game => {
  /* ... */
};
```

### Interface Segregation Principle

Small, focused function signatures:

```typescript
// No fat interfaces - just simple functions
export const canPlay: (index: number, round: Round) => boolean;
export const hasEnded: (round: Round) => boolean;
```

### Dependency Inversion Principle

Depend on abstractions (function types), not concretions:

```typescript
// Depends on Shuffler abstraction, not concrete implementation
type Shuffler<T> = (array: readonly T[]) => readonly T[];
const initialState = (args: { shuffler?: Shuffler<Card> }): Round => {
  /* ... */
};
```

---

## Testing Pure Functions

Pure functions are trivial to test - no setup, no mocks, no state to manage:

```typescript
describe("canPlay", () => {
  it("allows same color", () => {
    const round = createRound(["A", "B"], 0);
    const result = canPlay(0, round);
    expect(result).toBe(true);
  });
});

// No need to:
// - Mock anything
// - Set up global state
// - Clean up after test
// - Worry about test order
```

---

## Comparison: OOP (Assignment 1) vs FP (Assignment 4)

| Aspect           | OOP (Assignment 1)            | FP (Assignment 4)              |
| ---------------- | ----------------------------- | ------------------------------ |
| **State**        | Mutable class fields          | Immutable value objects        |
| **Behavior**     | Methods on classes            | Pure functions                 |
| **Data flow**    | Methods mutate `this`         | Functions return new data      |
| **Composition**  | Inheritance, interfaces       | Function composition           |
| **Side effects** | Methods can have side effects | Isolated at boundaries         |
| **Testing**      | Need mocks for mutable state  | Just call function with inputs |
| **Undo/Redo**    | Need memento pattern          | Just keep old states           |
| **Concurrency**  | Need locks/synchronization    | Immutable = thread-safe        |

---

## Best Practices Demonstrated

1. **Data-last parameter order** - Enables currying: `canPlay(index)(round)`
2. **Descriptive type aliases** - `type Shuffler<T> = ...` is clearer than inline types
3. **Const for everything** - Use `const`, never `let` or `var`
4. **Readonly everywhere** - Compiler enforces immutability
5. **Small, focused functions** - Each does one thing well
6. **Compose don't inherit** - Build complex behavior from simple functions
7. **Separate pure from impure** - Side effects isolated
8. **Type-driven development** - Types guide implementation

---

## Further Reading

- **Exam4_Functional.md** - Theory covered in exam
- **lodash/fp** - Functional utilities library
- **ramda** - Another functional library (more FP-purist)
- **fp-ts** - Advanced functional programming for TypeScript
- **immutable.js** - Persistent data structures

---

## Conclusion

This codebase demonstrates functional programming isn't just a style - it's a different way of thinking about programs:

- **Data transforms, never mutates**
- **Functions are values** (pass them around, return them, compose them)
- **Side effects are explicit** (injected dependencies)
- **Types guide design** (if it type-checks, it often works)

The result is code that's:

- ✅ Easier to reason about
- ✅ Easier to test
- ✅ More composable
- ✅ More predictable
- ✅ Safer for concurrent/parallel execution
