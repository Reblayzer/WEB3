# Assignment 4: Functional Programming - Implementation Guide

## File Structure Overview

```
uno-functional/
├── src/
│   ├── model/
│   │   ├── uno.ts        ← Game orchestration
│   │   ├── round.ts      ← Pure functional round logic
│   │   ├── deck.ts       ← Deck creation (pure functions)
│   │   └── types.ts      ← Type definitions
│   ├── utils/
│   │   └── random_utils.ts  ← Shuffler functions
│   └── __test__/
│       ├── utils/
│       │   ├── predicates.ts  ← Builder pattern for testing
│       │   └── shuffling.ts   ← Shuffler builders
│       └── model/
│           └── *.test.ts      ← Tests using lodash/fp
```

## Key Concept: Everything is Immutable

**NEVER mutate - always return new**

### Anti-Pattern (Mutable - DON'T DO THIS)

```ts
// ❌ BAD - Modifies existing round
function playCard(round: Round, cardIndex: number): void {
  round.hands[round.playerInTurn].splice(cardIndex, 1);
  round.playerInTurn = (round.playerInTurn + 1) % round.players.length;
}
```

### Correct Pattern (Immutable)

```ts
// ✓ GOOD - Returns new round
function playCard(round: Round, cardIndex: number): Round {
  return {
    ...round,
    hands: round.hands.map(
      (hand, i) =>
        i === round.playerInTurn
          ? hand.filter((_, j) => j !== cardIndex) // New array without card
          : hand // Unchanged
    ),
    playerInTurn: (round.playerInTurn + 1) % round.players.length,
  };
}
```

## Key Implementation: `round.ts`

**Pure functional game logic**

### Type Definition - Everything Readonly

```ts
// Lines 8-26: Immutable round structure
export type Round = {
  readonly players: readonly string[];
  readonly hands: readonly (readonly Card[])[];
  readonly deck: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly playerInTurn: number;
  readonly direction: number;
  readonly unoWindow: {
    readonly open: boolean;
    readonly player: number;
  };
};
```

**Key:** `readonly` everywhere prevents mutations

### Creating Round (Immutable Initialization)

```ts
// Lines 108-115: Spread operators everywhere
export const createRound = (
  config: RoundConfig,
  shuffler: Shuffler<Card>
): Round => {
  const shuffled = shuffler([...createDeck()]);
  const hands = Array(config.players.length)
    .fill(null)
    .map(() => shuffled.splice(0, config.handSize));

  return {
    ...config, // Spread config
    players: [...config.players], // Copy players
    hands: hands.map((h) => [...h]), // Deep copy hands
    deck: [...shuffled], // Copy deck
    discardPile: [shuffled.pop()!], // Initial card
    playerInTurn: 0,
    direction: 1,
    unoWindow: { open: false, player: -1 },
  };
};
```

### Playing Card (Pure Function)

```ts
// Lines 230-250: Pure - no side effects
export const play = (round: Round, cardIndex: number): Round => {
  const card = round.hands[round.playerInTurn][cardIndex];
  const hand = round.hands[round.playerInTurn];

  // All operations return new values
  return {
    ...round,
    hands: round.hands.map((h, i) =>
      i === round.playerInTurn
        ? h.filter((_, j) => j !== cardIndex) // Remove card
        : h
    ),
    discardPile: [...round.discardPile, card], // Add to pile
    playerInTurn: nextPlayer(round),
    unoWindow: {
      open: hand.length === 2, // Opening uno window
      player: round.playerInTurn,
    },
  };
};
```

**Why pure?**

- Same input → same output
- No side effects
- Easy to test
- Can be cached/memoized

## Key Implementation: Higher-Order Functions

**Functions as first-class citizens**

### Accepting Functions as Parameters

```ts
// uno.ts Line 54: Function as parameter
export const play = (game: UnoGame, f: (r: Round) => Round): UnoGame => {
  return {
    ...game,
    currentRound: f(game.currentRound), // Apply function to round
  };
};

// Usage:
const newGame = play(game, (round) => playCard(round, 2));
const newGame = play(game, (round) => drawCard(round));
```

