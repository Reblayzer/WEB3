# Assignment 2: Vue.js - Exam Guide

> **Core Goal:** Design a reactive client application using components, state, and routing.

---

## What This Assignment Is About (Big Picture)

This assignment is about **building a reactive client application using components, binding, and state management**. You learn how to structure a frontend where the UI automatically updates when state changes, following the **MVVM (Model-View-ViewModel)** pattern. The focus is on declarative rendering, component composition, and managing both local and global state effectively.

**Core Focus:** Master reactive programming patterns, component communication (props/emits), routing, and understand when to use local vs global state management.

---

## Key Idea

**The UI is a declarative projection of reactive state. When state changes, Vue re-renders automatically.**

---

# Part 1: Theory & Concepts

## 1. MVVM Pattern (Model-View-ViewModel)

**What it is:** An architectural pattern that separates UI from business logic through data binding.

- **Model:** Your reactive state/data (`ref`, `reactive`, Pinia stores)
- **View:** HTML template that declares what to render
- **ViewModel:** The `<script setup>` logic (computed, methods, watchers)
- **Binding:** Connects View ↔ ViewModel automatically

**Why it matters:** You change data, Vue updates the UI. No manual DOM manipulation.

**Real Example from ColorChooser.vue:**

```ts
// Model: The data
const shaking = ref(false);

// ViewModel: The logic
const handleOverlayClick = () => {
  shaking.value = true; // Change data
  setTimeout(() => (shaking.value = false), 500);
};
```

```html
<!-- View: The template -->
<div :class="{ shake: shaking }"></div>
```

**Pattern comparison:**

- **MVC:** View → Controller → Model → View reads

- **MVP:** View → Presenter → Model → Presenter updates View

- **MVVM:** View ↔ ViewModel (automatic binding) ↔ Model

---

## 2. Binding — Connecting State to DOM

**What it is:** Synchronization between JavaScript data and HTML. When data changes, the view updates automatically.

### Four Types of Binding:

**1. Text Binding `{{ }}`** - Renders data as text content

```html
<p>Player: {{ playerName }}</p>
<p>{{ card.number }}</p>
<!-- From UnoCard.vue -->
```

**2. Attribute Binding `:`** - Binds data to HTML attributes (`:src`, `:class`, `:disabled`)

```html
<!-- From UnoCard.vue -->
<div :class="['uno-card', colorClass, { playable, disabled: !playable }]"></div>
```

**3. Event Binding `@`** - Connects DOM events to methods

```html
<!-- From ColorChooser.vue -->
<button @click="$emit('choose-color', color)"></button>
```

**4. Two-Way Binding `v-model`** - Syncs input ↔ data (syntactic sugar for `:value` + `@input`)

```html
<!-- From GameSetup.vue -->
<input v-model="playerName" />
```

**🎯 Exam Tip:** `:class` can use object `{ active: bool }` or array `[base, { conditional: bool }]` syntax

---

## 3. Control Structures — What Exists in the DOM

**What they do:** Determine which DOM nodes exist and how lists are repeated.

### `v-if` vs `v-show`

**`v-if`** - Adds/removes from DOM (use for rare changes)

```html
<!-- From UnoCard.vue -->
<div v-if="card.type === 'NUMBERED'">{{ card.number }}</div>
<div v-else-if="card.type === 'SKIP'">🚫</div>
<div v-else-if="card.type === 'WILD'">🌈</div>
```

**`v-show`** - Toggles CSS `display` (use for frequent toggling)

```html
<div v-show="showColorPicker">Choose a color</div>
```

**Key difference:** `v-if` destroys component state, `v-show` preserves it.

### `v-for` with `:key`

**Purpose:** Repeat elements for each item in an array

```html
<!-- From ColorChooser.vue -->
<button
  v-for="color in colors"
  :key="color"
  @click="$emit('choose-color', color)"
>
  {{ color }}
</button>
```

