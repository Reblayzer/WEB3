// Round-related types - Single source of truth for round definitions

import type { Card, Color, Shuffler, CardMemento } from './card-types'

export type Direction = 'clockwise' | 'counterclockwise'

export type RoundConfig = {
  players: string[]
  dealer: number
  cardsPerPlayer?: number
  shuffler?: Shuffler<Card>
}

export type RoundMemento = {
  players: string[]
  hands: Card[][]
  drawPile: CardMemento[]
  discardPile: CardMemento[]
  currentColor: Color
  currentDirection: Direction
  dealer: number
  playerInTurn: number | undefined
}

export type EndEvent = { winner: number }
export type EndListener = (e: EndEvent) => void
