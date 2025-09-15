// Game interface and implementation

import type { GameConfig, GameMemento } from './types/game-types'
import { createRound, createRoundFromMemento, type Round } from './round'

// Re-export for backwards compatibility
export type { GameMemento } from './types/game-types'

export interface Game {
  readonly playerCount: number
  readonly targetScore: number
  player(i: number): string
  score(i: number): number
  winner(): number | undefined
  currentRound(): Round | undefined
  toMemento(): GameMemento
}

class GameImpl implements Game {
  players: string[]
  target: number
  private scores: number[]
  private roundInst: Round | undefined
  private theWinner: number | undefined
  private cardsPerPlayer?: number
  private randomizer?: (bound: number) => number

  constructor(cfg: GameConfig)
  constructor(m: GameMemento)
  constructor(arg: GameConfig | GameMemento) {
    if ('scores' in arg) {
      const m = arg as GameMemento

      // Validation
      if (m.players.length < 2) throw new Error('Need at least 2 players')
      if (m.targetScore <= 0) throw new Error('Target score must be positive')
      if (m.scores.length !== m.players.length) throw new Error('Scores count must match players count')
      if (m.scores.some(score => score < 0)) throw new Error('Scores cannot be negative')

      // Check for multiple winners
      const winners = m.scores.filter(score => score >= m.targetScore).length
      if (winners > 1) throw new Error('Multiple winners not allowed')

      // Check game state consistency
      const hasWinner = winners === 1
      if (!hasWinner && !m.currentRound) {
        throw new Error('Current round required for unfinished game')
      }

      this.players = m.players.slice()
      this.target = m.targetScore
      this.scores = m.scores.slice()
      this.cardsPerPlayer = m.cardsPerPlayer
      this.roundInst = m.currentRound ? createRoundFromMemento(m.currentRound) : undefined

      // Set up round end listener if there's a current round
      if (this.roundInst) {
        this.setupRoundEndListener()
      }

      const w = this.scores.findIndex(s => s >= this.target)
      this.theWinner = w >= 0 ? w : undefined
    } else {
      const cfg = arg as GameConfig

      // Validation for GameConfig
      if (cfg.players && cfg.players.length < 2) throw new Error('Need at least 2 players')
      if (cfg.targetScore !== undefined && cfg.targetScore <= 0) throw new Error('Target score must be positive')

      this.players = cfg.players ?? ['A', 'B']
      this.target = cfg.targetScore ?? 500
      this.scores = new Array(this.players.length).fill(0)
      this.cardsPerPlayer = cfg.cardsPerPlayer
      this.randomizer = cfg.randomizer

      // Start the first round
      this.startNewRound()
    }
  }

  private setupRoundEndListener() {
    if (!this.roundInst) return

    this.roundInst.onEnd((event) => {
      const score = this.roundInst!.score()
      if (score !== undefined) {
        this.scores[event.winner] += score
        // Check if game is won
        if (this.scores[event.winner] >= this.target) {
          this.theWinner = event.winner
          this.roundInst = undefined
        } else {
          // Start a new round if no one has won yet
          this.startNewRound()
        }
      }
    })
  }

  private startNewRound() {
    const dealer = this.randomizer ? this.randomizer(this.players.length) : Math.floor(Math.random() * this.players.length)
    this.roundInst = createRound({
      players: this.players,
      dealer,
      cardsPerPlayer: this.cardsPerPlayer
    })
    this.setupRoundEndListener()
  }

  get playerCount() { return this.players.length }
  get targetScore() { return this.target }

  player(i: number) {
    if (i < 0 || i >= this.players.length) throw new Error('Player index out of bounds')
    return this.players[i]
  }

  score(i: number) { return this.scores[i] }
  winner() { return this.theWinner }
  currentRound() { return this.roundInst }

  toMemento(): GameMemento {
    const memento: GameMemento = {
      players: this.players.slice(),
      targetScore: this.target,
      scores: this.scores.slice()
    }

    // Only include currentRound if there is one
    if (this.roundInst) {
      memento.currentRound = this.roundInst.toMemento()
    }

    // Only include cardsPerPlayer if it was set
    if (this.cardsPerPlayer !== undefined) {
      memento.cardsPerPlayer = this.cardsPerPlayer
    }

    return memento
  }
}

export const createGame = (cfg: GameConfig): Game => new GameImpl(cfg)
export const createGameFromMemento = (m: GameMemento): Game => new GameImpl(m)
