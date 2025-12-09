'use client'

import { useEffect, useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import type { Color, Card } from 'domain/src/model/deck'
import * as Round from 'domain/src/model/round'
import { connectServerStream, type OutgoingMessage } from '../rx/serverBridge'
import { setDisconnected, setRooms, setPlayerName } from '../features/uno/unoSlice'
import UnoCard from '../components/UnoCard'
import ColorChooser from '../components/ColorChooser'
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
    conn?.send({ type: 'create-room', bots: 0, maxPlayers })
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

type LoginProps = {
  connected: boolean
  name: string
  setName: (v: string) => void
  onLogin: () => void
}

function LoginView({ connected, name, setName, onLogin }: LoginProps) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>UNO Multiplayer</h1>
        <p className="subtitle">Enter your name to start playing</p>
        {!connected && <p className="alert">Connecting to server...</p>}
        <form
          className="login-form"
          onSubmit={e => {
            e.preventDefault()
            if (name.trim()) {
              setName(name.trim())
              onLogin()
            }
          }}
        >
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            type="text"
            placeholder="Enter your name"
            maxLength={20}
            required
            className="player-input"
          />
          <button type="submit" className="login-button" disabled={!name.trim() || !connected}>
            Play UNO
          </button>
        </form>
      </div>
    </div>
  )
}

type LobbyProps = {
  connected: boolean
  rooms: { id: string; players: string[]; awaiting: number }[]
  name: string
  maxPlayers: number
  setMaxPlayers: (n: number) => void
  onCreate: () => void
  onJoin: (roomId: string) => void
}

