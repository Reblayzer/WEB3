# WEB3 Assignment 5 – React, Redux, RxJS

This project converts the previous UNO work to a React/Redux client that uses the functional UNO model from Assignment 4. It demonstrates Session 9–10 topics: immutable functional core, Redux state management, and RxJS streams/WebSockets to handle server messages for multiplayer play.

## Tech choices
- **Functional model:** `src/model` (copied from Assignment 4) – pure, immutable game logic.
- **Redux Toolkit:** single slice in `src/features/uno/unoSlice.ts` for state/events.
- **RxJS + WebSocket:** `src/rx/serverBridge.ts` connects to the WebSocket server and feeds Redux with authoritative state.
- **WebSocket server:** `server/index.ts` keeps the canonical game state and broadcasts it to all connected clients.
- **React 18 + Vite + TypeScript:** lightweight client rendering current round, scores, and controls.

## Running
```bash
npm install
# terminal 1
npm run server   # starts ws://localhost:3001

# terminal 2
npm run dev
```

Open two browser tabs to play as different players; actions are sent to the WebSocket server and broadcast to all clients.

## Structure
- `src/model/*` – functional UNO core (deck, round, uno, random utils).
- `src/features/uno/unoSlice.ts` – Redux slice and actions to store server game state + player index.
- `src/rx/serverBridge.ts` – RxJS WebSocket connector that dispatches Redux actions from server messages.
- `src/App.tsx` – UI for playing a hand, showing scores, and simulating server messages.
- `server/index.ts` – Node WebSocket server running the functional model and broadcasting state.

## Notes
- Default players: Alice, Bob, Cara, Dan. Target score: 200 (adjust in server reset logic).
- Wild cards require a chosen color selector in the UI.
- The server enforces turn order; clients only send intents, and render the state they receive.
