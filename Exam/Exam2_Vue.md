# Assignment 2: Vue.js - Complete Exam Guide

> **Exam Topics:** binding, control structures, re-rendering, components with slots, routing, props and emits, state management

---

## Project Structure

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

---

## 1. Binding

### What is it?

Binding connects your JavaScript data to the HTML template. When data changes, the view updates automatically. Vue provides different types of binding for different purposes: displaying text, setting attributes, handling events, and two-way synchronization with form inputs.

### Text Binding (Mustache Syntax)

Double curly braces display data as text content. Vue evaluates the expression inside and shows the result. This is the simplest form of binding.

```vue
<p>Player: {{ playerName }}</p>
<p>Total: {{ score * 2 }}</p>
```

### Attribute Binding (`v-bind` or `:`)

To bind data to HTML attributes, you use `v-bind` or its shorthand `:`. This is necessary because mustaches don't work inside attributes. The attribute value becomes dynamic based on your data.

```vue
<button :disabled="!isMyTurn">Play</button>
<div :class="cardColor"></div>
<img :src="cardImage" />
```

### Dynamic Class Binding

For conditional CSS classes, use object or array syntax. This is common for applying styles based on component state.

```vue
<!-- Object syntax: class applied when condition is true -->
<div :class="{ active: isSelected, disabled: !canPlay }"></div>

<!-- Array syntax: combine static and dynamic classes -->
<div :class="[baseClass, { highlighted: isMyTurn }]"></div>

<!-- Dynamic inline styles -->
<div
  :style="{ backgroundColor: cardColor, transform: `rotate(${angle}deg)` }"
></div>
```

### Event Binding (`v-on` or `@`)

Event binding connects DOM events to methods in your component. When the event fires, Vue calls your method. Modifiers like `.prevent` add common behaviors without extra code.

```vue
<button @click="playCard">Play</button>
<button @click="playCard(index)">Play Card</button>
<form @submit.prevent="save"></form>
<!-- .prevent calls preventDefault() -->
```

### Two-Way Binding (`v-model`)

Two-way binding synchronizes data in both directions. When the user types in an input, your data updates. When your code changes the data, the input updates. This is syntactic sugar combining `:value` and `@input`.

```vue
<input v-model="playerName" />

<!-- Modifiers customize the behavior -->
<input v-model.trim="name" />
<!-- Removes whitespace -->
<input v-model.number="age" />
<!-- Converts to number -->
<input v-model.lazy="name" />
<!-- Updates on blur, not every keystroke -->
```

### Implementation in Assignment 2: `UnoCard.vue`

**Demonstrates: Props, computed properties, and event binding**

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

**Key Points:**

- `:class` uses array syntax mixing static classes, computed value, and object syntax
- `{{ card.number }}` displays text binding
- `@click` handles events
- `computed()` creates derived state for styling

### Implementation in Assignment 2: `GameSetup.vue`

**Demonstrates: v-model for two-way binding**

