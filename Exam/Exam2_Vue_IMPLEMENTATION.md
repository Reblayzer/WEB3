# Assignment 2: Vue.js - Implementation Guide

## File Structure Overview

```
client/
├── src/
│   ├── components/
│   │   ├── UnoCard.vue          ← Card display component
│   │   ├── PlayerHand.vue       ← Hand of cards
│   │   ├── ColorChooser.vue     ← Wild card color picker
│   │   ├── GameBoard.vue        ← Main game area
│   │   └── ...
│   ├── views/
│   │   ├── GameSetup.vue        ← Initial setup screen
│   │   ├── GamePlay.vue         ← Main game view
│   │   └── GameOver.vue         ← End game screen
│   ├── stores/
│   │   ├── game.js              ← Pinia game state
│   │   └── player.js            ← Pinia player state
│   ├── router/
│   │   └── index.js             ← Vue Router config
│   └── App.vue                  ← Root component
```

## Key Implementation: `UnoCard.vue`

**Props, computed, events in action**

### Template with Bindings

```vue
<!-- Lines 3-24: Template with all binding types -->
<template>
  <div
    :class="['uno-card', colorClass, { playable, disabled: !playable }]"
    @click="handleClick"
  >
    <!-- v-if for conditional rendering -->
    <div v-if="card.type === 'NUMBERED'" class="card-number">
      {{ card.number }}
    </div>
    <div v-else-if="card.type === 'SKIP'">🚫</div>
    <div v-else-if="card.type === 'WILD'">🌈</div>
  </div>
</template>
```

### Script with Props & Computed

```vue
<script setup>
import { computed } from "vue";

// Lines 32-41: Define props (Parent → Child)
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  playable: {
    type: Boolean,
    default: false,
  },
});

// Line 43: Define emits (Child → Parent)
const emit = defineEmits(["click"]);

// Lines 45-50: Computed for dynamic styling
const colorClass = computed(() => {
  if (!props.card.color) return "";
  return `card-${props.card.color.toLowerCase()}`;
});

// Handle events
function handleClick() {
  if (props.playable) {
    emit("click", props.card);
  }
}
</script>
```

## Key Implementation: `GamePlay.vue`

**State management, lifecycle, watchers**

### Reactive State with ref & reactive

```vue
<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { storeToRefs } from 'pinia'

// Lines 132-134: Local state
const showColorChooser = ref(false)
const pendingWildCard = ref(null)
const shaking = ref(false)

// Lines 136: Pinia store
const gameStore = useGameStore()

// Lines 137: Get reactive state from store
const { game, players, currentPlayerIndex } = storeToRefs(gameStore)
```

### Computed Properties

```vue
// Lines 173-215: Computed based on state const isMyTurn = computed(() => {
return game.value?.currentPlayerIndex === playerIndex.value }) const
playableCards = computed(() => { if (!isMyTurn.value) return [] return
hand.value.filter((card, index) => { return gameStore.canPlayCard(card) }) })
const canSayUno = computed(() => { return hand.value.length === 2 &&
isMyTurn.value })
```

### Watchers for Side Effects

```vue
// Lines 138-140: Watch for changes watch(currentPlayerIndex, (newIndex) => {
console.log(`Turn changed to player ${newIndex}`) }) // Lines 161-170: Watch
game state watch(() => game.value?.gameState, (newState) => { if (newState ===
'FINISHED') { router.push('/gameover') } })
```

### Lifecycle Hooks

```vue
// Lines 143-158: Component lifecycle onMounted(async () => { // Setup when
component enters DOM await gameStore.initGame(players.value) console.log('Game
initialized') }) onUnmounted(() => { // Cleanup when component leaves DOM
gameStore.cleanup() })
```

## Key Implementation: `ColorChooser.vue`

**v-for, scoped slots, events**

### List Rendering

```vue
<template>
  <div class="color-chooser" @click.self="close">
    <div class="colors">
      <!-- Lines 7-10: v-for with :key -->
      <button
        v-for="color in colors"
        :key="color"
        :class="`color-btn color-${color.toLowerCase()}`"
        @click="chooseColor(color)"
      >
        {{ color }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Line 23: Data for v-for
const colors = ["RED", "BLUE", "GREEN", "YELLOW"];

// Line 25: Emit event
const emit = defineEmits(["choose-color"]);

function chooseColor(color) {
  emit("choose-color", color);
}
</script>
```

## Key Implementation: Pinia Store (`stores/game.js`)

**Centralized state management**

### Store Definition

```js
// Lines 7-28: Define store
export const useGameStore = defineStore("game", () => {
  // State (ref for reactivity)
  const game = ref(null);
  const players = ref([]);
  const currentRound = ref(null);

  // Getters (computed)
  const currentPlayerIndex = computed(
    () => game.value?.currentRound?.playerInTurn ?? 0
  );

  const topCard = computed(() => {
    const pile = game.value?.currentRound?.discardPile;
    return pile?.[pile.length - 1];
  });

  const isGameOver = computed(() => game.value?.gameState === "FINISHED");

  // Actions (methods)
  function initGame(playerNames) {
    game.value = createGame(playerNames);
  }

  function playCard(cardIndex) {
    const round = game.value.currentRound;
    game.value.currentRound = round.play(cardIndex);
  }

  function drawCard() {
    const round = game.value.currentRound;
    game.value.currentRound = round.draw();
  }

  // Return everything to expose
  return {
    game,
    players,
    currentPlayerIndex,
    topCard,
    isGameOver,
    initGame,
    playCard,
    drawCard,
  };
});
```

### Using the Store in Components

