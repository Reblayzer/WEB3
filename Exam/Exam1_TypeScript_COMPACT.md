# Assignment 1: TypeScript UNO Game - 7 Minute Exam Guide

## 🎯 Project Overview (30 seconds)

**What:** UNO card game implementation in TypeScript with domain-driven design  
**Why:** Demonstrates TypeScript type system, functional programming, immutability patterns  
**Architecture:** Type definitions → Type guards → Domain logic (deck, round, game)

```
src/
├── model/
│   ├── types/
│   │   ├── card-types.ts    ← ALL type definitions (discriminated unions, utility types)
│   │   ├── round-types.ts   ← Round configuration & state types
│   │   └── game-types.ts    ← Game configuration & memento types
│   ├── card.ts              ← Type guard functions for safe narrowing
│   ├── deck.ts              ← Deck operations (create, shuffle, deal)
│   ├── round.ts             ← Core game logic (play cards, enforce rules)
│   └── game.ts              ← Multi-round orchestration, scoring
└── utils/
    └── random_utils.ts      ← Generic shuffler & randomizer
```

---

## 📚 Core TypeScript Concepts Applied

### 1. `as const` - Literal Types from Values

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L4-L8)**

```ts
export const colors = ["BLUE", "GREEN", "RED", "YELLOW"] as const;
export const numberedRanks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const actionTypes = ["SKIP", "REVERSE", "DRAW"] as const;
export const wildTypes = ["WILD", "WILD DRAW"] as const;
```

**Why?** Without `as const`: `string[]` (too general)  
**With `as const`**: `readonly ['BLUE', 'GREEN', ...]` (exact literals + immutable)

### 2. `typeof` + `[number]` - Extract Union from Array

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L11-L14)**

```ts
export type Color = (typeof colors)[number]; // 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export type Numbered = (typeof numberedRanks)[number]; // 0 | 1 | 2 | ... | 9
export type ActionType = (typeof actionTypes)[number]; // 'SKIP' | 'REVERSE' | 'DRAW'
```

**Benefit:** Single source of truth - change array, type updates automatically. Autocomplete works perfectly.

### 3. Discriminated Union - Type-Safe Card Variants

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L17-L23)**

```ts
export type NumberedCard = Readonly<{
  type: "NUMBERED";
  color: Color;
  number: Numbered;
}>;
export type ActionCard = Readonly<{ type: ActionType; color: Color }>;
export type WildCard = Readonly<{ type: "WILD" }>;
export type WildDraw4Card = Readonly<{ type: "WILD DRAW" }>;

export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card;
```

**The Magic:** `type` property discriminates which variant. Check `card.type === 'NUMBERED'` → TypeScript narrows to `NumberedCard` → safe `.number` access.

### 4. Utility Types - Extract & Exclude

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L26-L28)**

```ts
// Keep only cards with color property
export type ColoredCard = Extract<Card, { color: Color }>; // NumberedCard | ActionCard

// Get all wild variants
export type WildFamily = Extract<Card, { type: WildType }>; // WildCard | WildDraw4Card
```

**Usage:** Functions that need `.color` can require `ColoredCard` parameter → compile-time safety.

### 5. Type Guards - Safe Runtime Narrowing

**[card.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\card.ts#L14-L20)**

```ts
export const isNumberedCard = (c: Card): c is NumberedCard =>
  c.type === "NUMBERED";
export const isActionCard = (c: Card): c is ActionCard =>
  c.type === "SKIP" || c.type === "REVERSE" || c.type === "DRAW";
export const isWildCard = (c: Card): c is WildFamily =>
  c.type === "WILD" || c.type === "WILD DRAW";
export const hasColor = (
  c: Card,
  color?: ColoredCard["color"]
): c is ColoredCard =>
  "color" in c && (color === undefined || c.color === color);
```

**Key:** `c is NumberedCard` is a **type predicate**. After `if (isNumberedCard(card))`, TypeScript narrows `card` to `NumberedCard`.

---

## 🏆 Best Practices Implementation (round.ts)

### ✅ Constants Instead of Magic Numbers

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L13-L18)**

