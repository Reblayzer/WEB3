// GraphQL Resolvers for UNO Game
import { GameManager, pubsub } from './gameManager.js';
import type { Color } from '../../domain/src/model/types/card-types.js';
import type { AppContext } from './context.js';
import { GraphQLError } from 'graphql';
import { ZodError } from 'zod';
import {
  catchUnoArgsSchema,
  createGameArgsSchema,
  drawCardArgsSchema,
  gameQueryArgsSchema,
  joinGameArgsSchema,
  leaveGameArgsSchema,
  playerHandQueryArgsSchema,
  playCardArgsSchema,
  gameUpdatedSubscriptionArgsSchema,
  sayUnoArgsSchema,
  startGameArgsSchema,
  validateArgs
} from './validation.js';

/**
 * Safe mutation wrapper that catches and translates errors to GraphQL errors.
 * Handles validation errors, authorization failures, and game logic errors.
 */
function safeMutation<T>(
  mutationFn: () => T,
  operationName: string
): T {
  try {
    return mutationFn();
  } catch (error) {
    // Zod validation errors
    if (error instanceof ZodError) {
      const issues = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new GraphQLError(
        `Invalid ${operationName} arguments: ${issues}`,
        {
          extensions: {
            code: 'BAD_INPUT',
            validationErrors: error.errors,
          },
        }
      );
    }

    // Authorization errors
    if (error instanceof Error && error.message.includes('not authenticated')) {
      throw new GraphQLError('Unauthorized: Player not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    if (error instanceof Error && (error.message.includes('Not authorized') || error.message.includes('Cannot'))) {
      throw new GraphQLError(`Forbidden: ${error.message}`, {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Game logic errors
    if (error instanceof Error) {
      throw new GraphQLError(`Game error: ${error.message}`, {
        extensions: { code: 'GAME_ERROR' },
      });
    }

    throw new GraphQLError('Unknown server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

export const resolvers = {
  Query: {
    game: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        const { id } = validateArgs(gameQueryArgsSchema, rawArgs);
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const game = GameManager.getGame(id);
        return GameManager.getGameState(game);
      }, 'getGame');
    },

    availableGames: () => {
      return GameManager.getAvailableGames();
    },

    playerHand: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId } = validateArgs(playerHandQueryArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Cannot view another player\'s hand');
        }
        return GameManager.getPlayerHand(gameId, playerId);
      }, 'getPlayerHand');
    }
  },

  Mutation: {
    createGame: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        const { playerName, maxPlayers } = validateArgs(createGameArgsSchema, rawArgs);
        const game = GameManager.createGame(playerName, maxPlayers);
        return GameManager.getGameState(game);
      }, 'createGame');
    },

    joinGame: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        const { gameId, playerName } = validateArgs(joinGameArgsSchema, rawArgs);
        const game = GameManager.joinGame(gameId, playerName);
        return GameManager.getGameState(game);
      }, 'joinGame');
    },

    startGame: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId } = validateArgs(startGameArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Not authorized to start this game');
        }
        const game = GameManager.startGame(gameId, playerId);
        return GameManager.getGameState(game);
      }, 'startGame');
    },

    playCard: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId, cardIndex, chosenColor } = validateArgs(playCardArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Cannot play as another player');
        }
        const game = GameManager.playCard(gameId, playerId, cardIndex, chosenColor ?? null);
        return GameManager.getGameState(game);
      }, 'playCard');
    },

    drawCard: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId } = validateArgs(drawCardArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Cannot draw as another player');
        }
        const game = GameManager.drawCard(gameId, playerId);
        return GameManager.getGameState(game);
      }, 'drawCard');
    },

    sayUno: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId } = validateArgs(sayUnoArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Cannot call UNO as another player');
        }
        return GameManager.sayUno(gameId, playerId);
      }, 'sayUno');
    },

    catchUnoFailure: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, accuserId, accusedId } = validateArgs(catchUnoArgsSchema, rawArgs);
        if (accuserId !== context.playerId) {
          throw new Error('Cannot accuse as another player');
        }
        return GameManager.catchUnoFailure(gameId, accuserId, accusedId);
      }, 'catchUnoFailure');
    },

    leaveGame: (_: unknown, rawArgs: unknown, context: AppContext) => {
      return safeMutation(() => {
        if (!context.playerId) {
          throw new Error('Player not authenticated');
        }
        const { gameId, playerId } = validateArgs(leaveGameArgsSchema, rawArgs);
        if (playerId !== context.playerId) {
          throw new Error('Cannot leave as another player');
        }
        return GameManager.leaveGame(gameId, playerId);
      }, 'leaveGame');
    }
  },

  Subscription: {
    gameUpdated: {
      subscribe: (_: unknown, rawArgs: unknown) => {
        return safeMutation(() => {
          const { gameId } = validateArgs(gameUpdatedSubscriptionArgsSchema, rawArgs);
          return pubsub.asyncIterator([`GAME_${gameId}`]);
        }, 'gameUpdated');
      }
    },

    gamesListUpdated: {
      subscribe: () => {
        return pubsub.asyncIterator(['GAMES_LIST_UPDATED']);
      }
    }
  }
};
