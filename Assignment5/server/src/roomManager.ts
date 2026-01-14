import type { ClientInfo, Room } from './types'
import type { ServerMessage } from 'domain/src/types/messages'
import { MIN_PLAYERS, MAX_PLAYERS } from './types'
import { newId } from './utils'
import { createGame, waitingGame } from './game'
import { broadcastRoom, broadcastRoomsList } from './broadcast'

export class RoomManager {
  private rooms = new Map<string, Room>()
  private clients = new Map<string, ClientInfo>()

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id)
  }

  getRooms(): Map<string, Room> {
    return this.rooms
  }

  getClients(): Map<string, ClientInfo> {
    return this.clients
  }

  addClient(client: ClientInfo): void {
    this.clients.set(client.id, client)
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId)
  }

  createRoom(creator: ClientInfo, maxPlayers: number): void {
    const id = newId('room')
    const clampedMax = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, maxPlayers || MAX_PLAYERS))
    const room: Room = {
      id,
      game: waitingGame([creator.name || 'Player']),
      sockets: [creator],
      maxPlayers: clampedMax,
      creatorId: creator.id,
    }
    creator.roomId = id
    this.rooms.set(id, room)
    broadcastRoomsList(this.rooms, this.clients)
    broadcastRoom(room)
  }

  joinRoom(client: ClientInfo, roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) {
      client.socket.send(
        JSON.stringify({ type: 'error', message: 'Room not found' } satisfies ServerMessage)
      )
      return
    }
    if (room.sockets.length >= room.maxPlayers || room.game.winner !== undefined) {
      client.socket.send(
        JSON.stringify({ type: 'error', message: 'Room full or finished' } satisfies ServerMessage)
      )
      return
    }
    room.sockets.push(client)
    client.roomId = roomId
    room.game = waitingGame(room.sockets.map(c => c.name || 'Player'))
    broadcastRoomsList(this.rooms, this.clients)
    broadcastRoom(room)
  }

  startGame(room: Room): void {
    const humanNames = room.sockets.map(c => c.name || 'Player')
    room.game = createGame(humanNames)
  }

  removeClientFromRoom(client: ClientInfo): void {
    const roomId = client.roomId
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.sockets = room.sockets.filter(c => c !== client)
    if (room.sockets.length === 0) {
      this.rooms.delete(roomId)
    } else {
      const humanNames = room.sockets.map(c => c.name || 'Player')
      room.game = waitingGame(humanNames)
      broadcastRoom(room)
    }
  }

  updateClientName(client: ClientInfo, name: string): void {
    client.name = name || 'Player'
    broadcastRoomsList(this.rooms, this.clients)
    
    if (client.roomId) {
      const room = this.rooms.get(client.roomId)
      if (room) {
        const humanNames = room.sockets.map(c => c.name || 'Player')
        room.game = waitingGame(humanNames)
        broadcastRoom(room)
      }
    }
  }
}