**🎯 Why `:key` matters:** Vue uses keys to efficiently track and update list items. Without keys, Vue uses in-place patching which can cause bugs with stateful components.

- ✅ Good key: `card.id` (stable, unique)
- ❌ Bad key: `index` (breaks when list reorders)

---

## 4. Component Communication

**The Rule:** Props down, Emits up (one-way data flow)

### Props (Parent → Child)

**What:** Data passed from parent to child (read-only in child)

```html
<!-- From UnoCard.vue -->
<script setup>
  const props = defineProps({
    card: { type: Object, required: true },
    playable: { type: Boolean, default: false },
  });
</script>
```

**Usage:**

```html
<UnoCard :card="myCard" :playable="true" />
```

### Emits (Child → Parent)

**What:** Events sent from child to parent (with optional payload)

```html
<!-- From ColorChooser.vue -->
<script setup>
  const emit = defineEmits(["choose-color"]);

  function chooseColor(color) {
    emit("choose-color", color); // Send data to parent
  }
</script>
```

**Parent listens:**

```html
<ColorChooser @choose-color="handleColorChosen" />
```

**🎯 Flow Example:** User clicks card → `UnoCard` emits `'click'` → Parent catches event → Calls Pinia action → State updates → Vue re-renders

---

## 5. Slots — Flexible Content Injection

**What they solve:** Child controls layout, parent controls content.

### Types:

**1. Default Slot** - Single content insertion point

```html
<!-- Child -->
<div class="card"><slot>Fallback content</slot></div>

<!-- Parent -->
<Card>Custom content here</Card>
```

**2. Named Slots** - Multiple insertion points

```html
<!-- Child -->
<header><slot name="header"></slot></header>
<main><slot></slot></main>

<!-- Parent -->
<Card>
  <template #header>Title</template>
  <template #default>Body</template>
</Card>
```

**3. Scoped Slots** - Child passes data to parent

```html
<!-- From PlayerHand.vue - Child -->
<div v-for="(card, index) in cards" :key="card.id">
  <slot :card="card" :index="index" :playable="isPlayable(card)">
    <UnoCard :card="card" />
  </slot>
</div>

<!-- Parent receives data -->
<PlayerHand :cards="hand">
  <template #default="{ card, index, playable }">
    <UnoCard :card="card" :playable="playable" @click="playCard(index)" />
  </template>
</PlayerHand>
```

**🎯 Why scoped slots:** Avoids prop drilling while giving parent rendering control.

---

## 6. Reactivity — Automatic Re-rendering

**How it works:** Vue tracks dependencies. When reactive state changes, only affected UI parts update.

### Creating Reactive State:

**`ref()`** - For primitives (one reactive "box")

```js
// From ColorChooser.vue
const shaking = ref(false);
shaking.value = true; // In script: use .value
```

```html
<!-- In template: auto-unwrapped -->
<div :class="{ shake: shaking }"></div>
```

**`reactive()`** - For objects (no .value needed)

```js
const state = reactive({ turn: 0, players: [] });
state.turn++; // Direct access
```

### Derived State:

**`computed()`** - Cached value derived from reactive sources

```js
// From UnoCard.vue
const colorClass = computed(() => {
  if (!props.card.color) return "";
  return `card-${props.card.color.toLowerCase()}`;
});
```

**When to use:** "I need a **value** to render" (e.g., filtered lists, formatted text)

**`watch()`** - Side effects when state changes

```js
// From GamePlay.vue
watch(
  () => gameState.value,
  (state) => {
    if (state === "GAME_OVER") {
      router.push("/gameover"); // Side effect: navigation
    }
  }
);
```

**When to use:** "I need to **DO** something" (API calls, logging, routing)

**🎯 Key Difference:** `computed` returns a value for rendering, `watch` performs actions.

### ⚠️ Reactivity Pitfall:

```js
const store = useGameStore();
const { game } = store; // ❌ Loses reactivity!

// ✅ Correct:
import { storeToRefs } from "pinia";
const { game, players } = storeToRefs(store); // Preserves reactivity
```

