# Exam 4: Functional Programming - Assignment 4

**Core Goal:** Predictable, testable logic using functional principles.

---

## Functional Programming

**Concept:** Functional programming treats computation as evaluation of functions and avoids shared mutable state. Instead of modifying data, you create new data with the changes applied. This means:
- **Functions are primary**: Functions are first-class values - passed around, composed, stored
- **No shared state**: Each function works independently without relying on global variables or object fields that other code might change
- **Data flows**: Information enters a function, gets transformed, and exits - like data flowing through a pipeline
- **Immutability**: Data structures are never modified after creation
- **Predictability**: Since nothing changes unexpectedly, it's easier to reason about what code does

**Assignment 4 Example:**
```ts
// All game state is immutable
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly Card[][];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly playerInTurn: number | undefined;
  readonly ended: boolean;
};

// Functions are stateless transformations
export const canPlay = (index: number, round: Round): boolean => {
  if (round.ended || round.playerInTurn === undefined) return false;
  const card = round.hands[round.playerInTurn][index];
  const top = round.discardPile[0];
  return card.color === top.color || card.type === top.type;
};
```

---

## Purity

**Concept:** A pure function has two critical properties:

1. **Deterministic**: Same inputs always produce the same output, every time. No randomness, no depending on current time or external state.
   - `add(2, 3)` always returns `5`
   - `canPlay(0, round)` always returns true/false for that specific card and round
   - If the function returns something different for the same input, it's not pure

2. **No side effects**: The function doesn't modify anything outside itself.
   - No modifying variables in outer scope
   - No I/O operations (console.log, file writes, network calls)
   - No mutations (changing arrays, objects, or parameters)
   - Doesn't affect the outside world - just computes and returns a value

**Why pure?** Pure functions are:
- **Testable**: No setup needed, no mocks. Just input → verify output
- **Composable**: Can safely combine pure functions without unexpected interactions
- **Parallelizable**: Safe to run on multiple threads (no shared state to worry about)
- **Memoizable**: Same input → same output, so you can cache results

**Assignment 4 Example:**
```ts
// ✅ PURE - Same inputs always give same output
export const pointsFor = (c: Card): number => {
  switch (c.type) {
    case "NUMBERED": return c.number ?? 0;
    case "SKIP": case "REVERSE": case "DRAW2": return 20;
    case "WILD": case "WILD_DRAW4": return 50;
  }
};

// ✅ PURE - Only depends on parameters
export const canPlay = (index: number, round: Round): boolean => {
  const card = round.hands[round.playerInTurn!][index];
  const top = round.discardPile[0];
  return card.color === top.color || card.type === top.type;
};

// Benefits: Testable (no mocks), predictable, composable
```

---

## Immutability

**Concept:** Data is never modified after it's created. Instead of changing existing data, you create a new copy with the desired changes. This means:
- **Original unchanged**: When you "update" a Round, the old Round object stays exactly the same
- **New version created**: A new Round with the change is returned; the original is left alone
- **No unintended mutations**: If someone holds a reference to the original data, it won't suddenly change
- **Time travel**: You can keep old versions around, enabling undo/redo functionality
- **Change detection**: Since data is never mutated in place, you can detect changes by checking if object references changed (React/Vue optimization)

**Why it matters:**
Mutation makes code unpredictable - you can't tell when data changes because multiple references point to the same object. Immutability eliminates this confusion entirely.

**Assignment 4 Example:**
```ts
// ❌ DON'T: Mutate the original
export const playCardMutating = (index: number, round: Round): Round => {
  round.hands[round.playerInTurn!].splice(index, 1); // Mutation!
  return round; // Original is lost
};

// ✅ DO: Create new data
export const play = (
  index: number,
  color: Color | undefined,
  round: Round
): Round => {
  const hands = round.hands.map((h, i) =>
    i === round.playerInTurn ? h.filter((_, idx) => idx !== index) : h
  );
  const card = round.hands[round.playerInTurn!][index];

  return {
    ...round,  // Shallow copy - structure sharing
    hands,
    discardPile: [card, ...round.discardPile],
    currentColor: "color" in card ? card.color : round.currentColor,
    playerInTurn: (round.playerInTurn! + 1) % round.players.length,
  };
};

// All fields are readonly - TypeScript enforces immutability
```

---

## Callbacks and Higher-Order Functions

**Concept:** A higher-order function (HOF) is a function that either:
1. **Takes a function as an argument** (callback), or
2. **Returns a function** as its result

This is powerful because:
- **Abstraction**: Instead of writing loops manually (`for`, `while`), you pass a function that says what to do with each element
- **Code reuse**: One `map` function works with any transformation function you give it
- **Declarative**: You describe WHAT transformation to do, not HOW to loop through data
- **Flexibility**: Same utility (map, filter) works for any data type with any function

