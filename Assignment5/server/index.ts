import { WebSocketServer, WebSocket } from 'ws'
import * as Uno from '../src/model/uno'
import * as Round from '../src/model/round'
import { standardRandomizer, standardShuffler } from '../src/utils/random_utils'
import type { Color } from '../src/model/deck'

type ClientMessage =
  | { type: 'play'; index: number; color?: Color }
  | { type: 'draw' }
  | { type: 'say-uno' }
  | { type: 'catch-uno'; accused: number }
  | { type: 'reset'; players?: string[] }

type ServerMessage =
  | { type: 'welcome'; playerIndex: number; game: any }
  | { type: 'state'; game: any }
  | { type: 'error'; message: string }

const PORT = Number(process.env.PORT || 3001)
const DEFAULT_PLAYERS = ['Alice', 'Bob', 'Cara', 'Dan']

type ClientInfo = { socket: WebSocket; playerIndex: number }

let game: Uno.Game = createNewGame(DEFAULT_PLAYERS)
const clients: ClientInfo[] = []

function createNewGame(players: string[]) {
  return Uno.createGame({
    players,
    targetScore: 200,
    randomizer: standardRandomizer,
    shuffler: standardShuffler,
  })
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

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg)
  clients.forEach(c => {
    if (c.socket.readyState === WebSocket.OPEN) {
      c.socket.send(data)
    }
  })
}

function handleMessage(client: ClientInfo, msg: ClientMessage) {
  const round = game.currentRound
  if (!round && msg.type !== 'reset') return

  const player = client.playerIndex
  if (round && round.playerInTurn !== undefined && round.playerInTurn !== player && msg.type !== 'reset') {
    client.socket.send(JSON.stringify({ type: 'error', message: 'Not your turn' }))
    return
  }

  try {
    switch (msg.type) {
      case 'play': {
        game = Uno.play(r => Round.play(msg.index, msg.color, r), game)
        break
      }
      case 'draw': {
        game = Uno.play(Round.draw, game)
        break
      }
      case 'say-uno': {
        game = Uno.play(r => Round.sayUno(player, r), game)
        break
      }
      case 'catch-uno': {
        const accuser = player
        const accused = msg.accused
        game = Uno.play(r => Round.catchUnoFailure({ accuser, accused }, r), game)
        break
      }
      case 'reset': {
        const players = msg.players && msg.players.length >= 2 ? msg.players : DEFAULT_PLAYERS
        game = createNewGame(players)
        break
      }
      default:
        break
    }
    broadcast({ type: 'state', game: sanitizeGame(game) })
  } catch (e: any) {
    client.socket.send(JSON.stringify({ type: 'error', message: e?.message ?? 'Invalid action' }))
  }
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', socket => {
  const playerIndex = clients.length % DEFAULT_PLAYERS.length
  const client: ClientInfo = { socket, playerIndex }
  clients.push(client)

  // send welcome with current state
  socket.send(JSON.stringify({ type: 'welcome', playerIndex, game: sanitizeGame(game) }))

  socket.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString()) as ClientMessage
      handleMessage(client, parsed)
    } catch (e) {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }))
    }
  })

  socket.on('close', () => {
    const idx = clients.indexOf(client)
    if (idx >= 0) clients.splice(idx, 1)
  })
})

console.log(`WebSocket UNO server running on ws://localhost:${PORT}`)