```vue
<!-- Lines 8-12: Two-way binding with v-model -->
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

**Key Points:**

- `v-model` creates two-way binding - updates on user input and when code changes data
- `@keyup.enter` is event modifier - only triggers on Enter key
- `.trim` and `.number` modifiers transform input values

---

## 2. Control Structures

### What are they?

Control structures let you conditionally render elements or repeat elements for each item in a list. They control the structure of your rendered HTML based on your data.

### Conditional Rendering (`v-if`)

`v-if` completely adds or removes elements from the DOM based on a condition. Use `v-else-if` and `v-else` for multiple branches. This is best when the condition rarely changes because adding/removing DOM elements has a cost.

```vue
<div v-if="isMyTurn">Your turn!</div>
<div v-else-if="isGameOver">Game Over</div>
<div v-else>Waiting...</div>
```

### `v-show` (CSS Toggle)

`v-show` keeps the element in the DOM but toggles its CSS `display` property. The element is always rendered, just hidden or shown. Use this when you toggle visibility frequently because it's cheaper than adding/removing elements.

```vue
<div v-show="showColorPicker">Choose a color</div>
```

### List Rendering (`v-for`)

`v-for` repeats an element for each item in an array or object. You get access to each item and its index. The `:key` attribute is required - Vue uses it to track which elements changed when your data updates, enabling efficient DOM updates.

```vue
<Card v-for="(card, index) in hand" :key="card.id" :card="card" />
```

**Always provide `:key`** with a unique identifier. Without it, Vue can't efficiently update the list.

### Implementation in Assignment 2: `ColorChooser.vue`

**Demonstrates: v-for with :key, events**

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

**Key Points:**

- `v-for` iterates over the `colors` array
- `:key="color"` provides unique identifier for each button
- `@click.self` modifier - only fires when clicking the element itself, not children
- Template literal in `:class` creates dynamic class names

---

## 3. Re-rendering (Reactivity)

### What is it?

Reactivity is Vue's system for automatically updating the view when data changes. You don't manually update the DOM - you just change your data, and Vue figures out what needs to re-render. This is the core feature that makes Vue a reactive framework.

### `ref()` for Primitives

`ref()` creates a reactive wrapper around a value. In JavaScript code, you access the value through `.value`. In templates, Vue automatically unwraps it. Use `ref()` for primitive values like strings, numbers, and booleans.

```ts
const count = ref(0);
count.value++; // In script: use .value
// {{ count }}           In template: auto-unwrapped
```

### `reactive()` for Objects

`reactive()` makes an entire object reactive without needing `.value`. You access properties directly. Use this for objects where you want to track changes to multiple properties.

```ts
const game = reactive({ turn: 0, players: [] });
game.turn++; // Direct property access, no .value
```

### `computed()` for Derived State

`computed()` creates a value that depends on other reactive values. Vue tracks the dependencies automatically and only recalculates when they change. The result is cached - multiple accesses don't recalculate.

```ts
const isMyTurn = computed(() => game.turn === myIndex);
// Recalculates only when game.turn or myIndex changes
```

### `watch()` for Side Effects

`watch()` runs code when specific values change. Use this for side effects like API calls, logging, or updating non-reactive systems. Unlike computed, watch is for actions, not derived values.

```ts
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
});
```

### Lifecycle Hooks

Lifecycle hooks let you run code at specific points in a component's life. The most important are `onMounted` (component is in DOM) and `onUnmounted` (component is being removed). Use these for setup and cleanup.

```ts
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  // Component is now in the DOM
  console.log("Component mounted");
  startSubscription();
});

onUnmounted(() => {
  // Cleanup before component is removed
  stopSubscription(); // Prevent memory leaks!
});
```

### Template Refs

Template refs give you direct access to DOM elements. Use the `ref` attribute in the template and a matching `ref()` in script. Access the element after mounting.

```vue
<template>
  <input ref="inputElement" />
</template>

<script setup>
const inputElement = ref(null);

onMounted(() => {
  inputElement.value.focus(); // Focus the input when mounted
});
</script>
```

### Implementation in Assignment 2: `GamePlay.vue`

**Demonstrates: ref(), reactive(), computed(), watch(), lifecycle hooks**

#### Reactive State

```vue
<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { useGameStore } from "@/stores/game";
import { storeToRefs } from "pinia";

// Lines 132-134: Local state
const showColorChooser = ref(false);
const pendingWildCard = ref(null);
const shaking = ref(false);

// Lines 136: Pinia store
const gameStore = useGameStore();

// Lines 137: Get reactive state from store
const { game, players, currentPlayerIndex } = storeToRefs(gameStore);
</script>
```

#### Computed Properties

```vue
<script setup>
// Lines 173-215: Computed based on state
const isMyTurn = computed(() => {
  return game.value?.currentPlayerIndex === playerIndex.value;
});

const playableCards = computed(() => {
  if (!isMyTurn.value) return [];
  return hand.value.filter((card, index) => {
    return gameStore.canPlayCard(card);
  });
});

const canSayUno = computed(() => {
  return hand.value.length === 2 && isMyTurn.value;
});
</script>
```

#### Watchers for Side Effects

```vue
<script setup>
// Lines 138-140: Watch for changes
watch(currentPlayerIndex, (newIndex) => {
  console.log(`Turn changed to player ${newIndex}`);
});

