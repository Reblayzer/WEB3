import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import type { AppDispatch } from '../lib/store'
import { setGame, setPlayerIndex, setRoomId, setRooms, setConnected, setPlayerName } from '../features/uno/unoSlice'
import type { ClientMessage, ServerMessage } from 'domain/src/types/messages'
import * as Uno from 'domain/src/model/uno'

export type OutgoingMessage = ClientMessage
export type IncomingMessage = ServerMessage

export type Connection = {
  send: (msg: OutgoingMessage) => void
  disconnect: () => void
}

const sanitizeGame = (game: any): Uno.Game => {
  const { randomizer, shuffler, currentRound, ...rest } = game ?? {}
  const cleanRound = currentRound
    ? {
        ...currentRound,
        randomizer: undefined,
        shuffler: undefined,
      }
    : undefined
  return { ...(rest as Uno.Game), currentRound: cleanRound }
}

export function connectServerStream(dispatch: AppDispatch, url = 'ws://localhost:3001'): Connection {
  const socket$: WebSocketSubject<IncomingMessage | OutgoingMessage> = webSocket(url)

  const subscription = socket$.subscribe({
    next: msg => {
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return
      switch (msg.type) {
        case 'welcome':
          dispatch(setConnected(true))
          break
        case 'room-list':
          dispatch(setRooms(msg.rooms))
          break
        case 'state':
          dispatch(setRoomId(msg.roomId))
          dispatch(setPlayerIndex(msg.playerIndex))
          dispatch(setGame(sanitizeGame(msg.game)))
          break
        case 'error':
          console.warn('Server error:', msg.message)
          break
        default:
          break
      }
    },
    error: err => {
      console.error('WebSocket error', err)
      dispatch(setConnected(false))
    },
    complete: () => dispatch(setConnected(false))
  })

  return {
    send: (msg: OutgoingMessage) => socket$.next(msg),
    disconnect: () => {
      subscription.unsubscribe()
      socket$.complete()
      dispatch(setConnected(false))
      dispatch(setRoomId(undefined))
      dispatch(setPlayerIndex(undefined))
      dispatch(setRooms([]))
      dispatch(setPlayerName(undefined))
    },
  }
}
