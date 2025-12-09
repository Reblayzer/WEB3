// GraphQL Types for UNO Game Client
import type { Card, Color } from 'domain/src/model/types/card-types'

export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

export type Direction = 'clockwise' | 'counterclockwise'

export interface Player {
  id: string
  name: string
  cardCount: number
  hasCalledUno: boolean
  score: number
}

export interface Game {
  id: string
  players: Player[]
  currentPlayerIndex: number
  topCard: Card | null
  currentColor: Color | null
  direction: Direction
  drawPileCount: number
  status: GameStatus
  targetScore: number
  winner: string | null
  createdBy: string
  maxPlayers: number
  unoWindowOpen: boolean
  unoTarget: number | null
}

export interface AvailableGame {
  id: string
  createdBy: string
  playerCount: number
  maxPlayers: number
  status: GameStatus
}

export interface PlayerHand {
  gameId: string
  playerId: string
  cards: Card[]
}

export interface GameUpdate {
  gameId: string
  eventType: string
  data: string
  timestamp: string
}