// Lines 161-170: Watch game state
watch(
  () => game.value?.gameState,
  (newState) => {
    if (newState === "FINISHED") {
      router.push("/gameover");
    }
  }
);
</script>
```

#### Lifecycle Hooks

```vue
<script setup>
// Lines 143-158: Component lifecycle
onMounted(async () => {
  // Setup when component enters DOM
  await gameStore.initGame(players.value);
  console.log("Game initialized");
});

onUnmounted(() => {
  // Cleanup when component leaves DOM
  gameStore.cleanup();
});
</script>
```

**Key Points:**

- `ref()` for primitive values (booleans, nulls) - access with `.value` in script
- `storeToRefs()` keeps reactivity when destructuring Pinia store state
- `computed()` caches derived values - recalculates only when dependencies change
- `watch()` runs side effects - first watches single value, second watches nested property with getter
- `onMounted()` runs after component is in DOM - good for initialization
- `onUnmounted()` runs before component removed - good for cleanup

---

## 4. Components with Slots

### What are they?

Slots let a parent component inject content into a child component's template. The child defines where the content goes using `<slot>`, and the parent provides what goes there. This makes components flexible and reusable for different content.

### Default Slot

The simplest slot - content from the parent replaces the `<slot>` tag in the child. If the parent doesn't provide content, the slot's default content shows instead.

```vue
<!-- Parent -->
<Card><span>Custom content</span></Card>

<!-- Card.vue -->
<div class="card">
  <slot>Default if nothing provided</slot>
</div>
```

### Named Slots

When you need multiple slots, give them names. The parent uses `#slotName` to target specific slots. The unnamed slot is called "default".

```vue
<!-- Parent -->
<Card>
  <template #header>Title</template>
  <template #default>Body content</template>
  <template #footer>Footer</template>
</Card>

<!-- Card.vue -->
<header><slot name="header"></slot></header>
<main><slot></slot></main>
<footer><slot name="footer"></slot></footer>
```

### Scoped Slots

Sometimes the child has data that the parent needs to render the slot content. Scoped slots pass data from child to parent. The child binds data to the slot, and the parent receives it through the slot props.

```vue
<!-- Child: Hand.vue - passes card data up -->
<div v-for="(card, i) in cards">
  <slot :card="card" :index="i"></slot>
</div>

<!-- Parent - receives and uses the data -->
<Hand>
  <template #default="{ card, index }">
    <Card :card="card" @click="play(index)" />
  </template>
</Hand>
```

### Implementation in Assignment 2: `PlayerHand.vue`

**Demonstrates: Scoped slots - passing data from child to parent**

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

**Parent receiving scoped data:**

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

**Key Points:**

- Child (`PlayerHand.vue`) exposes data through slot props: `:card`, `:index`, `:playable`
- Parent receives data with destructuring: `{ card, index, playable }`
- Fallback content (`<UnoCard :card="card" />`) renders if parent doesn't provide slot content
- Enables parent to control rendering while child controls data

---

## 5. Routing (Vue Router)

### What is it?

Routing maps URLs to components. When the URL changes, the corresponding component renders. This creates a single-page application where navigation feels instant because you're not loading new HTML pages - just swapping components.

### Route Configuration

You define routes as an array mapping paths to components. Dynamic segments like `:gameId` capture variable parts of the URL.

```js
const routes = [
  { path: "/", component: Home },
  { path: "/game/:gameId", name: "game", component: Game },
];
```

### Navigation

`<router-link>` creates navigation links that don't reload the page. `<router-view>` is where the matched component renders. Together they create seamless navigation.

```vue
<router-link to="/">Home</router-link>
<router-link
  :to="{ name: 'game', params: { gameId: '123' } }"
>Play</router-link>
<router-view />
<!-- Matched component renders here -->
```

### Programmatic Navigation

Sometimes you need to navigate from code, like after form submission. Use `useRouter()` to get the router instance and call `push()` to navigate.

```ts
const router = useRouter();
router.push("/game/123");

// Access current route parameters
const route = useRoute();
const id = route.params.gameId;
```

### Navigation Guards

Guards let you control navigation - for authentication, unsaved changes warnings, or data loading. They can redirect, cancel, or allow navigation.