---

## 7. Lifecycle Hooks

**What they do:** Run code at specific moments in component's life.

```js
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  // Component is in DOM - refs are available
  // Good for: API calls, subscriptions, focus elements
});

onUnmounted(() => {
  // Component is being removed
  // Good for: cleanup, unsubscribe, clear timers (prevents memory leaks)
});
```

**🎯 Pattern:** `onMounted` = setup, `onUnmounted` = cleanup

---

## 8. Routing — SPA Navigation

**What it does:** Maps URLs to components without page reloads.

### Key Pieces:

**1. Route Configuration**

```js
// From router/index.js
const routes = [
  { path: "/", name: "setup", component: GameSetup },
  {
    path: "/play",
    name: "play",
    component: GamePlay,
    beforeEnter: (to, from) => {
      const store = useGameStore();
      if (!store.game) return "/"; // Guard: redirect if no game
    },
  },
  { path: "/gameover", name: "gameover", component: GameOver },
];
```

**2. Router Components**

```html
<!-- Declarative navigation -->
<router-link to="/play">Play Game</router-link>

<!-- Where matched component renders -->
<router-view />
```

**3. Programmatic Navigation**

```js
const router = useRouter();
router.push("/gameover"); // Navigate in code
```

### Navigation Guards

**Purpose:** Enforce valid app states (auth, validation, data loading)

```js
beforeEnter: (to, from) => {
  if (!isValid()) return "/"; // Redirect
};
```

**🎯 Why guards matter:** Prevent accessing routes when state is invalid (e.g., /play without initialized game).

---

## 9. State Management (Pinia)

**When to use local vs global state:**

**Local State** (`ref`/`reactive` in component):

- UI-only toggles (showModal, isLoading)
- Temporary form input
- Component-specific animations

**Global State** (Pinia):

- Shared across multiple components/views
- Persists across route changes
- Examples: user data, game state, shopping cart

### Pinia Store Structure:

```js
// From stores/game.js
export const useGameStore = defineStore("game", () => {
  // State - reactive data
  const game = ref(null);
  const players = ref([]);

  // Getters - computed values
  const currentPlayerIndex = computed(
    () => game.value?.currentRound?.playerInTurn ?? 0
  );

  const topCard = computed(() => {
    const pile = game.value?.currentRound?.discardPile;
    return pile?.[pile.length - 1];
  });

  // Actions - methods that modify state
  function playCard(cardIndex) {
    const round = game.value.currentRound;
    game.value.currentRound = round.play(cardIndex);
  }

  function drawCard() {
    const round = game.value.currentRound;
    game.value.currentRound = round.draw();
  }

  return { game, players, currentPlayerIndex, topCard, playCard, drawCard };
});
```

### Using the Store:

```js
const store = useGameStore();

// ❌ Wrong - loses reactivity
const { game, players } = store;

// ✅ Correct - preserves reactivity
const { game, players } = storeToRefs(store);

// ✅ Actions don't need storeToRefs (they're just functions)
const { playCard, drawCard } = store;
```

**🎯 Why Pinia:** Avoids prop drilling, centralizes state, integrates with Vue DevTools.

---

# Part 2: Client Implementation Overview

## Project Structure

```
client/src/
├── components/          # Reusable UI components
│   ├── UnoCard.vue     # Single card display (props: card, playable)
│   ├── PlayerHand.vue  # Hand of cards (emits play-card event)
│   ├── ColorChooser.vue # Wild card color picker (emits color choice)
│   └── GameBoard.vue   # Main game area (draw pile + top card)
│
├── views/              # Route-level components
│   ├── GameSetup.vue   # Initial setup: player name, bot count, start game
│   ├── GamePlay.vue    # Main game view: hands, board, actions
│   └── GameOver.vue    # End screen: scores, winner, play again
│
├── stores/             # Pinia state management (TypeScript)
│   ├── game.ts         # Game state, actions (playCard, drawCard, callUno)
│   └── player.ts       # Player name state
│
├── composables/        # Reusable composition functions
│   ├── useBotWorkers.ts # Bot worker lifecycle management
│   └── useGamePlay.ts  # Game play logic (handlers, computed, watchers)
│
├── utils/              # Shared utility functions
│   └── cardUtils.ts    # isWildCard(), formatCard()
│
├── workers/            # Web Workers
│   └── bot.worker.ts   # Bot AI logic (runs in separate thread)
│
├── router/
│   └── index.ts        # Route config + navigation guards
│
└── App.vue             # Root component with <router-view>
```

