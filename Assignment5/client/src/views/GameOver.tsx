import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type * as Uno from 'domain/src/model/uno'
import type { RootState } from '../store'
import { useServerConnection } from '../hooks/useServerConnection'

/**
 * Game over view - shows winner and final scores
 */
export default function GameOverView() {
  const navigate = useNavigate()
  const { send } = useServerConnection()
  const { game } = useSelector((state: RootState) => state.uno)

  const winnerName = game.winner !== undefined ? game.players[game.winner] : 'Unknown'

  const handleReset = () => {
    send({ type: 'reset' })
  }

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  return (
    <div className="game-over-container">
      <h1>Game Over!</h1>
      <h2>Winner: {winnerName}</h2>

      <div className="final-scores">
        <h3>Final Scores</h3>
        {Array.from(game.players).map((player: string, idx: number) => (
          <div key={player} className="score-entry">
            <span>{player}</span>
            <span>{game.scores[idx]} points</span>
          </div>
        ))}
      </div>

      <div className="actions-row">
        <button className="btn-primary" onClick={handleReset}>
          New Round
        </button>
        <button className="btn-secondary" onClick={handleBackToLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
