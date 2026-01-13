// Card-related types and constants - Single source of truth for card definitions

// Base arrays
export const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
export const numberedRanks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const actionTypes = ['SKIP', 'REVERSE', 'DRAW'] as const
export const wildTypes = ['WILD', 'WILD DRAW'] as const
export const cardTypes = ['NUMBERED', ...actionTypes, ...wildTypes] as const

// Literal unions
export type Color = (typeof colors)[number] // = 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export type Numbered = (typeof numberedRanks)[number] // = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type ActionType = (typeof actionTypes)[number] // = 'SKIP' | 'REVERSE' | 'DRAW'
export type WildType = (typeof wildTypes)[number] // = 'WILD' | 'WILD DRAW'
export type CardType = (typeof cardTypes)[number] // = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW'

// Card type definitions
export type NumberedCard = Readonly<{ type: 'NUMBERED', color: Color, number: Numbered }>
export type ActionCard = Readonly<{ type: ActionType, color: Color }>
export type WildCard = Readonly<{ type: 'WILD' }>
export type WildDraw4Card = Readonly<{ type: 'WILD DRAW' }>

// Main union type - all possible cards
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card

// Cards that have a color property (for matching logic)
export type ColoredCard = Extract<Card, { color: Color }> // = NumberedCard | ActionCard

// All wild card variants (for special rules)
export type WildFamily = Extract<Card, { type: WildType }> // = WildCard | WildDraw4Card

// For serialization - not all cards need all properties
type CardMementoFields = Partial<Pick<NumberedCard, 'color' | 'number'> & Pick<ActionCard, 'color'>>
export type CardMemento = Readonly<{ type: CardType } & CardMementoFields>
export type CardMementoKey = keyof CardMemento // = 'type' | 'color' | 'number'

// Template literal types for type-safe UI strings
export type CardLabel =
  | `${Color} ${Numbered}`        // "BLUE 5"
  | `${Color} ${ActionType}`      // "RED SKIP"
  | `${WildType}`                 // "WILD"

// Function type for deck shuffling operations
export type Shuffler<T> = (xs: T[]) => void