**Common array HOFs:**
- `map(fn)`: Transform each element with function `fn`
- `filter(fn)`: Keep only elements where `fn` returns true
- `reduce(fn, initial)`: Combine all elements using function `fn` into a single value
- `flatMap(fn)`: Transform each element with `fn`, then flatten the result

**Assignment 4 Example:**
```ts
// map - transform each element
const handSizes = round.hands.map(hand => hand.length);

// filter - keep only matching elements
const playableCards = round.hands[round.playerInTurn!]
  .filter((_, i) => canPlay(i, round));

// flatMap - map then flatten
const allCards = round.hands.flatMap(hand => hand);

// reduce - accumulate to single value
const totalPoints = allCards.reduce((sum, card) => sum + pointsFor(card), 0);

// Game.play - accepts function that transforms Round
export const play = (f: (r: Round) => Round, game: Game): Game => {
  if (!game.currentRound) return game;
  const updatedRound = f(game.currentRound);
  // Handle round completion...
};

// Usage:
play(draw, game);                    // Apply draw function
play((r) => playCard(0, r), game);  // Apply play function
play((r) => sayUno(0, r), game);    // Apply sayUno function
```

---

## Pipelining

**Concept:** Pipelining chains multiple transformations together. Data flows through a sequence of functions, with each function's output becoming the next function's input.

**Key idea**: Think of a factory assembly line:
1. Raw material enters
2. Station 1 transforms it
3. Station 2 receives transformed material, transforms further
4. Station 3 receives that, transforms it again
5. Finished product exits

**Why pipeline?**
- **Readable**: You can follow data transformation step-by-step, top-to-bottom
- **Modular**: Each transformation is independent - test it separately
- **Maintainable**: Easy to add/remove/reorder steps
- **Composable**: Build complex operations from simple building blocks

**Assignment 4 Example:**
```ts
// pipe implementation - compose functions left to right
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);

// Array method chaining - natural pipeline
const scores = allCards
  .filter(card => pointsFor(card) > 10)
  .map(card => pointsFor(card))
  .reduce((sum, points) => sum + points, 0);

// Composed operations using pipe
export const sayUnoAndPlay = (player: number, cardIndex: number) =>
  pipe<Round>(
    sayUno(player),      // Step 1: Say UNO
    playCard(cardIndex)  // Step 2: Play card
  );

// Usage
const newRound = sayUnoAndPlay(0, 2)(round);
```

---

## Currying

**Concept:** Currying transforms a function that takes multiple arguments into a sequence of functions, each taking one argument.

**Example:**
```ts
// Normal function: takes 2 arguments at once
const add = (a: number, b: number) => a + b;
add(2, 3);  // Call with both arguments

// Curried function: takes 1 argument, returns function for next argument
const addCurried = (a: number) => (b: number) => a + b;
addCurried(2)(3);  // Call in stages
```

**Partial Application**: The real power. When you curry, you can "fix" early arguments and create specialized functions:
```ts
const addCurried = (a: number) => (b: number) => a + b;
const add5 = addCurried(5);  // Fix first arg, get function waiting for second
add5(3);   // → 8
add5(10);  // → 15
```

**Why curry?**
- **Partial application**: Create specialized versions of general functions
- **Composition**: Curried functions are easier to compose (1 arg in, 1 value out)
- **Reusability**: Define once, use in many contexts
- **Data-last pattern**: Put data as last argument for better composition

**Assignment 4 Example:**
```ts
// curry2 helper - convert 2-arg function to curried form
export const curry2 = <A, B, R>(fn: (a: A, b: B) => R) => (a: A) => (b: B): R =>
  fn(a, b);

// curry3 helper - convert 3-arg function to curried form
export const curry3 = <A, B, C, R>(fn: (a: A, b: B, c: C) => R) =>
  (a: A) => (b: B) => (c: C): R => fn(a, b, c);

// Apply to Assignment 4 functions
export const canPlay = curry2(
  (index: number, round: Round): boolean => {
    // ... pure logic
  }
);

export const play = curry3(
  (index: number, color: Color | undefined, round: Round): Round => {
    // ... returns new Round
  }
);

// Partial application - fix first argument, use later with different data
const canPlayFirst = canPlay(0);   // Function waiting for round
canPlayFirst(round1);              // Check if card 0 playable in round1
canPlayFirst(round2);              // Check if card 0 playable in round2

// Create specialized functions for each player
const aliceActions = {
  canPlay: canPlay(0),
  play: play(0),
};
```

---

## Persistent Data Structures

**Concept:** Persistent data structures provide efficient immutability through **structural sharing** - a technique where multiple versions of data share the unchanged parts instead of copying everything.

**The problem:**
Naive immutability copies everything:
```ts
const state1 = { player: "Alice", score: 0, hand: [card1, card2] };
const state2 = { ...state1, score: 10 }; // Copies entire object
// Performance: O(n) - copies all fields
```

**Structural sharing solution:**
When you update, only changed path is copied. Rest is reused:
```
Both versions share unchanged data:
state1.hand === state2.hand  // true - same reference!
only score is different
```

