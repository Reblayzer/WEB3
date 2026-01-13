// Card utility functions
import type { Card } from 'domain/model/types/card-types'

/**
 * Check if a card is a wild card (WILD or WILD DRAW)
 */
export const isWildCard = (card: Card | null | undefined): boolean => {
  return card?.type === 'WILD' || card?.type === 'WILD DRAW'
}

/**
 * Format a card for display in logs
 */
export const formatCard = (card: Card | null): string => {
  if (!card) return '?'
  if (card.type === 'NUMBERED') {
    return `${card.color} ${card.number}`
  }
  if (isWildCard(card)) {
    return card.type
  }
  return `${(card as any).color} ${card.type}`
}
