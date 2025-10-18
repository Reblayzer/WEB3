// GraphQL Resolvers for UNO Game
import { GameManager, pubsub } from './gameManager.js';
import type { Color } from '../../domain/dist/model/types/card-types.js';

export const resolvers = {
  Query: {
    game: (_: any, { id }: { id: string }) => {
      const game = GameManager.getGame(id);
      return GameManager.getGameState(game);
    },

    availableGames: () => {
      return GameManager.getAvailableGames();
    },

    playerHand: (_: any, { gameId, playerId }: { gameId: string; playerId: string }) => {
      return GameManager.getPlayerHand(gameId, playerId);
    }
  },

  Mutation: {
    createGame: (_: any, { playerName, maxPlayers = 4 }: { playerName: string; maxPlayers?: number }) => {
      const game = GameManager.createGame(playerName, maxPlayers);
      return GameManager.getGameState(game);
    },

    joinGame: (_: any, { gameId, playerName }: { gameId: string; playerName: string }) => {
      const game = GameManager.joinGame(gameId, playerName);
      return GameManager.getGameState(game);
    },

    startGame: (_: any, { gameId, playerId }: { gameId: string; playerId: string }) => {
      const game = GameManager.startGame(gameId, playerId);
      return GameManager.getGameState(game);
    },

    playCard: (_: any, { gameId, playerId, cardIndex, chosenColor }: { gameId: string; playerId: string; cardIndex: number; chosenColor?: Color }) => {
      const game = GameManager.playCard(gameId, playerId, cardIndex, chosenColor ?? null);
      return GameManager.getGameState(game);
    },

    drawCard: (_: any, { gameId, playerId }: { gameId: string; playerId: string }) => {
      const game = GameManager.drawCard(gameId, playerId);
      return GameManager.getGameState(game);
    },

    sayUno: (_: any, { gameId, playerId }: { gameId: string; playerId: string }) => {
      return GameManager.sayUno(gameId, playerId);
    },

    catchUnoFailure: (_: any, { gameId, accuserId, accusedId }: { gameId: string; accuserId: string; accusedId: string }) => {
      return GameManager.catchUnoFailure(gameId, accuserId, accusedId);
    },

    leaveGame: (_: any, { gameId, playerId }: { gameId: string; playerId: string }) => {
      return GameManager.leaveGame(gameId, playerId);
    }
  },

  Subscription: {
    gameUpdated: {
      subscribe: (_: any, { gameId }: { gameId: string }) => {
        return pubsub.asyncIterator([`GAME_${gameId}`]);
      }
    },

    gamesListUpdated: {
      subscribe: () => {
        return pubsub.asyncIterator(['GAMES_LIST_UPDATED']);
      }
    }
  }
};
