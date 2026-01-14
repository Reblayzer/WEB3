import type { Card, Color } from 'domain/src/model/deck'
import * as Round from 'domain/src/model/round'
import UnoCard from '../components/UnoCard'
import ColorChooser from '../components/ColorChooser'
import type { RootState } from '../lib/store'

type ConnectionHandle = { send: (msg: any) => void; disconnect: () => void }

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

export default function GameView({
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
