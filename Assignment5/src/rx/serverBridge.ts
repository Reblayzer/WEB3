import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import type { AppDispatch } from '../store'
import { setGame, setPlayerIndex } from '../features/uno/unoSlice'
import type { Color } from '../model/deck'

export type OutgoingMessage =
  | { type: 'play'; index: number; color?: Color }
  | { type: 'draw' }
  | { type: 'say-uno' }
  | { type: 'catch-uno'; accused: number }
  | { type: 'reset'; players?: string[] }

type IncomingMessage =
  | { type: 'welcome'; playerIndex: number; game: any }
  | { type: 'state'; game: any }
  | { type: 'error'; message: string }

export type Connection = {
  send: (msg: OutgoingMessage) => void
  disconnect: () => void
}

export function connectServerStream(dispatch: AppDispatch, url = 'ws://localhost:3001'): Connection {
  const socket$: WebSocketSubject<IncomingMessage | OutgoingMessage> = webSocket(url)

  const subscription = socket$.subscribe({
    next: msg => {
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return
      switch (msg.type) {
        case 'welcome':
          dispatch(setPlayerIndex(msg.playerIndex))
          dispatch(setGame(msg.game))
          break
        case 'state':
          dispatch(setGame(msg.game))
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
    },
  })

  return {
    send: (msg: OutgoingMessage) => socket$.next(msg),
    disconnect: () => {
      subscription.unsubscribe()
      socket$.complete()
    },
  }
}
