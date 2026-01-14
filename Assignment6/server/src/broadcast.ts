import { WebSocket } from 'ws'
import type { ServerMessage, RoomSummary } from 'domain/src/types/messages'
import type { Room, ClientInfo } from './types'
import { sanitizeGame } from './utils'

export const broadcastRoom = (room: Room): void => {
  const { id, game } = room
  room.sockets.forEach((c, idx) => {
    if (c.socket.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = { 
        type: 'state', 
        roomId: id, 
        game: sanitizeGame(game), 
        playerIndex: idx 
      }
      c.socket.send(JSON.stringify(msg))
    }
  })
}

export const broadcastRoomsList = (
  rooms: Map<string, Room>,
  clients: Map<string, ClientInfo>
): void => {
  const list: RoomSummary[] = Array.from(rooms.values()).map(r => ({
    id: r.id,
    players: r.sockets.map(c => c.name || 'Unknown'),
    awaiting: Math.max(0, r.maxPlayers - r.sockets.length),
  }))
  const msg = JSON.stringify({ type: 'room-list', rooms: list } satisfies ServerMessage)
  clients.forEach(c => {
    if (c.socket.readyState === WebSocket.OPEN) c.socket.send(msg)
  })
}