function LobbyView({ connected, rooms, name, maxPlayers, setMaxPlayers, onCreate, onJoin }: LobbyProps) {
  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>UNO Lobby</h1>
        <div className="player-info">
          <span>
            Welcome, <strong>{name}</strong>!
          </span>
        </div>
      </div>

      <div className="lobby-content">
        <div className="create-game-section">
          <h2>Create New Game</h2>
          <div className="create-game-form">
            <label>
              Maximum Players:
              <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="player-select">
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </label>
            <button onClick={onCreate} className="create-button" disabled={!connected}>
              Create Game
            </button>
            <p className="muted">Create a table and invite friends to fill the seats.</p>
          </div>
        </div>

        <div className="available-games-section">
          <h2>Available Games ({rooms.length})</h2>
          {!connected && <div className="loading">Waiting for connection...</div>}
          {connected && rooms.length === 0 && <div className="no-games">No games available. Create one to start playing!</div>}
          {rooms.length > 0 && (
            <div className="games-list">
              {rooms.map(game => (
                <div key={game.id} className="game-card" onClick={() => onJoin(game.id)}>
                  <div className="game-info">
                    <h3>Game #{game.id.substring(0, 8)}</h3>
                    <p className="game-creator">Players: {game.players.join(', ') || 'Waiting...'}</p>
                    <p className="game-players">Slots left: {game.awaiting}</p>
                  </div>
                  <button className="join-button">Join</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type GameProps = {
  game: RootState['uno']['game']
  round: RootState['uno']['game']['currentRound']
  playerIndex: number | undefined
  currentPlayer: number
  connected: boolean
  canAct: boolean
  onCardClick: (idx: number, card: Card) => void
  conn: ConnectionHandle | null
  leaveRoom: () => void
  directionLabel: string
  showColorChooser: boolean
  onChooseColor: (c: Color) => void
  onCancelColor: () => void
}

function GameView({
  game,
  round,
  playerIndex,
  currentPlayer,
  connected,
  canAct,
  onCardClick,
  conn,
  leaveRoom,
  directionLabel,
  showColorChooser,
  onChooseColor,
  onCancelColor,
}: GameProps) {
  if (!connected) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Reconnecting to the game...</p>
      </div>
    )
  }

  if (!round && game.winner !== undefined) {
    const winnerName = game.players[game.winner] ?? 'Player'
    return (
      <div className="game-over-container">
        <h1>Game Over!</h1>
        <h2>Winner: {winnerName}</h2>
        <div className="final-scores">
          <h3>Final Scores</h3>
          {game.players.map((p, idx) => (
            <div key={p} className="score-entry">
              <span>{p}</span>
              <span>{game.scores[idx]} points</span>
            </div>
          ))}
        </div>
        <div className="actions-row">
          <button className="btn-primary" onClick={() => conn?.send({ type: 'reset' })}>
            New Round
          </button>
        </div>
      </div>
    )
  }

  if (!round) {
    const isCreator = playerIndex === 0
    const canStart = isCreator && game.playerCount >= 2
    return (
      <div className="waiting-container">
        <h2>Waiting for the round to start...</h2>
        <p className="muted">Players in room:</p>
        <div className="players-waiting">
          {game.players.map((p, idx) => (
            <div key={p} className="player-waiting">
              {idx + 1}. {p}
            </div>
          ))}
        </div>
        <div className="actions-row" style={{ marginTop: 16 }}>
          {canStart && (
            <button className="btn-primary" onClick={() => conn?.send({ type: 'start-game' })}>
              Start Game
            </button>
          )}
          <button className="btn-secondary" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      </div>
    )
  }

  const isMyTurn = canAct
  const drawPileCount = round.drawPile.length
  const currentColorHex = colorToHex(round.currentColor)
  const myHandLength = playerIndex !== undefined ? round.hands[playerIndex].length : 0
  const alreadyCalled = playerIndex !== undefined ? round.preUno[playerIndex] === true : false
  const canPlayAny = isMyTurn && playerIndex !== undefined ? Round.canPlayAny(round) : false
  const canCallUno = isMyTurn && myHandLength === 2 && canPlayAny && !alreadyCalled
  const canCatchUno =
    round.unoOpen &&
    !round.unoSaid &&
    round.unoTarget !== undefined &&
    playerIndex !== undefined &&
    playerIndex !== round.unoTarget

  return (
    <div className="game-play-network">
      <div className="game-container">
        <div className="game-header">
          <div className="turn-info">
            {isMyTurn ? <span className="your-turn">YOUR TURN</span> : <span>{round.players[currentPlayer]}'s turn</span>}
          </div>
          <div className="game-stats">
            <span>Direction: {directionLabel}</span>
            <span>Draw Pile: {drawPileCount}</span>
            <span>Score to win: {game.targetScore}</span>
          </div>
        </div>

        <div className="game-board">
          <div className="discard-pile">
            <UnoCard card={round.discardPile[0]} playable />
            <div className="current-color" style={{ backgroundColor: currentColorHex }}>
              Current Color: {round.currentColor}
            </div>
          </div>
          <button className="draw-pile-button" onClick={() => conn?.send({ type: 'draw' })} disabled={!isMyTurn}>
            <div className="card-back">UNO</div>
            Draw Card
          </button>
        </div>

        <div className="players-display">
          {round.players.map((p, idx) => (
            <div
              key={p}
              className={[
                'player-card',
                idx === currentPlayer ? 'active' : '',
                playerIndex !== undefined && idx === playerIndex ? 'current-user' : '',
              ].join(' ')}
            >
              <div className="player-header">
                <strong>{p}</strong>
                {(round.preUno[idx] || (round.unoOpen && round.unoTarget === idx)) && <span className="uno-badge">UNO!</span>}
              </div>
              <div className="player-stats">
                <span>Cards: {round.hands[idx].length}</span>
                <span>Score: {game.scores[idx]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="player-hand">
          <h3>Your Hand ({myHandLength} cards)</h3>
          <div className="hand-cards">
            {playerIndex !== undefined ? (
              round.hands[playerIndex].map((card, cardIdx) => {
                const playable = isMyTurn && Round.canPlay(cardIdx, round)
                return (
                  <div
                    key={`${cardIdx}-${card.type}-${(card as any).color ?? ''}`}
                    className={['hand-card', playable ? 'playable' : '', !isMyTurn ? 'disabled' : ''].join(' ')}
                    onClick={() => playable && isMyTurn && onCardClick(cardIdx, card)}
                  >
                    <UnoCard card={card} playable={playable} disabled={!isMyTurn} />
                  </div>
                )
              })
            ) : (
              <span className="muted">Join a room to see your hand</span>
            )}
          </div>

          <div className="hand-actions">
            {canCallUno && (
              <button className="uno-button" onClick={() => conn?.send({ type: 'say-uno' })}>
                Call UNO!
              </button>
            )}
            {canCatchUno && (
              <button className="catch-button" onClick={() => conn?.send({ type: 'catch-uno', accused: round.unoTarget! })}>
                Catch UNO Failure
              </button>
            )}
          </div>
        </div>
      </div>
      {showColorChooser && <ColorChooser onChooseColor={onChooseColor} onCancel={onCancelColor} />}
    </div>
  )
}

const colorToHex = (color: Color) => {
  switch (color) {
    case 'RED':
      return '#e74c3c'
    case 'BLUE':
      return '#3498db'
    case 'GREEN':
      return '#2ecc71'
    case 'YELLOW':
      return '#f1c40f'
    default:
      return '#95a5a6'
  }
}