---

## Component Hierarchy & Data Flow

```
App.vue
  └─ <router-view>  (renders one of:)
      │
      ├─ GameSetup.vue
      │   ├─ v-model with computed getter/setter (MVVM pattern)
      │   ├─ Pinia: playerStore.setPlayerName()
      │   ├─ Pinia: gameStore.setupGame(numBots)
      │   └─ router.push('/play') on start
      │
      ├─ GamePlay.vue  (uses useGamePlay composable)
      │   ├─ Composable: useGamePlay()
      │   │   ├─ Computed: isGameReady, playableCards, canSayUno, canCatchUnoFailure
      │   │   ├─ Handlers: handleDrawCard, handlePlayCard, handleColorChosen
      │   │   └─ Watchers: gameState → router.push('/gameover')
      │   ├─ PlayerHand
      │   │   └─ UnoCard[] (props + emits)
      │   ├─ GameBoard (emits draw-card)
      │   │   └─ UnoCard (top card, non-playable)
      │   └─ ColorChooser (v-show when wild played)
      │       └─ emits color → handleColorChosen
      │
      └─ GameOver.vue
          ├─ Computed: winner, sortedPlayers (from Pinia)
          ├─ Actions: playAgain(), backToLobby()
          └─ v-show for game log modal
```

**Data Flow Example:**

1. User clicks card in `UnoCard` → emits `'click'`
2. Parent `PlayerHand` emits `'play-card'` with card index
3. `GamePlay` composable's `handlePlayCard(index)` is called
4. If wild card → shows ColorChooser (v-show), else calls `gameStore.playCard(index)`
5. Store updates `game` state (domain model)
6. All components reactively update (hands, top card, turn indicator)
7. Store triggers bot workers via `useBotWorkers` composable

---

## Key Implementation Patterns

### 1. **Composable Pattern** (useGamePlay.ts)

**Separation of Concerns:** Logic extracted from large view component into reusable composable

```ts
// useGamePlay.ts
export function useGamePlay() {
  const router = useRouter();
  const gameStore = useGameStore();

  // Local UI state
  const showColorChooser = ref(false);
  const unoCaught = ref(false);

  // Computed state
  const isGameReady = computed(
    () =>
      gameStore.gameState === "IN_PROGRESS" &&
      gameStore.players.length > 0 &&
      gameStore.players[0] !== undefined &&
      gameStore.topCard !== null
  );

  const playableCards = computed(() => {
    if (!isGameReady.value) return [];
    const hand = gameStore.players[0].hand;
    return hand.map((card, index) => ({
      ...card,
      index,
      playable: gameStore.canPlayCard(card),
    }));
  });

  // Event handlers
  function handlePlayCard(cardIndex: number) {
    const card = gameStore.players[0].hand[cardIndex];
    if (isWildCard(card)) {
      showColorChooser.value = true;
      return;
    }
    gameStore.playCard(cardIndex);
  }

  // Watchers for navigation
  watch(
    () => gameStore.gameState,
    (newState) => {
      if (newState === "FINISHED") {
        setTimeout(() => router.push("/gameover"), 1500);
      }
    },
    { immediate: true }
  );

  return {
    showColorChooser,
    isGameReady,
    playableCards,
    handlePlayCard,
    // ... other exports
  };
}
```

**Usage in GamePlay.vue:**

