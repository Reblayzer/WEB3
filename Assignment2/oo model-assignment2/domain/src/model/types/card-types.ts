// Card-related types and constants - Single source of truth for card definitions

export const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
export type Color = (typeof colors)[number]

export const numberedRanks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export type Numbered = (typeof numberedRanks)[number]

export const actionTypes = ['SKIP', 'REVERSE', 'DRAW'] as const
export const wildTypes = ['WILD', 'WILD DRAW'] as const
export const cardTypes = ['NUMBERED', ...actionTypes, ...wildTypes] as const

export type ActionType = (typeof actionTypes)[number]
export type WildType = (typeof wildTypes)[number]
export type CardType = (typeof cardTypes)[number]

export type NumberedCard = Readonly<{ type: 'NUMBERED', color: Color, number: Numbered }>
export type ActionCard = Readonly<{ type: ActionType, color: Color }>
export type WildCard = Readonly<{ type: 'WILD' }>
export type WildDraw4Card = Readonly<{ type: 'WILD DRAW' }>
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card

export type ColoredCard = Extract<Card, { color: Color }>
export type WildFamily = Extract<Card, { type: WildType }>
export type NonWildCard = Exclude<Card, WildFamily>

type CardMementoFields = Partial<Pick<NumberedCard, 'color' | 'number'> & Pick<ActionCard, 'color'>>
export type CardMemento = Readonly<{ type: CardType } & CardMementoFields>
export type CardMementoKey = keyof CardMemento

// Template literal examples to reflect lecture theory
export type CardLabel =
  | `${Color} ${Numbered}`
  | `${Color} ${ActionType}`
  | `${WildType}`

// Shuffler type for deck operations
export type Shuffler<T> = (xs: T[]) => void
