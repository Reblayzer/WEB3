# Assignment 4 - Functional Programming

## Overview

This assignment transforms the object-oriented UNO game from Assignment 1 into a **functional programming** implementation. The goal is to write predictable, testable logic using functional principles.

## Core Functional Programming Concepts Demonstrated

✅ **Pure Functions** - Deterministic, no side effects  
✅ **Immutability** - All data structures are readonly, never mutated  
✅ **Higher-Order Functions** - Functions that take/return functions  
✅ **Function Composition** - Building complex behavior from simple functions  
✅ **Currying** - Transform multi-parameter functions into sequences of single-parameter functions  
✅ **Persistent Data Structures** - Efficient immutable updates with structural sharing  
✅ **Side Effect Isolation** - Impure operations (randomness) injected as dependencies

## Structure

```
Assignment4/
├── uno-functional/           # Functional implementation
│   ├── src/
│   │   ├── model/
│   │   │   ├── deck.ts              # Card types and deck creation
│   │   │   ├── round.ts             # Core round logic (pure functions)
│   │   │   ├── round-functional.ts  # Curried API + composition examples
│   │   │   └── uno.ts               # Game orchestration
│   │   └── utils/
│   │       ├── functional.ts        # FP utilities (pipe, curry, Maybe monad)
│   │       └── random_utils.ts      # Randomness abstraction
│   └── __test__/                    # Test suite (185 tests, all passing)
├── FUNCTIONAL_PATTERNS.md    # Comprehensive documentation of FP patterns
└── README.md                 # This file
```

## Getting Started

```bash
# Install dependencies
npm install

# Run all tests (185 tests)
npm test -w uno-functional

# Run tests in watch mode
cd uno-functional
npm test -- --watch
```

## Key Features

### 1. Immutable Data Structures

All data uses `readonly` types and spread operators for updates:

```typescript
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly Card[][];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  // ... all fields readonly
};
```

### 2. Pure Function API

Main operations return new states instead of mutating:

```typescript
// All pure - same input always produces same output
export const play: (
  index: number,
  color: Color | undefined,
  round: Round
) => Round;
export const draw: (round: Round) => Round;
export const sayUno: (player: number, round: Round) => Round;
export const canPlay: (index: number, round: Round) => boolean;
```

### 3. Curried API for Composition

`round-functional.ts` provides curried versions enabling partial application:

```typescript
import { canPlay, sayUno, playCard } from "./model/round-functional";

// Partial application - fix first argument
const canPlayFirst = canPlay(0); // Returns: (Round) => boolean
canPlayFirst(round1); // true
canPlayFirst(round2); // false

// Function composition
const sayUnoAndPlay = pipe(sayUno(player), playCard(index));
```

### 4. Side Effect Isolation (Sandwich Model)

Impure operations (randomness) are injected as dependencies:

```typescript
// Pure function that accepts impurity as parameter
type Shuffler<T> = (array: readonly T[]) => readonly T[];

const createRound = (args: {
  players: string[];
  dealer: number;
  shuffler?: Shuffler<Card>; // Randomness injected, not hardcoded
}): Round => {
  // Pure transformations using the injected shuffler
};
```

### 5. Functional Utilities

`utils/functional.ts` provides common FP patterns:

- **Composition**: `pipe`, `compose`
- **Currying**: `curry2`, `curry3`, `partial`
- **Predicates**: `not`, `and`, `or`
- **Maybe Monad**: Safe null handling
- **Array utilities**: `head`, `tail`, `last`, `init`

### 6. Higher-Order Functions

Functions that work with other functions:

```typescript
// HOF: takes a round transformer function
export const play = (f: (r: Round) => Round, game: Game): Game => {
  const updatedRound = f(game.currentRound);
  // ...
};

// Usage:
play(draw, game); // Apply draw function
play(playCard(0), game); // Apply play function
play(sayUno(1), game); // Apply sayUno function
```

## Documentation

### 📖 [FUNCTIONAL_PATTERNS.md](FUNCTIONAL_PATTERNS.md)

Comprehensive guide covering:

- All FP patterns used in the codebase
- Theory explanations with code examples
- Comparison: OOP (Assignment 1) vs FP (Assignment 4)
- SOLID principles in functional context
- Best practices and further reading

## Comparison: OOP vs FP

| Aspect           | OOP (Assignment 1)    | FP (Assignment 4)         |
| ---------------- | --------------------- | ------------------------- |
| **State**        | Mutable class fields  | Immutable value objects   |
| **Behavior**     | Methods on classes    | Pure functions            |
| **Data flow**    | Methods mutate `this` | Functions return new data |
| **Composition**  | Inheritance           | Function composition      |
| **Side effects** | Mixed with logic      | Isolated at boundaries    |
| **Testing**      | Need mocks for state  | Just call with inputs     |
| **Undo/Redo**    | Memento pattern       | Keep old states           |
| **Concurrency**  | Locks/synchronization | Thread-safe by default    |

## Testing

All 185 tests pass, covering:

- ✅ Round creation and initialization
- ✅ Legal play validation
- ✅ Card playing (numbered, action, wild cards)
- ✅ Drawing cards and pile reshuffling
- ✅ UNO calling (pre-announce and post-play)
- ✅ UNO failure catching
- ✅ Round completion and scoring
- ✅ Multi-round game flow
- ✅ Edge cases (empty draw pile, wild card handling)

## Functional Programming Theory Covered

Based on **Exam4_Functional.md**:

1. ✅ **Pure vs Impure Functions** - Isolation of side effects
2. ✅ **Immutability** - Readonly types, no mutations
3. ✅ **Higher-Order Functions** - map, filter, reduce, flatMap
4. ✅ **Function Composition** - pipe, compose utilities
5. ✅ **Currying & Partial Application** - Curried API layer
6. ✅ **Persistent Data Structures** - Structural sharing with spread
7. ✅ **Side Effect Isolation** - Shuffler injection (sandwich model)
8. ✅ **Functors & Monads** - Maybe monad for safe null handling

## Best Practices

The codebase demonstrates:

- ✅ Data-last parameter order (enables currying)
- ✅ Const for everything (never let/var)
- ✅ Readonly everywhere (compiler-enforced immutability)
- ✅ Small, focused functions (single responsibility)
- ✅ Compose, don't inherit
- ✅ Separate pure from impure
- ✅ Type-driven development

## Further Reading

- **[FUNCTIONAL_PATTERNS.md](FUNCTIONAL_PATTERNS.md)** - In-depth pattern documentation
- **[Exam4_Functional.md](../Exam/Exam4_Functional.md)** - Theory covered in exam
- **[Assignment4_Theory_Explained.md](../Notes/Assignment4_Theory_Explained.md)** - Course notes
- **lodash/fp** - Functional utilities library
- **ramda** - Pure functional library for JavaScript
- **fp-ts** - Advanced FP for TypeScript

## Key Takeaways

Functional programming isn't just a style—it's a different paradigm:

- 🎯 **Data transforms, never mutates**
- 🎯 **Functions are first-class values** (pass, return, compose)
- 🎯 **Side effects are explicit** (injected dependencies)
- 🎯 **Types guide design** (if it compiles, it often works)

Result: Code that's easier to reason about, test, compose, and parallelize.

---

**Note**: This is the same UNO game logic as Assignment 1, just implemented with functional programming principles instead of object-oriented patterns.
