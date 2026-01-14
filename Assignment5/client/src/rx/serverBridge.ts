import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { filter, tap, catchError, EMPTY } from 'rxjs'
import type { AppDispatch } from '../store'
import {
  setGame,
  setPlayerIndex,
  setRoomId,
  setRooms,
  setConnected,
  setDisconnected,
} from '../features/uno/unoSlice'
import type { IncomingMessage, OutgoingMessage, ServerConnection } from '../types/serverTypes'
import { sanitizeGame } from '../utils/gameUtils'

/**
 * Creates and manages WebSocket connection to game server
 * Uses RxJS operators to handle message filtering and error handling
 * 
 * @param dispatch - Redux dispatch function
 * @param url - WebSocket server URL
 * @returns Connection object with send/disconnect methods
 */
export function connectServerStream(dispatch: AppDispatch, url = 'ws://localhost:3001'): ServerConnection {
  const socket$: WebSocketSubject<IncomingMessage | OutgoingMessage> = webSocket({
    url,
    openObserver: {
      next: () => {
        console.log('WebSocket connection opened')
        dispatch(setConnected(true))
      },
    },
    closeObserver: {
      next: () => {
        console.log('WebSocket connection closed')
        dispatch(setConnected(false))
      },
    },
  })

  // Use RxJS operators to process incoming messages
  const subscription = socket$
    .pipe(
      // Filter out invalid messages
      filter((msg): msg is IncomingMessage => {
        return msg !== null && typeof msg === 'object' && 'type' in msg
      }),
      // Log all incoming messages for debugging
      tap(msg => console.log('Received:', msg)),
      // Handle errors gracefully
      catchError(err => {
        console.error('WebSocket stream error:', err)
        dispatch(setDisconnected())
        return EMPTY
      })
    )
    .subscribe({
      next: handleIncomingMessage(dispatch),
      error: err => {
        console.error('WebSocket error:', err)
        dispatch(setConnected(false))
      },
      complete: () => {
        console.log('WebSocket stream completed')
        dispatch(setConnected(false))
      },
    })

  let connected = true

  return {
    send: (msg: OutgoingMessage) => {
      if (!connected) {
        console.warn('Cannot send message: WebSocket is disconnected')
        return
      }
      socket$.next(msg)
    },
    disconnect: () => {
      connected = false
      subscription.unsubscribe()
      socket$.complete()
      dispatch(setConnected(false))
      dispatch(setRoomId(undefined))
      dispatch(setPlayerIndex(undefined))
      dispatch(setRooms([]))
    },
    get isConnected() {
      return connected
    },
  }
}

/**
 * Creates a message handler function for incoming WebSocket messages
 * Uses Redux dispatch to update application state
 * 
 * @param dispatch - Redux dispatch function
 * @returns Message handler function
 */
function handleIncomingMessage(dispatch: AppDispatch) {
  return (msg: IncomingMessage) => {
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
        console.warn('Unknown message type:', (msg as any).type)
        break
    }
  }
}

