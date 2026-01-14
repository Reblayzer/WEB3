import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { useGameState } from '../hooks/useGameState'
import GamePlayView from './GamePlay'
import GameWaitingView from './GameWaiting'
import GameOverView from './GameOver'

/**
 * Game state router
 * Routes to appropriate game view based on game state:
 * - Reconnecting: Loading state
 * - Waiting: Waiting for game to start
 * - Playing: Active gameplay
 * - Game Over: Show winner and scores
 */
export default function GameRouter() {
  const { connected, roomId, round } = useGameState()
  const { game } = useSelector((state: RootState) => state.uno)
  const isGameOver = !round && game.winner !== undefined
  const isWaiting = !round && game.winner === undefined

  // Reconnecting/not connected
  if (!connected) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Reconnecting to the game...</p>
      </div>
    )
  }

  // Game over
  if (isGameOver) {
    return <GameOverView />
  }

  // Waiting for game to start
  if (isWaiting && roomId) {
    return <GameWaitingView />
  }

  // Active gameplay
  if (round && roomId) {
    return <GamePlayView />
  }

  // No room selected
  return (
    <div className="error-container">
      <p>No active game. Return to the lobby to join or create a game.</p>
    </div>
  )
}
