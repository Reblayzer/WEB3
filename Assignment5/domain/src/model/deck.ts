// Card definitions and deck creation (immutable data)

export type Color = 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export const colors: Color[] = ['BLUE', 'GREEN', 'RED', 'YELLOW']

export type Numbered = 0|1|2|3|4|5|6|7|8|9
export type Type = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW'

export type NumberedCard = { readonly type: 'NUMBERED', readonly color: Color, readonly number: Numbered }
export type ActionCard = { readonly type: 'SKIP'|'REVERSE'|'DRAW', readonly color: Color }
export type WildCard = { readonly type: 'WILD' }
export type WildDraw4Card = { readonly type: 'WILD DRAW' }
export type Card = NumberedCard | ActionCard | WildCard | WildDraw4Card

// Build the standard 108-card Uno deck
export function createInitialDeck(): Card[] {
  const cards: Card[] = []
  for (const color of colors) {
    // one zero
    cards.push({ type: 'NUMBERED', color, number: 0 })
    // two of each 1..9
    for (let n: Numbered = 1 as Numbered; n <= 9; n = (n + 1) as Numbered) {
      cards.push({ type: 'NUMBERED', color, number: n })
      cards.push({ type: 'NUMBERED', color, number: n })
    }
    // two of each action
    cards.push({ type: 'SKIP', color }); cards.push({ type: 'SKIP', color })
    cards.push({ type: 'REVERSE', color }); cards.push({ type: 'REVERSE', color })
    cards.push({ type: 'DRAW', color }); cards.push({ type: 'DRAW', color })
  }
  // wilds
  for (let i = 0; i < 4; i++) cards.push({ type: 'WILD' })
  for (let i = 0; i < 4; i++) cards.push({ type: 'WILD DRAW' })
  return cards
}

export const pointsFor = (c: Card): number => {
  switch (c.type) {
    case 'NUMBERED': return c.number
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW': return 20
    case 'WILD':
    case 'WILD DRAW': return 50
    default: return 0
  }
}
