# Functional API Usage Examples

This document provides practical examples of using the functional programming API for the UNO game.

## Basic Usage (Standard API)

```typescript
import { createRound, play, draw, canPlay, sayUno } from "./model/round";
import { createGame } from "./model/uno";

// Create a game
const game = createGame({
  players: ["Alice", "Bob", "Charlie"],
  targetScore: 500,
});

// Get current round
let round = game.currentRound!;

// Check if card is playable
if (canPlay(0, round)) {
  // Play the card
  round = play(0, undefined, round);
}

// Draw a card
round = draw(round);

// Say UNO
round = sayUno(0, round); // Player 0 says UNO
```

## Curried API (Functional Style)

```typescript
import * as F from "./model/round-functional";
import { pipe } from "./utils/functional";

let round = createRound({
  players: ["Alice", "Bob", "Charlie"],
  dealer: 0,
});

// Partial application - create specialized functions
const canPlayFirst = F.canPlay(0); // (Round) => boolean
const canPlaySecond = F.canPlay(1); // (Round) => boolean
const sayUnoForAlice = F.sayUno(0); // (Round) => Round

// Use specialized functions
if (canPlayFirst(round)) {
  console.log("First card is playable");
}

// Check multiple cards at once
const playableIndices = [0, 1, 2, 3, 4, 5, 6].filter((i) =>
  F.canPlay(i)(round)
);

console.log("Playable card indices:", playableIndices);
```

## Function Composition

```typescript
import { pipe } from "./utils/functional";
import * as F from "./model/round-functional";

// Compose multiple operations
const playTurn = (player: number, cardIndex: number) =>
  pipe<Round>(
    F.sayUno(player), // First say UNO
    F.playCard(cardIndex) // Then play the card
  );

// Use the composed function
round = playTurn(0, 3)(round);

// More complex composition
const playWildAndDraw = pipe<Round>(
  F.playWild(2)("RED"), // Play wild card, choose red
  F.drawCard // Next player draws (if WILD DRAW)
);
```

## Player Action Factories

```typescript
import { createPlayerAction } from "./model/round-functional";

// Create action object for player 0 (Alice)
const aliceActions = createPlayerAction(0);

// Alice says UNO
round = aliceActions.sayUno()(round);

// Alice plays card at index 2
round = aliceActions.playCard(2)(round);

// Alice plays wild card with chosen color
round = aliceActions.playWild(4, "BLUE")(round);

// Check if Alice has called UNO
const hasCalledUno = aliceActions.hasCalledUno()(round);
```

## Safe Operations with Maybe Monad

```typescript
import {
  getCurrentHand,
  getWinnerName,
  getTopCard,
} from "./model/round-functional";
import { Maybe } from "./utils/functional";

// Safely get current player's hand
const maybeHand = getCurrentHand(round);
const handSize = pipe(
  maybeHand,
  Maybe.map((hand: Card[]) => hand.length),
  Maybe.getOrElse(0)
);

// Safely get winner name
const maybeWinner = getWinnerName(round);
const winnerName = Maybe.getOrElse("No winner yet")(maybeWinner);

// Safely get top card
const maybeTop = getTopCard(round);
const topCardColor = pipe(
  maybeTop,
  Maybe.map((card: Card) => ("color" in card ? card.color : "WILD")),
  Maybe.getOrElse("Unknown")
);
```

## Predicate Composition

```typescript
import { not, and, or } from "./utils/functional";
import * as F from "./model/round-functional";

// Create predicates
const isAliceTurn = F.isPlayerTurn(0);
const isBobTurn = F.isPlayerTurn(1);
const isInProgress = F.isInProgress;

// Combine predicates
const isActiveGame = and(
  isInProgress,
  (r: Round) => r.playerInTurn !== undefined
);

// Use combined predicate
if (isActiveGame(round)) {
  console.log("Game is active");
}

// Check if Alice can play
const aliceCanPlay = and(isAliceTurn, F.playerCanPlayAny(0));

if (aliceCanPlay(round)) {
  console.log("Alice can play a card");
}
```

## Finding Cards

```typescript
import { findCardInHand, countCards } from "./model/round-functional";
import { Maybe } from "./utils/functional";

// Find first red card
const redCard = findCardInHand(
  (card: Card) => "color" in card && card.color === "RED"
)(round);

// Get card info or default
const cardIndex = Maybe.getOrElse(-1)(
  pipe(
    redCard,
    Maybe.map(({ index }) => index)
  )(undefined as any)
);

// Count wild cards in hand
const wildCount = countCards(
  (card: Card) => card.type === "WILD" || card.type === "WILD DRAW"
)(round);

console.log(`Player has ${wildCount} wild cards`);
```

## Game Level Operations

