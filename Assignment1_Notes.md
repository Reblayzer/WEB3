# Assignment 1: UNO Domain Model (TypeScript)

## Overview
**Focus:** TypeScript types and how you use them to avoid errors  
**Stack:** TypeScript, Jest  
**Goal:** Build the core UNO game logic as a reusable domain model

---

## Exam Focus Areas
**The examiner will ask about:**
- Basic type operators
- Discriminated unions
- Casting and narrowing
- Immutability
- Utility types
- Type manipulations

### Quick Explanations with Snippets
- **Basic type operators** — build literal unions from values so the compiler knows exact options.
```ts
const colors = ['RED', 'BLUE'] as const
type Color = (typeof colors)[number] // 'RED' | 'BLUE'
```
- **Discriminated unions** — one literal field lets switches narrow safely.
```ts
type Card = { type: 'NUMBERED'; n: number } | { type: 'WILD' }
function score(card: Card) {
  switch (card.type) {
    case 'NUMBERED': return card.n
    case 'WILD': return 50
  }
}
```
- **Casting vs narrowing** — prefer guards; casting skips safety.
```ts
const isNumber = (x: unknown): x is number => typeof x === 'number'
function double(x: unknown) {
  if (isNumber(x)) return x * 2 // safe narrowing
  return NaN
}
```
- **Immutability** — readonly collections prevent mutation mistakes.
```ts
type Hand = readonly Card[]
const hand: Hand = []
// hand.push(card) // ❌ compile error
const newHand = [...hand, card] // ✅ new array
```
- **Utility types** — reuse shapes without repeating properties.
```ts
type CardBase = { type: string; color?: Color }
type CardDraft = Partial<CardBase> // all optional for form
type CardView = Pick<CardBase, 'type' | 'color'>
```
- **Type manipulations** — mapped/conditional types reshape other types.
```ts
type Mutable<T> = { -readonly [P in keyof T]: T[P] }
type Points<T> = T extends { number: number } ? number : 50
```

---

## 1. Basic Type Operators

### `as const` - Const Assertions
```ts
// Creates a readonly tuple with LITERAL types (not just string[])
export const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
// Type: readonly ['BLUE', 'GREEN', 'RED', 'YELLOW']

// Without 'as const' → string[]
// With 'as const' → readonly tuple with literal types
```

### `typeof` - Get Type from Value
```ts
const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
type Colors = typeof colors  // readonly ['BLUE', 'GREEN', 'RED', 'YELLOW']
```

### Indexed Access Types `[number]`
```ts
// [number] extracts UNION of all array element types
export type Color = (typeof colors)[number]  
// Result: 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'

const ranks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
type Rank = (typeof ranks)[number]  // 0 | 1 | 2 | ... | 9
```

### Union Types `|`
```ts
// Combine multiple types - value can be ANY of them
export type CardType = 'NUMBERED' | ActionType | WildType
```

### Intersection Types `&`
```ts
// Combine multiple types - value must have ALL properties
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged  // Has both name AND age
```

---

## 2. Discriminated Unions

**Definition:** A union type where each variant has a common "discriminant" property with a literal type.

```ts
// The 'type' property is the DISCRIMINANT
export type NumberedCard = Readonly<{ 
  type: 'NUMBERED'  // Literal type discriminant
  color: Color
  number: Numbered 
}>

export type ActionCard = Readonly<{ 
  type: ActionType  // 'SKIP' | 'REVERSE' | 'DRAW'
  color: Color 
}>

export type WildCard = Readonly<{ type: 'WILD' }>
export type WildDraw4Card = Readonly<{ type: 'WILD DRAW' }>

// Union of all card types
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card
```

### Why Discriminated Unions?
1. **Type Safety**: TypeScript knows exactly which properties exist
2. **Exhaustive Checking**: Compiler ensures all cases handled in switch
3. **IDE Support**: Autocomplete shows correct properties

```ts
// TypeScript NARROWS type based on discriminant check
function getCardValue(card: Card): number {
  switch (card.type) {
    case 'NUMBERED':
      return card.number  // TS knows 'number' property exists!
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      return 20  // TS knows it's ActionCard (has color)
    case 'WILD':
    case 'WILD DRAW':
      return 50
  }
}
```

---

## 3. Casting and Narrowing

### Type Narrowing (PREFERRED - Safe)
TypeScript automatically narrows types based on control flow:

```ts
// Narrowing with typeof
function process(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase()  // TS knows it's string
  }
  return value * 2  // TS knows it's number
}

// Narrowing with 'in' operator
function handleCard(card: Card) {
  if ('color' in card) {
    // card is ColoredCard (NumberedCard | ActionCard)
    console.log(card.color)  // Safe!
  }
}

// Narrowing with discriminant property
if (card.type === 'NUMBERED') {
  console.log(card.number)  // Narrowed to NumberedCard
}
```

### Type Guards (Custom Narrowing Functions)
```ts
// Return type is a TYPE PREDICATE: `card is NumberedCard`
export const isNumberedCard = (card: Card): card is NumberedCard => 
  card.type === 'NUMBERED'

export const isActionCard = (card: Card): card is ActionCard => 
  ['SKIP', 'REVERSE', 'DRAW'].includes(card.type)

export const hasColor = (card: Card): card is ColoredCard => 
  'color' in card

// Usage - TS narrows type after guard
if (isNumberedCard(card)) {
  console.log(card.number)  // Safe access!
}
```

### Type Casting/Assertion (USE CAREFULLY - Unsafe)
```ts
// 'as' keyword - tells TypeScript "trust me, I know better"
const element = document.getElementById('app') as HTMLDivElement

// Non-null assertion (!) - asserts value is not null/undefined
const element = document.getElementById('app')!

// Double assertion for "impossible" casts
const value = someValue as unknown as TargetType
```

