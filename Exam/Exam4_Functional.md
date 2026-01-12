# Exam 4: Functional Programming

> **Exam Topics:** immutability, purity, functional libraries, pipelining (map, filter, flatMap), currying, persistent data structures, lightweight proxies (sequences)

---

## 1. Higher-Order Functions

### What are they?
Higher-order functions (HOFs) are functions that take other functions as arguments OR return functions. They're the foundation of functional programming, enabling code reuse and composition.

### Why use them?
HOFs let you abstract patterns. Instead of writing similar loops repeatedly, you pass behavior as a function to a HOF like `map` or `filter`. This makes code shorter, clearer, and more reusable.

```ts
// map, filter, reduce are HOFs - they take functions as arguments
const doubled = numbers.map(n => n * 2)
const evens = numbers.filter(n => n % 2 === 0)
const sum = numbers.reduce((acc, n) => acc + n, 0)

// Function returning a function
const multiply = (a: number) => (b: number) => a * b
const double = multiply(2)  // Returns a function
double(5)  // 10
```

---

## 2. Functors and Monads

### Functors
A functor is any data structure with a `map` method that applies a function to wrapped values. Arrays are functors. The key property: mapping preserves the structure.

```ts
// Array is a functor - has map
[1, 2, 3].map(x => x * 2)  // [2, 4, 6]

// Type signature: F<T> with (T => U) produces F<U>
// The container type stays the same, only contents change
```

### Monads
A monad is a functor with a `flatMap` (also called `bind` or `chain`) method. FlatMap applies a function that returns a wrapped value, then flattens the result. This prevents nested wrappers.

```ts
// Without flatMap - nested arrays
[[1, 2], [3, 4]].map(arr => arr.map(x => x * 2))
// [[2, 4], [6, 8]] - nested!

// With flatMap - flattened
[[1, 2], [3, 4]].flatMap(arr => arr.map(x => x * 2))
// [2, 4, 6, 8] - flat!
```

### Common Monads
- **Promise**: `.then()` is like flatMap for async operations
- **Optional/Maybe**: Handles "value or nothing" without null checks
- **Either/Result**: Handles "success or error" branching

```ts
// Promise monad - chain async operations
fetchUser(id)
  .then(user => fetchOrders(user.id))  // Returns Promise
  .then(orders => processOrders(orders))

// Optional pattern - avoid null checks
Optional.of(user)
  .map(u => u.address)
  .map(a => a.city)
  .getOrElse('Unknown')
```

---

## 3. Immutability

### What is it?
Immutability means data cannot be changed after it's created. Instead of modifying existing data, you create new data with the changes you want. The original remains unchanged. This is a core principle of functional programming because it eliminates a whole class of bugs caused by unexpected mutations.

### Why is it important?
When data can't change, your code becomes predictable. You never have to worry about some other part of your code modifying data you're using. This makes debugging easier because you can trace exactly when and where new data was created. It also enables features like undo/redo (just keep old versions) and efficient change detection in React/Vue (compare object references).

### Mutable (Imperative Style - Avoid)
```ts
function addCard(hand, card) {
  hand.push(card)    // Changes the original array!
  return hand
}

const myHand = [card1, card2]
addCard(myHand, card3)
// myHand is now [card1, card2, card3] - original was modified
```

### Immutable (Functional Style - Preferred)
```ts
function addCard(hand, card) {
  return [...hand, card]   // Creates a new array
}

const myHand = [card1, card2]
const newHand = addCard(myHand, card3)
// myHand is still [card1, card2] - original unchanged
// newHand is [card1, card2, card3]
```

### Common Immutable Patterns
```ts
// Add to array
const added = [...array, item]

// Remove from array
const removed = array.filter((_, i) => i !== index)

// Update at index
const updated = array.map((item, i) => i === index ? newValue : item)

// Update object property
const updated = { ...obj, property: newValue }

// Nested update
const updated = { ...state, round: { ...state.round, turn: newTurn } }
```

---

## 4. Purity

