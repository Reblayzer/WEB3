// Card utility functions

import type { Card, Color, Numbered } from './types/card-types'

export const hasColor = (c: Card, color: Color) => 'color' in c && c.color === color
export const hasNumber = (c: Card, n: Numbered) => c.type === 'NUMBERED' && c.number === n
