import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../store'
import { connectServerStream } from '../rx/serverBridge'
import type { ServerConnection, OutgoingMessage } from '../types/serverTypes'
import { setDisconnected, setPlayerName } from '../features/uno/unoSlice'

const DEFAULT_WS_URL = 'ws://localhost:3001'
const RECONNECT_DELAY_MS = 2000

/**
 * Custom hook for managing server WebSocket connection
 * Handles connection lifecycle, auto-reconnect, and message sending
 * 
 * @returns Connection object with send/disconnect methods and connection state
 */
export function useServerConnection() {
  const dispatch = useDispatch<AppDispatch>()
  const [connection, setConnection] = useState<ServerConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize connection
  useEffect(() => {
    const conn = connectServerStream(dispatch, DEFAULT_WS_URL)
    setConnection(conn)
    setIsConnected(true)

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      conn.disconnect()
      dispatch(setDisconnected())
    }
  }, [dispatch])

  // Auto-reconnect logic
  useEffect(() => {
    if (connection?.isConnected) {
      setIsConnected(true)
      return
    }

    setIsConnected(false)

    reconnectTimeoutRef.current = setTimeout(() => {
      connection?.disconnect()
      const newConn = connectServerStream(dispatch, DEFAULT_WS_URL)
      setConnection(newConn)
    }, RECONNECT_DELAY_MS)

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connection?.isConnected, dispatch])

  const send = useCallback(
    (message: OutgoingMessage) => {
      if (!connection) {
        console.warn('Attempted to send message with no active connection')
        return
      }
      connection.send(message)
    },
    [connection]
  )

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    connection?.disconnect()
    dispatch(setDisconnected())
    setIsConnected(false)
  }, [connection, dispatch])

  const reconnect = useCallback(() => {
    disconnect()
    const newConn = connectServerStream(dispatch, DEFAULT_WS_URL)
    setConnection(newConn)
    setIsConnected(true)
  }, [disconnect, dispatch])

  const setName = useCallback(
    (name: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) return

      send({ type: 'set-name', name: trimmedName })
      dispatch(setPlayerName(trimmedName))
    },
    [send, dispatch]
  )

  return {
    send,
    disconnect,
    reconnect,
    isConnected,
    setName,
  }
}
