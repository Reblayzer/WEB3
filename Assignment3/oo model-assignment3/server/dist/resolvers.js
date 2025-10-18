// GraphQL Resolvers for UNO Game
import { GameManager, pubsub } from './gameManager.js';
export const resolvers = {
    Query: {
        game: (_, { id }) => {
            const game = GameManager.getGame(id);
            return GameManager.getGameState(game);
        },
        availableGames: () => {
            return GameManager.getAvailableGames();
        },
        playerHand: (_, { gameId, playerId }) => {
            return GameManager.getPlayerHand(gameId, playerId);
        }
    },
    Mutation: {
        createGame: (_, { playerName, maxPlayers = 4 }) => {
            const game = GameManager.createGame(playerName, maxPlayers);
            return GameManager.getGameState(game);
        },
        joinGame: (_, { gameId, playerName }) => {
            const game = GameManager.joinGame(gameId, playerName);
            return GameManager.getGameState(game);
        },
        startGame: (_, { gameId, playerId }) => {
            const game = GameManager.startGame(gameId, playerId);
            return GameManager.getGameState(game);
        },
        playCard: (_, { gameId, playerId, cardIndex, chosenColor }) => {
            const game = GameManager.playCard(gameId, playerId, cardIndex, chosenColor ?? null);
            return GameManager.getGameState(game);
        },
        drawCard: (_, { gameId, playerId }) => {
            const game = GameManager.drawCard(gameId, playerId);
            return GameManager.getGameState(game);
        },
        sayUno: (_, { gameId, playerId }) => {
            return GameManager.sayUno(gameId, playerId);
        },
        catchUnoFailure: (_, { gameId, accuserId, accusedId }) => {
            return GameManager.catchUnoFailure(gameId, accuserId, accusedId);
        },
        leaveGame: (_, { gameId, playerId }) => {
            return GameManager.leaveGame(gameId, playerId);
        }
    },
    Subscription: {
        gameUpdated: {
            subscribe: (_, { gameId }) => {
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