```ts
const {
  showColorChooser,
  isGameReady,
  playableCards,
  handlePlayCard,
  handleDrawCard,
  handleColorChosen,
} = useGamePlay();
```

### 2. **Bot Worker Management** (useBotWorkers.ts)

**Web Workers:** Run bot AI in separate thread to avoid blocking UI

```ts
export function useBotWorkers() {
  const workers = new Map<string, Worker>();

  function initializeBot(
    botName: string,
    onAction: (botName: string, action: BotAction) => void
  ) {
    const worker = new Worker(
      new URL("../workers/bot.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => onAction(botName, e.data);
    workers.set(botName, worker);
  }

  function requestBotAction(botName: string, gameState: GameState) {
    const worker = workers.get(botName);
    worker?.postMessage({ type: "YOUR_TURN", gameState });
  }

  function terminateAllBots() {
    workers.forEach((worker) => worker.terminate());
    workers.clear();
  }

  return { initializeBot, requestBotAction, terminateAllBots };
}
```

### 3. **Reactive Game State with Domain Model** (game.ts store)

**Integration:** Pinia store wraps immutable domain model with Vue reactivity

```ts
export const useGameStore = defineStore("game", () => {
  // Import domain model
  const game: Ref<Game | null> = ref(null);

  // Computed delegating to domain
  const currentRound: ComputedRef<Round | null> = computed(() => {
    roundKey.value; // Force reactivity
    return game.value?.currentRound() ?? null;
  });

  const topCard = computed(() => {
    if (!currentRound.value) return null;
    const pile = currentRound.value.discardPile();
    return pile[pile.length - 1];
  });

  // Actions wrapping domain methods
  function playCard(cardIndex: number, chosenColor: Color | null = null) {
    const round = currentRound.value;
    if (!round) return;

    if (isWildCard(card) && chosenColor) {
      round.play(cardIndex, chosenColor);
    } else {
      round.play(cardIndex);
    }

    nextTurn();
  }

  return { game, currentRound, topCard, playCard, drawCard, callUno };
});
```

### 4. **Component Communication** (Props + Emits)

```html
<!-- GamePlay.vue -->
<PlayerHand
  :cards="gameStore.players[0].hand"
  :playableCards="playableCards"
  @play-card="handlePlayCard"
/>

<!-- PlayerHand.vue -->
<UnoCard
  v-for="(cardData, index) in playableCards"
  :key="index"
  :card="cardData"
  :playable="cardData.playable"
  @click="handleCardClick(index)"
/>
```

### 5. **Performance: v-show vs v-if**

**Frequently toggled elements use v-show:**

```html
<!-- ColorChooser modal -->
<ColorChooser v-show="showColorChooser" @choose-color="handleColorChosen" />

<!-- Player hand (toggles every turn) -->
<div v-show="gameStore.currentPlayerIndex === 0" class="player-hand-section">
  <PlayerHand ... />
</div>

<!-- Bot indicator (toggles every turn) -->
<div v-show="gameStore.currentPlayerIndex !== 0" class="bot-turn-indicator">
  ...
</div>
```

**Rarely rendered elements use v-if:**

```html
<!-- Card types (never change) -->
<div v-if="card.type === 'NUMBERED'">{{ card.number }}</div>
<div v-else-if="card.type === 'SKIP'">🚫</div>
<div v-else-if="card.type === 'WILD'">🌈</div>
```

### 6. **Route Guards** (router/index.ts)

**Navigation guards at router level (not component level):**

```ts
const routes = [
  { path: "/", name: "home", component: GameSetup },
  {
    path: "/play",
    name: "play",
    component: GamePlay,
    beforeEnter: (to, from) => {
      const gameStore = useGameStore();
      if (!gameStore.game) {
        return "/"; // Redirect if no game initialized
      }
    },
  },
  {
    path: "/gameover",
    name: "gameover",
    component: GameOver,
    beforeEnter: (to, from) => {
      const gameStore = useGameStore();
      if (gameStore.gameState !== "FINISHED") {
        return "/";
      }
    },
  },
];
```