### What is a pure function?
A pure function has two properties: given the same inputs, it always returns the same output (deterministic), and it has no side effects (doesn't change anything outside itself). Pure functions are like mathematical functions - they compute a result based solely on their inputs.

### Why does purity matter?
Pure functions are predictable and easy to test. You can call them any number of times without worrying about affecting other parts of your program. They're also easier to reason about because you only need to look at the inputs and outputs, not the entire program state.

### Pure Functions
```ts
// Pure: same input always gives same output
function add(a, b) { return a + b }

// Pure: only depends on parameters
function isPlayable(card, topCard) {
  return card.color === topCard.color || card.type === topCard.type
}
```

### Impure Functions
```ts
// Impure: uses external state
let total = 0
function addToTotal(n) {
  total += n    // Side effect: modifies external variable
  return total
}

// Impure: non-deterministic (random)
function getRandomCard(deck) {
  return deck[Math.floor(Math.random() * deck.length)]
}

// Impure: I/O side effect
function logCard(card) {
  console.log(card)  // Side effect: outputs to console
}
```

### Making Functions Pure
Instead of using randomness or external state directly, inject dependencies. This makes the function pure while still allowing the behavior you need.

```ts
// Impure: uses internal randomness
function shuffle(deck) { /* uses Math.random internally */ }

// Pure: randomness is injected
type Shuffler = <T>(array: T[]) => T[]
function createRound(players: string[], shuffler: Shuffler) {
  const shuffled = shuffler(createDeck())  // Behavior injected
  // ...
}

// In tests: use predictable shuffler
const testShuffler = arr => arr  // Returns array unchanged
```

---

## 5. Functional Libraries

### What are they?
Functional libraries like Lodash/FP and Ramda provide utility functions designed for functional programming. Their functions are often curried by default and designed for composition. They make it easier to write functional code without building everything from scratch.

### Why use them?
These libraries provide well-tested implementations of common operations. Their functions are designed to work well together, especially for building data transformation pipelines. They also handle edge cases you might forget about.

### Lodash/FP
Lodash/FP is a functional version of Lodash with auto-curried functions and data-last argument order (which makes composition easier).

```ts
import { map, filter, pipe } from 'lodash/fp'

const doubled = map(x => x * 2)      // Returns a function
doubled([1, 2, 3])                    // [2, 4, 6]
```

### Common Functions

| Function | What it does |
|----------|--------------|
| `map` | Transform each element |
| `filter` | Keep elements matching a condition |
| `reduce` | Accumulate elements into a single value |
| `find` | Get first element matching a condition |
| `flatten` | Flatten nested arrays one level |
| `uniq` | Remove duplicate values |
| `groupBy` | Group elements by a key |

---

## 6. Pipelining (map, filter, flatMap)

### What is pipelining?
Pipelining chains multiple operations together, passing the output of each operation as the input to the next. Data flows through a series of transformations. This creates readable, declarative code that describes what you want, not how to compute it step by step.

### pipe vs compose
`pipe` processes left-to-right (first function runs first), which matches how we read. `compose` processes right-to-left (mathematical order). They do the same thing, just in opposite directions.

```ts
// pipe: left to right (more readable)
const process = pipe(
  filter(isPlayable),    // Step 1
  map(getColor),         // Step 2
  uniq                   // Step 3
)

// compose: right to left (mathematical)
const process = compose(uniq, map(getColor), filter(isPlayable))
```

### map - Transform Each Element
Map applies a function to every element and returns a new array with the results. The original array is unchanged.

```ts
[1, 2, 3].map(x => x * 2)     // [2, 4, 6]
hand.map(card => card.color)   // ['RED', 'BLUE', 'RED']
```

### filter - Keep Matching Elements
Filter keeps only the elements for which your function returns true.

```ts
[1, 2, 3, 4].filter(x => x % 2 === 0)    // [2, 4]
hand.filter(card => card.color === 'RED') // All red cards
```

### reduce - Accumulate to Single Value
Reduce combines all elements into a single value using an accumulator function.

```ts
[1, 2, 3].reduce((sum, n) => sum + n, 0)  // 6
hand.reduce((total, card) => total + cardPoints(card), 0)  // Total points
```

### flatMap - Map and Flatten
FlatMap maps each element to an array, then flattens the result one level. It's useful when your mapping function returns multiple values.

```ts
[[1, 2], [3, 4]].flatMap(arr => arr)  // [1, 2, 3, 4]
players.flatMap(p => p.hand)           // All cards from all players
```

---

## 7. Currying

### What is it?
Currying transforms a function that takes multiple arguments into a sequence of functions that each take one argument. Instead of `f(a, b, c)`, you get `f(a)(b)(c)`. Each call returns a new function until all arguments are provided.

### Why use it?
Currying enables partial application - you can fix some arguments now and supply the rest later. This lets you create specialized functions from general ones. It also makes functions easier to compose because you can create functions that expect just one argument.

```ts
// Normal function
function add(a, b) { return a + b }
add(2, 3)  // 5

// Curried function
const add = a => b => a + b
add(2)(3)       // 5
const add2 = add(2)  // Partial application: fix first argument
add2(3)         // 5
add2(10)        // 12
```

### Practical Example
Create specialized functions by partially applying arguments:

```ts
const filterByColor = color => cards => cards.filter(c => c.color === color)

const filterRed = filterByColor('RED')     // Specialized function
const filterBlue = filterByColor('BLUE')

filterRed(hand)   // All red cards in hand
filterBlue(hand)  // All blue cards in hand
```

### Point-Free Style
When functions are curried and data-last, you can compose them without mentioning the data at all. This style is concise but can be harder to read for complex operations.

```ts
// With explicit data
const getTypes = cards => cards.map(card => card.type)

// Point-free (no mention of 'cards')
const getTypes = map(prop('type'))
```

---

## 8. Persistent Data Structures (Immutable.js)

### What are they?
Persistent data structures are immutable structures that efficiently share unchanged parts between versions. When you "update" a persistent structure, you get a new version that shares most of its memory with the old version. Only the changed parts are copied.

### Why use them?
Plain JavaScript immutable updates copy entire objects and arrays, which is wasteful for large data. Persistent data structures use structural sharing to make immutable updates efficient. An update costs O(log n) instead of O(n).

### Structural Sharing
When you update one part of a tree structure, only the path from the root to the changed node needs to be copied. All other branches are shared between old and new versions.

```
Original: [A, B, C, D, E]
Update C to C':
New:      [A, B, C', D, E]
            ^     ^
        Shared  Shared
```

### Immutable.js Basics
Immutable.js provides persistent versions of JavaScript's built-in collections. Methods that would normally mutate instead return new structures.

```ts
import { Map, List, fromJS } from 'immutable'

const map = Map({ name: 'Player 1', score: 0 })
const updated = map.set('score', 10)

map.get('score')      // 0 - original unchanged
updated.get('score')  // 10 - new version

// Deep updates with setIn
const state = fromJS({ game: { round: { turn: 0 } } })
const newState = state.setIn(['game', 'round', 'turn'], 1)
```

---

## 9. Lightweight Proxies (Sequences)

### What are they?
Sequences (Seq) in Immutable.js are lazy collections. Operations on sequences don't execute immediately - they're recorded and only run when you actually need the result. This is called lazy evaluation.

### Why use them?
Lazy evaluation avoids unnecessary work. If you chain multiple operations (map, filter, etc.), eager evaluation creates intermediate arrays at each step. Lazy evaluation does a single pass through the data, computing only what's needed for the final result.

### Lazy vs Eager

```ts
// Eager (List): executes each step immediately
List([1, 2, 3, 4, 5])
  .map(x => x * 2)     // Creates [2, 4, 6, 8, 10]
  .filter(x => x > 5)  // Creates [6, 8, 10]
  .toArray()           // [6, 8, 10]

// Lazy (Seq): defers execution
Seq([1, 2, 3, 4, 5])
  .map(x => x * 2)     // No computation yet
  .filter(x => x > 5)  // Still no computation
  .toArray()           // NOW computes in single pass: [6, 8, 10]
```

### Benefits of Lazy Evaluation
- **Short-circuit**: Can stop early (e.g., `first()` doesn't process whole sequence)
- **Memory efficient**: No intermediate arrays
- **Infinite sequences**: Can represent infinite ranges and take only what you need

```ts
import { Range } from 'immutable'

// Infinite range - doesn't crash because it's lazy!
const naturals = Range(1, Infinity)

// Take only what you need
naturals.take(10).toArray()  // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Find first square > 100 - stops early
naturals.map(x => x * x).filter(x => x > 100).first()  // 121
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| What is immutability? | Data cannot change after creation - you create new data with modifications instead |
| What makes a function pure? | Same input always gives same output, and no side effects (doesn't modify external state) |
| What is currying? | Transforming `f(a, b)` into `f(a)(b)` - enables partial application |
| pipe vs compose? | Both chain functions; pipe is left-to-right, compose is right-to-left |
| What is structural sharing? | Immutable structures share unchanged parts between versions for efficiency |
| Why use Seq instead of List? | Seq is lazy - operations don't execute until needed, avoiding intermediate arrays |
| What is a higher-order function? | A function that takes functions as arguments or returns a function |
| What is a functor? | Data structure with a `map` method that preserves structure (like Array) |
| What is a monad? | Functor with `flatMap` that prevents nesting (Promise, Optional, Either) |
| Why data-last in FP? | Enables partial application and function composition with curried functions |

---

## Where It's Applied in Assignment 4

| Concept | File | Location |
|---------|------|----------|
| **Higher-Order Functions** | `uno-functional/src/model/uno.ts:54` | `play` accepts `f: (r: Round) => Round` as parameter |
| **Pure Functions** | `uno-functional/src/model/deck.ts:37-47` | `pointsFor` - calculates card points without side effects |
| **Immutability (spread)** | `uno-functional/src/model/round.ts:108-115` | `players: [...players]`, `hands: hands.map(h => [...h])` |
| **Immutable Updates** | `uno-functional/src/model/round.ts:144-149` | `closeUnoWindow` returns new Round with spread |
| **`readonly` types** | `uno-functional/src/model/round.ts:8-26` | All Round fields are `readonly` |
| **Array `.map()`** | `uno-functional/src/model/round.ts:113,157,232` | Copying hands immutably |
| **Array `.filter()`** | `uno-functional/src/model/round.ts:234` | `hands[p].filter((_, i) => i !== index)` remove card |
| **Array `.flatMap()`** | `uno-functional/src/model/round.ts:362` | `hands.flatMap((h, idx) => ...)` for scoring |
| **Lodash `_.sum()`** | `uno-functional/src/model/round.ts:362` | `_.sum(round.hands.flatMap(...))` |
| **Lodash `_.matches()`** | `uno-functional/__test__/model/deck.test.ts:8-17` | `deck.filter(_.matches({type: 'NUMBERED'}))` |
| **Lodash `_.groupBy()`** | `uno-functional/__test__/model/deck.test.ts:26` | Group cards by color |
| **`_.flow()` composition** | `uno-functional/__test__/model/round.going.out.test.ts:34` | `_.flow([draw, _.partial(play, 2), draw])` |
| **`_.partial()` application** | `uno-functional/__test__/model/round.going.out.test.ts:36` | `_.partial(play, 2, undefined)` |
| **Shuffler Type** | `uno-functional/src/utils/random_utils.ts:8` | `Shuffler<T> = (ts: Readonly<T[]>) => T[]` |
| **Generic Functions** | `uno-functional/src/utils/random_utils.ts:10` | `standardShuffler<T>` |
| **Predicate Functions** | `uno-functional/__test__/utils/predicates.ts:3-29` | `is(spec): CardPredicate` returns predicate |
| **Builder Pattern** | `uno-functional/__test__/utils/shuffling.ts:53-106` | `shuffleBuilder().discard().is({...}).build()` |
| **Arrow Functions** | Throughout | All functions use arrow syntax `const f = () => {}` |
