import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type * as Uno from 'domain/src/model/uno'
import type { RootState } from '../store'
import { useServerConnection } from '../hooks/useServerConnection'

/**
 * Waiting view - players waiting for game to start
 */
export default function GameWaitingView() {
  const navigate = useNavigate()
  const { send, reconnect } = useServerConnection()
  const { game, playerIndex } = useSelector((state: RootState) => state.uno)

  const isCreator = playerIndex === 0
  const canStart = isCreator && game.playerCount >= 2

  const handleStartGame = () => {
    send({ type: 'start-game' })
  }

  const handleLeaveRoom = () => {
    reconnect()
    navigate('/lobby')
  }

  return (
    <div className="waiting-container">
      <h2>Waiting for the round to start...</h2>
      <p className="muted">Players in room:</p>

      <div className="players-waiting">
        {Array.from(game.players).map((player: string, idx: number) => (
          <div key={player} className="player-waiting">
            {idx + 1}. {player}
          </div>
        ))}
      </div>

      <div className="actions-row" style={{ marginTop: 16 }}>
        {canStart && (
          <button className="btn-primary" onClick={handleStartGame}>
            Start Game
          </button>
        )}
        <button className="btn-secondary" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
    </div>
  )
}
