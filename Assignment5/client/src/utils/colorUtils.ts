import type { Color } from 'domain/src/model/deck'

/**
 * Convert UNO card color to hex color code
 */
export function colorToHex(color: Color): string {
  switch (color) {
    case 'RED':
      return '#e74c3c'
    case 'BLUE':
      return '#3498db'
    case 'GREEN':
      return '#2ecc71'
    case 'YELLOW':
      return '#f1c40f'
    default:
      return '#95a5a6'
  }
}
