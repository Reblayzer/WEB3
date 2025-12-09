import { WebSocketServer, WebSocket } from 'ws'
import * as Uno from '../src/model/uno.ts'
import * as Round from '../src/model/round.ts'
import { standardRandomizer, standardShuffler } from '../src/utils/random_utils.ts'
import type { Color } from '../src/model/deck.ts'

type ClientMessage =
  | { type: 'set-name'; name: string }
  | { type: 'create-room'; bots?: number }
  | { type: 'join-room'; roomId: string }
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
  bots: number
}

type ClientInfo = {
  id: string
  socket: WebSocket
  name: string
  roomId?: string
}

const PORT = Number(process.env.PORT || 3001)
const MAX_PLAYERS = 4

const clients = new Map<string, ClientInfo>()
const rooms = new Map<string, Room>()

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeGame(g: Uno.Game) {
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

function broadcastRoom(room: Room) {
  const { id, game } = room
  room.sockets.forEach((c, idx) => {
    if (c.socket.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = { type: 'state', roomId: id, game: sanitizeGame(game), playerIndex: idx }
      c.socket.send(JSON.stringify(msg))
    }
  })
}

function broadcastRoomsList() {
  const list: RoomSummary[] = Array.from(rooms.values()).map(r => ({
    id: r.id,
    players: r.sockets.map(c => c.name || 'Unknown'),
    awaiting: MAX_PLAYERS - r.sockets.length,
  }))
  const msg = JSON.stringify({ type: 'room-list', rooms: list } satisfies ServerMessage)
  clients.forEach(c => {
    if (c.socket.readyState === WebSocket.OPEN) c.socket.send(msg)
  })
}

function createGame(players: string[]) {
  return Uno.createGame({
    players,
    targetScore: 200,
    randomizer: standardRandomizer,
    shuffler: standardShuffler,
  })
}

function createRoom(creator: ClientInfo, bots: number) {
  const id = newId('room')
  const playerNames = [creator.name || 'Player', ...Array.from({ length: bots }, (_, i) => `Bot ${i + 1}`)]
  const game = createGame(playerNames)
  const room: Room = {
    id,
    game,
    sockets: [creator],
    bots,
  }
  creator.roomId = id
  rooms.set(id, room)
  broadcastRoomsList()
  broadcastRoom(room)
}

function joinRoom(client: ClientInfo, roomId: string) {
  const room = rooms.get(roomId)
  if (!room) {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Room not found' } satisfies ServerMessage))
    return
  }
  if (room.sockets.length >= MAX_PLAYERS || room.game.winner !== undefined) {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Room full or finished' } satisfies ServerMessage))
    return
  }
  room.sockets.push(client)
  client.roomId = roomId
  // rebuild game with new player name list but same ordering (humans first then bots)
  const humanNames = room.sockets.map(c => c.name || 'Player')
  const botNames = Array.from({ length: room.bots }, (_, i) => `Bot ${i + 1}`)
  const players = [...humanNames, ...botNames]
  // start fresh game when a new player joins
  room.game = createGame(players)
  broadcastRoomsList()
  broadcastRoom(room)
}

function handleAction(client: ClientInfo, msg: ClientMessage) {
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
        const botNames = Array.from({ length: room.bots }, (_, i) => `Bot ${i + 1}`)
        room.game = createGame([...humanNames, ...botNames])
        break
      }
      default:
        break
    }
    runBots(room)
    broadcastRoom(room)
  } catch (e: any) {
    client.socket.send(JSON.stringify({ type: 'error', message: e?.message ?? 'Invalid action' } satisfies ServerMessage))
  }
}

function runBots(room: Room) {
  let guard = 0
  while (room.game.currentRound && room.game.currentRound.playerInTurn !== undefined) {
    const p = room.game.currentRound.playerInTurn
    if (p >= room.sockets.length) {
      // bot turn
      const round = room.game.currentRound
      if (!round) break
      const hand = round.hands[p]
      const playableIdx = hand.findIndex((_, idx) => Round.canPlay(idx, round))
      if (playableIdx >= 0) {
        room.game = Uno.play(r => Round.play(playableIdx, pickColor(hand[playableIdx], r), r), room.game)
      } else {
        room.game = Uno.play(Round.draw, room.game)
      }
      guard++
    } else {
      break
    }
    if (guard > 50) break
  }
}

function pickColor(card: CardLike, round: Round.Round) {
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    // pick color with most in hand
    const hand = round.hands[round.playerInTurn!]
    const colorCounts = hand.reduce<Record<string, number>>((acc, c: any) => {
      if ('color' in c) acc[c.color] = (acc[c.color] || 0) + 1
      return acc
    }, {})
    const best = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return (best ?? 'BLUE') as Color
  }
  if ('color' in card) return card.color
  return round.currentColor
}

type CardLike = { type: string; color?: Color }

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', socket => {
  const clientId = newId('c')
  const client: ClientInfo = { id: clientId, socket, name: 'Player' }
  clients.set(clientId, client)

  socket.send(JSON.stringify({ type: 'welcome', clientId } satisfies ServerMessage))
  broadcastRoomsList()

  socket.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString()) as ClientMessage
      switch (parsed.type) {
        case 'set-name':
          client.name = parsed.name || 'Player'
          broadcastRoomsList()
          break
        case 'create-room':
          createRoom(client, Math.max(0, Math.min(parsed.bots ?? 0, MAX_PLAYERS - 1)))
          break
        case 'join-room':
          joinRoom(client, parsed.roomId)
          break
        default:
          handleAction(client, parsed)
          break
      }
    } catch {
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
          // rebuild names without this player
          const humanNames = room.sockets.map(c => c.name || 'Player')
          const botNames = Array.from({ length: room.bots }, (_, i) => `Bot ${i + 1}`)
          room.game = createGame([...humanNames, ...botNames])
          broadcastRoom(room)
        }
      }
    }
    broadcastRoomsList()
  })
})

console.log(`WebSocket UNO server running on ws://localhost:${PORT}`)
