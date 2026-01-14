import type { Color } from '../model/deck'

// Messages sent FROM client TO server
export type ClientMessage =
  | { type: 'set-name'; name: string }
  | { type: 'create-room'; bots?: number; maxPlayers?: number }
  | { type: 'join-room'; roomId: string }
  | { type: 'start-game' }
  | { type: 'play'; index: number; color?: Color }
  | { type: 'draw' }
  | { type: 'say-uno' }
  | { type: 'catch-uno'; accused: number }
  | { type: 'reset' }

export type RoomSummary = {
  id: string
  players: string[]
  awaiting: number
}

// Messages sent FROM server TO client
export type ServerMessage =
  | { type: 'welcome'; clientId: string }
  | { type: 'room-list'; rooms: RoomSummary[] }
  | { type: 'state'; roomId: string; game: any; playerIndex: number }
  | { type: 'error'; message: string }

// Compatibility aliases used by the client codebase
export type OutgoingMessage = ClientMessage
export type IncomingMessage = ServerMessage

export type { Color }
