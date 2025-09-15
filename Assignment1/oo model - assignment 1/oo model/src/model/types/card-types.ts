// Card-related types and constants - Single source of truth for card definitions

export type Color = 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export const colors: Readonly<Color[]> = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const

export type Numbered = 0|1|2|3|4|5|6|7|8|9
export type CardType = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW'

export type NumberedCard = { type: 'NUMBERED', color: Color, number: Numbered }
export type ActionCard = { type: 'SKIP'|'REVERSE'|'DRAW', color: Color }
export type WildCard = { type: 'WILD' }
export type WildDraw4Card = { type: 'WILD DRAW' }
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card

export type CardMemento = { type: CardType, color?: Color, number?: Numbered }

// Shuffler type for deck operations
export type Shuffler<T> = (xs: T[]) => void
