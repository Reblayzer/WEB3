// Deck interface and implementation

import type { Card, CardMemento, Color, Numbered, Shuffler } from './types/card-types'
import { colors } from './types/card-types'

// Re-export commonly used types and constants for backwards compatibility
export { colors } from './types/card-types'
export type { Card } from './types/card-types'
export { hasColor, hasNumber } from './card'

export interface Deck {
  readonly size: number
  shuffle(s: Shuffler<Card>): void
  deal(): Card | undefined
  peek(): Card | undefined
  top(): Card | undefined
  /** Returns a NEW deck containing only the cards that match `pred`, in the same order. */
  filter(pred: (c: Card) => boolean): Deck
  /** JSON-safe snapshot of the remaining cards in order (top first). */
  toMemento(): CardMemento[]
}

class ArrayDeck implements Deck {
  private cards: Card[]
  constructor(cards: Card[]) { this.cards = cards }
  get size() { return this.cards.length }
  shuffle(s: Shuffler<Card>) { s(this.cards) }
  deal() { return this.cards.shift() }
  peek() { return this.cards[0] }
  top() { return this.peek() }
  filter(pred: (c: Card) => boolean): Deck {
    return new ArrayDeck(this.cards.filter(pred))
  }
  toMemento(): CardMemento[] { return this.cards.map(c => ({ ...c })) }
}

const makeStandardCards = (): Card[] => {
  const cards: Card[] = []
  for (const color of colors) {
    // one 0
    cards.push({ type: 'NUMBERED', color, number: 0 })
    // two of each 1..9
    for (let n = 1 as Numbered; n <= 9; n = (n + 1) as Numbered) {
      cards.push({ type: 'NUMBERED', color, number: n })
      cards.push({ type: 'NUMBERED', color, number: n })
    }
    // two of each action card
    cards.push({ type: 'SKIP', color }); cards.push({ type: 'SKIP', color })
    cards.push({ type: 'REVERSE', color }); cards.push({ type: 'REVERSE', color })
    cards.push({ type: 'DRAW', color }); cards.push({ type: 'DRAW', color })
  }
  // 4 wild + 4 wild draw
  for (let i = 0; i < 4; i++) cards.push({ type: 'WILD' })
  for (let i = 0; i < 4; i++) cards.push({ type: 'WILD DRAW' })
  return cards
}

export const createStandardDeck = (): Deck => new ArrayDeck(makeStandardCards())

export const deckFromMemento = (cards: CardMemento[]): Deck => {
  const parsed: Card[] = cards.map(raw => {
    if (raw.type === 'WILD') return { type: 'WILD' }
    if (raw.type === 'WILD DRAW') return { type: 'WILD DRAW' }
    if (raw.type === 'NUMBERED') {
      if (raw.color === undefined || raw.number === undefined) throw new Error('Invalid NUMBERED memento')
      return { type: 'NUMBERED', color: raw.color, number: raw.number }
    }
    if (raw.type === 'SKIP' || raw.type === 'REVERSE' || raw.type === 'DRAW') {
      if (raw.color === undefined) throw new Error('Missing color for action card')
      return { type: raw.type, color: raw.color }
    }
    throw new Error('Unknown card type')
  })
  return new ArrayDeck(parsed)
}
