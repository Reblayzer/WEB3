type LobbyProps = {
  connected: boolean
  rooms: { id: string; players: string[]; awaiting: number }[]
  name: string
  maxPlayers: number
  setMaxPlayers: (n: number) => void
  onCreate: () => void
  onJoin: (roomId: string) => void
}

export default function LobbyView({ connected, rooms, name, maxPlayers, setMaxPlayers, onCreate, onJoin }: LobbyProps) {
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
