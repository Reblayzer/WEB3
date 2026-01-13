// Apollo context type + builder
// Extracts player identity from request headers and injects into all resolvers

import type { Request } from 'express';

/**
 * Apollo context passed to all resolvers.
 * Contains authenticated player identity from request headers.
 */
export interface AppContext {
  /**
   * Player ID from x-player-id header.
   * Set by client after login; all mutations require this.
   */
  playerId: string | undefined;
  req: Request;
}

/**
 * Build Apollo context from Express request.
 * Extracts playerId from x-player-id header for client identity.
 *
 * Header format: x-player-id: <uuid>
 * If header missing or invalid, playerId is undefined (resolver must validate)
 */
export async function buildContext({ req }: { req: Request }): Promise<AppContext> {
  // Extract player ID from header
  const playerId = (req.headers['x-player-id'] as string) || undefined;

  return {
    playerId,
    req,
  };
}
