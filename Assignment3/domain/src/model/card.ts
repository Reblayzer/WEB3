// Card utility functions drawn directly from the lecture theory

import type {
  ActionCard,
  Card,
  CardLabel,
  ColoredCard,
  Numbered,
  NumberedCard,
  WildFamily
} from './types/card-types'

export const isNumberedCard = (c: Card): c is NumberedCard => c.type === 'NUMBERED'
export const isActionCard = (c: Card): c is ActionCard =>
  c.type === 'SKIP' || c.type === 'REVERSE' || c.type === 'DRAW'
export const isWildCard = (c: Card): c is WildFamily =>
  c.type === 'WILD' || c.type === 'WILD DRAW'

export const hasColor = (c: Card, color?: ColoredCard['color']): c is ColoredCard =>
  'color' in c && (color === undefined || c.color === color)
export const hasNumber = (c: Card, n?: Numbered): c is NumberedCard =>
  isNumberedCard(c) && (n === undefined || c.number === n)

export const describeCard = (c: Card): CardLabel => {
  if (isNumberedCard(c)) {
    const { color, number } = c
    return `${color} ${number}` as CardLabel
  }
  if (isActionCard(c)) {
    const { color, type } = c
    return `${color} ${type}` as CardLabel
  }
  return `${c.type}` as CardLabel
}