```ts
const DRAW_CARD_PENALTY = 2;
const WILD_DRAW_PENALTY = 4;
const UNO_FAILURE_PENALTY = 4;
const DEFAULT_CARDS_PER_PLAYER = 7;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
```

**Impact:** Self-documenting, type-safe, maintainable

### ✅ Type Guard for Constructor Overload

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L21-L23)**

```ts
function isRoundMemento(arg: RoundConfig | RoundMemento): arg is RoundMemento {
  return 'hands' in arg
}

// Usage:
if (isRoundMemento(arg)) {
  const m = arg  // TypeScript knows it's RoundMemento, no 'as' cast!
```

**Better than:** `const m = arg as RoundMemento` (no runtime check)

### ✅ Readonly Properties & Parameters

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L89-L90)**

```ts
class RoundImpl implements Round {
  readonly players: readonly string[]  // Double readonly: array + elements
  readonly dealer: number              // Can't reassign after construction
```

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L297-L301)**

```ts
private playableAgainst(
  card: Readonly<Card>,          // Signals: won't mutate card
  top: Readonly<Card>,           // Signals: won't mutate top
  currentColor: Color,
  allowTypeMatch: boolean
): boolean
```

**Why?** Enforces immutability at compile time. Readers know function is pure.

### ✅ Helper Function with Exhaustive Checking

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L61-L86)**

```ts
function deserializeCard(raw: Readonly<CardMemento>): Card {
  switch (raw.type) {
    case "WILD":
      return { type: "WILD" };

    case "WILD DRAW":
      return { type: "WILD DRAW" };

    case "NUMBERED":
      if (raw.color === undefined || raw.number === undefined) {
        throw new Error("Invalid NUMBERED memento: missing color or number");
      }
      return { type: "NUMBERED", color: raw.color, number: raw.number };

    case "SKIP":
    case "REVERSE":
    case "DRAW":
      if (raw.color === undefined) {
        throw new Error(`Invalid ${raw.type} memento: missing color`);
      }
      return { type: raw.type, color: raw.color };

    default:
      const _exhaustive: never = raw.type; // Compiler errors if case missing!
      throw new Error(`Unknown card type: ${_exhaustive}`);
  }
}

// Eliminates 48 lines of duplicate code:
this.drawCards = m.drawPile.map(deserializeCard);
this.discardCards = m.discardPile.map(deserializeCard);
```

**Pattern:** DRY principle + exhaustive checking. Add new card type? Compile error forces you to handle it.

### ✅ No Non-Null Assertions (!)

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L372)**

```ts
private advanceAfterPlay(card: Readonly<Card>): void {
  if (this.turn === undefined) return  // Guard clause

  const currentTurn = this.turn  // Capture after null check
  // Now TypeScript knows currentTurn is number, not number | undefined
```

**Bad:** `const t = this.turn!` (bypasses type checking)  
**Good:** Guard + capture (TypeScript tracks control flow)

### ✅ Exhaustive Switch Statement

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L415)**

```ts
switch (card.type) {
  case "SKIP":
    this.turn = next(currentTurn, step * 2);
    break;

  case "REVERSE":
    this.dir = this.dir === "clockwise" ? "counterclockwise" : "clockwise";
    this.turn = next(currentTurn);
    break;

  case "DRAW":
    const victim1 = next(currentTurn);
    this.giveCards(victim1, DRAW_CARD_PENALTY); // Constant, not magic 2
    this.turn = next(victim1);
    break;

  case "WILD DRAW":
    const victim2 = next(currentTurn);
    this.giveCards(victim2, WILD_DRAW_PENALTY); // Constant, not magic 4
    this.turn = next(victim2);
    break;

  case "NUMBERED":
  case "WILD":
    this.turn = next(currentTurn);
    break;

  default:
    const _exhaustive: never = card; // Add card type? Compile error here!
    throw new Error(`Unhandled card type: ${(_exhaustive as Card).type}`);
}
```