```typescript
import { play, createGame } from "./model/uno";
import { draw, play as playCard } from "./model/round";

let game = createGame({
  players: ["Alice", "Bob", "Charlie"],
  targetScore: 500,
});

// Apply round transformation to game
// play() takes a function that transforms the round
game = play((round) => draw(round), game);

// Play a card through game
game = play((round) => playCard(0, undefined, round), game);

// Chain multiple round operations
game = play((round) => {
  round = draw(round);
  if (canPlay(round.hands[round.playerInTurn!].length - 1, round)) {
    round = playCard(
      round.hands[round.playerInTurn!].length - 1,
      undefined,
      round
    );
  }
  return round;
}, game);
```

## Array Operations (Higher-Order Functions)

```typescript
// Map over all hands to get hand sizes
const handSizes = round.hands.map((hand) => hand.length);

// Filter to get players with 1 card (need to call UNO)
const playersNeedingUno = round.hands
  .map((hand, index) => ({ hand, index }))
  .filter(({ hand }) => hand.length === 1)
  .map(({ index }) => round.players[index]);

// Reduce to calculate total cards in play
const totalCards = round.hands.reduce((total, hand) => total + hand.length, 0);

// FlatMap to get all cards across all hands
const allCards = round.hands.flatMap((hand) => hand);

// Find player with most cards
const maxCards = Math.max(...round.hands.map((h) => h.length));
const playerWithMost = round.hands.findIndex((h) => h.length === maxCards);
```

## Pipeline Example: Complete Turn

```typescript
import { pipe } from "./utils/functional";
import * as F from "./model/round-functional";

// Complex turn: check playability, say UNO if needed, then play
function executeTurn(playerIndex: number, cardIndex: number) {
  return (round: Round): Round => {
    // Check if player can play
    if (!F.canPlay(cardIndex)(round)) {
      throw new Error("Cannot play this card");
    }

    // Check if player will have 1 card after playing
    const willHaveOneCard = round.hands[playerIndex].length === 2;

    // Build pipeline conditionally
    const pipeline = willHaveOneCard
      ? pipe<Round>(F.sayUno(playerIndex), F.playCard(cardIndex))
      : F.playCard(cardIndex);

    return pipeline(round);
  };
}

// Use it
round = executeTurn(0, 2)(round);
```

## Error Handling with Try-Catch

```typescript
function safePlay(
  index: number,
  color: Color | undefined,
  round: Round
): Round | Error {
  try {
    return play(index, color, round);
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

// Use safe version
const result = safePlay(0, undefined, round);
if (result instanceof Error) {
  console.error("Play failed:", result.message);
} else {
  round = result;
}
```

## Logging with Side Effects

```typescript
// Pure function that returns the round and a log message
function playWithLogging(
  index: number,
  round: Round
): { round: Round; message: string } {
  const playerName = round.players[round.playerInTurn!];
  const card = round.hands[round.playerInTurn!][index];

  const newRound = play(index, undefined, round);

  const cardStr =
    card.type === "NUMBERED" ? `${card.color} ${card.number}` : `${card.type}`;

  return {
    round: newRound,
    message: `${playerName} played ${cardStr}`,
  };
}

// Usage - side effect happens outside pure function
const { round: newRound, message } = playWithLogging(0, round);
console.log(message); // Side effect here, not in the function
round = newRound;
```

## Testing Pure Functions

```typescript
import { canPlay, play, draw } from "./model/round";

describe("Pure function tests", () => {
  it("canPlay returns same result every time", () => {
    const round = createRound({ players: ["A", "B"], dealer: 0 });

    // Call multiple times
    const result1 = canPlay(0, round);
    const result2 = canPlay(0, round);
    const result3 = canPlay(0, round);

    // Same result every time
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it("play does not mutate original round", () => {
    const round = createRound({ players: ["A", "B"], dealer: 0 });
    const originalHandSize = round.hands[0].length;

    // Play a card
    const newRound = play(0, undefined, round);

    // Original unchanged
    expect(round.hands[0].length).toBe(originalHandSize);
    // New round has one less card
    expect(newRound.hands[0].length).toBe(originalHandSize - 1);
  });
});
```

## Performance Tip: Memoization

```typescript
// For expensive pure functions, you can memoize
function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>();

  return (arg: A): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

// Memoize expensive calculation
const getPlayableCards = memoize((round: Round) =>
  round.hands[round.playerInTurn!]
    .map((_, i) => ({ index: i, playable: canPlay(i, round) }))
    .filter(({ playable }) => playable)
    .map(({ index }) => index)
);

// First call computes, subsequent calls use cache
const playable1 = getPlayableCards(round); // Computes
const playable2 = getPlayableCards(round); // Cached
```

---

## Summary

The functional API enables:

- ✅ **Partial application** - Fix some arguments, supply others later
- ✅ **Function composition** - Build complex operations from simple ones
- ✅ **Point-free style** - Functions without explicit parameters
- ✅ **Safe operations** - Maybe monad prevents null errors
- ✅ **Predictable testing** - Pure functions always produce same output
- ✅ **Easy debugging** - No hidden state, just input → output

Choose the API that fits your style:

- **Standard API**: Direct and simple, good for straightforward code
- **Curried API**: Enables composition and partial application, good for complex pipelines
- **Maybe monad**: When you need safe null handling
- **Composition**: When building complex operations from simple ones
