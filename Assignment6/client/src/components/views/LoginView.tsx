type LoginProps = {
  connected: boolean
  name: string
  setName: (v: string) => void
  onLogin: () => void
}

export default function LoginView({ connected, name, setName, onLogin }: LoginProps) {
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
