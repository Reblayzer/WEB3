type GameHeaderProps = {
  isMyTurn: boolean
  currentPlayer: string
  directionLabel: string
  drawPileCount: number
  targetScore: number
}

/**
 * Game header showing turn info and game stats
 */
export default function GameHeader({
  isMyTurn,
  currentPlayer,
  directionLabel,
  drawPileCount,
  targetScore,
}: GameHeaderProps) {
  return (
    <div className="game-header">
      <div className="turn-info">
        {isMyTurn ? (
          <span className="your-turn">YOUR TURN</span>
        ) : (
          <span>{currentPlayer}'s turn</span>
        )}
      </div>
      <div className="game-stats">
        <span>Direction: {directionLabel}</span>
        <span>Draw Pile: {drawPileCount}</span>
        <span>Score to win: {targetScore}</span>
      </div>
    </div>
  )
}
