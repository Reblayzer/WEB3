import * as Uno from 'domain/src/model/uno'
import * as Round from 'domain/src/model/round'
import type { ClientMessage, ServerMessage } from 'domain/src/types/messages'
import type { ClientInfo } from './types'
import { MIN_PLAYERS } from './types'
import type { RoomManager } from './roomManager'
import { broadcastRoom, broadcastRoomsList } from './broadcast'

export class MessageHandler {
  constructor(private roomManager: RoomManager) {}

  handleMessage(client: ClientInfo, parsed: ClientMessage): void {
    switch (parsed.type) {
      case 'set-name':
        this.roomManager.updateClientName(client, parsed.name)
        break
      case 'create-room':
        this.roomManager.createRoom(
          client,
          Math.max(MIN_PLAYERS, Math.min(parsed.maxPlayers ?? 4, 4))
        )
        break
      case 'join-room':
        this.roomManager.joinRoom(client, parsed.roomId)
        break
      case 'start-game':
        this.handleStartGame(client)
        break
      default:
        this.handleGameAction(client, parsed)
        break
    }
  }

  private handleStartGame(client: ClientInfo): void {
    if (!client.roomId) return

    const room = this.roomManager.getRoom(client.roomId)
    if (!room) return

    if (room.creatorId !== client.id) {
      client.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Only the creator can start the game',
        } satisfies ServerMessage)
      )
      return
    }

    if (room.sockets.length < MIN_PLAYERS) {
      client.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Need at least 2 players to start',
        } satisfies ServerMessage)
      )
      return
    }

    this.roomManager.startGame(room)
    broadcastRoom(room)
  }

  private handleGameAction(client: ClientInfo, msg: ClientMessage): void {
    const roomId = client.roomId
    if (!roomId) {
      client.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Join or create a room first',
        } satisfies ServerMessage)
      )
      return
    }

    const room = this.roomManager.getRoom(roomId)
    if (!room) return

    const playerIdx = room.sockets.indexOf(client)
    if (playerIdx === -1) return

    const round = room.game.currentRound

    // Ensure turn
    if (
      round &&
      round.playerInTurn !== undefined &&
      round.playerInTurn !== playerIdx &&
      msg.type !== 'reset'
    ) {
      client.socket.send(
        JSON.stringify({ type: 'error', message: 'Not your turn' } satisfies ServerMessage)
      )
      return
    }

    try {
      switch (msg.type) {
        case 'play':
          room.game = Uno.play(r => Round.play(msg.index, msg.color, r), room.game)
          break
        case 'draw':
          room.game = Uno.play(Round.draw, room.game)
          break
        case 'say-uno':
          room.game = Uno.play(r => Round.sayUno(playerIdx, r), room.game)
          break
        case 'catch-uno':
          room.game = Uno.play(
            r => Round.catchUnoFailure({ accuser: playerIdx, accused: msg.accused }, r),
            room.game
          )
          break
        case 'reset': {
          const humanNames = room.sockets.map(c => c.name || 'Player')
          room.game = Uno.createGame({
            players: humanNames,
            targetScore: 200,
            randomizer: room.game.randomizer,
            shuffler: room.game.shuffler,
          })
          break
        }
        default:
          break
      }
      broadcastRoom(room)
    } catch (e: any) {
      client.socket.send(
        JSON.stringify({
          type: 'error',
          message: e?.message ?? 'Invalid action',
        } satisfies ServerMessage)
      )
    }
  }
}
