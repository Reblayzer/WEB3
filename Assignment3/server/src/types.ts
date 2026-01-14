// Type definitions for UNO Game Server

import type { Game } from '../../domain/src/model/game.js';
import type { Card } from '../../domain/src/model/types/card-types.js';
import type { 
  GameStatus,
  Player,
  GameLogEntry,
  AvailableGame,
  PlayerHand
} from '../../domain/src/model/types/shared-types.js';

export type { GameStatus, Player, GameLogEntry, AvailableGame, PlayerHand }

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
  gameLog: GameLogEntry[];
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
  gameLog: GameLogEntry[];
}

export interface GameUpdateEvent {
  gameId: string;
  eventType: string;
  data: string;
  timestamp: string;
}