```ts
// Global guard in router setup
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'  // Redirect to login
  }
})

// Per-route guard
{
  path: '/game/:id',
  component: Game,
  beforeEnter: (to) => {
    if (!gameExists(to.params.id)) return '/lobby'
  }
}
```

### Implementation in Assignment 2: Router & Navigation

**Router Configuration (`router/index.js`)**

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

**Using Router in Components**

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

**Key Points:**

- Three routes defined: `/` (setup), `/play` (gameplay), `/gameover` (end screen)
- `beforeEnter` guard prevents accessing `/play` without initialized game
- `router.push()` navigates programmatically (e.g., after form submission)
- `<router-link>` creates navigation links without page reload
- `<router-view>` in `App.vue` renders matched route component

---

## 6. Props and Emits

### What are they?

Props and emits are how parent and child components communicate. Props send data down from parent to child. Emits send events up from child to parent. This one-way data flow makes components predictable and easy to understand.

### Props (Parent to Child)

Props are inputs to a component. The parent binds values, the child declares what props it expects. Props should be treated as read-only - the child shouldn't modify them.

```vue
<!-- Parent passes data down -->
<Card :card="myCard" :playable="isMyTurn" />

<!-- Card.vue declares expected props -->
<script setup>
const props = defineProps<{ card: Card, playable: boolean }>()
</script>
```

### Emits (Child to Parent)

When something happens in the child that the parent needs to know about, the child emits an event. The parent listens with `@eventName`. Events can carry data as payload.

```vue
<!-- Card.vue emits events -->
<script setup>
const emit = defineEmits(["play", "select"]);
function handleClick() {
  emit("play", props.card); // Send card as payload
}
</script>

<!-- Parent listens for events -->
<Card @play="handlePlay" @select="handleSelect" />
```

### v-model on Components

`v-model` on a component is shorthand for passing a prop and listening for an update event. It enables two-way binding between parent data and child component.

```vue
<!-- Parent uses v-model -->
<PlayerInput v-model="name" />

<!-- Child implements the v-model contract -->
<script setup>
defineProps(["modelValue"]);
defineEmits(["update:modelValue"]);
</script>
<template>
  <input
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
```

### Implementation in Assignment 2

Props and emits are used throughout the application for component communication:

**`UnoCard.vue` - Receiving props and emitting events (shown earlier in Binding section)**

```vue
<script setup>
// Lines 32-41: Define props (Parent → Child)
const props = defineProps({
  card: { type: Object, required: true },
  playable: { type: Boolean, default: false },
});

// Line 43: Define emits (Child → Parent)
const emit = defineEmits(["click"]);

function handleClick() {
  if (props.playable) {
    emit("click", props.card); // Send card data to parent
  }
}
</script>
```

**`ColorChooser.vue` - Emitting color choice (shown earlier)**

```vue
<script setup>
const emit = defineEmits(["choose-color"]);

function chooseColor(color) {
  emit("choose-color", color); // Send selected color to parent
}
</script>
```

**Data Flow Example: Playing a card**

1. User clicks card → `UnoCard.vue` emits `'click'` event with card data
2. Parent `GamePlay.vue` catches event with `@click="handleCardClick"`
3. `handleCardClick` calls Pinia store action: `gameStore.playCard(index)`
4. Store updates game state
5. Vue's reactivity propagates changes to all components

**Key Points:**

- Props flow down (parent → child) - immutable in child
- Events flow up (child → parent) - carry payload data
- One-way data flow makes debugging easier
- `defineProps()` and `defineEmits()` provide type safety

---

## 7. State Management (Pinia)

### What is it?

Pinia is Vue's official state management library. It provides a centralized store for data that multiple components need to access. Instead of passing props through many levels of components, any component can access the store directly.

### Why use it?

When several components need the same data, lifting state to a common ancestor and passing it down becomes messy. A store provides a single source of truth that any component can read and update. It also integrates with Vue Devtools for debugging.

### Creating a Store

A store contains state (the data), getters (computed values derived from state), and actions (methods that modify state). The `defineStore` function creates a store with a unique name.

