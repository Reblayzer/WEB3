import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Color, Card } from './model/deck'
import type { RootState, AppDispatch } from './store'
import { connectServerStream, type OutgoingMessage } from './rx/serverBridge'
import * as Round from './model/round'
import { setDisconnected } from './features/uno/unoSlice'

const cardLabel = (card: Card) => {
  if (card.type === 'NUMBERED') return `${card.color} ${card.number}`
  if (card.type === 'WILD' || card.type === 'WILD DRAW') return card.type
  return `${card.color} ${card.type}`
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { game, playerIndex, connected } = useSelector((state: RootState) => state.uno)
  const round = game.currentRound
  const [conn, setConn] = useState<{ send: (msg: OutgoingMessage) => void; disconnect: () => void } | null>(null)
  const [wildColor, setWildColor] = useState<Color>('BLUE')

  useEffect(() => {
    const connection = connectServerStream(dispatch)
    setConn(connection)
    return () => {
      connection.disconnect()
      dispatch(setDisconnected())
    }
  }, [dispatch])

  const currentPlayer = round?.playerInTurn ?? -1

  const handlePlay = (index: number, card: Card) => {
    if (!round) return
    const needsColor = card.type === 'WILD' || card.type === 'WILD DRAW'
    conn?.send({ type: 'play', index, color: needsColor ? wildColor : undefined })
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>UNO — Assignment 5</h1>
          <p>React + Redux + RxJS using functional model from Assignment 4</p>
        </div>
        <div className="scoreboard">
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
      </header>

      <section className="round-info">
        {round ? (
          <>
            <div>
              <div>Dealer: {round.players[round.dealer]}</div>
              <div>
                In turn: {round.players[currentPlayer]} ({round.currentDirection})
              </div>
              <div>Current color: {round.currentColor}</div>
              <div>Discard top: {cardLabel(round.discardPile[0])}</div>
              <div>Draw pile: {round.drawPile.length} cards</div>
            </div>
            {round.unoOpen && (
              <div className="alert">
                UNO pending for {round.players[round.unoTarget ?? 0]} ({round.unoSaid ? 'said' : 'not said'})
              </div>
            )}
          </>
        ) : (
          <div className="alert success">
            Round finished {game.winner !== undefined ? `– Winner: ${game.players[game.winner]}` : ''}
          </div>
        )}
      </section>

      <section className="hands">
        {round &&
          round.players.map((p, idx) => (
            <div key={p} className={`hand ${idx === currentPlayer ? 'active' : ''}`}>
              <div className="hand-header">
                <strong>{p}</strong> — {round.hands[idx].length} cards
                {idx === currentPlayer && <span className="badge">Your turn</span>}
              </div>
              <div className="hand-cards">
                {idx === currentPlayer ? (
                  round.hands[idx].map((card, cardIdx) => {
                    const playable = Round.canPlay(cardIdx, round)
                    return (
                      <button
                        key={cardIdx}
                        className="card"
                        disabled={!playable || !connected || playerIndex !== currentPlayer}
                        onClick={() => handlePlay(cardIdx, card)}
                      >
                        {cardLabel(card)}
                      </button>
                    )
                  })
                ) : (
                  <span className="muted">Hidden</span>
                )}
              </div>
            </div>
          ))}
      </section>

      <section className="actions">
        <label>
          Wild color:
          <select value={wildColor} onChange={e => setWildColor(e.target.value as Color)}>
            <option value="BLUE">Blue</option>
            <option value="GREEN">Green</option>
            <option value="RED">Red</option>
            <option value="YELLOW">Yellow</option>
          </select>
        </label>
        <div className="buttons">
          <button onClick={() => conn?.send({ type: 'draw' })} disabled={!round || playerIndex !== currentPlayer}>
            Draw
          </button>
          <button onClick={() => conn?.send({ type: 'say-uno' })} disabled={!round || playerIndex !== currentPlayer}>
            Say UNO
          </button>
          <button
            onClick={() => round && conn?.send({ type: 'catch-uno', accused: round.playerInTurn ?? 0 })}
            disabled={!round}
          >
            Accuse (UNO)
          </button>
          <button onClick={() => conn?.send({ type: 'reset' })}>New Game</button>
        </div>
      </section>

      <section className="actions">
        <h3>Connection</h3>
        <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
        <div>Your player index: {playerIndex !== undefined ? playerIndex : '—'}</div>
      </section>
    </div>
  )
}
