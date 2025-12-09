// Game-related types - Single source of truth for game definitions

import type { RoundMemento } from './round-types'

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
}
