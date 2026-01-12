# Functional Programming - Quick Reference

## Core Principles

### 1. Immutability

Never modify data - create new copies with changes

```ts
// ✗ Mutable
hand.push(card);

// ✓ Immutable
const newHand = [...hand, card];
```

**Common patterns:**

```ts
[...array, item]                              // Add
array.filter((_, i) => i !== index)           // Remove
array.map((x, i) => i === index ? new : x)    // Update
{ ...obj, prop: value }                       // Object update
```

### 2. Purity

Same input → Same output, No side effects

```ts
// ✓ Pure
function add(a, b) {
  return a + b;
}
function isPlayable(card, top) {
  return card.color === top.color;
}

// ✗ Impure
let total = 0;
function addToTotal(n) {
  total += n;
} // Side effect
function random() {
  return Math.random();
} // Non-deterministic
```

**Make impure code pure:** Inject dependencies

```ts
// Instead of using Math.random() internally:
function createRound(players, shuffler: Shuffler) {
  const deck = shuffler(createDeck()); // Behavior injected
}
```

## Higher-Order Functions

Functions that take/return functions

```ts
const doubled = numbers.map((n) => n * 2); // map is HOF
const evens = numbers.filter((n) => n % 2 === 0); // filter is HOF
const multiply = (a) => (b) => a * b; // Returns function
```

## Functors & Monads

### Functor

Has `map` method that transforms wrapped values

```ts
[1, 2, 3].map((x) => x * 2); // Array is a functor
```

### Monad

Functor with `flatMap` - applies function returning wrapped value, flattens result

```ts
[[1, 2], [3]].flatMap((arr) => arr.map((x) => x * 2)); // [2, 4, 6]

// Promise monad
fetchUser(id).then((user) => fetchOrders(user.id));
```

## Pipelining

### map - Transform Each

```ts
[1, 2, 3].map((x) => x * 2); // [2, 4, 6]
```

### filter - Keep Matching

```ts
[1, 2, 3, 4].filter((x) => x % 2 === 0); // [2, 4]
```

### reduce - Accumulate

```ts
[1, 2, 3].reduce((sum, n) => sum + n, 0); // 6
```

### flatMap - Map + Flatten

```ts
[[1, 2], [3]].flatMap((x) => x); // [1, 2, 3]
players.flatMap((p) => p.hand); // All cards
```

### pipe - Chain Operations (Left to Right)

```ts
import { pipe, filter, map, uniq } from "lodash/fp";

const process = pipe(filter(isPlayable), map(getColor), uniq);
```

## Currying

`f(a, b)` → `f(a)(b)` - enables partial application

```ts
// Normal
function add(a, b) {
  return a + b;
}

// Curried
const add = (a) => (b) => a + b;
const add2 = add(2); // Partial application
add2(3); // 5
add2(10); // 12
```

**Practical use:**

```ts
const filterByColor = (color) => (cards) =>
  cards.filter((c) => c.color === color);
const filterRed = filterByColor("RED"); // Specialized function
filterRed(hand);
```

## Lodash/FP

```ts
import { map, filter, pipe } from "lodash/fp";

const doubled = map((x) => x * 2); // Returns function (auto-curried)
doubled([1, 2, 3]); // [2, 4, 6]
```

| Function  | Purpose           |
| --------- | ----------------- |
| `map`     | Transform each    |
| `filter`  | Keep matching     |
| `reduce`  | Accumulate        |
| `find`    | First matching    |
| `flatten` | Flatten arrays    |
| `uniq`    | Remove duplicates |
| `groupBy` | Group by key      |

## Persistent Data Structures (Immutable.js)

### Why?

Efficient immutability through structural sharing

- Plain JS: Copy entire object (O(n))
- Immutable.js: Share unchanged parts (O(log n))

### Basics

```ts
import { Map, List, fromJS } from "immutable";

const map = Map({ name: "Player", score: 0 });
const updated = map.set("score", 10);
map.get("score"); // 0 - original unchanged
updated.get("score"); // 10

// Deep updates
const state = fromJS({ game: { round: { turn: 0 } } });
const newState = state.setIn(["game", "round", "turn"], 1);
```

## Sequences (Lazy Evaluation)

Operations don't execute until needed

```ts
import { Seq } from "immutable";

// Eager (List) - creates intermediate arrays
List([1, 2, 3, 4, 5])
  .map((x) => x * 2) // Creates [2,4,6,8,10]
  .filter((x) => x > 5); // Creates [6,8,10]

// Lazy (Seq) - single pass
Seq([1, 2, 3, 4, 5])
  .map((x) => x * 2) // Deferred
  .filter((x) => x > 5) // Deferred
  .toArray(); // NOW executes: [6,8,10]
```

**Benefits:**

- Short-circuit (stop early)
- No intermediate arrays
- Can handle infinite sequences

```ts
Range(1, Infinity).take(10).toArray(); // Works!
```

## Quick Decisions

**Data transformation?**

- Single operation → `map`, `filter`, `reduce`
- Multiple operations → `pipe`
- Large data → `Seq` (lazy)

**When to curry?**

- Creating specialized functions from general ones
- Function composition
- Partial application

**Immutable updates?**

- Simple → Spread operator
- Complex/frequent → Immutable.js
- Large data → Persistent structures

## Memory Aid

**FP = 3 Rules:**

1. **Immutable** = Don't change, create new
2. **Pure** = Same in → Same out, no side effects
3. **Functions** = First-class citizens (pass around, compose)

**Data Flow:**

```
Data → filter → map → reduce → Result
      (pipeline of transformations)
```
