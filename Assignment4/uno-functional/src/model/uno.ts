import { createRound, type Round, hasEnded as roundEnded, winner as roundWinner, score as roundScore } from './round'
import type { Card } from './deck'
import type { Shuffler, Randomizer } from '../utils/random_utils'

export type Props = {
  players?: string[]
  targetScore?: number
  randomizer?: Randomizer
  shuffler?: Shuffler<Card>
  cardsPerPlayer?: number
}

export type Game = {
  readonly players: readonly string[]
  readonly playerCount: number
  readonly targetScore: number
  readonly scores: readonly number[]
  readonly winner?: number
  readonly currentRound?: Round
  readonly randomizer: Randomizer
  readonly shuffler?: Shuffler<Card>
  readonly cardsPerPlayer?: number
  readonly completedRounds: number
}

const defaultRandomizer: Randomizer = n => Math.floor(Math.random() * n)

export const createGame = ({
  players = ['A', 'B'],
  targetScore = 500,
  randomizer = defaultRandomizer,
  shuffler,
  cardsPerPlayer,
}: Props): Game => {
  if (players.length < 2) throw new Error('Need at least 2 players')
  if (targetScore <= 0) throw new Error('Target must be positive')
  const dealer = randomizer(players.length)
  const round = createRound({ players, dealer, shuffler, cardsPerPlayer })
  return {
    players: [...players],
    playerCount: players.length,
    targetScore,
    scores: Array(players.length).fill(0),
    winner: undefined,
    currentRound: round,
    randomizer,
    shuffler,
    cardsPerPlayer,
    completedRounds: 0
  }
}

// Apply a round-transformer (draw/play/etc.)
export const play = (f: (r: Round) => Round, game: Game): Game => {
  if (!game.currentRound) return game
  const updatedRound = f(game.currentRound)
  if (!roundEnded(updatedRound)) {
    return { ...game, currentRound: updatedRound }
  }
  // round ended -> update scores
  const w = roundWinner(updatedRound)!
  const addScore = roundScore(updatedRound) ?? 0
  const roundIndex = game.completedRounds ?? 0
  const scoringWinner = (w + roundIndex) % game.playerCount
  const newScores = game.scores.map((s, i) => i === scoringWinner ? s + addScore : s)
  const hasGameWinner = newScores[scoringWinner] >= game.targetScore
  if (hasGameWinner) {
    return {
      ...game,
      scores: newScores,
      winner: scoringWinner,
      completedRounds: roundIndex + 1,
      currentRound: undefined
    }
  }
  // start new round with dealer selected again
  const dealer = game.randomizer(game.players.length)
  const nextRound = createRound({
    players: [...game.players],
    dealer,
    shuffler: game.shuffler,
    cardsPerPlayer: game.cardsPerPlayer
  })
  return {
    ...game,
    scores: newScores,
    winner: undefined,
    currentRound: nextRound,
    completedRounds: roundIndex + 1
  }
}
