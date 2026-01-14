// GraphQL Types for UNO Game Client
import type { Card, Color } from 'domain/src/model/types/card-types'
import type { 
  GameStatus,
  Direction,
  Player,
  GameLogEntry,
  AvailableGame,
  PlayerHand
} from 'domain/src/model/types/shared-types'

export type { GameStatus, Direction, Player, GameLogEntry, AvailableGame, PlayerHand }

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
  gameLog: GameLogEntry[]
}

export interface GameUpdate {
  gameId: string
  eventType: string
  data: string
  timestamp: string
}
