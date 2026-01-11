# Exam 1: TypeScript Types

> **Exam Topics:** basic type operators, discriminated unions, casting/narrowing, immutability, utility types, type manipulations

---

## 1. Coding Style Basics

### Arrow Functions
Arrow functions are a shorter syntax for writing functions. They're preferred for small, inline functions. Unlike regular functions, they don't have their own `this` binding.

```ts
// Standard function
function add(a: number, b: number): number { return a + b }

// Arrow function (preferred for small functions)
const add = (a: number, b: number): number => a + b
```

### Spread Operator
The spread operator (`...`) expands arrays or objects. It's essential for immutable updates because it creates copies rather than modifying originals.

```ts
// Spread array - creates new array with added element
const newHand = [...hand, drawnCard]

// Spread object - creates new object with updated property
const newPlayer = { ...player, score: player.score + 10 }
```

### Destructuring
Destructuring extracts values from arrays or properties from objects into separate variables. It makes code cleaner and more readable.

```ts
// Array destructuring
const [first, second, ...rest] = cards

// Object destructuring
const { name, score } = player

// With rest - get remaining properties
const { id, ...playerData } = player
```

### Functional Array Methods
These methods transform arrays without mutating them. They can be chained together to create data transformation pipelines.

```ts
const scores = players
  .filter(p => p.active)           // Keep only active players
  .map(p => p.score)               // Extract scores
  .reduce((sum, s) => sum + s, 0)  // Sum them up
```

---

## 2. Basic Type Operators

### What are they?
Basic type operators are tools that help you create types from existing values or other types. Instead of writing types manually, you can derive them automatically from your code. This keeps your types in sync with your actual values and reduces duplication.

### `as const` - Const Assertion
When you write an array or object normally, TypeScript gives it a general type like `string[]`. But sometimes you want TypeScript to know the exact values. The `as const` assertion tells TypeScript to treat values as literal types and make them readonly. This is useful when you have a fixed set of values that won't change.

```ts
const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const
// Without as const: string[]
// With as const: readonly ['RED', 'BLUE', 'GREEN', 'YELLOW']
```

### `typeof` - Get Type from Value
The `typeof` operator extracts the type from an existing value. This is helpful when you want to create a type based on a variable you already have, rather than defining the type separately.

### `[number]` - Indexed Access
When you have an array type, using `[number]` extracts a union of all possible element types. Combined with `typeof` and `as const`, this lets you create a union type from an array of values.

```ts
const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const
type Color = (typeof colors)[number]   // 'RED' | 'BLUE' | 'GREEN' | 'YELLOW'
```

### The `any` Type
The `any` type disables type checking for a value. It's an escape hatch when you can't or don't want to specify a type. Function parameters without type annotations default to `any`. Avoid it when possible since it defeats TypeScript's purpose.

```ts
let data: any = fetchSomething()
data.anything.goes()  // No error - but might crash at runtime!
```

### Interface vs Type
Both `interface` and `type` define object shapes. They're mostly interchangeable. Interfaces can be extended and merged; types are more flexible for unions and computed types. Use whichever your team prefers.

```ts
// Interface syntax
interface Card {
  type: string
  color?: Color  // Optional property
}

// Type syntax (equivalent)
type Card = {
  type: string
  color?: Color
}
```

### Structural Typing
TypeScript uses structural typing (duck typing). If an object has the required properties, it satisfies the type - the object can have extra properties. This is different from nominal typing where types must be explicitly declared.

```ts
interface Point { x: number; y: number }

const p = { x: 10, y: 20, z: 30 }  // Has extra 'z' property
const point: Point = p              // OK - has x and y, that's enough
```

### Generic Functions
Generic functions use type parameters to work with any type while maintaining type safety. The type parameter (like `T`) is determined when you call the function.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}