### ✅ Immutable State Updates (Memento Pattern)

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L537-L548)**

```ts
toMemento(): RoundMemento {
  return {
    players: [...this.players],          // Spread copy array
    hands: this.hands.map(h => [...h]),  // Deep copy each hand
    drawPile: this.drawCards.map(c => ({ ...c })),      // Copy cards
    discardPile: this.discardCards.map(c => ({ ...c })),
    currentColor: this.curColor,
    currentDirection: this.dir,
    dealer: this.dealer,
    playerInTurn: this.turn,
  }
}
```

**Never mutate original!** Always spread `...` to create new instances.

---

## 🎤 Likely Exam Questions & Answers

### Q1: "Explain discriminated unions and show an example"

**Show:** [card-types.ts lines 17-23](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L17-L23)

**Answer:** "A discriminated union has a common property (discriminant) with different literal values. Here, all Card variants have a `type` property. When I check `card.type === 'NUMBERED'`, TypeScript uses control flow analysis to narrow the type to `NumberedCard`, giving me safe access to `.color` and `.number`. This prevents runtime crashes - I can't access `.number` on a WildCard because TypeScript knows it doesn't exist."

### Q2: "Why use `as const` instead of just arrays?"

**Show:** [card-types.ts lines 4-8](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L4-L8)

**Answer:** "Without `as const`, TypeScript infers `string[]` - too broad, allows any string. With `as const`, I get `readonly ['BLUE', 'GREEN', 'RED', 'YELLOW']` with exact literal types. Combined with `typeof colors[number]`, I extract `'BLUE' | 'GREEN' | 'RED' | 'YELLOW'` union. Benefits: (1) single source of truth, (2) autocomplete in IDE, (3) compile-time typo prevention, (4) enforced immutability."

### Q3: "How do type guards improve safety?"

**Show:** [round.ts lines 297-311](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L297-L311) (playableAgainst method)

**Answer:** "Type guards perform runtime checks that TypeScript understands. In `playableAgainst`, I use `isWildCard(top)` which narrows `top` from `Card` to `WildFamily`. Then `'color' in card` narrows to `ColoredCard`. TypeScript combines these to allow safe `.color` access. This is safer than `as` casts because the check actually happens at runtime. If card structure changes, I only update guards in card.ts, not throughout the codebase."

### Q4: "Explain the exhaustive checking pattern"

**Show:** [round.ts lines 367-415](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L415) (advanceAfterPlay switch)

**Answer:** "In the default case, I assign `card` to `const _exhaustive: never`. If I handle all cases, `card` has type `never` (impossible type), so assignment succeeds. If I forget a case, `card` still has that card type (e.g., new `SPECIAL` card), and TypeScript errors: 'Type SPECIAL is not assignable to type never'. This forces me to handle all card types - the compiler won't let me forget."

### Q5: "Why `Readonly<Card>` parameters?"

**Show:** [round.ts line 297](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L297)

**Answer:** "It signals function intent - this function won't mutate the card. TypeScript enforces it: trying `card.color = 'BLUE'` causes compile error. In functional programming, we create new objects with changes rather than mutating. Readonly parameters document that the function is pure and help catch accidental mutations. The parameter is marked readonly, but internally I can still read all properties."

### Q6: "Show me immutability in practice"

**Show:** [round.ts lines 537-548](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L537-L548) (toMemento)

**Answer:** "When serializing state, I never return internal references - that would allow external mutation. I use spread operators: `[...this.players]` copies the array, `this.hands.map(h => [...h])` deep copies nested arrays, and `c => ({ ...c })` copies each card object. The returned memento is completely independent - mutating it won't affect the round's internal state. This defensive copying prevents bugs from shared references."

### Q7: "How do you avoid runtime crashes from null/undefined?"

