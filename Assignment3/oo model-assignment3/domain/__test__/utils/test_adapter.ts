import { type Randomizer, type Shuffler, standardRandomizer, standardShuffler } from '../../src/utils/random_utils'
import { type Card, createStandardDeck, deckFromMemento } from '../../src/model/deck'
import {
  createRound as _createRound,
  createRoundFromMemento as _createRoundFromMemento,
  type Round,
  type RoundMemento,
} from '../../src/model/round'
import {
  createGame as _createGame,
  createGameFromMemento as _createGameFromMemento,
  type Game,
  type GameMemento,
} from '../../src/model/game'

// Deck helpers
export function createInitialDeck() { return createStandardDeck() }
export function createDeckFromMemento(cards: Record<string, string | number>[]) {
  return deckFromMemento(cards as any)
}

// Round helpers
export type HandConfig = { players: string[], dealer: number, cardsPerPlayer?: number, shuffler?: Shuffler<Card> }
export function createRound(props: HandConfig): Round { return _createRound(props) }
export function createRoundFromMemento(m: RoundMemento, shuffler?: Shuffler<Card>): Round {
  return _createRoundFromMemento(m, shuffler)
}

// Game helpers
export type GameConfig = {
  players: string[],
  targetScore: number,
  randomizer?: Randomizer,
  shuffler?: Shuffler<Card>,
  cardsPerPlayer?: number
}

export function createGame(props: Partial<GameConfig>): Game {
  return _createGame({
    players: props.players,
    targetScore: props.targetScore,
    randomizer: props.randomizer,
    cardsPerPlayer: props.cardsPerPlayer
  })
}

export function createGameFromMemento(m: GameMemento, _r?: Randomizer, _s?: Shuffler<Card>): Game {
  return _createGameFromMemento(m)
}

export { standardShuffler, standardRandomizer }
