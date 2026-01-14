# Assignment 6 (UNO SSR with Next.js)

## Overview
Assignment 6 converts Assignment 5 to use Next.js for Server-Side Rendering (SSR) while maintaining all features and improvements:
- **SOLID server architecture** (modular, testable, maintainable)
- **Centralized protocol types** (single source of truth)
- **Component-based client** (separated views, no duplication)
- **Next.js SSR** (server and client components, optimized production builds)

## Structure
- `domain/` – Functional UNO model (from Assignment 4) + centralized protocol types
- `server/` – Modular WebSocket server following SOLID principles (7 focused modules)
- `client/` – Next.js app (SSR) using Redux + RxJS; separated view components

## Running
```bash
npm install

# WebSocket game server
npm run start -w server   # ws://localhost:3001

# Next.js app (SSR)
npm run dev -w client     # http://localhost:3000 (development)
npm run build -w client   # Production build
npm run start -w client   # Production server
```

## Assignment 6 Requirements ✅

### Must Have
- ✅ **Features from Assignment 5**: Rooms, UNO gameplay, Redux, RxJS, functional domain
- ✅ **Next.js for SSR**: Server-side rendering with hydration
- ✅ **Works in dev and production**: Both `npm run dev` and `npm run build && npm run start`

### Should Have
- ✅ **Server and client components**: Layout (server), Page (client)
- ✅ **Static vs Dynamic choices**: Metadata static, game state dynamic

## Architecture Highlights

### Server (SOLID Principles)
```
server/src/
├── index.ts              # WebSocket server setup (45 lines)
├── types.ts              # Type definitions
├── utils.ts              # Pure utilities
├── game.ts               # Game creation logic
├── broadcast.ts          # Broadcasting functions
├── roomManager.ts        # Room lifecycle (Single Responsibility)
└── messageHandler.ts     # Message routing (Dependency Injection)
```

### Client (Next.js SSR)
```
client/src/
├── app/
│   ├── layout.tsx        # Server component (metadata, static)
│   └── page.tsx          # Client component (Redux, WebSocket)
├── components/
│   ├── ColorChooser.tsx
│   ├── UnoCard.tsx
│   └── views/            # Separated view components
│       ├── LoginView.tsx
│       ├── LobbyView.tsx
│       └── GameView.tsx
├── features/uno/
│   └── unoSlice.ts       # Redux slice
├── rx/
│   └── serverBridge.ts   # RxJS WebSocket (centralized types)
└── lib/
    └── store.ts          # Redux store
```

### Domain (Shared Logic)
```
domain/src/
├── model/                # Functional UNO model (from Assignment 4)
│   ├── deck.ts
│   ├── round.ts
│   └── uno.ts
├── types/
│   └── messages.ts       # Centralized protocol types (NEW)
└── utils/
    └── random_utils.ts
```

## Improvements Over Assignment 5

1. **Next.js SSR**: Server-side rendering with hydration for better SEO and initial load
2. **Same Architecture**: Inherits all SOLID improvements from Assignment 5
3. **Component Separation**: Views extracted into separate components
4. **Production Ready**: Optimized builds with Next.js

## See Also
- [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) - Detailed refactoring documentation
- Assignment 5 README - Original implementation details