```ts
export const useGameStore = defineStore("game", () => {
  // State - the reactive data
  const game = ref(null);
  const playerIndex = ref(0);

  // Getters - derived state
  const myHand = computed(() => game.value?.playerHand(playerIndex.value));
  const isMyTurn = computed(
    () => game.value?.playerInTurn === playerIndex.value
  );

  // Actions - methods that modify state
  function playCard(index) {
    game.value.play(index);
  }

  return { game, playerIndex, myHand, isMyTurn, playCard };
});
```

### Using a Store

Import and call the store function in your component. Use `storeToRefs` to keep reactivity when destructuring state and getters. Actions can be destructured directly.

```ts
const store = useGameStore();
const { myHand, isMyTurn } = storeToRefs(store); // Keep reactivity
const { playCard } = store; // Actions directly
```

### Implementation in Assignment 2: Pinia Stores

**Store Definition (`stores/game.js`)**

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

**Using Store in Components**

```vue
<script setup>
import { useGameStore } from "@/stores/game";
import { storeToRefs } from "pinia";

const store = useGameStore();

// ❌ WRONG - destructure loses reactivity
const { count } = store;

// ✅ CORRECT - use storeToRefs for state/getters
const { game, topCard, isGameOver } = storeToRefs(store);

// ✅ CORRECT - actions can be destructured directly
const { playCard, drawCard } = store;

// Use in methods
function handleCardClick(index) {
  playCard(index);
}
</script>

<template>
  <p>{{ count }}</p>
  <button @click="increment">+</button>
</template>
```

**Key Points:**

- Store uses Composition API style with `ref()` and `computed()`
- State: `game`, `players`, `currentRound` (reactive references)
- Getters: `currentPlayerIndex`, `topCard`, `isGameOver` (computed properties)
- Actions: `initGame`, `playCard`, `drawCard` (functions that modify state)
- **Critical:** Use `storeToRefs()` when destructuring state/getters to keep reactivity
- Actions don't need `storeToRefs()` - they're just functions
- Multiple components access same store - single source of truth

---

## Common Exam Questions

**Q: "Show me how components communicate"**

