import type * as Uno from 'domain/src/model/uno'

export const newId = (prefix: string): string => 
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`

export const sanitizeGame = (g: Uno.Game): any => {
  const { randomizer, shuffler, currentRound, ...rest } = g as any
  const cleanRound = currentRound
    ? {
        ...currentRound,
        shuffler: undefined,
        randomizer: undefined,
      }
    : undefined
  return { ...rest, currentRound: cleanRound }
}
