type PlayerCardProps = {
  name: string
  handSize: number
  score: number
  isActive: boolean
  isCurrentUser: boolean
  hasUno: boolean
}

/**
 * Reusable player status card
 */
export default function PlayerCard({
  name,
  handSize,
  score,
  isActive,
  isCurrentUser,
  hasUno,
}: PlayerCardProps) {
  return (
    <div
      className={[
        'player-card',
        isActive ? 'active' : '',
        isCurrentUser ? 'current-user' : '',
      ].join(' ')}
    >
      <div className="player-header">
        <strong>{name}</strong>
        {hasUno && <span className="uno-badge">UNO!</span>}
      </div>
      <div className="player-stats">
        <span>Cards: {handSize}</span>
        <span>Score: {score}</span>
      </div>
    </div>
  )
}