⚠️ **Warning**: Casting BYPASSES type checking. Prefer narrowing!

---

## 4. Immutability

### `Readonly<T>` Utility Type
```ts
// Makes ALL properties readonly (shallow)
export type NumberedCard = Readonly<{ 
  type: 'NUMBERED'
  color: Color
  number: Numbered 
}>

const card: NumberedCard = { type: 'NUMBERED', color: 'RED', number: 5 }
card.number = 6  // ❌ Error: Cannot assign to 'number' - it is read-only
```

### `readonly` Modifier for Arrays
```ts
type Hand = readonly Card[]
const hand: Hand = [card1, card2]
hand.push(card3)  // ❌ Error: 'push' does not exist on readonly array
hand[0] = card3   // ❌ Error: Index signature is readonly

// For nested readonly
type Hands = readonly (readonly Card[])[]
```

### `as const` for Deep Immutability
```ts
const config = {
  maxPlayers: 4,
  colors: ['RED', 'BLUE']
} as const
// Type: { readonly maxPlayers: 4; readonly colors: readonly ['RED', 'BLUE'] }
// Values are literal types too!
```

### Why Immutability?
1. **Predictability**: Objects don't change unexpectedly
2. **Debugging**: Easy to trace when/where state changed
3. **Change Detection**: React/Vue can efficiently detect changes
4. **Thread Safety**: No race conditions in concurrent code

---

## 5. Utility Types

### `Readonly<T>` - Make all properties readonly
```ts
type ReadonlyCard = Readonly<Card>
```

### `Partial<T>` - Make all properties optional
```ts
type CardUpdate = Partial<NumberedCard>
// { type?: 'NUMBERED'; color?: Color; number?: Numbered }
```

### `Required<T>` - Make all properties required
```ts
type FullConfig = Required<RoundConfig>
```

### `Pick<T, K>` - Select specific properties
```ts
type CardColor = Pick<NumberedCard, 'color'>
// { color: Color }

type CardIdentity = Pick<NumberedCard, 'type' | 'color'>
// { type: 'NUMBERED'; color: Color }
```

### `Omit<T, K>` - Remove specific properties
```ts
type CardWithoutNumber = Omit<NumberedCard, 'number'>
// { type: 'NUMBERED'; color: Color }
```

### `Extract<T, U>` - Extract matching types from union
```ts
// Get only cards that have a color property
export type ColoredCard = Extract<Card, { color: Color }>
// Result: NumberedCard | ActionCard
```

### `Exclude<T, U>` - Remove matching types from union
```ts
type NonWildCard = Exclude<Card, { type: 'WILD' | 'WILD DRAW' }>
// Result: NumberedCard | ActionCard
```

### `ReturnType<T>` - Get function return type
```ts
function createCard() { return { type: 'WILD' as const } }
type CreatedCard = ReturnType<typeof createCard>
// { type: 'WILD' }
```

### `Record<K, V>` - Create object type with keys K and values V
```ts
type ColorPoints = Record<Color, number>
// { RED: number; BLUE: number; GREEN: number; YELLOW: number }
```

---

## 6. Type Manipulations

### Mapped Types
```ts
// Transform each property in a type
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]  // Remove readonly with '-'
}

type Optional<T> = {
  [P in keyof T]?: T[P]  // Make all optional
}

type Nullable<T> = {
  [P in keyof T]: T[P] | null  // Allow null for each property
}
```

### Conditional Types
```ts
// T extends U ? TrueType : FalseType
type IsString<T> = T extends string ? true : false

type A = IsString<string>  // true
type B = IsString<number>  // false

// Practical: Different return based on input
type CardPoints<T extends Card> = 
  T extends NumberedCard ? T['number'] :
  T extends ActionCard ? 20 :
  50
```

### `keyof` Operator
```ts
type CardKeys = keyof NumberedCard
// 'type' | 'color' | 'number'

// Generic function using keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

### Template Literal Types
```ts
type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW'
type CardId = `${Color}-${number}`
// 'RED-0' | 'RED-1' | ... 

type EventName = `on${Capitalize<'click' | 'hover'>}`
// 'onClick' | 'onHover'
```

### `infer` Keyword (in Conditional Types)
```ts
// Extract element type from array
type ElementType<T> = T extends (infer E)[] ? E : never

type A = ElementType<string[]>  // string
type B = ElementType<Card[]>    // Card
```

---

## Quick Reference for Exam

| Topic | What to Know |
|-------|--------------|
| **`as const`** | Creates literal types + readonly from values |
| **`typeof x[number]`** | Extracts union from array elements |
| **Discriminated Union** | Union with common literal property for narrowing |
| **Type Guard** | Function returning `x is Type` for custom narrowing |
| **Narrowing vs Casting** | Narrowing = safe (if/switch), Casting = unsafe (as) |
| **Readonly** | Prevents mutation at compile time |
| **Pick/Omit** | Select or remove properties from type |
| **Extract/Exclude** | Filter types from union |
| **Mapped Types** | Transform all properties: `[P in keyof T]` |
| **Conditional Types** | `T extends U ? X : Y` |

---

## Code Examples from UNO

```ts
// Discriminated union in action
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card

// Type guard
export const isNumberedCard = (c: Card): c is NumberedCard => 
  c.type === 'NUMBERED'

// Utility type
export type ColoredCard = Extract<Card, { color: Color }>

// Immutable state
export type Round = Readonly<{
  hands: readonly (readonly Card[])[]
  playerInTurn: number
}>
```
