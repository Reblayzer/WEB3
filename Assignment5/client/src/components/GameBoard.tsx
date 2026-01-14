import type { Card } from 'domain/src/model/deck'
import UnoCard from './UnoCard'

type GameBoardProps = {
  topCard: Card
  currentColor: string
  currentColorHex: string
  isMyTurn: boolean
  onDraw: () => void
}

/**
 * Main game board showing discard and draw piles
 */
export default function GameBoard({
  topCard,
  currentColor,
  currentColorHex,
  isMyTurn,
  onDraw,
}: GameBoardProps) {
  return (
    <div className="game-board">
      <div className="discard-pile">
        <UnoCard card={topCard} playable />
        <div className="current-color" style={{ backgroundColor: currentColorHex }}>
          Current Color: {currentColor}
        </div>
      </div>
      <button className="draw-pile-button" onClick={onDraw} disabled={!isMyTurn}>
        <div className="card-back">UNO</div>
        Draw Card
      </button>
    </div>
  )
}
