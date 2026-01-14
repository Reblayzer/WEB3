import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { useServerConnection } from '../hooks/useServerConnection'

/**
 * Lobby page - browse and create games
 */
export default function LobbyView() {
  const navigate = useNavigate()
  const [maxPlayers, setMaxPlayers] = useState(4)
  const { isConnected, send } = useServerConnection()
  const { rooms, playerName } = useSelector((state: RootState) => state.uno)

  const handleCreateGame = () => {
    send({ type: 'create-room', bots: 0, maxPlayers })
    navigate('/play')
  }

  const handleJoinGame = (roomId: string) => {
    send({ type: 'join-room', roomId })
    navigate('/play')
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>UNO Lobby</h1>
        <div className="player-info">
          <span>
            Welcome, <strong>{playerName}</strong>!
          </span>
        </div>
      </div>

      <div className="lobby-content">
        <div className="create-game-section">
          <h2>Create New Game</h2>
          <div className="create-game-form">
            <label>
              Maximum Players:
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="player-select"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </label>
            <button onClick={handleCreateGame} className="create-button" disabled={!isConnected}>
              Create Game
            </button>
            <p className="muted">Create a table and invite friends to fill the seats.</p>
          </div>
        </div>

        <div className="available-games-section">
          <h2>Available Games ({rooms?.length || 0})</h2>
          {!isConnected && <div className="loading">Waiting for connection...</div>}
          {isConnected && (!rooms || rooms.length === 0) && (
            <div className="no-games">No games available. Create one to start playing!</div>
          )}
          {rooms && rooms.length > 0 && (
            <div className="games-list">
              {rooms.map((game) => (
                <div
                  key={game.id}
                  className="game-card"
                  onClick={() => handleJoinGame(game.id)}
                >
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