first([1, 2, 3])       // T is number, returns number
first(['a', 'b'])      // T is string, returns string
```

---

## 3. Discriminated Unions

### What are they?
A discriminated union is a pattern where you have several types that share a common property with different literal values. This common property acts as a "tag" or "discriminant" that TypeScript uses to figure out which specific type you're working with. It's the safest way to handle objects that can be one of several types.

### Why use them?
When you check the discriminant property in an `if` or `switch` statement, TypeScript automatically knows which type you have and gives you access to the correct properties. This prevents errors where you try to access properties that don't exist on certain variants.

```ts
type NumberedCard = { type: 'NUMBERED', color: Color, number: number }
type WildCard = { type: 'WILD' }
type Card = NumberedCard | WildCard
```

The `type` property is the discriminant. Each variant has a unique literal value for this property.

```ts
function getValue(card: Card) {
  switch (card.type) {
    case 'NUMBERED': return card.number  // TS knows card has .number here
    case 'WILD': return 50               // TS knows card is WildCard here
  }
}
```

### Benefits
- **Type safety**: TypeScript prevents accessing wrong properties
- **Exhaustive checking**: Compiler warns if you forget a case
- **IDE support**: Autocomplete shows correct properties for each type

---

## 4. Intersection Types

### What are they?
Intersection types combine multiple types into one using the `&` operator. The resulting type has all properties from all combined types. While unions (`|`) mean "one of these types," intersections (`&`) mean "all of these types combined."

```ts
type Point = { x: number; y: number }
type Labeled = { label: string }

type LabeledPoint = Point & Labeled
// Has x, y, AND label

const p: LabeledPoint = { x: 10, y: 20, label: 'Origin' }
```

### When to use
Use intersections to add properties to existing types without modifying them. This is common for adding metadata or combining traits.

```ts
type Timestamped<T> = T & { createdAt: Date; updatedAt: Date }

type Card = { color: string; number: number }
type TrackedCard = Timestamped<Card>
// Has color, number, createdAt, and updatedAt
```

---

## 5. Narrowing vs Casting

### What's the difference?
Both casting and narrowing help you work with values whose type isn't specific enough. However, they work very differently. Narrowing is safe because TypeScript verifies your logic. Casting is unsafe because you're telling TypeScript to trust you without verification.

### Narrowing (Safe)
Narrowing uses runtime checks that TypeScript can analyze. When you check a condition, TypeScript "narrows" the type based on what must be true after that check. This is the preferred approach because it catches real errors.

```ts
// typeof narrows primitive types
if (typeof x === 'string') { x.toUpperCase() }

// 'in' operator checks for property existence
if ('color' in card) { card.color }

// Discriminant check narrows union types
if (card.type === 'NUMBERED') { card.number }
```

### Type Guards
A type guard is a function that performs a check and tells TypeScript about the result using a special return type syntax. This lets you reuse narrowing logic across your code.

```ts
const isNumbered = (c: Card): c is NumberedCard => c.type === 'NUMBERED'