**Why structural sharing matters:**
- **Memory efficient**: Don't copy data you're not changing
- **Performance**: O(log n) for updates instead of O(n)
- **Immutability without cost**: Efficient immutability without huge memory overhead

**In Assignment 4:**
The spread operator provides lightweight structural sharing - efficient enough for typical applications.

**Assignment 4 Example:**
```ts
// Structural sharing with spread operator - lightweight alternative to immutable.js
export const play = (
  index: number,
  color: Color | undefined,
  round: Round
): Round => {
  // Only create new hands array for current player
  const hands = round.hands.map((h, i) =>
    i === round.playerInTurn ? h.filter((_, idx) => idx !== index) : h
  );
  const card = round.hands[round.playerInTurn!][index];

  // Top-level copy, but unchanged objects are reused
  return {
    ...round,  // Copies reference to other fields
    hands,     // Only this is new - rest shared
    discardPile: [card, ...round.discardPile],
  };
};

// Shallow copy - top level new, nested structures shared
// Performance: O(n) where n = changed fields, not total data size
// Memory: Only changed path copied, rest shared between versions
```

---

## Lightweight Proxies (Lazy Evaluation)

**Concept:** Lazy evaluation defers computation until the result is actually needed. This avoids creating intermediate data structures and unnecessary calculations.

**Eager evaluation (wasteful):**
```ts
const numbers = [1, 2, 3, 4, 5];
const step1 = numbers.map(x => x * 2);    // Creates [2, 4, 6, 8, 10] in memory
const step2 = step1.filter(x => x > 5);   // Creates [6, 8, 10] in memory
const result = step2.reduce((s, x) => s+x); // 24
// 3 array objects created, data traversed 3 times
```

**Lazy evaluation (efficient):**
```ts
const result = numbers
  .map(x => x * 2)       // Not executed yet
  .filter(x => x > 5)    // Not executed yet
  .reduce((s, x) => s+x); // NOW executes in single pass
// Single traversal, no intermediate arrays
```

**Why lazy evaluation?**
- **Memory efficiency**: No intermediate arrays taking up memory
- **Performance**: Single pass through data instead of multiple passes
- **Infinite sequences**: Can work with infinite data if you take finite results
- **Composition**: Build transformations without performance penalty

**Assignment 4 Example:**
```ts
// Score calculation - chains operations lazily
export const score = (round: Round): number | undefined => {
  if (!round.ended || round.winner === undefined) return undefined;
  
  // Transform: hands -> cards -> filter non-winners -> sum points
  return round.hands
    .flatMap((hand, idx) =>
      idx === round.winner ? [] : hand  // Remove winner's cards
    )
    .reduce((sum, card) => sum + pointsFor(card), 0);
};

// Single pass - no intermediate arrays created
// map/filter/reduce executed together, not as separate steps
// With 4 players, 7 cards each (28 cards):
//   - Eager: creates [28] -> [21] -> result (intermediate arrays)
//   - Lazy: single pass through 21 cards (Assignment 4 approach)
```

---

## Key Idea

Functional programming reduces bugs by:
- **Avoiding mutation** - data never changes, new versions created
- **Isolating side effects** - pure logic in center, I/O at boundaries
- **Enabling composition** - small testable functions combine into larger systems

---

## File Structure

```
uno-functional/
├── src/
│   ├── model/
│   │   ├── deck.ts           # pointsFor (pure function)
│   │   ├── round.ts          # Core: canPlay, play, draw (pure)
│   │   ├── round-functional.ts # Curried API, composition
│   │   └── uno.ts            # Game orchestration (pure)
│   └── utils/
│       └── functional.ts     # pipe, curry2, curry3
└── __test__/                 # 185 tests
```

---

## Exam Checklist

✅ **Functional Programming**: Stateless computation, immutable data  
✅ **Purity**: All game logic is pure, deterministic  
✅ **Immutability**: readonly types, no mutations  
✅ **Higher-Order Functions**: map, filter, reduce, flatMap, play(f, game)  
✅ **Pipelining**: pipe utility, array method chaining  
✅ **Currying**: curry2/curry3 helpers, partial application  
✅ **Persistent Data**: Structural sharing via spread operator  
✅ **Lazy Evaluation**: Single-pass transformations (score calculation)  

---

## Quick Q&A

**Q: What makes Assignment 4 functional?**  
A: Immutable data, pure functions, higher-order functions for composition, no side effects inside logic.

**Q: Why readonly on all types?**  
A: TypeScript compiler enforces immutability - prevents mutations at compile time.

**Q: How do you update immutable data?**  
A: Spread operator for shallow copy: `{ ...round, field: newValue }`

**Q: Why curry?**  
A: Partial application - fix some args, get function waiting for rest. Reuse across different data.

**Q: What's the benefit of pure functions?**  
A: Easy to test (no mocks), predictable, composable, parallelizable.
