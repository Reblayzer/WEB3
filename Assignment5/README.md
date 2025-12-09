# Assignment 5 (React + Redux + RxJS Uno)

## Structure
- `domain/` – functional Uno model (pure logic from Assignment 4).
- `server/` – Node WebSocket server using the domain model for state.
- `client/` – React + Redux + RxJS UI that talks to the server and renders the game.

## Getting started
```bash
npm install               # installs workspaces
npm run start -w server   # start ws://localhost:3001
npm run dev -w client     # start Vite dev server
```
