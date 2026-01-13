// Zod schemas for API response validation
// Single source of truth for both validation and TypeScript types
import { z } from 'zod'

// Card types - match server domain model
export const CardTypeEnum = z.enum(['NUMBERED', 'SKIP', 'REVERSE', 'DRAW', 'WILD', 'WILD DRAW'])
export const ColorEnum = z.enum(['RED', 'YELLOW', 'GREEN', 'BLUE'])
export type Color = z.infer<typeof ColorEnum>

export const CardSchema = z.object({
  type: CardTypeEnum,
  color: ColorEnum.nullable(),
  number: z.number().int().min(0).max(9).nullable(),
})

export type Card = z.infer<typeof CardSchema>

// Player schema
// Note: 'hand' is not included in public game state (security: prevents seeing other players' cards)
// Use separate PlayerHand query to get your own hand
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  hasCalledUno: z.boolean(),
  score: z.number().int().min(0),
  cardCount: z.number().int().min(0),
})

export type Player = z.infer<typeof PlayerSchema>

// Game log entry schema
export const GameLogEntrySchema = z.object({
  type: z.string(),
  message: z.string(),
  timestamp: z.string(),
  data: z.any().optional(),
})

export type GameLogEntry = z.infer<typeof GameLogEntrySchema>

// Game status enum
export const GameStatusEnum = z.enum(['WAITING', 'IN_PROGRESS', 'FINISHED'])

// Game schema
export const GameSchema = z.object({
  id: z.string(),
  players: z.array(PlayerSchema),
  currentPlayerIndex: z.number().int().min(0),
  topCard: CardSchema.nullable(),
  currentColor: ColorEnum.nullable(),
  direction: z.enum(['clockwise', 'counterclockwise']),
  drawPileCount: z.number().int().min(0),
  status: GameStatusEnum,
  targetScore: z.number().int().min(100),
  winner: z.string().nullable(),
  createdBy: z.string(),
  maxPlayers: z.number().int().min(2).max(10),
  unoWindowOpen: z.boolean().optional(),
  unoTarget: z.number().int().nullable().optional(),
  gameLog: z.array(GameLogEntrySchema),
})

export type Game = z.infer<typeof GameSchema>

// Available game (for lobby list)
export const AvailableGameSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  playerCount: z.number().int().min(1),
  maxPlayers: z.number().int().min(2),
  status: GameStatusEnum,
})

export type AvailableGame = z.infer<typeof AvailableGameSchema>

// Player hand response
export const PlayerHandResponseSchema = z.object({
  cards: z.array(CardSchema),
})

export type PlayerHandResponse = z.infer<typeof PlayerHandResponseSchema>

// Validation error - structured error response
export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.record(z.string()).optional(),
})

export type ValidationError = z.infer<typeof ValidationErrorSchema>
