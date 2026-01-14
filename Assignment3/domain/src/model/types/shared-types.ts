// Shared types for UNO Game - used across client, server, and domain
import type { Card } from './card-types.js';

export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';

export type Direction = 'clockwise' | 'counterclockwise';

export interface Player {
  id: string;
  name: string;
  cardCount: number;
  hasCalledUno: boolean;
  score: number;
}

export interface GameLogEntry {
  type: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface AvailableGame {
  id: string;
  createdBy: string;
  playerCount: number;
  maxPlayers: number;
  status: GameStatus;
}

export interface PlayerHand {
  gameId: string;
  playerId: string;
  cards: Card[];
}