**Show:** [round.ts lines 367-372](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L372)

**Answer:** "Instead of non-null assertion `this.turn!` which bypasses type checking, I use guard clauses: `if (this.turn === undefined) return`. Then I capture `const currentTurn = this.turn` after the check. TypeScript's control flow analysis knows that after the guard, `this.turn` can't be undefined, so `currentTurn` has type `number`, not `number | undefined`. This is safer because there's an actual runtime check."

### Q8: "Explain the helper function pattern"

**Show:** [round.ts lines 61-86](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L61-L86) (deserializeCard)

**Answer:** "I had duplicate card deserialization code - 48 lines repeated for drawPile and discardPile. I extracted it into `deserializeCard` helper with `Readonly<CardMemento>` input and `Card` output. It uses exhaustive checking to handle all card types. Now both piles use `.map(deserializeCard)` - DRY principle. Bonus: the helper validates data format, centralizing error handling."

---

## 🎯 30-Second Code Demo Path

**Open these files in order:**

1. **[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L4-L23)**

   - Point: "Here's where everything starts - `as const` arrays"
   - Point: "`typeof [number]` extracts unions"
   - Point: "Discriminated union Card with type property"

2. **[card.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\card.ts#L14-L20)**

   - Point: "Type guards with predicates `c is NumberedCard`"
   - Say: "These enable safe narrowing throughout the codebase"

3. **[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L13-L18)**
   - Point: "Constants replace magic numbers"
   - Scroll to line 21: "Type guard for constructor"
   - Scroll to line 89: "`readonly` properties"
   - Scroll to line 297: "`Readonly<Card>` parameters"
   - Scroll to line 367: "Exhaustive switch with `never`"

---

## 📋 Quick Reference Table

| Concept               | File                       | Lines       | Purpose                    |
| --------------------- | -------------------------- | ----------- | -------------------------- |
| `as const`            | card-types.ts              | 4-8         | Literal types + readonly   |
| `typeof [number]`     | card-types.ts              | 11-14       | Extract union from array   |
| Discriminated Union   | card-types.ts              | 17-23       | Type-safe card variants    |
| Extract/Exclude       | card-types.ts              | 26-28       | Filter union types         |
| Type Guards           | card.ts                    | 14-20       | Safe narrowing functions   |
| Constants             | round.ts, game.ts, deck.ts | 13-18       | No magic numbers           |
| Type Guard Function   | round.ts                   | 21-23       | Constructor discrimination |
| Readonly Properties   | round.ts                   | 89-90       | Immutable fields           |
| Readonly Parameters   | round.ts                   | 47, 61, 297 | Pure function signal       |
| Helper + Exhaustive   | round.ts                   | 61-86       | DRY + compile-time safety  |
| Exhaustive Switch     | round.ts                   | 367-415     | Handle all cases           |
| No `!` Assertions     | round.ts                   | 367-372     | Guard clauses instead      |
| Immutable Updates     | round.ts                   | 537-548     | Spread for copying         |
| Explicit Return Types | All files                  | All methods | Type safety                |

---

## 🚀 Key Takeaways for 7-Minute Presentation

1. **Architecture:** Types first (card-types.ts) → Guards (card.ts) → Domain logic (deck, round, game)

2. **Type Safety:** Discriminated unions + type guards = compiler catches errors before runtime

3. **Immutability:** `readonly`, `Readonly<T>`, spread operators = functional programming style

4. **Best Practices:**

   - ✅ Constants over magic numbers
   - ✅ Type guards over type assertions (`as`)
   - ✅ Guard clauses over `!` assertions
   - ✅ Helper functions over duplication
   - ✅ Exhaustive checking with `never`
   - ✅ Explicit return types on all methods

5. **Maintainability:** Add new card type? Compiler forces updates everywhere it matters.

**Final Note:** This implementation demonstrates production-ready TypeScript with full compile-time safety, zero runtime type errors, and functional programming principles.
