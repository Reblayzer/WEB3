# Assignment 1: TypeScript UNO Game - Complete Exam Guide

> **Exam Topics:** basic type operators, discriminated unions, casting/narrowing, immutability, utility types, type manipulations

---

## Project Structure

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

**Architecture:** Type definitions → Type guards → Domain logic (deck, round, game)

---

## TypeScript Fundamentals

### 1. Coding Style Basics

### Arrow Functions

Arrow functions are a shorter syntax for writing functions. They're preferred for small, inline functions. Unlike regular functions, they don't have their own `this` binding.

```ts
// Standard function
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function (preferred for small functions)
const add = (a: number, b: number): number => a + b;
```

### Spread Operator

The spread operator (`...`) expands arrays or objects. It's essential for immutable updates because it creates copies rather than modifying originals.

```ts
// Spread array - creates new array with added element
const newHand = [...hand, drawnCard];

// Spread object - creates new object with updated property
const newPlayer = { ...player, score: player.score + 10 };
```

### Destructuring

Destructuring extracts values from arrays or properties from objects into separate variables. It makes code cleaner and more readable.

```ts
// Array destructuring
const [first, second, ...rest] = cards;

// Object destructuring
const { name, score } = player;

// With rest - get remaining properties
const { id, ...playerData } = player;
```

### Functional Array Methods

These methods transform arrays without mutating them. They can be chained together to create data transformation pipelines.

```ts
const scores = players
  .filter((p) => p.active) // Keep only active players
  .map((p) => p.score) // Extract scores
  .reduce((sum, s) => sum + s, 0); // Sum them up
```

### 2. Basic Type Operators

### What are they?

Basic type operators are tools that help you create types from existing values or other types. Instead of writing types manually, you can derive them automatically from your code. This keeps your types in sync with your actual values and reduces duplication.

### `as const` - Const Assertion

When you write an array or object normally, TypeScript gives it a general type like `string[]`. But sometimes you want TypeScript to know the exact values. The `as const` assertion tells TypeScript to treat values as literal types and make them readonly. This is useful when you have a fixed set of values that won't change.

```ts
const colors = ["RED", "BLUE", "GREEN", "YELLOW"] as const;
// Without as const: string[]
// With as const: readonly ['RED', 'BLUE', 'GREEN', 'YELLOW']
```

### `typeof` - Get Type from Value

The `typeof` operator extracts the type from an existing value. This is helpful when you want to create a type based on a variable you already have, rather than defining the type separately.

### `[number]` - Indexed Access

When you have an array type, using `[number]` extracts a union of all possible element types. Combined with `typeof` and `as const`, this lets you create a union type from an array of values.

```ts
const colors = ["RED", "BLUE", "GREEN", "YELLOW"] as const;
type Color = (typeof colors)[number]; // 'RED' | 'BLUE' | 'GREEN' | 'YELLOW'
```

### The `any` Type

The `any` type disables type checking for a value. It's an escape hatch when you can't or don't want to specify a type. Function parameters without type annotations default to `any`. Avoid it when possible since it defeats TypeScript's purpose.

```ts
let data: any = fetchSomething();
data.anything.goes(); // No error - but might crash at runtime!
```

### Interface vs Type

Both `interface` and `type` define object shapes. They're mostly interchangeable. Interfaces can be extended and merged; types are more flexible for unions and computed types. Use whichever your team prefers.

```ts
// Interface syntax
interface Card {
  type: string;
  color?: Color; // Optional property
}

// Type syntax (equivalent)
type Card = {
  type: string;
  color?: Color;
};
```

### Structural Typing

TypeScript uses structural typing (duck typing). If an object has the required properties, it satisfies the type - the object can have extra properties. This is different from nominal typing where types must be explicitly declared.

```ts
interface Point {
  x: number;
  y: number;
}

const p = { x: 10, y: 20, z: 30 }; // Has extra 'z' property
const point: Point = p; // OK - has x and y, that's enough
```

