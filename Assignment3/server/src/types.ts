// Type definitions for UNO Game Server

import type { Game } from 'domain/src/model/game';
import type { Card } from 'domain/src/model/types/card-types';

export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
  cardCount: number;
  hasCalledUno: boolean;
  score: number;
}

export interface GameState {
  id: string;
  domainGame: Game | null;
  players: Player[];
  currentPlayerIndex: number;
  status: GameStatus;
  targetScore: number;
  createdBy: string;
  maxPlayers: number;
  winner: string | null;
  createdAt: Date;
}

export interface SerializedGame {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  topCard: Card | null;
  currentColor: string | null;
  direction: string;
  drawPileCount: number;
  status: GameStatus;
  targetScore: number;
  winner: string | null;
  createdBy: string;
  maxPlayers: number;
  unoWindowOpen: boolean;
  unoTarget: number | null;
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

export interface GameUpdateEvent {
  gameId: string;
  eventType: string;
  data: string;
  timestamp: string;
}
