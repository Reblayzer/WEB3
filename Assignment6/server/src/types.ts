import type { WebSocket } from 'ws'
import type * as Uno from 'domain/src/model/uno'

export type Room = {
  id: string
  game: Uno.Game
  sockets: ClientInfo[]
  maxPlayers: number
  creatorId: string
}

export type ClientInfo = {
  id: string
  socket: WebSocket
  name: string
  roomId?: string
}

export const PORT = Number(process.env.PORT || 3001)
export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 2
