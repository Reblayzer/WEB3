import { z } from 'zod';
import { colors } from '../../domain/src/model/types/card-types.js';

// Common primitives
const idSchema = z.string().uuid({ message: 'Invalid game or player id' });
const playerNameSchema = z
  .string()
  .trim()
  .min(1, 'Player name required')
  .max(30, 'Player name too long');

const maxPlayersSchema = z.number().int().min(2).max(8).default(4);
const cardIndexSchema = z.number().int().min(0, 'Card index must be >= 0');
const colorSchema = z.enum(colors, { invalid_type_error: 'Invalid color' }).nullable().optional();

export const createGameArgsSchema = z.object({
  playerName: playerNameSchema,
  maxPlayers: maxPlayersSchema,
});

export const gameQueryArgsSchema = z.object({ id: idSchema });

export const playerHandQueryArgsSchema = z.object({
  gameId: idSchema,
  playerId: idSchema,
});

export const joinGameArgsSchema = z.object({
  gameId: idSchema,
  playerName: playerNameSchema,
});

export const startGameArgsSchema = z.object({
  gameId: idSchema,
  playerId: idSchema,
});

export const playCardArgsSchema = z.object({
  gameId: idSchema,
  playerId: idSchema,
  cardIndex: cardIndexSchema,
  chosenColor: colorSchema,
});

export const drawCardArgsSchema = z.object({
  gameId: idSchema,
  playerId: idSchema,
});

export const sayUnoArgsSchema = drawCardArgsSchema;

export const catchUnoArgsSchema = z.object({
  gameId: idSchema,
  accuserId: idSchema,
  accusedId: idSchema,
});

export const leaveGameArgsSchema = drawCardArgsSchema;
export const gameUpdatedSubscriptionArgsSchema = z.object({ gameId: idSchema });

export type CreateGameArgs = z.infer<typeof createGameArgsSchema>;
export type GameQueryArgs = z.infer<typeof gameQueryArgsSchema>;
export type JoinGameArgs = z.infer<typeof joinGameArgsSchema>;
export type StartGameArgs = z.infer<typeof startGameArgsSchema>;
export type PlayCardArgs = z.infer<typeof playCardArgsSchema>;
export type DrawCardArgs = z.infer<typeof drawCardArgsSchema>;
export type SayUnoArgs = z.infer<typeof sayUnoArgsSchema>;
export type CatchUnoArgs = z.infer<typeof catchUnoArgsSchema>;
export type LeaveGameArgs = z.infer<typeof leaveGameArgsSchema>;
export type GameUpdatedSubscriptionArgs = z.infer<typeof gameUpdatedSubscriptionArgsSchema>;
export type PlayerHandQueryArgs = z.infer<typeof playerHandQueryArgsSchema>;

export function validateArgs<T>(schema: z.ZodType<T>, raw: unknown): T {
  return schema.parse(raw);
}