### 7. **Shared Utilities** (cardUtils.ts)

**Eliminate code duplication:**

```ts
import type { Card } from "domain/model/types/card-types";

export function isWildCard(card: Card): boolean {
  return card.type === "WILD" || card.type === "WILD DRAW";
}

export function formatCard(card: Card): string {
  if (isWildCard(card)) {
    return `${card.type}`;
  }
  return `${card.color} ${card.type === "NUMBERED" ? card.number : card.type}`;
}
```

---

## How It All Works Together

**Startup Flow:**

1. `App.vue` loads → `<router-view>` shows `GameSetup`
2. User enters name, selects bot count → `v-model` with computed setter (MVVM)
3. Click "Start" → `playerStore.setPlayerName()` → `gameStore.setupGame(numBots)` → `router.push('/play')`
4. Router `beforeEnter` guard checks game exists → allows navigation
5. `GamePlay.vue` mounts → `useGamePlay()` composable initializes
6. Store initializes bot workers via `useBotWorkers()` composable

**Game Flow:**

1. `useGamePlay` composable computes `playableCards` from store state
2. Cards with `playable=true` show visual indicator (`:class="{ playable }"`)
3. User clicks card → `UnoCard` emits → `PlayerHand` emits → `handlePlayCard(index)`
4. If wild card → `showColorChooser.value = true` (v-show toggles modal)
5. User chooses color → `handleColorChosen(color)` → `gameStore.playCard(index, color)`
6. Store updates domain model → reactivity triggers → all `computed` recalculate
7. If not human turn → `gameStore.botTurn()` → `requestBotAction()` sends message to worker
8. Worker responds → callback plays card → cycle repeats

**State Management Pattern:**

- **Local UI State** (ref in composable): `showColorChooser`, `unoCaught`
- **Derived State** (computed): `playableCards`, `isGameReady`, `canSayUno`
- **Global State** (Pinia): Game model, players, scores
- **Side Effects** (watch): Navigation on game finish

**Cleanup:**

1. Navigate away → `onUnmounted` runs in components
2. Store's `resetGame()` → `terminateAllBots()` cleans up workers
3. New route renders → previous component destroyed

---

## 🎯 Exam Strategy: 7-Minute Demo Path

If showing code, open these files to demonstrate concepts:

**1. UnoCard.vue** (136 lines) - Shows:

- Props (`card`, `playable`) with TypeScript types
- Emits (`'click'`)
- Computed (`colorClass` derived from card data)
- Dynamic `:class` binding with array + object syntax
- Conditional rendering (`v-if`/`v-else-if` for card types)
- MVVM: Model (props) → ViewModel (computed) → View (template)

**2. useGamePlay.ts** (130 lines) - Shows:

- **Composable pattern:** Reusable logic extraction (SOLID: Single Responsibility)
- `ref` for local UI state (`showColorChooser`, `unoCaught`)
- `computed` for derived values (`playableCards`, `canSayUno`)
- `watch` for side effects (navigation on game finish)
- Event handlers that coordinate with store
- TypeScript types (`Color`, `PendingWildCard`)

**3. GamePlay.vue** (343 lines) - Shows:

- Using composables (`useGamePlay`, `useGameStore`)
- Template data binding (`:cards`, `@play-card`)
- `v-show` vs `v-if` (ColorChooser modal uses v-show)
- Component communication (props down, emits up)
- Dynamic classes for current player indicator

**4. router/index.ts** - Shows:

- Route configuration
- **Navigation guards** (`beforeEnter`) at router level
- Guards check store state before allowing navigation
- Programmatic navigation (`router.push`)

**Alternative: game.ts store** (428 lines) - Shows:

- Pinia store structure (`defineStore` with setup syntax)
- `ref` for primitive state
- `computed` delegating to domain model
- Actions modifying state
- Integration with composables (`useBotWorkers`)