### Generic Functions

Generic functions use type parameters to work with any type while maintaining type safety. The type parameter (like `T`) is determined when you call the function.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

first([1, 2, 3]); // T is number, returns number
first(["a", "b"]); // T is string, returns string
```

### Implementation in Assignment 1: `card-types.ts`

**Demonstrates: `as const`, `typeof`, `[number]` pattern**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L4-L14)**

```ts
// Lines 4-8: as const arrays - exact literal types + immutable
export const colors = ["BLUE", "GREEN", "RED", "YELLOW"] as const;
export const numberedRanks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const actionTypes = ["SKIP", "REVERSE", "DRAW"] as const;
export const wildTypes = ["WILD", "WILD DRAW"] as const;

// Lines 11-14: typeof + [number] - extract union from array
export type Color = (typeof colors)[number]; // 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export type Numbered = (typeof numberedRanks)[number]; // 0 | 1 | 2 | ... | 9
export type ActionType = (typeof actionTypes)[number]; // 'SKIP' | 'REVERSE' | 'DRAW'
```

**Key Points:**

- Without `as const`: `string[]` (too general, allows any string)
- With `as const`: `readonly ['BLUE', 'GREEN', ...]` (exact literals + immutable)
- `typeof colors` gets the array type, `[number]` extracts element union
- **Single source of truth** - change array, type updates automatically
- Autocomplete in IDE shows exact values

### Implementation in Assignment 1: `random_utils.ts`

**Demonstrates: Generic functions**

**[random_utils.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\utils\random_utils.ts#L5-L13)**

```ts
// Lines 5-11: Generic shuffler function
export function standardShuffler<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
```

**Key Points:**

- `<T>` is type parameter - works with any type
- Input is `readonly T[]` - won't mutate original
- Returns `T[]` - type is preserved through function
- Called as `standardShuffler<Card>(cards)` or `standardShuffler(cards)` (inferred)

### 3. Discriminated Unions

### What are they?

A discriminated union is a pattern where you have several types that share a common property with different literal values. This common property acts as a "tag" or "discriminant" that TypeScript uses to figure out which specific type you're working with. It's the safest way to handle objects that can be one of several types.

### Why use them?

When you check the discriminant property in an `if` or `switch` statement, TypeScript automatically knows which type you have and gives you access to the correct properties. This prevents errors where you try to access properties that don't exist on certain variants.

```ts
type NumberedCard = { type: "NUMBERED"; color: Color; number: number };
type WildCard = { type: "WILD" };
type Card = NumberedCard | WildCard;
```

The `type` property is the discriminant. Each variant has a unique literal value for this property.

```ts
function getValue(card: Card) {
  switch (card.type) {
    case "NUMBERED":
      return card.number; // TS knows card has .number here
    case "WILD":
      return 50; // TS knows card is WildCard here
  }
}
```

### Benefits

- **Type safety**: TypeScript prevents accessing wrong properties
- **Exhaustive checking**: Compiler warns if you forget a case
- **IDE support**: Autocomplete shows correct properties for each type

### Implementation in Assignment 1: `card-types.ts`

**Demonstrates: Discriminated unions with type discriminant**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L17-L23)**

```ts
// Lines 17-23: Discriminated union - type property is discriminant
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

**Usage in `round.ts` - Exhaustive switch with never:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L415)**

```ts
// Lines 367-415: Exhaustive switch statement
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
    this.giveCards(victim1, DRAW_CARD_PENALTY);
    this.turn = next(victim1);
    break;

  case "WILD DRAW":
    const victim2 = next(currentTurn);
    this.giveCards(victim2, WILD_DRAW_PENALTY);
    this.turn = next(victim2);
    break;

  case "NUMBERED":
  case "WILD":
    this.turn = next(currentTurn);
    break;

  default:
    const _exhaustive: never = card; // Compile error if case missing!
    throw new Error(`Unhandled card type: ${(_exhaustive as Card).type}`);
}
```

