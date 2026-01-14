'use client'

import { useEffect, useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import type { Color, Card } from 'domain/src/model/deck'
import { connectServerStream, type OutgoingMessage } from '../rx/serverBridge'
import { setDisconnected, setRooms, setPlayerName } from '../features/uno/unoSlice'
import LoginView from '../components/views/LoginView'
import LobbyView from '../components/views/LobbyView'
import GameView from '../components/views/GameView'
import { store, type RootState, type AppDispatch } from '../lib/store'

type ConnectionHandle = { send: (msg: OutgoingMessage) => void; disconnect: () => void }

export default function Page() {
  return (
    <Provider store={store}>
      <ClientPage />
    </Provider>
  )
}

function ClientPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { game, playerIndex, connected, rooms, roomId, playerName } = useSelector((state: RootState) => state.uno)
  const round = game.currentRound
  const [conn, setConn] = useState<ConnectionHandle | null>(null)
  const [inputName, setInputName] = useState<string>(playerName ?? '')
  const [loggedIn, setLoggedIn] = useState<boolean>(Boolean(playerName))
  const [pendingWildIndex, setPendingWildIndex] = useState<number | null>(null)
  const [showColorChooser, setShowColorChooser] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState<number>(4)

  useEffect(() => {
    const connection = connectServerStream(dispatch)
    setConn(connection)
    return () => {
      connection.disconnect()
      dispatch(setDisconnected())
    }
  }, [dispatch])

  useEffect(() => {
    if (conn && loggedIn && inputName.trim()) {
      const trimmed = inputName.trim()
      conn.send({ type: 'set-name', name: trimmed })
      dispatch(setPlayerName(trimmed))
    }
  }, [conn, inputName, loggedIn, dispatch])

  // Auto-reconnect if the server goes down and comes back
  useEffect(() => {
    if (connected) return
    const retry = setTimeout(() => {
      setConn(prev => {
        prev?.disconnect()
        return connectServerStream(dispatch)
      })
    }, 2000)
    return () => clearTimeout(retry)
  }, [connected, dispatch])

  const currentPlayer = round?.playerInTurn ?? -1
  const canAct = Boolean(connected && roomId && playerIndex !== undefined && playerIndex === currentPlayer)

  const myName = useMemo(() => {
    if (playerIndex === undefined || !round) return ''
    return round.players[playerIndex]
  }, [round, playerIndex])

  const handleCardClick = (index: number, card: Card) => {
    if (!round || !canAct) return
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      setPendingWildIndex(index)
      setShowColorChooser(true)
      return
    }
    conn?.send({ type: 'play', index })
  }

  const handleWildChosen = (color: Color) => {
    if (pendingWildIndex === null) return
    conn?.send({ type: 'play', index: pendingWildIndex, color })
    setPendingWildIndex(null)
    setShowColorChooser(false)
  }

  const handleLogin = () => {
    const trimmed = inputName.trim()
    if (!trimmed) return
    setInputName(trimmed)
    setLoggedIn(true)
  }

  const leaveRoom = () => {
    conn?.disconnect()
    dispatch(setDisconnected())
    dispatch(setRooms([]))
    const c = connectServerStream(dispatch)
    setConn(c)
  }

  const handleCreateRoom = () => {
    const n = (playerName || inputName).trim()
    if (!n) return
    conn?.send({ type: 'create-room', maxPlayers })
  }

  const handleJoinRoom = (room: string) => {
    conn?.send({ type: 'join-room', roomId: room })
  }

  const directionLabel =
    round?.currentDirection === 'clockwise' ? 'Clockwise' : round?.currentDirection === 'counterclockwise' ? 'Counter-clockwise' : 'Unknown'

  const view = !loggedIn ? 'login' : roomId ? 'play' : 'lobby'

  return (
    <div id="app">
      <header className="app-header">
        <h1>UNO Multiplayer</h1>
        <p className="player-info">
          {connected ? (
            <>
              Connected{myName ? ` as ${myName}` : ''} {roomId ? `(Room: ${roomId})` : ''}
            </>
          ) : (
            'Connecting to game server...'
          )}
        </p>
      </header>

      <main className="app-main">
        {view === 'login' && <LoginView connected={connected} name={inputName} setName={setInputName} onLogin={handleLogin} />}
        {view === 'lobby' && (
          <LobbyView
            connected={connected}
            rooms={rooms}
            name={playerName || inputName}
            maxPlayers={maxPlayers}
            setMaxPlayers={setMaxPlayers}
            onCreate={handleCreateRoom}
            onJoin={handleJoinRoom}
          />
        )}
        {view === 'play' && (
          <GameView
            game={game}
            round={round}
            playerIndex={playerIndex}
            currentPlayer={currentPlayer}
            connected={connected}
            canAct={canAct}
            onCardClick={handleCardClick}
            conn={conn}
            leaveRoom={leaveRoom}
            directionLabel={directionLabel}
            showColorChooser={showColorChooser}
            onChooseColor={handleWildChosen}
            onCancelColor={() => {
              setShowColorChooser(false)
              setPendingWildIndex(null)
            }}
          />
        )}
      </main>
    </div>
  )
}
