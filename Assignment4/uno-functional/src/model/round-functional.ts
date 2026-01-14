// Curried and composed functional API for UNO Round operations
// Demonstrates: currying, partial application, function composition, point-free style

import type { Round } from './round'
import type { Color, Card } from './deck'
import {
  canPlay as canPlayUncurried,
  play as playUncurried,
  sayUno as sayUnoUncurried,
  catchUnoFailure as catchUnoFailureUncurried,
  hasCalledUno as hasCalledUnoUncurried,
  draw,
  canPlayAny,
  hasEnded,
  winner,
  score,
  topOfDiscard
} from './round'
import { curry2, curry3, pipe, Maybe } from '../utils/functional'

/**
 * CURRIED VERSIONS OF ROUND OPERATIONS
 * 
 * These functions demonstrate currying - each takes one parameter at a time
 * This enables partial application and function composition
 */

// canPlay :: number -> Round -> boolean
export const canPlay = curry2(canPlayUncurried)

// sayUno :: number -> Round -> Round
export const sayUno = curry2(sayUnoUncurried)

// hasCalledUno :: number -> Round -> boolean
export const hasCalledUno = curry2(hasCalledUnoUncurried)

// play :: number -> Color | undefined -> Round -> Round
export const play = curry3(playUncurried)

// catchUnoFailure :: { accuser, accused } -> Round -> Round
export const catchUnoFailure = curry2(catchUnoFailureUncurried)

/**
 * PARTIAL APPLICATION EXAMPLES
 * 
 * Create specialized functions by fixing some parameters
 */

// Check if specific player can play any card
export const playerCanPlayAny = (playerIndex: number) => (round: Round): boolean => {
  if (round.playerInTurn !== playerIndex) return false
  return canPlayAny(round)
}

// Check if specific card index is playable
export const isCardPlayable = (index: number) => (round: Round): boolean =>
  canPlay(index)(round)

// Play card at index without color choice (for non-wild cards)
export const playCard = (index: number) => (round: Round): Round =>
  play(index)(undefined)(round)

// Play wild card with chosen color
export const playWild = (index: number) => (color: Color) => (round: Round): Round =>
  play(index)(color)(round)

/**
 * COMPOSITION EXAMPLES
 * 
 * Combine multiple round operations in sequence
 */

// Player says UNO then plays a card
export const sayUnoAndPlay = (player: number, cardIndex: number) =>
  pipe<Round>(
    sayUno(player),
    playCard(cardIndex)
  )

// Draw a card for the current player
export const drawCard = (round: Round): Round => draw(round)

/**
 * PREDICATES - Pure functions that return boolean
 * 
 * These can be composed with logical operators
 */

// Check if round is still in progress
export const isInProgress = (round: Round): boolean => !hasEnded(round)

// Check if player is in turn
export const isPlayerTurn = (playerIndex: number) => (round: Round): boolean =>
  round.playerInTurn === playerIndex

// Check if UNO window is open for player
export const isUnoWindowOpen = (playerIndex: number) => (round: Round): boolean =>
  round.unoOpen && round.unoTarget === playerIndex

// Check if player needs to call UNO
export const needsToCallUno = (playerIndex: number) => (round: Round): boolean => {
  if (!isPlayerTurn(playerIndex)(round)) return false
  return round.hands[playerIndex].length === 2 // About to play penultimate card
}

/**
 * SAFE GETTERS using Maybe monad
 * 
 * Demonstrates safe null handling without exceptions
 */

// Safely get the current player's hand
export const getCurrentHand = (round: Round): Maybe<readonly Card[]> =>
  Maybe.of(round.playerInTurn !== undefined ? round.hands[round.playerInTurn] : undefined)

// Safely get the winner's name
export const getWinnerName = (round: Round): Maybe<string | undefined> => {
  const w = winner(round)
  return Maybe.of(w !== undefined ? round.players[w] : undefined)
}

// Safely get top discard card
export const getTopCard = (round: Round): Maybe<Card> =>
  Maybe.of(round.discardPile.length > 0 ? topOfDiscard(round) : undefined)

/**
 * HIGHER-ORDER FUNCTIONS
 * 
 * Functions that take or return other functions
 */

// Create a function that checks if a card matches a predicate
export const findCardInHand = (predicate: (card: Card) => boolean) =>
  (round: Round): Maybe<{ card: Card; index: number } | undefined> => {
    if (round.playerInTurn === undefined) return Maybe.of(undefined)

    const hand = round.hands[round.playerInTurn]
    const index = hand.findIndex(predicate)

    return Maybe.of(
      index >= 0 ? { card: hand[index], index } : undefined
    )
  }

// Filter playable cards in current player's hand
export const getPlayableCards = (round: Round): readonly number[] => {
  if (round.playerInTurn === undefined) return []

  return round.hands[round.playerInTurn]
    .map((_, i) => i)
    .filter(i => canPlay(i)(round))
}

// Count cards matching a predicate
export const countCards = (predicate: (card: Card) => boolean) =>
  (round: Round): number => {
    if (round.playerInTurn === undefined) return 0
    return round.hands[round.playerInTurn].filter(predicate).length
  }

/**
 * FUNCTION FACTORIES
 * 
 * Functions that create configured functions
 */

// Create a player action executor
export const createPlayerAction = (playerIndex: number) => ({
  sayUno: () => (round: Round) => sayUno(playerIndex)(round),
  playCard: (cardIndex: number) => (round: Round) => playCard(cardIndex)(round),
  playWild: (cardIndex: number, color: Color) => (round: Round) =>
    playWild(cardIndex)(color)(round),
  hasCalledUno: () => (round: Round) => hasCalledUno(playerIndex)(round),
  canPlay: (cardIndex: number) => (round: Round) => canPlay(cardIndex)(round)
})

/**
 * LENSES - Functional getters/setters (simplified version)
 * 
 * Provides immutable updates to nested data
 */

export const updateHand = (playerIndex: number, updater: (hand: readonly Card[]) => readonly Card[]) =>
  (round: Round): Round => ({
    ...round,
    hands: round.hands.map((h, i) => i === playerIndex ? updater(h) : h) as unknown as readonly Card[][]
  })

export const updateCurrentColor = (color: Color) =>
  (round: Round): Round => ({
    ...round,
    currentColor: color
  })

/**
 * POINT-FREE STYLE EXAMPLES
 * 
 * Functions defined without explicit parameters
 */

// Get all hands that are empty (winners)
export const getEmptyHands = (round: Round): readonly number[] =>
  round.hands
    .map((hand, index) => ({ hand, index }))
    .filter(({ hand }) => hand.length === 0)
    .map(({ index }) => index)

// Get player with most cards
export const getPlayerWithMostCards = (round: Round): number | undefined => {
  const counts = round.hands.map(h => h.length)
  const maxCount = Math.max(...counts)
  return counts.findIndex(c => c === maxCount)
}

/**
 * EXPORTED UTILITIES
 */

export {
  canPlayAny,
  draw,
  hasEnded,
  winner,
  score,
  topOfDiscard
}