if (isNumbered(card)) { card.number }  // TS narrows after the guard
```

### Casting (Unsafe)
Casting tells TypeScript to treat a value as a different type without any runtime check. Use this only when you're certain about the type and TypeScript can't figure it out. Casting bypasses type safety, so errors won't be caught at compile time.

```ts
const x = value as string              // "Trust me, this is a string"
const y = element!                     // "Trust me, this isn't null"
```

---

## 6. Immutability

### What is it?
Immutability means that once you create a value, you cannot change it. Instead of modifying existing data, you create new data with the changes you want. TypeScript's `readonly` modifier enforces this at compile time by making properties or array elements unchangeable.

### Why use it?
Immutable data is predictable because it can't change unexpectedly. This makes bugs easier to find, enables features like undo/redo (just keep old versions), and helps frameworks like React and Vue detect changes efficiently by comparing object references.

### `Readonly<T>`
This utility type makes all properties of an object readonly. Any attempt to assign to these properties will cause a compile error.

```ts
type Card = Readonly<{ type: string, color: Color }>
card.color = 'RED'  // ERROR: Cannot assign to readonly property
```

### `readonly` for Arrays
The `readonly` modifier on arrays prevents mutation methods like `push`, `pop`, and direct index assignment.

```ts
type Hand = readonly Card[]
hand.push(card)     // ERROR: push doesn't exist on readonly array
hand[0] = card      // ERROR: index signature is readonly
```

### `as const` for Deep Immutability
The `as const` assertion makes everything readonly recursively, including nested objects and arrays. It also converts values to their literal types.

```ts
const config = { max: 4, colors: ['RED'] } as const
// All nested properties become readonly, values become literal types
```

---

## 7. Utility Types

### What are they?
Utility types are built-in TypeScript types that transform other types. Instead of manually creating variations of your types (like making all properties optional), you use these utilities to derive new types automatically. This reduces duplication and keeps related types in sync.

| Type | What it does |
|------|--------------|
| `Partial<T>` | Makes all properties optional - useful for update functions |
| `Required<T>` | Makes all properties required - opposite of Partial |
| `Pick<T, K>` | Creates a type with only the specified properties |
| `Omit<T, K>` | Creates a type without the specified properties |
| `Extract<T, U>` | From a union T, keeps only types assignable to U |
| `Exclude<T, U>` | From a union T, removes types assignable to U |
| `ReturnType<T>` | Gets the return type of a function type |
| `Record<K, V>` | Creates an object type with keys K and values V |

### Examples from UNO

```ts
// Extract keeps only Card types that have a color property
type ColoredCard = Extract<Card, { color: Color }>  // NumberedCard | ActionCard

// Exclude removes Card types that are wild
type NonWild = Exclude<Card, { type: 'WILD' }>
```

---

## 8. Type Manipulations

### What are they?
Type manipulations are advanced features that let you create new types by transforming existing ones programmatically. They're like functions that operate on types instead of values. These are powerful tools for building flexible, reusable type definitions.

### Mapped Types
Mapped types iterate over the properties of another type and transform them. You can add or remove modifiers like `readonly` or `?` (optional), or change the property types.

```ts
// Remove readonly from all properties
type Mutable<T> = { -readonly [P in keyof T]: T[P] }

// Make all properties optional
type Optional<T> = { [P in keyof T]?: T[P] }
```

### Conditional Types
Conditional types choose between two types based on a condition, similar to a ternary operator for types. They use the `extends` keyword to test if a type matches a pattern.

```ts
type IsString<T> = T extends string ? true : false

type A = IsString<string>  // true
type B = IsString<number>  // false
```

### Template Literal Types
Template literal types create string types by combining other string types. They work like template strings in JavaScript but create types instead of values.

```ts
type Color = 'RED' | 'BLUE'
type Size = 'small' | 'large'
type CardClass = `${Color}-${Size}`  // 'RED-small' | 'RED-large' | 'BLUE-small' | 'BLUE-large'
```

### `keyof` Operator
The `keyof` operator creates a union of all property names of a type. This is useful when you want to accept any valid property name as a parameter.

```ts
type Keys = keyof NumberedCard  // 'type' | 'color' | 'number'
```

### The `infer` Keyword
The `infer` keyword extracts types from within other types in conditional type expressions. It's like pattern matching for types - you define a pattern and "capture" part of it into a new type variable.

```ts
// Extract the return type of a function
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never

type A = ReturnOf<() => string>  // string
type B = ReturnOf<() => number>  // number

// Extract the element type of an array
type ElementOf<T> = T extends (infer E)[] ? E : never

