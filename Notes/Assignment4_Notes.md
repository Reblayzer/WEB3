# Assignment 4: UNO Functional Programming

## Overview
**Focus:** Functional programming and tools to help with functional programming  
**Stack:** TypeScript, Ramda/Lodash, Jest  
**Goal:** Refactor OOP domain model to pure functional style

---

## Exam Focus Areas
**The examiner will ask about:**
- Immutability
- Purity
- Functional libraries
- Pipelining (with map, filter, flatMap, etc.)
- Currying
- Persistent data structures (immutable.js)
- Lightweight proxies (immutable.js sequences)

### Quick Explanations with Snippets
- **Immutability** — never mutate; return new data instead.
```ts
const add = (hand: readonly Card[], card: Card) => [...hand, card]
```
- **Purity** — same input, same output, no side effects.
```ts
const isPlayable = (card: Card, top: Card) => card.color === top.color
```
- **Functional libraries** — Ramda/Lodash FP give curried, data-last helpers.
```ts
const playableTypes = pipe(filter(isPlayable), map(prop('type')))(hand)
```
- **Pipelining** — chain small transforms left-to-right.
```ts
const score = pipe(map(cardPoints), reduce((a, b) => a + b, 0))(hand)
```
- **Currying** — fix some args now, reuse later.
```ts
const filterByColor = (color: Color) => (cards: Card[]) => cards.filter(c => c.color === color)
```
- **Persistent data structures** — immutable.js shares structure between versions.
```ts
const next = state.setIn(['round', 'turn'], state.getIn(['round', 'turn']) + 1)
```
- **Lightweight proxies (Seq)** — lazy views avoid copying until needed.
```ts
const evenSeq = Seq(hand).filter(c => c.number % 2 === 0)
```

---

## 1. Immutability

### Definition
Data that **cannot be changed** after creation. Instead of mutating, create **new** data with changes.

### Mutable (BAD in FP)
```ts
// Mutates original array
function addCard(hand: Card[], card: Card): Card[] {
  hand.push(card)  // MUTATION!
  return hand
}

const hand = [card1, card2]
addCard(hand, card3)
console.log(hand)  // [card1, card2, card3] - original changed!
```

### Immutable (GOOD in FP)
```ts
// Returns NEW array, original unchanged
function addCard(hand: readonly Card[], card: Card): Card[] {
  return [...hand, card]  // Spread creates new array
}

const hand = [card1, card2]
const newHand = addCard(hand, card3)
console.log(hand)     // [card1, card2] - original preserved!
console.log(newHand)  // [card1, card2, card3]
```

### Immutable Update Patterns
```ts
// Add to array
const added = [...array, newItem]
const prepended = [newItem, ...array]

// Remove from array
const removed = array.filter((_, i) => i !== indexToRemove)

// Update at index
const updated = array.map((item, i) => i === index ? newValue : item)

// Update object property
const updated = { ...obj, propertyToChange: newValue }

// Update nested property
const updated = {
  ...state,
  round: {
    ...state.round,
    playerInTurn: newPlayer
  }
}
```

### Why Immutability?
1. **Predictable**: No unexpected side effects
2. **Debuggable**: Can trace all state changes
3. **Testable**: Functions are isolated
4. **Undo/Redo**: Just keep old states
5. **Concurrency**: No race conditions
6. **React/Redux**: Efficient change detection

---

## 2. Purity

### What is a Pure Function?
1. **Deterministic**: Same input → Same output (always)
2. **No Side Effects**: Doesn't modify external state

### Pure Function ✅
```ts
// Same input always gives same output
function add(a: number, b: number): number {
  return a + b
}

// Depends only on inputs
function isPlayable(card: Card, topCard: Card, currentColor: Color): boolean {
  if (card.type === 'WILD') return true
  if (card.color === currentColor) return true
  return card.type === topCard.type
}
```

### Impure Function ❌
```ts
// Side effect: modifies external state
let total = 0
function addToTotal(n: number): number {
  total += n  // SIDE EFFECT!
  return total
}

// Non-deterministic: different output each call
function getRandomCard(): Card {
  return deck[Math.random() * deck.length | 0]  // RANDOM!
}

// Side effect: I/O
function logCard(card: Card): void {
  console.log(card)  // SIDE EFFECT!
}
```

### Making Impure → Pure
```ts
// IMPURE: uses external randomness
function shuffle(deck: Card[]): Card[] {
  // Uses Math.random internally
}

// PURE: randomness is INJECTED
type Shuffler = <T>(array: T[]) => T[]

function createRound(players: string[], shuffler: Shuffler): Round {
  const shuffledDeck = shuffler(createDeck())
  // ...
}

// In tests: inject deterministic shuffler
const testShuffler = (arr) => arr  // No shuffle for predictable tests
```

### Referential Transparency
You can **replace a function call with its result** without changing behavior:
```ts
const x = add(2, 3)  // x = 5
const y = x + x      // y = 10

// Equivalent to:
const y = 5 + 5      // y = 10 (same result!)
```

