import type * as Uno from 'domain/src/model/uno'

/**
 * Sanitize game object by removing non-serializable functions (randomizer, shuffler)
 * This is needed when receiving game state from the server
 */
export function sanitizeGame(game: any): Uno.Game {
  if (!game) {
    throw new Error('Game object is required')
  }

  const { randomizer, shuffler, currentRound, ...rest } = game

  const cleanRound = currentRound
    ? {
        ...currentRound,
        randomizer: undefined,
        shuffler: undefined,
      }
    : undefined

  return {
    ...(rest as Uno.Game),
    currentRound: cleanRound,
  }
}