### Shuffler Type (Generic HOF)

```ts
// random_utils.ts Line 8: Generic type for functions
export type Shuffler<T> = (ts: readonly T[]) => T[];

// Line 10: Generic HOF implementation
export const standardShuffler = <T>(array: readonly T[]): T[] => {
  const arr = [...array]; // Immutable copy
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Works with any type!
const shuffledCards = standardShuffler<Card>(deck);
const shuffledPlayers = standardShuffler<string>(players);
```

## Key Implementation: Lodash/FP in Tests

**Functional pipelines for data transformation**

### Using \_.flow for Composition

```ts
// round.going.out.test.ts Line 34: Compose functions
import _ from "lodash/fp";

it("should handle going out", () => {
  const round = createRound(config, fixedShuffler);

  // Compose multiple operations left-to-right
  const finalRound = _.flow([
    draw, // First operation
    _.partial(play, 2), // Play card at index 2
    draw, // Draw again
    _.partial(play, 0, undefined), // Play card at index 0
  ])(round);

  expect(hasWinner(finalRound)).toBe(true);
});
```

### Using \_.matches for Filtering

```ts
// deck.test.ts Lines 8-17: Lodash predicates
import _ from "lodash/fp";

it("should have correct card types", () => {
  const deck = createDeck();

  // _.matches creates a predicate function
  const numbered = deck.filter(_.matches({ type: "NUMBERED" }));
  const actions = deck.filter(
    (c) =>
      _.matches({ type: "SKIP" })(c) ||
      _.matches({ type: "REVERSE" })(c) ||
      _.matches({ type: "DRAW_2" })(c)
  );

  expect(numbered.length).toBe(40);
});
```

### Using \_.groupBy

```ts
// deck.test.ts Line 26: Group by property
const byColor = _.groupBy("color", coloredCards);
// Result: { RED: [...], BLUE: [...], GREEN: [...], YELLOW: [...] }
```

## Key Implementation: Currying & Partial Application

**Enable function composition**

### Partial Application with Lodash

```ts
// _.partial fixes some arguments, returns function waiting for rest
const playIndex2 = _.partial(play, _, 2);
// playIndex2 is now: (round: Round) => Round

// Use it:
const newRound = playIndex2(round);
```

### Manual Currying

```ts
// Transform f(a, b, c) into f(a)(b)(c)
const playCard = (round: Round) => (index: number) => {
  return {
    ...round,
    hands: round.hands.map((h, i) =>
      i === round.playerInTurn ? h.filter((_, j) => j !== index) : h
    ),
  };
};

// Use it:
const playFromRound = playCard(myRound);
const newRound = playFromRound(2);
// Or in one go:
const newRound = playCard(myRound)(2);
```

## Key Implementation: Builder Pattern for Tests

**Functional approach to test setup**

### Shuffler Builder (shuffling.ts)

```ts
// Lines 53-106: Builder pattern
export const shuffleBuilder = () => {
  let discardSequence: Card[] = [];
  let deckSequence: Card[] = [];

  return {
    discard: () => {
      // Methods return 'this' for chaining
      return {
        is(spec: any) {
          discardSequence.push(findCard(spec));
          return this;
        },
        // ...
      };
    },

    deck: () => {
      return {
        is(spec: any) {
          deckSequence.push(findCard(spec));
          return this;
        },
      };
    },

    build: (): Shuffler<Card> => {
      // Return function that uses built sequences
      return (cards: readonly Card[]): Card[] => {
        return [...discardSequence, ...deckSequence, ...rest];
      };
    },
  };
};

// Usage in tests:
const shuffler = shuffleBuilder()
  .discard()
  .is({ type: "NUMBERED", color: "RED", number: 5 })
  .deck()
  .is({ type: "NUMBERED", color: "RED", number: 3 })
  .deck()
  .is({ type: "SKIP", color: "BLUE" })
  .build();
```