type C = ElementOf<string[]>  // string
type D = ElementOf<Card[]>    // Card
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| What does `as const` do? | Creates literal types and makes values readonly, keeping exact values instead of general types |
| What is a discriminated union? | A union where each type has a common property with different literal values, enabling safe type narrowing |
| Narrowing vs casting? | Narrowing uses runtime checks that TypeScript verifies; casting bypasses type checking entirely |
| Why immutability? | Prevents unexpected changes, enables change detection, makes debugging easier |
| When use Extract vs Exclude? | Extract keeps types matching a pattern, Exclude removes types matching a pattern |
| Union vs Intersection? | Union (`\|`) means "one of these types", Intersection (`&`) means "all types combined" |
| What is structural typing? | Objects are compatible if they have required properties, regardless of declared type name |
| What does `infer` do? | Extracts/captures a type from within another type in conditional type expressions |
| Interface vs Type? | Mostly equivalent; interfaces can extend/merge, types are more flexible for unions |

---

## Where It's Applied in Assignment 1

| Concept | File | Location |
|---------|------|----------|
| **`as const`** | `domain/src/model/types/card-types.ts` | Lines 3, 6, 9-11: `colors`, `numberedRanks`, `actionTypes`, `wildTypes`, `cardTypes` arrays |
| **`typeof` + `[number]`** | `domain/src/model/types/card-types.ts` | Lines 4, 7, 13-15: `Color`, `Numbered`, `ActionType`, `WildType`, `CardType` |
| **Discriminated Unions** | `domain/src/model/types/card-types.ts` | Lines 17-21: `Card = NumberedCard \| ActionCard \| WildCard \| WildDraw4Card` with `type` discriminant |
| **Type Guards** | `domain/src/model/card.ts` | Lines 13-22: `isNumberedCard`, `isActionCard`, `isWildCard`, `hasColor`, `hasNumber` |
| **Type Narrowing** | `domain/src/model/round.ts` | Lines 275-287: `'color' in card`, `card.type === 'NUMBERED'` checks |
| **Casting (`as`)** | `domain/src/model/card.ts` | Lines 27, 31, 33: Template strings cast to `CardLabel` |
| **`Readonly<T>`** | `domain/src/model/types/card-types.ts` | Lines 17-20, 28: All card types wrapped in `Readonly<>` |
| **`readonly` arrays** | `domain/src/model/round.ts` | Line 15: `playerHand(i: number): Readonly<Card[]>` |
| **`Extract<T, U>`** | `domain/src/model/types/card-types.ts` | Lines 23-24: `ColoredCard`, `WildFamily` |
| **`Exclude<T, U>`** | `domain/src/model/types/card-types.ts` | Line 25: `NonWildCard = Exclude<Card, WildFamily>` |
| **`Pick<T, K>`** | `domain/src/model/types/card-types.ts` | Line 27: `Pick<NumberedCard, 'color' \| 'number'>` |
| **`Partial<T>`** | `domain/src/model/types/card-types.ts` | Line 27: `Partial<Pick<...> & Pick<...>>` |
| **`keyof`** | `domain/src/model/types/card-types.ts` | Line 29: `CardMementoKey = keyof CardMemento` |
| **Template Literal Types** | `domain/src/model/types/card-types.ts` | Lines 32-35: `CardLabel` type combines Color, Numbered, ActionType |
| **Generic Functions** | `domain/src/utils/random_utils.ts` | Lines 5, 13: `standardShuffler<T>`, `memoizingShuffler<T>` |
| **Interfaces** | `domain/src/model/deck.ts`, `round.ts`, `game.ts` | `Deck`, `Round`, `Game` interfaces for contracts |
| **Type Aliases** | `domain/src/model/types/card-types.ts` | All card and game types use `type` keyword |
| **Intersection (`&`)** | `domain/src/model/types/card-types.ts` | Lines 27-28: `Pick<...> & Pick<...>`, `{ type } & CardMementoFields` |
| **Spread Operator** | `domain/src/model/deck.ts` | Line 34: `({ ...c })` for immutable copies |
| **Destructuring** | `domain/src/model/card.ts` | Lines 26-27: `const { color, number } = c` |
| **Array Methods** | `domain/src/model/round.ts` | Lines 330, 338, 503, 515: `forEach`, `some`, `reduce`, `map` |
