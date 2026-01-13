# Assignment 2: Vue.js - Exam Guide

> **Core Goal:** Design a reactive client application using components, state, and routing.

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
│   ├── PlayerHand.vue  # Hand of cards (uses scoped slots)
│   ├── ColorChooser.vue # Wild card color picker (emits color choice)
│   └── GameBoard.vue   # Main game area layout
│
├── views/              # Route-level components
│   ├── GameSetup.vue   # Initial setup: player names, start game
│   ├── GamePlay.vue    # Main game view: hands, board, actions
│   └── GameOver.vue    # End screen: scores, winner
│
├── stores/             # Pinia state management
│   ├── game.js         # Game state, actions (playCard, drawCard, sayUno)
│   └── player.js       # Player-specific state
│
├── router/
│   └── index.js        # Route config + guards
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
      │   ├─ v-model for player input
      │   └─ router.push('/play') on start
      │
      ├─ GamePlay.vue  (uses Pinia store)
      │   ├─ PlayerHand (scoped slot)
      │   │   └─ UnoCard[] (props + emits)
      │   ├─ GameBoard
      │   │   └─ UnoCard (top card)
      │   └─ ColorChooser (v-if wild played)
      │       └─ emits color → store action
      │
      └─ GameOver.vue
          └─ Displays scores from Pinia
```

**Data Flow Example:**

1. User clicks card in `UnoCard` → emits `'click'`
2. Parent `PlayerHand` passes to `GamePlay`
3. `GamePlay` calls `gameStore.playCard(index)`
4. Store updates `game` state
5. All components reactively update (hands, top card, turn indicator)

---

## Key Implementation Patterns

### 1. **Reactive Game State** (GamePlay.vue)

```js
const gameStore = useGameStore();
const { game, currentPlayerIndex, topCard } = storeToRefs(gameStore);

const isMyTurn = computed(() => currentPlayerIndex.value === playerIndex.value);

const playableCards = computed(() =>
  hand.value.filter((card) => gameStore.canPlayCard(card))
);
```

### 2. **Component Communication** (Props + Emits)

```html
<!-- GamePlay.vue -->
<PlayerHand :cards="hand">
  <template #default="{ card, index, playable }">
    <UnoCard
      :card="card"
      :playable="playable"
      @click="handleCardClick(index)"
    />
  </template>
</PlayerHand>
```

### 3. **Conditional Rendering** (ColorChooser)

```html
<ColorChooser v-if="showColorChooser" @choose-color="handleColorChoice" />
```

### 4. **Route Guards** (router/index.js)

```js
{
  path: '/play',
  component: GamePlay,
  beforeEnter: (to, from) => {
    const store = useGameStore()
    if (!store.game) return '/'  // Prevent access without initialized game
  }
}
```

### 5. **Side Effects** (Watchers for Navigation)

```js
watch(
  () => game.value?.gameState,
  (state) => {
    if (state === "FINISHED") {
      router.push("/gameover");
    }
  }
);
```

---

## How It All Works Together

**Startup Flow:**

1. `App.vue` loads → `<router-view>` shows `GameSetup`
2. User enters names → `v-model` binds to local `ref`
3. Click "Start" → `gameStore.initGame(players)` → `router.push('/play')`
4. Router guard checks game exists → allows navigation
5. `GamePlay.vue` mounts → `onMounted` initializes subscriptions

**Game Flow:**

1. `GamePlay` computes `isMyTurn` and `playableCards` from store state
2. Cards with `playable=true` show visual indicator (`:class`)
3. User clicks card → emit bubbles up → Pinia action called
4. Store updates `game.currentRound` → reactivity triggers
5. All `computed` properties recalculate → UI updates

**Cleanup:**

1. Navigate away → `onUnmounted` runs cleanup
2. New route renders → previous component destroyed

---

## 🎯 Exam Strategy: 7-Minute Demo Path

If showing code, open these two files:

**1. UnoCard.vue** - Shows:

- Props (`card`, `playable`)
- Emits (`'click'`)
- Computed (`colorClass`)
- Dynamic `:class` binding
- Conditional rendering (`v-if`/`v-else-if`)

**2. GamePlay.vue** - Shows:

- `ref`/`reactive` local state
- Pinia store usage with `storeToRefs`
- `computed` (derived values)
- `watch` (side effects)
- `onMounted`/`onUnmounted` lifecycle
- Router navigation

This covers all 9 concepts in ~7 minutes.

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

A: User clicks → `UnoCard` emits `'click'` → `GamePlay` catches event → Calls `gameStore.playCard(index)` → Store updates `game` state → Vue's reactivity detects change → All dependent `computed` recalculate → UI updates (hands, top card, turn)

**Q: "Why use Pinia instead of just props?"**

A: Multiple components across different routes need game state. Pinia provides centralized store accessible anywhere, avoiding prop drilling through 5+ component levels. Also integrates with DevTools for debugging.

**Q: "What's the difference between ref and reactive?"**

A: `ref` wraps primitives in a reactive box (needs `.value` in script, auto-unwraps in template). `reactive` makes object properties reactive (no `.value`). Use `ref` for primitives, `reactive` for grouped state.

**Q: "Show me MVVM in your code"**

A: [Open ColorChooser.vue]

- **Model:** `const shaking = ref(false)` - the data
- **View:** `<div :class="{ shake: shaking }">` - the template
- **ViewModel:** `handleOverlayClick()` - the logic
- **Binding:** `:class` automatically syncs Model ↔ View

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
