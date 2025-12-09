# Assignment 6 (UNO SSR with Next.js)
## Structure
- `domain/` – functional UNO model from previous assignments.
- `server/` – WebSocket server using the domain model.
- `client/` – Next.js app (SSR) using Redux + RxJS to talk to the server; uses both server and client components.

## Running
```bash
npm install

# WebSocket game server
npm run start -w server

# Next.js app (SSR)
npm run dev -w client      # dev
npm run build -w client
npm run start -w client    # production
```

Meets assignment 6 requirements:
- Features from assignment 5 carried over (rooms, UNO play, Redux/RxJS, functional domain).
- Next.js for SSR, works with both `npm run dev` and `npm run build && npm run start`.
- Uses server and client components deliberately (layout server component; page + UI client components).
