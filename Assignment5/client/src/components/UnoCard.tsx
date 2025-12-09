import React from 'react'
import type { Card, Color } from 'domain/src/model/deck'

type Props = {
  card: Card
  playable?: boolean
  disabled?: boolean
  onClick?: () => void
}

const symbolFor = (card: Card) => {
  switch (card.type) {
    case 'NUMBERED':
      return card.number
    case 'SKIP':
      return '⦸'
    case 'REVERSE':
      return '⟳'
    case 'DRAW':
      return '+2'
    case 'WILD':
      return 'W'
    case 'WILD DRAW':
      return '+4'
    default:
      return card.type
  }
}

const colorClass = (card: Card) => {
  if (card.type === 'WILD' || card.type === 'WILD DRAW') return 'wild-card'
  const c = (card as any).color as Color | undefined
  return c ? `color-${c.toLowerCase()}` : 'color-none'
}

export const UnoCard: React.FC<Props> = ({ card, playable = false, disabled, onClick }) => {
  const classNames = ['uno-card', colorClass(card)]
  if (playable && !disabled) classNames.push('playable')
  if (disabled) classNames.push('disabled')
  return (
    <div className={classNames.join(' ')} onClick={!disabled && playable ? onClick : undefined}>
      <div className="card-content">
        {card.type === 'NUMBERED' ? <div className="card-number">{symbolFor(card)}</div> : <div className="card-symbol">{symbolFor(card)}</div>}
      </div>
    </div>
  )
}

export default UnoCard