---

## 3. Functional Libraries

### Lodash/FP
```ts
import { map, filter, reduce, pipe, curry } from 'lodash/fp'

// Auto-curried functions
const addOne = map((x: number) => x + 1)
addOne([1, 2, 3])  // [2, 3, 4]

// Data-last (for piping)
const getEvenDoubled = pipe(
  filter((x: number) => x % 2 === 0),
  map((x: number) => x * 2)
)
getEvenDoubled([1, 2, 3, 4])  // [4, 8]
```

### Ramda
```ts
import * as R from 'ramda'

// All functions are auto-curried
const add = R.add(10)
add(5)  // 15

// Powerful composition
const getPlayableCards = R.pipe(
  R.filter(isPlayable),
  R.map(R.prop('type')),
  R.uniq
)
```

### Common Functions
| Function | Purpose |
|----------|---------|
| `map` | Transform each element |
| `filter` | Keep elements matching predicate |
| `reduce` | Accumulate to single value |
| `find` | Get first match |
| `some/any` | Check if any match |
| `every/all` | Check if all match |
| `flatten` | Flatten nested arrays |
| `uniq` | Remove duplicates |
| `groupBy` | Group by key |
| `sortBy` | Sort by key |

---

## 4. Pipelining (map, filter, flatMap)

### Pipeline/Pipe
Chain operations left-to-right:
```ts
import { pipe } from 'ramda'  // or lodash/fp

const processHand = pipe(
  filterPlayable,      // 1. Keep playable cards
  sortByColor,         // 2. Sort by color
  groupByType          // 3. Group by type
)

// Data flows through: input → step1 → step2 → step3 → output
const result = processHand(myHand)
```

### Compose (opposite of pipe)
Chain operations right-to-left (mathematical order):
```ts
import { compose } from 'ramda'

// Read bottom-to-top
const processHand = compose(
  groupByType,         // 3. Last
  sortByColor,         // 2. Middle
  filterPlayable       // 1. First
)
```

### map - Transform Each Element
```ts
const numbers = [1, 2, 3]
const doubled = numbers.map(x => x * 2)  // [2, 4, 6]

// With cards
const cardTypes = hand.map(card => card.type)  // ['NUMBERED', 'SKIP', ...]
```

### filter - Keep Matching Elements
```ts
const numbers = [1, 2, 3, 4, 5]
const evens = numbers.filter(x => x % 2 === 0)  // [2, 4]

// With cards
const redCards = hand.filter(card => card.color === 'RED')
```

### reduce - Accumulate to Single Value
```ts
const numbers = [1, 2, 3, 4]
const sum = numbers.reduce((acc, n) => acc + n, 0)  // 10

// With cards
const totalPoints = hand.reduce((sum, card) => sum + cardPoints(card), 0)
```

### flatMap - Map + Flatten
```ts
const nested = [[1, 2], [3, 4]]
nested.map(arr => arr)        // [[1, 2], [3, 4]]
nested.flatMap(arr => arr)    // [1, 2, 3, 4]

// Practical: get all cards from all hands
const allCards = hands.flatMap(hand => hand)  // Flattened

// Or: expand each card to multiple results
const expanded = cards.flatMap(card => 
  card.type === 'WILD' ? ['RED', 'BLUE', 'GREEN', 'YELLOW'] : [card.color]
)
```

---

## 5. Currying

### Definition
Convert function with multiple arguments into chain of single-argument functions.

```ts
// Normal function
function add(a: number, b: number): number {
  return a + b
}
add(2, 3)  // 5

// Curried function
function addCurried(a: number): (b: number) => number {
  return (b: number) => a + b
}
const add2 = addCurried(2)  // Partial application
add2(3)  // 5
addCurried(2)(3)  // 5
```

### Why Curry?
1. **Partial Application**: Create specialized functions
2. **Point-free Style**: Compose without mentioning data
3. **Reusability**: Build functions from smaller pieces

```ts
// Curried filter
const filterByColor = (color: Color) => (cards: Card[]) =>
  cards.filter(card => card.color === color)

const filterRed = filterByColor('RED')
const filterBlue = filterByColor('BLUE')

filterRed(hand)  // Get all red cards
```

### Auto-Currying with Libraries
```ts
import { curry } from 'lodash/fp'

const add = curry((a: number, b: number, c: number) => a + b + c)

add(1)(2)(3)     // 6
add(1, 2)(3)     // 6
add(1)(2, 3)     // 6
add(1, 2, 3)     // 6
```

### Point-Free Style
Write functions without explicitly mentioning the data:
```ts
// With explicit data
const getCardTypes = (cards: Card[]) => cards.map(card => card.type)

// Point-free (no mention of 'cards')
import { map, prop } from 'ramda'
const getCardTypes = map(prop('type'))
```

---

## 6. Persistent Data Structures (Immutable.js)

### What are Persistent Data Structures?
Data structures that **preserve previous versions** when modified. Updates return new version while old version remains unchanged.

