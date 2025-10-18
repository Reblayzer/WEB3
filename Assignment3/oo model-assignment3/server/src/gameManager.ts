// Game Manager - Manages multiple game instances
import { v4 as uuidv4 } from 'uuid';
import { createGame } from '../../domain/dist/model/game.js';
import { PubSub } from 'graphql-subscriptions';
import type { Card, Color } from '../../domain/dist/model/types/card-types.js';
import type { GameState, SerializedGame, AvailableGame, PlayerHand, GameUpdateEvent } from './types.js';

export const pubsub = new PubSub();

// Store for active games
const games = new Map<string, GameState>();
const playerGames = new Map<string, string>(); // Map player IDs to game IDs
const playerHands = new Map<string, Card[]>(); // Map player IDs to their hands

// Fisher-Yates shuffle for card randomization
const shuffler = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export class GameManager {
  // Create a new game
  static createGame(createdBy: string, maxPlayers: number = 4): GameState {
    const gameId = uuidv4();

    const gameState: GameState = {
      id: gameId,
      domainGame: null, // Will be initialized when game starts
      players: [{
        id: uuidv4(),
        name: createdBy,
        cardCount: 0,
        hasCalledUno: false,
        score: 0
      }],
      currentPlayerIndex: 0,
      status: 'WAITING',
      targetScore: 100,
      createdBy,
      maxPlayers,
      winner: null,
      createdAt: new Date()
    };

    games.set(gameId, gameState);
    playerGames.set(gameState.players[0].id, gameId);

    // Notify about games list update
    this.notifyGamesListUpdate();

    return gameState;
  }

  // Join an existing game
  static joinGame(gameId: string, playerName: string): GameState {
    const game = games.get(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'WAITING') {
      throw new Error('Game already started');
    }

    // Check if player is already in the game (allow re-joining)
    const existingPlayer = game.players.find(p => p.name === playerName);
    if (existingPlayer) {
      // Player already in game, just return the game state
      return game;
    }

    // Only check if game is full for NEW players
    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    const playerId = uuidv4();
    game.players.push({
      id: playerId,
      name: playerName,
      cardCount: 0,
      hasCalledUno: false,
      score: 0
    });

    playerGames.set(playerId, gameId);

    // Notify all players about the update
    this.notifyGameUpdate(gameId, 'PLAYER_JOINED', { playerName });
    this.notifyGamesListUpdate();

    return game;
  }

  // Start the game
  static startGame(gameId: string, playerId: string): GameState {
    const game = games.get(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.players[0].id !== playerId) {
      throw new Error('Only the game creator can start the game');
    }

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    if (game.status !== 'WAITING') {
      throw new Error('Game already started');
    }

    // Create domain game with player names
    const playerNames = game.players.map(p => p.name);
    game.domainGame = createGame({
      players: playerNames,
      targetScore: game.targetScore,
      shuffler
    });

    // Update player card counts
    const round = game.domainGame.currentRound();
    if (round) {
      game.players.forEach((player, idx) => {
        player.cardCount = round.playerHand(idx).length;
      });
    }

    game.status = 'IN_PROGRESS';
    game.currentPlayerIndex = round ? (round.playerInTurn() ?? 0) : 0;

    // Notify all players
    this.notifyGameUpdate(gameId, 'GAME_STARTED', {});
    this.notifyGamesListUpdate();

    return game;
  }

  // Play a card
  static playCard(gameId: string, playerId: string, cardIndex: number, chosenColor: Color | null = null): GameState {
    const game = games.get(gameId);

    if (!game || !game.domainGame) {
      throw new Error('Game not found or not started');
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in game');
    }

    const round = game.domainGame.currentRound();
    if (!round) {
      throw new Error('No active round');
    }

    if (round.playerInTurn() !== playerIndex) {
      throw new Error('Not your turn');
    }

    // Play the card through domain model
    const card = round.playerHand(playerIndex)[cardIndex];
    round.play(cardIndex, chosenColor ?? undefined);

    // Update game state
    this.updateGameState(game);

    // Notify all players
    this.notifyGameUpdate(gameId, 'CARD_PLAYED', {
      playerName: game.players[playerIndex].name,
      card,
      chosenColor
    });

    return game;
  }

  // Draw a card
  static drawCard(gameId: string, playerId: string): GameState {
    const game = games.get(gameId);

    if (!game || !game.domainGame) {
      throw new Error('Game not found or not started');
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in game');
    }

    const round = game.domainGame.currentRound();
    if (!round) {
      throw new Error('No active round');
    }

    if (round.playerInTurn() !== playerIndex) {
      throw new Error('Not your turn');
    }

    // Draw card through domain model
    round.draw();

    // Update game state
    this.updateGameState(game);

    // Notify all players
    this.notifyGameUpdate(gameId, 'CARD_DRAWN', {
      playerName: game.players[playerIndex].name
    });

    return game;
  }

  // Say UNO
  static sayUno(gameId: string, playerId: string): boolean {
    const game = games.get(gameId);

    if (!game || !game.domainGame) {
      throw new Error('Game not found or not started');
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in game');
    }

    const round = game.domainGame.currentRound();
    if (!round) {
      throw new Error('No active round');
    }

    // Domain model handles the UNO state
    round.sayUno(playerIndex);

    // Update game state to sync hasCalledUno from domain
    this.updateGameState(game);

    this.notifyGameUpdate(gameId, 'UNO_CALLED', {
      playerName: game.players[playerIndex].name
    });

    return true;
  }

  // Catch UNO failure
  static catchUnoFailure(gameId: string, accuserId: string, accusedId: string): boolean {
    const game = games.get(gameId);

    if (!game || !game.domainGame) {
      throw new Error('Game not found or not started');
    }

    const accuserIndex = game.players.findIndex(p => p.id === accuserId);
    const accusedIndex = game.players.findIndex(p => p.id === accusedId);

    if (accuserIndex === -1 || accusedIndex === -1) {
      throw new Error('Player not in game');
    }

    const round = game.domainGame.currentRound();
    if (!round) {
      throw new Error('No active round');
    }

    const success = round.catchUnoFailure({
      accuser: accuserIndex,
      accused: accusedIndex
    });

    if (success) {
      // Domain model handles the UNO state changes
      // Update game state to sync from domain
      this.updateGameState(game);
      this.notifyGameUpdate(gameId, 'UNO_CAUGHT', {
        accuserName: game.players[accuserIndex].name,
        accusedName: game.players[accusedIndex].name
      });
    }

    return success;
  }

  // Update game state from domain model
  static updateGameState(game: GameState): void {
    if (!game.domainGame) {
      return;
    }

    const round = game.domainGame.currentRound();

    if (!round) {
      // Game ended
      const winnerIndex = game.domainGame.winner();
      if (winnerIndex !== null && winnerIndex !== undefined) {
        game.status = 'FINISHED';
        game.winner = game.players[winnerIndex].name;
      }
      return;
    }

    // Update player states
    game.players.forEach((player, idx) => {
      const cardCount = round.playerHand(idx).length;
      player.cardCount = cardCount;
      player.score = game.domainGame!.score(idx);

      // Get hasCalledUno from domain model (source of truth)
      player.hasCalledUno = round.hasCalledUno(idx);
    });

    game.currentPlayerIndex = round.playerInTurn() ?? 0;

    // Check if round ended
    const roundWinner = round.winner();
    if (roundWinner !== null && roundWinner !== undefined) {
      this.notifyGameUpdate(game.id, 'ROUND_ENDED', {
        winnerName: game.players[roundWinner].name,
        score: round.score()
      });
    }
  }

  // Get game by ID
  static getGame(gameId: string): GameState | undefined {
    return games.get(gameId);
  }

  // Get player's hand
  static getPlayerHand(gameId: string, playerId: string): PlayerHand {
    const game = games.get(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    // If game hasn't started yet, return empty hand
    if (!game.domainGame) {
      return { gameId, playerId, cards: [] };
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in game');
    }

    const round = game.domainGame.currentRound();
    if (!round) {
      return { gameId, playerId, cards: [] };
    }

    return {
      gameId,
      playerId,
      cards: [...round.playerHand(playerIndex)]
    };
  }

  // Get available games
  static getAvailableGames(): AvailableGame[] {
    return Array.from(games.values())
      .filter(g => g.status === 'WAITING')
      .map(g => ({
        id: g.id,
        createdBy: g.createdBy,
        playerCount: g.players.length,
        maxPlayers: g.maxPlayers,
        status: g.status
      }));
  }

  // Get game state for GraphQL
  static getGameState(game: GameState | undefined): SerializedGame | null {
    if (!game) return null;

    const round = game.domainGame?.currentRound();

    return {
      id: game.id,
      players: game.players,
      currentPlayerIndex: game.currentPlayerIndex,
      topCard: round ? (round.discardPile().top() ?? null) : null,
      currentColor: round ? round.toMemento().currentColor : null,
      direction: round ? round.toMemento().currentDirection : 'clockwise',
      drawPileCount: round ? round.drawPile().size : 0,
      status: game.status,
      targetScore: game.targetScore,
      winner: game.winner,
      createdBy: game.createdBy,
      maxPlayers: game.maxPlayers,
      unoWindowOpen: round ? round.isUnoWindowOpen() : false,
      unoTarget: round ? (round.getUnoTarget() ?? null) : null
    };
  }

  // Notify game update via subscription
  static notifyGameUpdate(gameId: string, eventType: string, data: any): void {
    pubsub.publish(`GAME_${gameId}`, {
      gameUpdated: {
        gameId,
        eventType,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Notify games list update
  static notifyGamesListUpdate(): void {
    const availableGames = this.getAvailableGames();
    pubsub.publish('GAMES_LIST_UPDATED', {
      gamesListUpdated: availableGames
    });
  }

  // Leave game
  static leaveGame(gameId: string, playerId: string): boolean {
    const game = games.get(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in game');
    }

    if (game.status === 'WAITING') {
      // Remove player from waiting game
      game.players.splice(playerIndex, 1);
      playerGames.delete(playerId);

      // If no players left, delete game
      if (game.players.length === 0) {
        games.delete(gameId);
      }

      this.notifyGameUpdate(gameId, 'PLAYER_LEFT', {});
      this.notifyGamesListUpdate();
    } else {
      // Game in progress - forfeit
      this.notifyGameUpdate(gameId, 'PLAYER_FORFEITED', {
        playerName: game.players[playerIndex].name
      });
    }

    return true;
  }
}
