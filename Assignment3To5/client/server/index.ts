import { WebSocketServer, WebSocket } from 'ws'
import * as Uno from '../src/model/uno.ts'
import * as Round from '../src/model/round.ts'
import { standardRandomizer, standardShuffler } from '../src/utils/random_utils.ts'
import type { Color } from '../src/model/deck.ts'

type ClientMessage =
  | { type: 'set-name'; name: string }
  | { type: 'create-room'; maxPlayers?: number }
  | { type: 'join-room'; roomId: string }
  | { type: 'start-game' }
  | { type: 'play'; index: number; color?: Color }
  | { type: 'draw' }
  | { type: 'say-uno' }
  | { type: 'catch-uno'; accused: number }
  | { type: 'reset' }

type ServerMessage =
  | { type: 'welcome'; clientId: string }
  | { type: 'room-list'; rooms: RoomSummary[] }
  | { type: 'state'; roomId: string; game: any; playerIndex: number }
  | { type: 'error'; message: string }

type RoomSummary = { id: string; players: string[]; awaiting: number }

type Room = {
  id: string
  game: Uno.Game
  sockets: ClientInfo[]
  maxPlayers: number
  creatorId: string
}

type ClientInfo = {
  id: string
  socket: WebSocket
  name: string
  roomId?: string
}

const PORT = Number(process.env.PORT || 3001)
const MAX_PLAYERS = 4
const MIN_PLAYERS = 2

const clients = new Map<string, ClientInfo>()
const rooms = new Map<string, Room>()

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

const sanitizeGame = (g: Uno.Game) => {
  const { randomizer, shuffler, currentRound, ...rest } = g as any
  const cleanRound = currentRound
    ? {
        ...currentRound,
        shuffler: undefined,
        randomizer: undefined,
      }
    : undefined
  return { ...rest, currentRound: cleanRound }
}

const broadcastRoom = (room: Room) => {
  const { id, game } = room
  room.sockets.forEach((c, idx) => {
    if (c.socket.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = { type: 'state', roomId: id, game: sanitizeGame(game), playerIndex: idx }
      c.socket.send(JSON.stringify(msg))
    }
  })
}

const broadcastRoomsList = () => {
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

const createGame = (players: string[]) =>
  Uno.createGame({
    players,
    targetScore: 200,
    randomizer: standardRandomizer,
    shuffler: standardShuffler,
  })

const waitingGame = (players: string[]): Uno.Game => ({
  players: [...players],
  playerCount: players.length,
  targetScore: 200,
  scores: Array(players.length).fill(0),
  winner: undefined,
  currentRound: undefined,
  randomizer: standardRandomizer,
  shuffler: standardShuffler,
  cardsPerPlayer: 7,
  completedRounds: 0,
})

const startGame = (room: Room) => {
  const humanNames = room.sockets.map(c => c.name || 'Player')
  room.game = createGame(humanNames)
}

const createRoom = (creator: ClientInfo, maxPlayers: number) => {
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
  rooms.set(id, room)
  broadcastRoomsList()
  broadcastRoom(room)
}

const joinRoom = (client: ClientInfo, roomId: string) => {
  const room = rooms.get(roomId)
  if (!room) {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Room not found' } satisfies ServerMessage))
    return
  }
  if (room.sockets.length >= room.maxPlayers || room.game.winner !== undefined) {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Room full or finished' } satisfies ServerMessage))
    return
  }
  room.sockets.push(client)
  client.roomId = roomId
  room.game = waitingGame(room.sockets.map(c => c.name || 'Player'))
  broadcastRoomsList()
  broadcastRoom(room)
}

const handleAction = (client: ClientInfo, msg: ClientMessage) => {
  const roomId = client.roomId
  if (!roomId) {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Join or create a room first' } satisfies ServerMessage))
    return
  }
  const room = rooms.get(roomId)
  if (!room) return

  const playerIdx = room.sockets.indexOf(client)
  if (playerIdx === -1) return

  const round = room.game.currentRound

  // Ensure turn
  if (round && round.playerInTurn !== undefined && round.playerInTurn !== playerIdx && msg.type !== 'reset') {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Not your turn' } satisfies ServerMessage))
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
        room.game = Uno.play(r => Round.catchUnoFailure({ accuser: playerIdx, accused: msg.accused }, r), room.game)
        break
      case 'reset': {
        const humanNames = room.sockets.map(c => c.name || 'Player')
        room.game = createGame(humanNames)
        break
      }
      default:
        break
    }
    broadcastRoom(room)
  } catch (e: any) {
    client.socket.send(JSON.stringify({ type: 'error', message: e?.message ?? 'Invalid action' } satisfies ServerMessage))
  }
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', socket => {
  const clientId = newId('c')
  const client: ClientInfo = { id: clientId, socket, name: 'Player' }
  clients.set(clientId, client)

  socket.send(JSON.stringify({ type: 'welcome', clientId } satisfies ServerMessage))
  broadcastRoomsList()

  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      return
    }
    try {
      const text = typeof data === 'string' ? data : (data as Buffer).toString()
      const parsed = JSON.parse(text) as ClientMessage
      switch (parsed.type) {
        case 'set-name':
          client.name = parsed.name || 'Player'
          broadcastRoomsList()
          if (client.roomId) {
            const room = rooms.get(client.roomId)
            if (room) {
              const humanNames = room.sockets.map(c => c.name || 'Player')
              room.game = waitingGame(humanNames)
              broadcastRoom(room)
            }
          }
          break
        case 'create-room':
          createRoom(client, Math.max(MIN_PLAYERS, Math.min(parsed.maxPlayers ?? MAX_PLAYERS, MAX_PLAYERS)))
          break
        case 'join-room':
          joinRoom(client, parsed.roomId)
          break
        case 'start-game': {
          if (!client.roomId) break
          const room = rooms.get(client.roomId)
          if (!room) break
          if (room.creatorId !== client.id) {
            client.socket.send(JSON.stringify({ type: 'error', message: 'Only the creator can start the game' } satisfies ServerMessage))
            break
          }
          if (room.sockets.length < MIN_PLAYERS) {
            client.socket.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start' } satisfies ServerMessage))
            break
          }
          startGame(room)
          broadcastRoom(room)
          break
        }
        default:
          handleAction(client, parsed)
          break
      }
    } catch (err) {
      console.warn('Invalid message received', err)
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' } satisfies ServerMessage))
    }
  })

  socket.on('close', () => {
    const roomId = client.roomId
    clients.delete(clientId)
    if (roomId) {
      const room = rooms.get(roomId)
      if (room) {
        room.sockets = room.sockets.filter(c => c !== client)
        if (room.sockets.length === 0) {
          rooms.delete(roomId)
        } else {
          const humanNames = room.sockets.map(c => c.name || 'Player')
          room.game = waitingGame(humanNames)
          broadcastRoom(room)
        }
      }
    }
    broadcastRoomsList()
  })
})

console.log(`WebSocket UNO server running on ws://localhost:${PORT}`)