### Structural Sharing
Efficient immutability by **sharing unchanged parts**:
```
Original: [A, B, C, D, E]
                ↓
Update index 2 to C':
                ↓
New:      [A, B, C', D, E]
              ↑     ↑
         Shared  Shared
```
Only changed node is copied, rest is shared.

### Immutable.js Basics
```ts
import { Map, List, fromJS } from 'immutable'

// Create immutable structures
const map = Map({ name: 'Player 1', score: 0 })
const list = List([1, 2, 3])

// "Mutations" return NEW structures
const updated = map.set('score', 10)
console.log(map.get('score'))     // 0 (unchanged)
console.log(updated.get('score')) // 10 (new)

// Deep immutability
const state = fromJS({
  game: {
    round: {
      turn: 0
    }
  }
})

const newState = state.setIn(['game', 'round', 'turn'], 1)
```

### Immutable.js Collections
```ts
import { List, Map, Set, OrderedMap, Record } from 'immutable'

// List (like Array)
const list = List([1, 2, 3])
list.push(4)        // Returns new List
list.get(0)         // 1
list.set(0, 10)     // Returns new List

// Map (like Object)
const map = Map({ a: 1, b: 2 })
map.get('a')        // 1
map.set('c', 3)     // Returns new Map
map.delete('a')     // Returns new Map

// Record (typed Map)
const GameRecord = Record({ players: [], scores: [] })
const game = new GameRecord()
```

---

## 7. Lightweight Proxies (Immutable.js Sequences)

### What are Sequences (Seq)?
**Lazy evaluation** - operations are not executed until needed.

```ts
import { Seq, Range } from 'immutable'

// Create lazy sequence
const seq = Seq([1, 2, 3, 4, 5])
  .map(x => {
    console.log('mapping', x)
    return x * 2
  })
  .filter(x => x > 4)

// Nothing logged yet! Operations are lazy.

// Force evaluation
const result = seq.toArray()
// Now logs: mapping 1, mapping 2, mapping 3...
// Result: [6, 8, 10]
```

### Benefits of Lazy Sequences
1. **Short-circuit**: Stop early when possible
2. **Memory efficient**: Don't create intermediate arrays
3. **Infinite sequences**: Can represent infinite ranges

```ts
import { Range } from 'immutable'

// Infinite range (doesn't crash!)
const naturals = Range(1, Infinity)

// Take only what you need
const firstTen = naturals.take(10).toArray()  // [1, 2, ..., 10]

// Find first match (stops early)
const firstOver100 = naturals
  .map(x => x * x)
  .filter(x => x > 100)
  .first()  // 121 (doesn't compute all squares)
```

### Seq vs List
```ts
// List: eager (executes immediately)
List([1, 2, 3, 4, 5])
  .map(x => x * 2)    // Creates new List
  .filter(x => x > 4) // Creates another List
  .toArray()          // [6, 8, 10]

// Seq: lazy (executes on demand)
Seq([1, 2, 3, 4, 5])
  .map(x => x * 2)    // No computation yet
  .filter(x => x > 4) // Still no computation
  .toArray()          // NOW computes, single pass
```

---

## Functional UNO Example

```ts
// Functional Round type
type Round = Readonly<{
  hands: readonly (readonly Card[])[]
  playerInTurn: number
  discardPile: readonly Card[]
  drawPile: readonly Card[]
  direction: 'CLOCKWISE' | 'COUNTER_CLOCKWISE'
  currentColor: Color
}>

// Pure function: returns NEW round
function play(round: Round, cardIndex: number, color?: Color): Round {
  const hand = round.hands[round.playerInTurn]
  const card = hand[cardIndex]
  
  return {
    ...round,
    hands: round.hands.map((h, i) => 
      i === round.playerInTurn 
        ? h.filter((_, idx) => idx !== cardIndex)
        : h
    ),
    discardPile: [...round.discardPile, card],
    currentColor: color ?? card.color ?? round.currentColor,
    playerInTurn: nextPlayer(round)
  }
}

// Original round unchanged!
const round2 = play(round1, 2, 'RED')
```

---

## Quick Reference for Exam

| Topic | Key Points |
|-------|------------|
| **Immutability** | Never mutate, return new data with changes |
| **Purity** | Same input → same output, no side effects |
| **pipe/compose** | Chain functions: `pipe` (L→R), `compose` (R→L) |
| **map** | Transform each element: `[1,2,3].map(x => x*2)` → `[2,4,6]` |
| **filter** | Keep matching: `[1,2,3].filter(x => x>1)` → `[2,3]` |
| **reduce** | Accumulate: `[1,2,3].reduce((a,b) => a+b, 0)` → `6` |
| **flatMap** | Map + flatten nested results |
| **Currying** | `f(a,b)` → `f(a)(b)`, enables partial application |
| **Persistent DS** | Immutable structures with structural sharing |
| **Seq/Lazy** | Evaluate only when needed, efficient for chains |
| **Immutable.js** | Library for persistent data structures in JS |