**Key Points:**

- `type` property with literal values (`"NUMBERED"`, `"SKIP"`, etc.) is the discriminant
- TypeScript narrows: `if (card.type === 'NUMBERED')` → `card` becomes `NumberedCard`
- Exhaustive checking: `const _exhaustive: never` catches missing cases at compile time
- Add new card type? Compiler forces you to handle it everywhere

### 4. Intersection Types

### What are they?

Intersection types combine multiple types into one using the `&` operator. The resulting type has all properties from all combined types. While unions (`|`) mean "one of these types," intersections (`&`) mean "all of these types combined."

```ts
type Point = { x: number; y: number };
type Labeled = { label: string };

type LabeledPoint = Point & Labeled;
// Has x, y, AND label

const p: LabeledPoint = { x: 10, y: 20, label: "Origin" };
```

### When to use

Use intersections to add properties to existing types without modifying them. This is common for adding metadata or combining traits.

```ts
type Timestamped<T> = T & { createdAt: Date; updatedAt: Date };

type Card = { color: string; number: number };
type TrackedCard = Timestamped<Card>;
// Has color, number, createdAt, and updatedAt
```

### Implementation in Assignment 1: `card-types.ts`

**Demonstrates: Intersection types combining Pick results**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L27-L28)**

```ts
// Line 27-28: Intersection combining multiple Pick types
export type CardMementoFields = Partial<
  Pick<NumberedCard, "color" | "number"> & Pick<ActionCard, "color">
>;

export type CardMemento = { type: CardType } & CardMementoFields;
```

**Key Points:**

- `Pick<NumberedCard, 'color' | 'number'>` extracts `{ color, number }`
- `Pick<ActionCard, 'color'>` extracts `{ color }`
- `&` combines them: result has all properties
- `Partial<...>` makes all properties optional
- Useful for creating flexible serialization types

### 5. Narrowing vs Casting

### What's the difference?

Both casting and narrowing help you work with values whose type isn't specific enough. However, they work very differently. Narrowing is safe because TypeScript verifies your logic. Casting is unsafe because you're telling TypeScript to trust you without verification.

### Narrowing (Safe)

Narrowing uses runtime checks that TypeScript can analyze. When you check a condition, TypeScript "narrows" the type based on what must be true after that check. This is the preferred approach because it catches real errors.

```ts
// typeof narrows primitive types
if (typeof x === "string") {
  x.toUpperCase();
}

// 'in' operator checks for property existence
if ("color" in card) {
  card.color;
}

// Discriminant check narrows union types
if (card.type === "NUMBERED") {
  card.number;
}
```

### Type Guards

A type guard is a function that performs a check and tells TypeScript about the result using a special return type syntax. This lets you reuse narrowing logic across your code.

```ts
const isNumbered = (c: Card): c is NumberedCard => c.type === "NUMBERED";

if (isNumbered(card)) {
  card.number;
} // TS narrows after the guard
```

### Casting (Unsafe)

Casting tells TypeScript to treat a value as a different type without any runtime check. Use this only when you're certain about the type and TypeScript can't figure it out. Casting bypasses type safety, so errors won't be caught at compile time.

```ts
const x = value as string; // "Trust me, this is a string"
const y = element!; // "Trust me, this isn't null"
```

### Implementation in Assignment 1: Type Guards & Narrowing

**Type Guards (`card.ts`):**

