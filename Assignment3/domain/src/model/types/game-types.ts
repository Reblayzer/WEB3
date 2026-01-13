// Game-related types - Single source of truth for game definitions

import type { RoundMemento } from './round-types.js'
import type { Shuffler, Card } from './card-types.js'

export type GameMemento = {
  players: string[]
  targetScore: number
  scores: number[]
  currentRound?: RoundMemento
  cardsPerPlayer?: number
}

export type GameConfig = {
  players?: string[]
  targetScore?: number
  randomizer?: (bound: number) => number
  cardsPerPlayer?: number
  shuffler?: Shuffler<Card>
}
