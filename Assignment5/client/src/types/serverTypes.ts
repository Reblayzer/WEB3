import type { IncomingMessage, OutgoingMessage, RoomSummary, Color } from 'domain/src/types/messages'

export type ServerConnection = {
  send: (msg: OutgoingMessage) => void
  disconnect: () => void
  isConnected: boolean
}

export type { IncomingMessage, OutgoingMessage, RoomSummary, Color }
