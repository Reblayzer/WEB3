import { WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from 'domain/src/types/messages'
import type { ClientInfo } from './types'
import { PORT } from './types'
import { newId } from './utils'
import { RoomManager } from './roomManager'
import { MessageHandler } from './messageHandler'
import { broadcastRoomsList } from './broadcast'

const roomManager = new RoomManager()
const messageHandler = new MessageHandler(roomManager)

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', socket => {
  const clientId = newId('c')
  const client: ClientInfo = { id: clientId, socket, name: 'Player' }
  roomManager.addClient(client)

  socket.send(JSON.stringify({ type: 'welcome', clientId } satisfies ServerMessage))
  broadcastRoomsList(roomManager.getRooms(), roomManager.getClients())

  socket.on('message', (data, isBinary) => {
    if (isBinary) return

    try {
      const text = typeof data === 'string' ? data : (data as Buffer).toString()
      const parsed = JSON.parse(text) as ClientMessage
      messageHandler.handleMessage(client, parsed)
    } catch (err) {
      console.warn('Invalid message received', err)
      socket.send(
        JSON.stringify({ type: 'error', message: 'Invalid message' } satisfies ServerMessage)
      )
    }
  })

  socket.on('close', () => {
    roomManager.removeClientFromRoom(client)
    roomManager.removeClient(clientId)
    broadcastRoomsList(roomManager.getRooms(), roomManager.getClients())
  })
})

console.log(`WebSocket UNO server running on ws://localhost:${PORT}`)