### Predicate Builder (predicates.ts)

```ts
// Lines 3-29: Flexible card matching
export type CardPredicate = (c: Card) => boolean;

export const is = (spec: any): CardPredicate => {
  return (card: Card) => {
    if (spec.type && card.type !== spec.type) return false;
    if (spec.color && "color" in card && card.color !== spec.color)
      return false;
    if (
      spec.number !== undefined &&
      "number" in card &&
      card.number !== spec.number
    )
      return false;
    return true;
  };
};

// Usage:
const redCards = deck.filter(is({ color: "RED" }));
const skipCards = deck.filter(is({ type: "SKIP" }));
const red5 = deck.filter(is({ color: "RED", number: 5 }));
```

## Functional Principles in Action

### 1. Immutability

```ts
// ✓ Always return new
return { ...round, playerInTurn: next };

// ✓ Never modify
return round.hands.map((h) => [...h]);
```

### 2. Purity

```ts
// ✓ Pure - same input = same output, no side effects
export const play = (round: Round, index: number): Round => {
  return { ...round /* new state */ };
};

// ✗ Impure - modifies external state
let globalScore = 0;
export const updateScore = (points: number) => {
  globalScore += points; // Side effect!
};
```

### 3. Function Composition

```ts
// Compose functions into pipelines
const processRound = _.flow([draw, _.partial(play, 2), checkWinner]);
```

### 4. Higher-Order Functions

```ts
// Functions that take/return functions
const withLogging =
  (fn: Function) =>
  (...args: any[]) => {
    console.log("Calling", fn.name);
    return fn(...args);
  };
```

## Common Exam Questions for Assignment 4

**Q: "Show me how you ensure immutability"**

- **Show:** `round.ts` lines 8-26 (readonly types)
- **Show:** `round.ts` lines 230-250 (spread operators)
- **Explain:** "All types use `readonly`. All functions return new objects with spread operators. Never mutate existing data."

**Q: "What makes a function pure?"**

- **Show:** `round.ts` play function
- **Explain:** "Pure means: same input always gives same output, and no side effects. This `play` function only uses its parameters and returns new data. Doesn't modify global state, doesn't do I/O."

**Q: "Show me higher-order functions"**

- **Show:** `uno.ts` line 54 - accepts function
- **Show:** `random_utils.ts` - generic shuffler
- **Explain:** "HOF takes functions as arguments or returns functions. `play` accepts a function to apply to the round. Shuffler is generic, works with any type."

**Q: "How do you use Lodash/FP?"**

- **Show:** Test files using `_.flow`, `_.partial`, `_.matches`
- **Explain:** "`_.flow` composes functions left-to-right. `_.partial` fixes some arguments. All lodash/fp functions are curried and data-last for easy composition."

**Q: "Explain the builder pattern in your tests"**

- **Show:** `shuffling.ts` lines 53-106
- **Explain:** "Builder lets me construct complex test scenarios fluently. Chain methods to specify what cards appear in what order, then `build()` creates the shuffler function."

**Q: "Why inject the shuffler instead of using Math.random directly?"**

- **Explain:** "Makes functions pure. If `createRound` used `Math.random` internally, same inputs could give different outputs. Injecting shuffler means I can pass predictable shuffler for tests, random shuffler for real game. Pure functions are testable."

## Memory Aid for Oral Exam

**Core Concepts to Emphasize:**

1. **Immutability** - Show `readonly` and spread operators
2. **Purity** - Show functions with no side effects
3. **HOF** - Show functions accepting/returning functions
4. **Composition** - Show `_.flow` in tests

**File Walkthrough:**

1. **Start with `round.ts`** - "All types are readonly"
2. **Show `play` function** - "Pure, returns new round"
3. **Show test file** - "Using lodash/fp for composition"
4. **Show builder pattern** - "Fluent test setup"

**Quick Principles:**

- **Immutable** = No mutations, return new
- **Pure** = No side effects, deterministic
- **HOF** = Functions as values
- **Composition** = Combine small functions into complex behaviors