**Demo Flow (7 minutes):**

1. Show `UnoCard.vue` → Props, emits, computed, v-if (2 min)
2. Show `useGamePlay.ts` → Composable pattern, ref, computed, watch (2 min)
3. Show `GamePlay.vue` → Template binding, component usage (1.5 min)
4. Show `router/index.ts` → Guards enforcing valid state (1 min)
5. Quick mention: `game.ts` wraps domain model, `useBotWorkers` manages threads (0.5 min)

This covers all 9 concepts efficiently.

---

## Quick Reference: Exam Trap Checklist

✅ **Why `:key` in `v-for`?** → Efficient DOM diffing, prevents state bugs

✅ **`v-if` vs `v-show`?** → `v-if` destroys DOM, `v-show` toggles CSS

✅ **`computed` vs `watch`?** → `computed` returns value, `watch` does actions

✅ **Props mutability?** → Read-only! Emit events to request changes

✅ **`storeToRefs` necessity?** → Preserves reactivity when destructuring

✅ **Route guard purpose?** → Enforce valid app states before navigation

✅ **Scoped slots benefit?** → Parent controls rendering, child controls data

✅ **MVVM in Vue?** → View ↔ ViewModel (binding) ↔ Model (state)

---

## Common Exam Questions

**Q: "Walk through the data flow when a card is played"**

A: User clicks → `UnoCard` emits `'click'` → `PlayerHand` emits `'play-card'` with index → `GamePlay` calls composable's `handlePlayCard(index)` → If wild card, shows ColorChooser (v-show), otherwise calls `gameStore.playCard(index)` → Store calls domain model's `round.play(cardIndex)` → Domain returns new immutable round → Store updates reactive `game` ref → Vue's reactivity detects change → All dependent `computed` recalculate (`playableCards`, `topCard`, `currentPlayerIndex`) → UI updates automatically

**Q: "Why use Pinia instead of just props?"**

A: Game state needed across 3 routes (GameSetup, GamePlay, GameOver) and multiple components at different nesting levels. Pinia provides centralized store accessible anywhere, avoiding prop drilling through 5+ component levels. Also integrates with DevTools for debugging state changes.

**Q: "What's the difference between ref and reactive?"**

A: `ref` wraps any value (especially primitives) in a reactive box—needs `.value` in script, auto-unwraps in template. `reactive` makes object properties reactive directly (no `.value`). Use `ref` for primitives and when you need to reassign entire objects. Use `reactive` for grouped state you'll mutate properties of.

**Q: "Show me MVVM in your code"**

A: [Open UnoCard.vue]

- **Model:** `const props = defineProps({ card, playable })` - the data
- **View:** `<div :class="colorClass">{{ card.number }}</div>` - the template
- **ViewModel:** `const colorClass = computed(() => ...)` - the logic
- **Binding:** `:class` automatically syncs Model ↔ View, no manual DOM updates

**Q: "Why use composables instead of keeping logic in components?"**

A: **Single Responsibility Principle** - `GamePlay.vue` was 463 lines doing too much. Extracted game logic to `useGamePlay.ts` (130 lines), reduced component to 343 lines focused on presentation. Composables make logic reusable, testable, and easier to maintain. Similar to React hooks pattern.

**Q: "What's the purpose of navigation guards?"**

A: Enforce valid application states before route transitions. Example: `/play` guard checks `gameStore.game` exists, redirects to `/` if not—prevents accessing game view without initialized game. Guards run at router level (not component level) for centralized validation.

---

## Memory Aid: Component Communication Patterns

```
Parent Component
    ↓ Props (:card, :playable)
Child Component (UnoCard)
    ↑ Emits (@click)
Parent Component

Siblings → Communicate via Pinia Store
```

**Flow patterns:**

- **Props:** Data down (parent controls)
- **Emits:** Events up (child notifies)
- **Pinia:** Cross-component state (shared truth)
- **Slots:** Content injection (flexible rendering)
