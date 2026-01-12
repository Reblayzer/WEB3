// Deck interface and implementation

import type { Card, CardMemento, Color, Numbered, Shuffler } from './types/card-types'
import { colors } from './types/card-types'

// Re-export commonly used types and constants for backwards compatibility
export { colors } from './types/card-types'
export type { Card } from './types/card-types'
export { hasColor, hasNumber } from './card'

// Constants for standard UNO deck composition
const NUMBERED_ZERO_COUNT = 1
const NUMBERED_NONZERO_COUNT = 2  // Two of each 1-9
const ACTION_CARDS_PER_COLOR = 2
const WILD_CARDS_COUNT = 4
const WILD_DRAW_CARDS_COUNT = 4

export interface Deck {
  readonly size: number
  shuffle(s: Shuffler<Card>): void
  deal(): Card | undefined
  peek(): Card | undefined
  top(): Card | undefined
  /** Returns a NEW deck containing only the cards that match `pred`, in the same order. */
  filter(pred: (c: Readonly<Card>) => boolean): Deck
  /** JSON-safe snapshot of the remaining cards in order (top first). */
  toMemento(): readonly CardMemento[]
}

class ArrayDeck implements Deck {
  private cards: Card[]
  constructor(cards: Card[]) { this.cards = cards }

  get size(): number { return this.cards.length }

  shuffle(s: Shuffler<Card>): void { s(this.cards) }

  deal(): Card | undefined { return this.cards.shift() }

  peek(): Card | undefined { return this.cards[0] }

  top(): Card | undefined { return this.peek() }

  filter(pred: (c: Readonly<Card>) => boolean): Deck {
    return new ArrayDeck(this.cards.filter(pred))
  }

  toMemento(): readonly CardMemento[] {
    return this.cards.map(c => ({ ...c }))
  }
}

const makeStandardCards = (): Card[] => {
  const cards: Card[] = []

  for (const color of colors) {
    // One 0 per color
    for (let i = 0; i < NUMBERED_ZERO_COUNT; i++) {
      cards.push({ type: 'NUMBERED', color, number: 0 })
    }

    // Two of each 1-9 per color
    for (let n = 1 as Numbered; n <= 9; n = (n + 1) as Numbered) {
      for (let i = 0; i < NUMBERED_NONZERO_COUNT; i++) {
        cards.push({ type: 'NUMBERED', color, number: n })
      }
    }

    // Two of each action card per color
    for (let i = 0; i < ACTION_CARDS_PER_COLOR; i++) {
      cards.push({ type: 'SKIP', color })
      cards.push({ type: 'REVERSE', color })
      cards.push({ type: 'DRAW', color })
    }
  }

  // Wild cards
  for (let i = 0; i < WILD_CARDS_COUNT; i++) {
    cards.push({ type: 'WILD' })
  }

  // Wild Draw cards
  for (let i = 0; i < WILD_DRAW_CARDS_COUNT; i++) {
    cards.push({ type: 'WILD DRAW' })
  }

  return cards
}

export const createStandardDeck = (): Deck => new ArrayDeck(makeStandardCards())

// Helper to deserialize a single card with exhaustive checking
function deserializeCardMemento(raw: Readonly<CardMemento>): Card {
  switch (raw.type) {
    case 'WILD':
      return { type: 'WILD' }

    case 'WILD DRAW':
      return { type: 'WILD DRAW' }

    case 'NUMBERED':
      if (raw.color === undefined || raw.number === undefined) {
        throw new Error('Invalid NUMBERED memento: missing color or number')
      }
      return { type: 'NUMBERED', color: raw.color, number: raw.number }

    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      if (raw.color === undefined) {
        throw new Error(`Invalid ${raw.type} memento: missing color`)
      }
      return { type: raw.type, color: raw.color }

    default:
      const _exhaustive: never = raw.type
      throw new Error(`Unknown card type: ${_exhaustive}`)
  }
}

export const deckFromMemento = (cards: readonly CardMemento[]): Deck => {
  const parsed: Card[] = cards.map(deserializeCardMemento)
  return new ArrayDeck(parsed)
}
