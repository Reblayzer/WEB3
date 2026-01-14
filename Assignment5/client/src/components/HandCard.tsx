import type { Card } from 'domain/src/model/deck'
import UnoCard from './UnoCard'

type HandCardProps = {
  card: Card
  index: number
  playable: boolean
  disabled: boolean
  onClick: () => void
}

/**
 * Single card in player's hand
 */
export default function HandCard({
  card,
  index,
  playable,
  disabled,
  onClick,
}: HandCardProps) {
  return (
    <div
      className={['hand-card', playable ? 'playable' : '', disabled ? 'disabled' : ''].join(' ')}
      onClick={onClick}
    >
      <UnoCard card={card} playable={playable} disabled={disabled} />
    </div>
  )
}