**[card.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\card.ts#L14-L20)**

```ts
// Lines 14-20: Type guard functions with predicates
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

**Using type guards in `round.ts`:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L297-L311)**

```ts
// Lines 297-311: Type narrowing with guards and 'in' operator
private playableAgainst(
  card: Readonly<Card>,
  top: Readonly<Card>,
  currentColor: Color,
  allowTypeMatch: boolean
): boolean {
  // Type guard narrows to WildFamily
  if (isWildCard(top)) {
    return hasColor(card, currentColor);
  }

  // 'in' operator narrows to ColoredCard
  if ("color" in card && card.color === currentColor) {
    return true;
  }

  // After checks, TypeScript knows card structure
  return allowTypeMatch && card.type === top.type;
}
```

**Guard clauses (no `!` assertions) in `round.ts`:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L367-L372)**

```ts
// Lines 367-372: Guard clause instead of non-null assertion
private advanceAfterPlay(card: Readonly<Card>): void {
  if (this.turn === undefined) return  // Guard clause

  const currentTurn = this.turn  // Capture after null check
  // TypeScript knows currentTurn is number, not number | undefined
```

**Type guard for constructor overload:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L21-L23)**

```ts
// Lines 21-23: Type guard for discriminating constructor arguments
function isRoundMemento(arg: RoundConfig | RoundMemento): arg is RoundMemento {
  return 'hands' in arg
}

// Usage in constructor:
if (isRoundMemento(arg)) {
  const m = arg  // TypeScript knows it's RoundMemento, no 'as' cast!
```

**Key Points:**

- Type guards (`c is NumberedCard`) enable safe narrowing - TypeScript understands them
- `'in'` operator checks property existence - narrows union types
- Guard clauses (`if (...) return`) + capture pattern enables control flow analysis
- **Better than casting** - runtime checks actually happen
- **Better than `!`** - no bypassing type system

### 6. Immutability

### What is it?

Immutability means that once you create a value, you cannot change it. Instead of modifying existing data, you create new data with the changes you want. TypeScript's `readonly` modifier enforces this at compile time by making properties or array elements unchangeable.

### Why use it?

Immutable data is predictable because it can't change unexpectedly. This makes bugs easier to find, enables features like undo/redo (just keep old versions), and helps frameworks like React and Vue detect changes efficiently by comparing object references.

### `Readonly<T>`

This utility type makes all properties of an object readonly. Any attempt to assign to these properties will cause a compile error.

```ts
type Card = Readonly<{ type: string; color: Color }>;
card.color = "RED"; // ERROR: Cannot assign to readonly property
```

### `readonly` for Arrays

The `readonly` modifier on arrays prevents mutation methods like `push`, `pop`, and direct index assignment.

```ts
type Hand = readonly Card[];
hand.push(card); // ERROR: push doesn't exist on readonly array
hand[0] = card; // ERROR: index signature is readonly
```

### `as const` for Deep Immutability

The `as const` assertion makes everything readonly recursively, including nested objects and arrays. It also converts values to their literal types.

```ts
const config = { max: 4, colors: ["RED"] } as const;
// All nested properties become readonly, values become literal types
```

### Implementation in Assignment 1: Immutability Patterns

**`Readonly<T>` on all card types:**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L17-L20)**

```ts
// Lines 17-20: All card types wrapped in Readonly<>
export type NumberedCard = Readonly<{
  type: "NUMBERED";
  color: Color;
  number: Numbered;
}>;
export type ActionCard = Readonly<{ type: ActionType; color: Color }>;
export type WildCard = Readonly<{ type: "WILD" }>;
export type WildDraw4Card = Readonly<{ type: "WILD DRAW" }>;
```

**`readonly` properties in class:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L89-L90)**

```ts
// Lines 89-90: Readonly properties - can't reassign after construction
class RoundImpl implements Round {
  readonly players: readonly string[]  // Double readonly: array + elements
  readonly dealer: number              // Can't reassign
```

**`Readonly<>` parameters signal pure functions:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L297-L301)**

```ts
// Lines 297-301: Readonly parameters - function won't mutate
private playableAgainst(
  card: Readonly<Card>,          // Signals: won't mutate card
  top: Readonly<Card>,           // Signals: won't mutate top
  currentColor: Color,
  allowTypeMatch: boolean
): boolean
```

**Immutable updates with spread operator (Memento pattern):**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L537-L548)**

```ts
// Lines 537-548: Defensive copying - spread to create new instances
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

**`readonly` return types:**

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L15)**

```ts
// Line 15: Return readonly array - caller can't mutate
playerHand(i: number): Readonly<Card[]>
```

**Key Points:**

- `Readonly<T>` prevents property assignment at compile time
- `readonly` on arrays prevents `push`, `pop`, direct assignment
- `as const` creates deep readonly + literal types
- Spread operators (`...`) create copies - never mutate originals
- Defensive copying in `toMemento` prevents external mutation
- Readonly parameters document function purity

### 7. Utility Types

### What are they?

Utility types are built-in TypeScript types that transform other types. Instead of manually creating variations of your types (like making all properties optional), you use these utilities to derive new types automatically. This reduces duplication and keeps related types in sync.

| Type            | What it does                                                |
| --------------- | ----------------------------------------------------------- |
| `Partial<T>`    | Makes all properties optional - useful for update functions |
| `Required<T>`   | Makes all properties required - opposite of Partial         |
| `Pick<T, K>`    | Creates a type with only the specified properties           |
| `Omit<T, K>`    | Creates a type without the specified properties             |
| `Extract<T, U>` | From a union T, keeps only types assignable to U            |
| `Exclude<T, U>` | From a union T, removes types assignable to U               |
| `ReturnType<T>` | Gets the return type of a function type                     |
| `Record<K, V>`  | Creates an object type with keys K and values V             |

### Examples from UNO

```ts
// Extract keeps only Card types that have a color property
type ColoredCard = Extract<Card, { color: Color }>; // NumberedCard | ActionCard

// Exclude removes Card types that are wild
type NonWild = Exclude<Card, { type: "WILD" }>;
```

### Implementation in Assignment 1: `card-types.ts`

**Demonstrates: Extract, Exclude, Pick, Partial, keyof**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L23-L29)**

```ts
// Lines 23-25: Extract keeps types matching pattern
export type ColoredCard = Extract<Card, { color: Color }>; // NumberedCard | ActionCard
export type WildFamily = Extract<Card, { type: WildType }>; // WildCard | WildDraw4Card
export type NonWildCard = Exclude<Card, WildFamily>; // Remove wild cards

// Lines 27-28: Pick, Partial, and intersection
export type CardMementoFields = Partial<
  Pick<NumberedCard, "color" | "number"> & Pick<ActionCard, "color">
>;

// Line 29: keyof extracts property names
export type CardMementoKey = keyof CardMemento; // 'type' | 'color' | 'number'
```

**Key Points:**

- `Extract<Card, { color: Color }>` keeps only card types with `color` property
- `Exclude<Card, WildFamily>` removes wild cards from union
- `Pick<T, K>` selects specific properties
- `Partial<T>` makes all properties optional
- `keyof T` creates union of property names
- **Use case:** Functions needing `.color` can require `ColoredCard` parameter

### 8. Type Manipulations

### What are they?

Type manipulations are advanced features that let you create new types by transforming existing ones programmatically. They're like functions that operate on types instead of values. These are powerful tools for building flexible, reusable type definitions.

### Mapped Types

Mapped types iterate over the properties of another type and transform them. You can add or remove modifiers like `readonly` or `?` (optional), or change the property types.

```ts
// Remove readonly from all properties
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

// Make all properties optional
type Optional<T> = { [P in keyof T]?: T[P] };
```

### Conditional Types

Conditional types choose between two types based on a condition, similar to a ternary operator for types. They use the `extends` keyword to test if a type matches a pattern.

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

### Template Literal Types

Template literal types create string types by combining other string types. They work like template strings in JavaScript but create types instead of values.

```ts
type Color = "RED" | "BLUE";
type Size = "small" | "large";
type CardClass = `${Color}-${Size}`; // 'RED-small' | 'RED-large' | 'BLUE-small' | 'BLUE-large'
```

### `keyof` Operator

The `keyof` operator creates a union of all property names of a type. This is useful when you want to accept any valid property name as a parameter.

```ts
type Keys = keyof NumberedCard; // 'type' | 'color' | 'number'
```

### The `infer` Keyword

The `infer` keyword extracts types from within other types in conditional type expressions. It's like pattern matching for types - you define a pattern and "capture" part of it into a new type variable.

```ts
// Extract the return type of a function
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

type A = ReturnOf<() => string>; // string
type B = ReturnOf<() => number>; // number

// Extract the element type of an array
type ElementOf<T> = T extends (infer E)[] ? E : never;

type C = ElementOf<string[]>; // string
type D = ElementOf<Card[]>; // Card
```

### Implementation in Assignment 1: `card-types.ts`

**Demonstrates: Template literal types**

**[card-types.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\types\card-types.ts#L32-L35)**

```ts
// Lines 32-35: Template literal type combining unions
export type CardLabel =
  | `${Color} ${Numbered}` // "RED 5", "BLUE 7", etc.
  | `${Color} ${ActionType}` // "RED SKIP", "BLUE REVERSE", etc.
  | WildType; // "WILD", "WILD DRAW"
```

**Usage in `card.ts` for string labels:**

**[card.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\card.ts#L26-L33)**

```ts
// Lines 26-33: Using template literals for card labels
export const toLabel = (c: Card): CardLabel => {
  const { color, number } = c as any;

  if (c.type === "NUMBERED") {
    return `${color} ${number}` as CardLabel;
  } else if (c.type !== "WILD" && c.type !== "WILD DRAW") {
    return `${color} ${c.type}` as CardLabel;
  }
  return c.type;
};
```

**Key Points:**

- Template literal types create string types from unions
- `${Color} ${Numbered}` expands to all combinations: "RED 0", "RED 1", ..., "YELLOW 9"
- Creates strong typing for string labels
- Autocomplete shows all valid combinations

---

## Best Practices Implementation

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

### ✅ Helper Function with Exhaustive Checking

**[round.ts](c:\Users\bolfa\VIA\WEB3\Assignment1\domain\src\model\round.ts#L61-L86)**

```ts
// Lines 61-86: Helper function - DRY + exhaustive checking
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

// Usage - eliminates duplicate code:
this.drawCards = m.drawPile.map(deserializeCard);
this.discardCards = m.discardPile.map(deserializeCard);
```

**Pattern:** DRY principle + exhaustive checking. Add new card type? Compile error forces you to handle it.

---

## Likely Exam Questions & Answers

**Q1: "Explain discriminated unions and show an example"**

**Show:** [card-types.ts lines 17-23](#implementation-in-assignment-1-card-typests-1)

**Answer:** "A discriminated union has a common property (discriminant) with different literal values. Here, all Card variants have a `type` property. When I check `card.type === 'NUMBERED'`, TypeScript uses control flow analysis to narrow the type to `NumberedCard`, giving me safe access to `.color` and `.number`. This prevents runtime crashes - I can't access `.number` on a WildCard because TypeScript knows it doesn't exist."

**Q2: "Why use `as const` instead of just arrays?"**

**Show:** [card-types.ts lines 4-8](#implementation-in-assignment-1-card-typests)

**Answer:** "Without `as const`, TypeScript infers `string[]` - too broad, allows any string. With `as const`, I get `readonly ['BLUE', 'GREEN', 'RED', 'YELLOW']` with exact literal types. Combined with `typeof colors[number]`, I extract `'BLUE' | 'GREEN' | 'RED' | 'YELLOW'` union. Benefits: (1) single source of truth, (2) autocomplete in IDE, (3) compile-time typo prevention, (4) enforced immutability."

**Q3: "How do type guards improve safety?"**

**Show:** [round.ts lines 297-311](#using-type-guards-in-roundts)

**Answer:** "Type guards perform runtime checks that TypeScript understands. In `playableAgainst`, I use `isWildCard(top)` which narrows `top` from `Card` to `WildFamily`. Then `'color' in card` narrows to `ColoredCard`. TypeScript combines these to allow safe `.color` access. This is safer than `as` casts because the check actually happens at runtime. If card structure changes, I only update guards in card.ts, not throughout the codebase."

**Q4: "Explain the exhaustive checking pattern"**

**Show:** [Exhaustive switch in discriminated unions](#implementation-in-assignment-1-card-typests-1)

**Answer:** "In the default case, I assign `card` to `const _exhaustive: never`. If I handle all cases, `card` has type `never` (impossible type), so assignment succeeds. If I forget a case, `card` still has that card type (e.g., new `SPECIAL` card), and TypeScript errors: 'Type SPECIAL is not assignable to type never'. This forces me to handle all card types - the compiler won't let me forget."

**Q5: "Why `Readonly<Card>` parameters?"**

**Show:** [round.ts line 297](#readonlygt-parameters-signal-pure-functions)

**Answer:** "It signals function intent - this function won't mutate the card. TypeScript enforces it: trying `card.color = 'BLUE'` causes compile error. In functional programming, we create new objects with changes rather than mutating. Readonly parameters document that the function is pure and help catch accidental mutations. The parameter is marked readonly, but internally I can still read all properties."

**Q6: "Show me immutability in practice"**

**Show:** [toMemento in round.ts](#immutable-updates-with-spread-operator-memento-pattern)

**Answer:** "When serializing state, I never return internal references - that would allow external mutation. I use spread operators: `[...this.players]` copies the array, `this.hands.map(h => [...h])` deep copies nested arrays, and `c => ({ ...c })` copies each card object. The returned memento is completely independent - mutating it won't affect the round's internal state. This defensive copying prevents bugs from shared references."

**Q7: "How do you avoid runtime crashes from null/undefined?"**

**Show:** [Guard clauses in round.ts](#guard-clauses-no--assertions-in-roundts)

**Answer:** "Instead of non-null assertion `this.turn!` which bypasses type checking, I use guard clauses: `if (this.turn === undefined) return`. Then I capture `const currentTurn = this.turn` after the check. TypeScript's control flow analysis knows that after the guard, `this.turn` can't be undefined, so `currentTurn` has type `number`, not `number | undefined`. This is safer because there's an actual runtime check."

**Q8: "Explain the helper function pattern"**

**Show:** [deserializeCard helper](#-helper-function-with-exhaustive-checking)

**Answer:** "The `deserializeCard` helper converts `CardMemento` (plain objects from JSON) back to properly typed `Card` objects. It takes `Readonly<CardMemento>` as input and returns `Card` output. The function uses exhaustive checking with a switch statement - if I add a new card type, the compiler forces me to handle it here. This centralizes validation logic and type conversion in one place. Both drawPile and discardPile use `.map(deserializeCard)` to transform their arrays, following the DRY principle and ensuring consistent deserialization throughout the codebase."

---

## 30-Second Code Demo Path

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

### 📋 Quick Reference Table

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

### 🚀 Key Takeaways for 7-Minute Presentation

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

---

## Quick Reference Tables

### TypeScript Concept Answers

| Question                       | Answer                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| What does `as const` do?       | Creates literal types and makes values readonly, keeping exact values instead of general types            |
| What is a discriminated union? | A union where each type has a common property with different literal values, enabling safe type narrowing |
| Narrowing vs casting?          | Narrowing uses runtime checks that TypeScript verifies; casting bypasses type checking entirely           |
| Why immutability?              | Prevents unexpected changes, enables change detection, makes debugging easier                             |
| When use Extract vs Exclude?   | Extract keeps types matching a pattern, Exclude removes types matching a pattern                          |
| Union vs Intersection?         | Union (`\|`) means "one of these types", Intersection (`&`) means "all types combined"                    |
| What is structural typing?     | Objects are compatible if they have required properties, regardless of declared type name                 |
| What does `infer` do?          | Extracts/captures a type from within another type in conditional type expressions                         |
| Interface vs Type?             | Mostly equivalent; interfaces can extend/merge, types are more flexible for unions                        |

### Where Concepts Are Applied in Assignment 1

| Concept                    | File                                              | Location                                                                                               |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **`as const`**             | `domain/src/model/types/card-types.ts`            | Lines 3, 6, 9-11: `colors`, `numberedRanks`, `actionTypes`, `wildTypes`, `cardTypes` arrays            |
| **`typeof` + `[number]`**  | `domain/src/model/types/card-types.ts`            | Lines 4, 7, 13-15: `Color`, `Numbered`, `ActionType`, `WildType`, `CardType`                           |
| **Discriminated Unions**   | `domain/src/model/types/card-types.ts`            | Lines 17-21: `Card = NumberedCard \| ActionCard \| WildCard \| WildDraw4Card` with `type` discriminant |
| **Type Guards**            | `domain/src/model/card.ts`                        | Lines 13-22: `isNumberedCard`, `isActionCard`, `isWildCard`, `hasColor`, `hasNumber`                   |
| **Type Narrowing**         | `domain/src/model/round.ts`                       | Lines 275-287: `'color' in card`, `card.type === 'NUMBERED'` checks                                    |
| **Casting (`as`)**         | `domain/src/model/card.ts`                        | Lines 27, 31, 33: Template strings cast to `CardLabel`                                                 |
| **`Readonly<T>`**          | `domain/src/model/types/card-types.ts`            | Lines 17-20, 28: All card types wrapped in `Readonly<>`                                                |
| **`readonly` arrays**      | `domain/src/model/round.ts`                       | Line 15: `playerHand(i: number): Readonly<Card[]>`                                                     |
| **`Extract<T, U>`**        | `domain/src/model/types/card-types.ts`            | Lines 23-24: `ColoredCard`, `WildFamily`                                                               |
| **`Exclude<T, U>`**        | `domain/src/model/types/card-types.ts`            | Line 25: `NonWildCard = Exclude<Card, WildFamily>`                                                     |
| **`Pick<T, K>`**           | `domain/src/model/types/card-types.ts`            | Line 27: `Pick<NumberedCard, 'color' \| 'number'>`                                                     |
| **`Partial<T>`**           | `domain/src/model/types/card-types.ts`            | Line 27: `Partial<Pick<...> & Pick<...>>`                                                              |
| **`keyof`**                | `domain/src/model/types/card-types.ts`            | Line 29: `CardMementoKey = keyof CardMemento`                                                          |
| **Template Literal Types** | `domain/src/model/types/card-types.ts`            | Lines 32-35: `CardLabel` type combines Color, Numbered, ActionType                                     |
| **Generic Functions**      | `domain/src/utils/random_utils.ts`                | Lines 5, 13: `standardShuffler<T>`, `memoizingShuffler<T>`                                             |
| **Interfaces**             | `domain/src/model/deck.ts`, `round.ts`, `game.ts` | `Deck`, `Round`, `Game` interfaces for contracts                                                       |
| **Type Aliases**           | `domain/src/model/types/card-types.ts`            | All card and game types use `type` keyword                                                             |
| **Intersection (`&`)**     | `domain/src/model/types/card-types.ts`            | Lines 27-28: `Pick<...> & Pick<...>`, `{ type } & CardMementoFields`                                   |
| **Spread Operator**        | `domain/src/model/deck.ts`                        | Line 34: `({ ...c })` for immutable copies                                                             |
| **Destructuring**          | `domain/src/model/card.ts`                        | Lines 26-27: `const { color, number } = c`                                                             |
| **Array Methods**          | `domain/src/model/round.ts`                       | Lines 330, 338, 503, 515: `forEach`, `some`, `reduce`, `map`                                           |