```vue
<script setup>
import { useGameStore } from "@/stores/game";
import { storeToRefs } from "pinia";

const store = useGameStore();

// Get reactive state (use storeToRefs!)
const { game, topCard, isGameOver } = storeToRefs(store);

// Get actions (direct destructure)
const { playCard, drawCard } = store;

// Use in methods
function handleCardClick(index) {
  playCard(index);
}
</script>
```

## Key Implementation: Router (`router/index.js`)

**Navigation between views**

### Route Configuration

```js
// Lines 6-21: Define routes
const routes = [
  {
    path: "/",
    name: "setup",
    component: GameSetup,
  },
  {
    path: "/play",
    name: "play",
    component: GamePlay,
    // Navigation guard
    beforeEnter: (to, from) => {
      const store = useGameStore();
      if (!store.game) {
        return "/"; // Redirect if no game
      }
    },
  },
  {
    path: "/gameover",
    name: "gameover",
    component: GameOver,
  },
];
```

### Navigation in Components

```vue
<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

function startGame() {
  // Programmatic navigation
  router.push("/play");
}
</script>

<template>
  <!-- Declarative navigation -->
  <router-link to="/">Home</router-link>
  <router-link :to="{ name: 'play' }">Play</router-link>

  <!-- Where matched component renders -->
  <router-view />
</template>
```

## Key Implementation: Two-Way Binding

**v-model in action**

### Form Input

```vue
<!-- GameSetup.vue Lines 8-12 -->
<template>
  <div class="setup">
    <input
      v-model="playerName"
      placeholder="Enter your name"
      @keyup.enter="addPlayer"
    />

    <!-- With modifiers -->
    <input v-model.trim="playerName" />
    <!-- Remove whitespace -->
    <input v-model.number="numBots" />
    <!-- Convert to number -->
  </div>
</template>

<script setup>
import { ref } from "vue";

const playerName = ref("");
const numBots = ref(0);

function addPlayer() {
  players.value.push(playerName.value);
  playerName.value = ""; // Reset input
}
</script>
```

## Key Implementation: Slots

**Reusable component structure**

### Parent Using Slots

```vue
<!-- PlayerHand.vue Lines 4-11 -->
<template>
  <div class="player-hand">
    <div v-for="(card, index) in cards" :key="card.id" class="card-slot">
      <!-- Default slot with scoped data -->
      <slot :card="card" :index="index" :playable="isPlayable(card)">
        <!-- Fallback content -->
        <UnoCard :card="card" />
      </slot>
    </div>
  </div>
</template>
```

### Parent Receiving Scoped Data

```vue
<template>
  <PlayerHand :cards="hand">
    <!-- Receive data from child via slot props -->
    <template #default="{ card, index, playable }">
      <UnoCard :card="card" :playable="playable" @click="playCard(index)" />
    </template>
  </PlayerHand>
</template>
```

## Common Exam Questions for Assignment 2

**Q: "Show me how components communicate"**

- **Parent → Child:** Props (`defineProps`)
  - Show: `UnoCard.vue` lines 32-41
- **Child → Parent:** Events (`defineEmits`)
  - Show: `UnoCard.vue` line 43, emit on click
- **Between siblings:** Pinia store
  - Show: `stores/game.js`

**Q: "Explain reactivity in this component"**

- **Show:** `GamePlay.vue` lines 132-137
- **Explain:** "`ref()` makes primitives reactive, `reactive()` for objects. In templates, refs auto-unwrap. `computed()` creates derived values that update when dependencies change."

**Q: "When do you use v-if vs v-show?"**

- **v-if:** Show `UnoCard.vue` lines 7-22 - "Completely adds/removes from DOM. Use when rarely changes."
- **v-show:** Show `GamePlay.vue` line 37 - "Toggles CSS display. Use for frequent toggling."

**Q: "Walk through the data flow when a card is played"**

1. User clicks card → `UnoCard.vue` emits 'click' event
2. Parent `GamePlay.vue` catches event, calls `handleCardClick(index)`
3. Calls Pinia store action: `gameStore.playCard(index)`
4. Store updates game state
5. Vue's reactivity detects change
6. All components using that state re-render automatically

**Q: "Why use Pinia?"**

- **Show:** `stores/game.js`
- **Explain:** "Multiple components need game state. Instead of prop drilling through many levels, Pinia provides centralized state any component can access. Also integrates with Vue DevTools for debugging."

**Q: "Explain computed vs watch"**

- **computed:** `GamePlay.vue` lines 173+ - "For derived state. Cached, only recalculates when dependencies change. Returns a value."
- **watch:** `GamePlay.vue` lines 138-140 - "For side effects like API calls or logging. Doesn't return a value, just runs code."

## Memory Aid for Oral Exam

**File Walkthrough Strategy:**

1. **Start with `App.vue`** - "Root component with router-view"
2. **Show router** - "Three routes: setup, play, gameover"
3. **Open `GamePlay.vue`** - "Main game logic"
   - Point to refs/reactive - "Local state"
   - Point to store usage - "Global state"
   - Point to computed - "Derived values"
   - Point to lifecycle hooks - "Setup/cleanup"
4. **Open `UnoCard.vue`** - "Demonstrates props, emits, computed"
5. **Open `stores/game.js`** - "Centralized state management"

**Quick Bindings Reference:**

- `{{ }}` = Show data
- `:attr` = Bind attribute
- `@event` = Handle event
- `v-model` = Two-way sync
- `v-if` = Conditional render
- `v-for` = Loop render
- `v-show` = Toggle visibility

**Component Communication:**

```
Parent
  ↓ :props
Child
  ↑ @events
Parent

Siblings → Use Pinia Store
```
