import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Color, Card } from './model/deck'
import type { RootState, AppDispatch } from './store'
import { connectServerStream, type OutgoingMessage } from './rx/serverBridge'
import * as Round from './model/round'
import { setDisconnected, setRooms } from './features/uno/unoSlice'
import UnoCard from './components/UnoCard'

const cardLabel = (card: Card) => {
  if (card.type === 'NUMBERED') return `${card.color} ${card.number}`
  if (card.type === 'WILD' || card.type === 'WILD DRAW') return card.type
  return `${card.color} ${card.type}`
}

type ConnectionHandle = { send: (msg: OutgoingMessage) => void; disconnect: () => void }

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { game, playerIndex, connected, rooms, roomId } = useSelector((state: RootState) => state.uno)
  const round = game.currentRound
  const [conn, setConn] = useState<ConnectionHandle | null>(null)
  const [wildColor, setWildColor] = useState<Color>('BLUE')
  const [name, setName] = useState<string>('Player')
  const [bots, setBots] = useState<number>(0)

  useEffect(() => {
    const connection = connectServerStream(dispatch)
    setConn(connection)
    return () => {
      connection.disconnect()
      dispatch(setDisconnected())
    }
  }, [dispatch])

  useEffect(() => {
    if (conn && name.trim()) {
      conn.send({ type: 'set-name', name })
    }
  }, [conn, name])

  const currentPlayer = round?.playerInTurn ?? -1
  const canAct = connected && roomId && playerIndex !== undefined && playerIndex === currentPlayer

  const myName = useMemo(() => {
    if (playerIndex === undefined || !round) return ''
    return round.players[playerIndex]
  }, [round, playerIndex])

  const handlePlay = (index: number, card: Card) => {
    if (!round) return
    const needsColor = card.type === 'WILD' || card.type === 'WILD DRAW'
    conn?.send({ type: 'play', index, color: needsColor ? wildColor : undefined })
  }

  const leaveRoom = () => {
    // simplest: reconnect socket to leave current room
    conn?.disconnect()
    dispatch(setDisconnected())
    dispatch(setRooms([]))
    const c = connectServerStream(dispatch)
    setConn(c)
  }

  const showLobby = !roomId

  return (
    <div id="app">
      <header className="app-header">
        <h1>UNO Game – Assignment 5</h1>
        <p className="player-info">
          {connected ? `Connected${myName ? ` as ${myName}` : ''}` : 'Connecting to game server...'}
        </p>
      </header>

      <main className="app-main">
        {showLobby ? (
          <LobbyView
            connected={connected}
            rooms={rooms}
            name={name}
            bots={bots}
            setName={setName}
            setBots={setBots}
            conn={conn}
          />
        ) : (
          <GameView
            game={game}
            round={round}
            playerIndex={playerIndex}
            currentPlayer={currentPlayer}
            connected={connected}
            canAct={canAct}
            wildColor={wildColor}
            setWildColor={setWildColor}
            handlePlay={handlePlay}
            conn={conn}
            leaveRoom={leaveRoom}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>UNO — Assignment 5 • React + Redux + RxJS • Functional core from Assignment 4 • Rooms & bots</p>
      </footer>
    </div>
  )
}

type LobbyProps = {
  connected: boolean
  rooms: { id: string; players: string[]; awaiting: number }[]
  name: string
  bots: number
  setName: (v: string) => void
  setBots: (n: number) => void
  conn: ConnectionHandle | null
}

function LobbyView({ connected, rooms, name, bots, setName, setBots, conn }: LobbyProps) {
  return (
    <div className="section-grid">
      <div className="card setup-card">
        <h2>Welcome to UNO!</h2>

        <div className="form-group">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            value={name}
            onChange={e => setName(e.target.value)}
            type="text"
            placeholder="Enter your name"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>Number of Bot Players:</label>
          <div className="bot-selector">
            {[0, 1, 2, 3].map(num => (
              <button key={num} onClick={() => setBots(num)} className={`bot-btn ${bots === num ? 'active' : ''}`}>
                {num} Bot{num !== 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={() => conn?.send({ type: 'create-room', bots })}
          disabled={!connected || !name.trim()}
        >
          Create Game
        </button>
      </div>

      <div className="card setup-card">
        <h2>Join a Room</h2>
        <div className="info-box">
          <p>Available Rooms: {rooms.length}</p>
          {rooms.length === 0 && <p className="muted">No rooms available. Create one to start playing!</p>}
        </div>
        <div className="games-list">
          {rooms.map(r => (
            <div key={r.id} className="game-card">
              <div className="game-info">
                <h3>{r.id}</h3>
                <p className="game-creator">Players: {r.players.join(', ')}</p>
                <p className="game-players">Slots left: {r.awaiting}</p>
              </div>
              <button className="join-button" onClick={() => conn?.send({ type: 'join-room', roomId: r.id })}>
                Join
              </button>
            </div>
          ))}
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
  wildColor: Color
  setWildColor: (c: Color) => void
  handlePlay: (idx: number, card: Card) => void
  conn: ConnectionHandle | null
  leaveRoom: () => void
}

function GameView({
  game,
  round,
  playerIndex,
  currentPlayer,
  connected,
  canAct,
  wildColor,
  setWildColor,
  handlePlay,
  conn,
  leaveRoom,
}: GameProps) {
  return (
    <>
      <div className="section-grid">
        <div className="card scoreboard">
          <h3>Scores</h3>
          <ul>
            {game.players.map((p, idx) => (
              <li key={p}>
                <strong>{p}</strong>: {game.scores[idx]}
                {game.winner === idx && <span className="badge">Game Winner</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Round</h3>
          {round ? (
            <div className="round-info">
              <div>Dealer: {round.players[round.dealer]}</div>
              <div>
                Turn: {round.players[currentPlayer]} ({round.currentDirection})
              </div>
              <div>Current color: {round.currentColor}</div>
              <div>Discard top: {cardLabel(round.discardPile[0])}</div>
              <div>Draw pile: {round.drawPile.length} cards</div>
              {round.unoOpen && (
                <div className="alert" style={{ marginTop: '0.5rem' }}>
                  UNO pending for {round.players[round.unoTarget ?? 0]} ({round.unoSaid ? 'said' : 'not said'})
                </div>
              )}
            </div>
          ) : (
            <div className="alert success">Waiting for round...</div>
          )}
        </div>

        <div className="card">
          <h3>Actions</h3>
          <label>
            Wild color:
            <select value={wildColor} onChange={e => setWildColor(e.target.value as Color)} style={{ marginLeft: 8 }}>
              <option value="BLUE">Blue</option>
              <option value="GREEN">Green</option>
              <option value="RED">Red</option>
              <option value="YELLOW">Yellow</option>
            </select>
          </label>
          <div className="actions-row">
            <button className="btn-primary" onClick={() => conn?.send({ type: 'draw' })} disabled={!canAct}>
              Draw
            </button>
            <button className="btn-secondary" onClick={() => conn?.send({ type: 'say-uno' })} disabled={!canAct}>
              Say UNO
            </button>
            <button
              className="btn-danger"
              onClick={() => round && conn?.send({ type: 'catch-uno', accused: round.playerInTurn ?? 0 })}
              disabled={!round}
            >
              Accuse (UNO)
            </button>
            <button className="btn-primary" onClick={() => conn?.send({ type: 'reset' })}>
              New Game
            </button>
            <button className="btn-secondary" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Connection</h3>
          <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
          <div>Your player index: {playerIndex !== undefined ? playerIndex + 1 : '—'}</div>
        </div>
      </div>

      <div className="card">
        <h3>Hands</h3>
        <div className="hands-grid">
          {round &&
            round.players.map((p, idx) => (
              <div key={p} className={`card hand ${idx === currentPlayer ? 'active' : ''}`}>
                <div className="hand-header">
                  <strong>{p}</strong> — {round.hands[idx].length} cards
                  {idx === currentPlayer && <span className="badge">Your turn</span>}
                </div>
                <div className="hand-cards">
                  {idx === currentPlayer ? (
                    round.hands[idx].map((card, cardIdx) => {
                      const playable = Round.canPlay(cardIdx, round)
                      return (
                        <UnoCard
                          key={cardIdx}
                          card={card}
                          playable={playable}
                          disabled={!canAct}
                          onClick={() => handlePlay(cardIdx, card)}
                        />
                      )
                    })
                  ) : (
                    <span className="muted">Hidden</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  )
}
