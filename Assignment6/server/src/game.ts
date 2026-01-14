import * as Uno from 'domain/src/model/uno'
import { standardRandomizer, standardShuffler } from 'domain/src/utils/random_utils'

export const createGame = (players: string[]): Uno.Game =>
  Uno.createGame({
    players,
    targetScore: 200,
    randomizer: standardRandomizer,
    shuffler: standardShuffler,
  })

export const waitingGame = (players: string[]): Uno.Game => ({
  players: [...players],
  playerCount: players.length,
  targetScore: 200,
  scores: Array(players.length).fill(0),
  winner: undefined,
  currentRound: undefined,
  randomizer: standardRandomizer,
  shuffler: standardShuffler,
  cardsPerPlayer: 7,
  completedRounds: 0,
})
