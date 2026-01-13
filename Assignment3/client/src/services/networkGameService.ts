// Service layer for network game API calls with runtime validation
// Validates all API responses using Zod schemas at the boundary
import {
  getGame,
  getPlayerHand,
  playCard as apiPlayCard,
  drawCard as apiDrawCard,
  sayUno as apiSayUno,
  catchUnoFailure as apiCatchUnoFailure,
  startGame as apiStartGame,
  leaveGame as apiLeaveGame,
} from '../api/graphql'
import {
  GameSchema,
  PlayerHandResponseSchema,
  type Game,
  type Card,
  type Color,
} from '../api/schemas'
import { ZodError } from 'zod'

// Custom error class for API validation failures
export class ApiValidationError extends Error {
  constructor(
    public endpoint: string,
    public validationError: ZodError,
    message?: string
  ) {
    super(message || `API validation failed at ${endpoint}`)
    this.name = 'ApiValidationError'
  }
}

export const networkGameService = {
  /**
   * Fetch game state with runtime validation
   * Validates response against GameSchema before returning
   */
  async fetchGame(gameId: string): Promise<Game> {
    try {
      const raw = await getGame(gameId)
      // Runtime validation at API boundary
      return GameSchema.parse(raw)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError('getGame', error, `Invalid game data: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Fetch player's hand with runtime validation
   * Validates response before extracting cards
   */
  async fetchPlayerHand(gameId: string, playerId: string): Promise<Card[]> {
    try {
      const raw = await getPlayerHand(gameId, playerId)
      // Runtime validation at API boundary
      const validated = PlayerHandResponseSchema.parse(raw)
      return validated.cards
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError('getPlayerHand', error, `Invalid hand data: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Start game with runtime validation
   */
  async startGame(gameId: string, playerId: string): Promise<Game> {
    try {
      const raw = await apiStartGame(gameId, playerId)
      return GameSchema.parse(raw)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError('startGame', error, `Invalid start game response: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Play card with runtime validation
   */
  async playCard(
    gameId: string,
    playerId: string,
    cardIndex: number,
    chosenColor: Color | null
  ): Promise<Game> {
    try {
      const raw = await apiPlayCard(gameId, playerId, cardIndex, chosenColor)
      return GameSchema.parse(raw)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError('playCard', error, `Invalid play card response: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Draw card with runtime validation
   */
  async drawCard(gameId: string, playerId: string): Promise<Game> {
    try {
      const raw = await apiDrawCard(gameId, playerId)
      return GameSchema.parse(raw)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError('drawCard', error, `Invalid draw card response: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Call UNO with runtime validation
   */
  async callUno(gameId: string, playerId: string): Promise<boolean> {
    try {
      return await apiSayUno(gameId, playerId)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to call UNO')
    }
  },

  /**
   * Catch UNO failure with runtime validation
   */
  async catchUnoFailure(
    gameId: string,
    playerId: string,
    accusedPlayerId: string
  ): Promise<boolean> {
    try {
      return await apiCatchUnoFailure(gameId, playerId, accusedPlayerId)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to catch UNO failure')
    }
  },

  /**
   * Leave game
   */
  async leaveGame(gameId: string, playerId: string): Promise<boolean> {
    try {
      return await apiLeaveGame(gameId, playerId)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to leave game')
    }
  },
}
