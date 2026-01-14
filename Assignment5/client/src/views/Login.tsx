import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServerConnection } from '../hooks/useServerConnection'

/**
 * Login page - player enters name to start
 */
export default function LoginView() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const { isConnected, send } = useServerConnection()

  const handleLogin = () => {
    if (!name.trim()) return
    send({ type: 'set-name', name: name.trim() })
    navigate('/lobby')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>UNO Multiplayer</h1>
        <p className="subtitle">Enter your name to start playing</p>
        {!isConnected && <p className="alert">Connecting to server...</p>}
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Enter your name"
            maxLength={20}
            required
            className="player-input"
            autoFocus
          />
          <button type="submit" className="login-button" disabled={!name.trim() || !isConnected}>
            Play UNO
          </button>
        </form>
      </div>
    </div>
  )
}
