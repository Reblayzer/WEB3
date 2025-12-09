# WEB3 Assignment 5 – React, Redux, RxJS

This client renders the UNO game using the functional model from Assignment 4. It lives in a workspace alongside the shared `domain/` package and the WebSocket `server/`.

## Tech choices
- Functional model: shared from `domain/src` (pure, immutable game logic).
- Redux Toolkit: `src/features/uno/unoSlice.ts` stores authoritative game state from the server.
- RxJS + WebSocket: `src/rx/serverBridge.ts` bridges server messages into Redux.
- React 18 + Vite + TypeScript for rendering.

## Running (from repo root)
```bash
npm install
npm run start -w server   # starts ws://localhost:3001
npm run dev -w client     # Vite dev server on http://localhost:5173
```

## Structure
- `src/App.tsx` – UI for login, lobby, and play.
- `src/features/uno/unoSlice.ts` – Redux slice and actions.
- `src/rx/serverBridge.ts` – RxJS WebSocket connector.
- Shared UNO model comes from `domain/src` (deck, round, uno, random utils).

## Notes
- Default target score: 200 (see server reset logic).
- Wild cards require a chosen color selector in the UI.
- The server enforces turn order; clients send intents and render server state.