- **Parent → Child:** Props (`defineProps`) - Show [UnoCard.vue lines 32-41](#implementation-in-assignment-2-unocard.vue)
- **Child → Parent:** Events (`defineEmits`) - Show [UnoCard.vue line 43](#implementation-in-assignment-2-unocard.vue)
- **Between siblings:** Pinia store - Show [stores/game.js](#implementation-in-assignment-2-pinia-stores)

**Q: "Explain reactivity in this component"**

- **Show:** [GamePlay.vue lines 132-137](#reactive-state)
- **Explain:** "`ref()` makes primitives reactive, `reactive()` for objects. In templates, refs auto-unwrap. `computed()` creates derived values that update when dependencies change."

**Q: "When do you use v-if vs v-show?"**

- **v-if:** Show [UnoCard.vue lines 7-22](#implementation-in-assignment-2-unocard.vue) - "Completely adds/removes from DOM. Use when rarely changes."
- **v-show:** "Toggles CSS display. Use for frequent toggling."

**Q: "Walk through the data flow when a card is played"**

1. User clicks card → `UnoCard.vue` emits 'click' event
2. Parent `GamePlay.vue` catches event, calls `handleCardClick(index)`
3. Calls Pinia store action: `gameStore.playCard(index)`
4. Store updates game state
5. Vue's reactivity detects change
6. All components using that state re-render automatically

**Q: "Why use Pinia?"**

- **Show:** [stores/game.js](#implementation-in-assignment-2-pinia-stores)
- **Explain:** "Multiple components need game state. Instead of prop drilling through many levels, Pinia provides centralized state any component can access. Also integrates with Vue DevTools for debugging."

**Q: "Explain computed vs watch"**

- **computed:** [GamePlay.vue lines 173+](#computed-properties) - "For derived state. Cached, only recalculates when dependencies change. Returns a value."
- **watch:** [GamePlay.vue lines 138-140](#watchers-for-side-effects) - "For side effects like API calls or logging. Doesn't return a value, just runs code."

---

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

---

## Quick Reference Tables

### Concept Quick Answers

| Question                  | Answer                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| v-bind vs v-model?        | v-bind is one-way (data to DOM), v-model is two-way (data syncs with form input)                             |
| v-if vs v-show?           | v-if adds/removes from DOM (use for rare changes), v-show toggles CSS display (use for frequent toggling)    |
| Why `:key` in v-for?      | Vue uses keys to track elements and efficiently update the DOM when data changes                             |
| ref vs reactive?          | ref wraps a single value (needs .value), reactive makes an object's properties reactive (no .value)          |
| Props vs emits?           | Props flow down (parent to child), emits flow up (child to parent) - one-way data flow                       |
| Why Pinia?                | Centralized state for data shared across components, devtools support, simpler than passing props everywhere |
| onMounted vs onUnmounted? | onMounted runs after component enters DOM (setup), onUnmounted runs before removal (cleanup)                 |
| What are template refs?   | Direct access to DOM elements using ref attribute and ref() - useful for focus, measurements                 |
| Dynamic :class syntax?    | Object `{ active: bool }` or array `[base, { cond: bool }]` for conditional CSS classes                      |

### Where Concepts Are Applied in Assignment 2

| Concept                     | File                                           | Location                                                        |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **Text Binding `{{ }}`**    | `App.vue`, `GamePlay.vue`, `GameOver.vue`      | Player names, scores, turn indicators, game state               |
| **Attribute Binding (`:`)** | `UnoCard.vue:3`, `PlayerHand.vue:7,10`         | `:class`, `:card`, `:playable`, `:style` bindings               |
| **Dynamic `:class`**        | `UnoCard.vue:3`, `GamePlay.vue:37-39`          | `['uno-card', colorClass, { playable, disabled }]` mixed syntax |
| **Event Binding (`@`)**     | `ColorChooser.vue:2,10`, `GameBoard.vue:16`    | `@click`, `@click.self`, `@draw-card`                           |
| **`v-model`**               | `GameSetup.vue:10`                             | `v-model="playerNameModel"` on input                            |
| **`v-if/v-else-if/v-else`** | `UnoCard.vue:7-22`, `GamePlay.vue:7-13`        | Card type rendering, turn display                               |
| **`v-for` with `:key`**     | `ColorChooser.vue:7-10`, `PlayerHand.vue:4-11` | Iterating colors, cards, players                                |
| **`ref()`**                 | `ColorChooser.vue:23`, `GamePlay.vue:132-134`  | `shaking`, `showColorChooser`, `pendingWildCard`                |
| **`reactive()`**            | `GameSetup.vue:64`                             | `formState = reactive({ playerName, numBots })`                 |
| **`computed()`**            | `UnoCard.vue:45-50`, `GamePlay.vue:173-215`    | `colorClass`, `isGameReady`, `playableCards`, `canSayUno`       |
| **`watch()`**               | `GamePlay.vue:138-140, 161-170`                | Watch `currentPlayerIndex`, `gameState` changes                 |
| **`onMounted`**             | `GameOver.vue:102-106`, `GamePlay.vue:143-158` | Check game state, initialize game                               |
| **Route Config**            | `router/index.js:6-21`                         | Routes for `/`, `/play`, `/gameover`                            |
| **`<router-view>`**         | `App.vue:11`                                   | Renders matched route component                                 |
| **`useRouter()`**           | `GameOver.vue:96`, `GamePlay.vue:130`          | Programmatic navigation with `router.push()`                    |
| **`defineProps()`**         | `UnoCard.vue:32-41`, `PlayerHand.vue:19-28`    | `card`, `playable`, `cards` props                               |
| **`defineEmits()`**         | `ColorChooser.vue:25`, `UnoCard.vue:43`        | `'choose-color'`, `'click'` events                              |
| **Pinia `defineStore()`**   | `stores/game.js:7`, `stores/player.js:4`       | `useGameStore`, `usePlayerStore`                                |
| **Pinia State/Getters**     | `stores/game.js:29-131`                        | `currentRound`, `players`, `scores`, `topCard`, etc.            |
| **Pinia Actions**           | `stores/game.js:133-541`                       | `initGame`, `playCard`, `drawCard`, `sayUno`                    |
