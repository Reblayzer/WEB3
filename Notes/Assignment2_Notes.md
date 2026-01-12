# Assignment 2: UNO Browser Client (Vue.js + State Management)

## Overview
**Focus:** Vue.js and state management  
**Stack:** Vue 3, Pinia, Vite  
**Goal:** Build an interactive browser UI for the UNO domain model

---

## Exam Focus Areas
**The examiner will ask about:**
- Binding
- Control structures
- Re-rendering
- Components with slots
- Routing
- Props and emits
- State management

### Quick Explanations with Snippets
- **Binding** — connect template to data for text/attrs/events.
```vue
<input v-model="name" :disabled="isBusy" @keyup.enter="save" />
```
- **Control structures** — render conditionally or repeat lists.
```vue
<p v-if="isMyTurn">Your turn</p>
<Card v-for="card in hand" :key="card.id" :card="card" />
```
- **Re-rendering** — reactive refs trigger updates; computed derives values.
```vue
<script setup>
import { ref, computed } from 'vue'
const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```
- **Components with slots** — parents inject layout/content into children.
```vue
<Card>
  <template #header>Top</template>
  Body text
</Card>
```
- **Routing** — file router renders matched component and links switch views.
```vue
<router-link :to="{ name: 'game', params: { id } }">Play</router-link>
<router-view />
```
- **Props and emits** — parent passes data, child notifies with events.
```vue
<Card :card="c" @play="onPlay(c)" />
```
- **State management (Pinia)** — centralized store shares reactive state/actions.
```ts
export const useGameStore = defineStore('game', {
  state: () => ({ hand: [] as Card[] }),
  actions: { add(card: Card) { this.hand.push(card) } }
})
```

---

## 1. Binding

### Text Binding (Interpolation)
```vue
<template>
  <!-- Mustache syntax for text -->
  <p>Player: {{ playerName }}</p>
  <p>Score: {{ score }}</p>
  
  <!-- Expressions allowed -->
  <p>Total: {{ score * 2 }}</p>
</template>
```

### Attribute Binding (v-bind / :)
```vue
<template>
  <!-- v-bind:attribute or shorthand :attribute -->
  <div :class="cardColorClass"></div>
  <img :src="cardImage" :alt="cardName">
  <button :disabled="!isMyTurn">Play</button>
  
  <!-- Dynamic binding to object -->
  <div v-bind="cardAttributes"></div>
</template>

<script setup>
const cardAttributes = {
  class: 'card',
  id: 'card-1',
  'data-color': 'red'
}
</script>
```

### Two-Way Binding (v-model)
```vue
<template>
  <!-- v-model = v-bind:value + v-on:input -->
  <input v-model="playerName" />
  
  <!-- Modifiers -->
  <input v-model.trim="playerName" />     <!-- Trim whitespace -->
  <input v-model.number="targetScore" />  <!-- Cast to number -->
  <input v-model.lazy="playerName" />     <!-- Update on blur -->
</template>

<script setup>
import { ref } from 'vue'
const playerName = ref('')
const targetScore = ref(500)
</script>
```

### Event Binding (v-on / @)
```vue
<template>
  <!-- v-on:event or shorthand @event -->
  <button @click="playCard">Play</button>
  <button @click="playCard(index)">Play Card {{ index }}</button>
  
  <!-- Event modifiers -->
  <form @submit.prevent="handleSubmit"></form>  <!-- preventDefault -->
  <div @click.stop="handleClick"></div>          <!-- stopPropagation -->
  <input @keyup.enter="submit">                  <!-- Key modifier -->
</template>
```

---

## 2. Control Structures

### Conditional Rendering (v-if / v-else / v-else-if)
```vue
<template>
  <!-- v-if removes element from DOM entirely -->
  <div v-if="isMyTurn">Your turn!</div>
  <div v-else-if="isGameOver">Game Over</div>
  <div v-else>Waiting for {{ currentPlayer }}...</div>
  
  <!-- v-show toggles display CSS (element stays in DOM) -->
  <div v-show="showColorPicker">Choose a color</div>
</template>
```

**v-if vs v-show:**
- `v-if`: Element added/removed from DOM. Use for rarely changing conditions.
- `v-show`: Element always in DOM, CSS `display` toggled. Use for frequently toggling.

### List Rendering (v-for)
```vue
<template>
  <!-- Array iteration -->
  <div v-for="(card, index) in hand" :key="card.id">
    <Card :card="card" @click="playCard(index)" />
  </div>
  
  <!-- Object iteration -->
  <div v-for="(score, playerName) in scores" :key="playerName">
    {{ playerName }}: {{ score }}
  </div>
  
  <!-- Range -->
  <span v-for="n in 5" :key="n">{{ n }}</span>
</template>
```

⚠️ **Always use `:key`** - Vue uses it for efficient DOM updates!

---

## 3. Re-rendering (Reactivity)

### How Vue Reactivity Works
```vue
<script setup>
import { ref, reactive, computed, watch } from 'vue'

// ref() - for primitives (accessed via .value in JS)
const count = ref(0)
count.value++  // In script
// {{ count }} in template (auto-unwrapped)

// reactive() - for objects (no .value needed)
const game = reactive({
  players: [],
  currentTurn: 0
})
game.currentTurn++  // Direct access

// computed() - derived state, auto-updates when dependencies change
const isMyTurn = computed(() => game.currentTurn === myIndex)

// watch() - side effects when value changes
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})
</script>
```

### Forcing Re-renders
```js
// Problem: Vue can't detect some changes
const round = ref(gameRound)
round.value.play(cardIndex)  // Mutation - Vue might miss this!

// Solution: Use a "key" to force recalculation
const roundKey = ref(0)

const currentRound = computed(() => {
  roundKey.value  // Creates dependency
  return game.currentRound()
})

function playCard(index) {
  round.value.play(index)
  roundKey.value++  // Force computed to recalculate
}
```

### When Vue Re-renders
1. Reactive state (`ref`, `reactive`) changes
2. Props change
3. Computed dependencies change
4. Parent component re-renders (unless memoized)

---

## 4. Components with Slots

### Default Slot
```vue
<!-- Parent -->
<Card>
  <span>Custom content here</span>
</Card>

<!-- Card.vue (Child) -->
<template>
  <div class="card">
    <slot>Default content if nothing passed</slot>
  </div>
</template>
```

### Named Slots
```vue
<!-- Parent -->
<Card>
  <template #header>Card Title</template>
  <template #default>Card body content</template>
  <template #footer>
    <button>Action</button>
  </template>
</Card>

<!-- Card.vue (Child) -->
<template>
  <div class="card">
    <header><slot name="header"></slot></header>
    <main><slot></slot></main>  <!-- default slot -->
    <footer><slot name="footer"></slot></footer>
  </div>
</template>
```

### Scoped Slots (Passing Data Back)
```vue
<!-- Child: Hand.vue -->
<template>
  <div class="hand">
    <div v-for="(card, i) in cards" :key="i">
      <!-- Pass card data to parent's slot content -->
      <slot :card="card" :index="i" :isPlayable="canPlay(card)">
        {{ card.type }}  <!-- Default if no slot content -->
      </slot>
    </div>
  </div>
</template>

<!-- Parent -->
<Hand :cards="myHand">
  <!-- Receive scoped data with v-slot or # -->
  <template #default="{ card, index, isPlayable }">
    <Card 
      :card="card" 
      :playable="isPlayable"
      @click="playCard(index)"
    />
  </template>
</Hand>
```

---

## 5. Routing (Vue Router)

### Router Setup
```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Game from '../views/Game.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/game/:gameId', name: 'game', component: Game },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### Using Router in Components
```vue
<template>
  <!-- Declarative navigation -->
  <router-link to="/">Home</router-link>
  <router-link :to="{ name: 'game', params: { gameId: '123' } }">
    Join Game
  </router-link>
  
  <!-- Route view renders matched component -->
  <router-view />
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Programmatic navigation
function goToGame(id) {
  router.push(`/game/${id}`)
  // or: router.push({ name: 'game', params: { gameId: id } })
}

// Access route params
const gameId = route.params.gameId
</script>
```

### Navigation Guards
```js
// Global guard
router.beforeEach((to, from) => {
  if (to.name === 'game' && !isLoggedIn()) {
    return { name: 'home' }  // Redirect
  }
})

// Per-route guard
{
  path: '/game/:gameId',
  component: Game,
  beforeEnter: (to, from) => {
    if (!gameExists(to.params.gameId)) {
      return { name: 'not-found' }
    }
  }
}
```

---

## 6. Props and Emits

### Props (Parent → Child)
```vue
<!-- Parent -->
<Card :card="myCard" :playable="isMyTurn" />

<!-- Card.vue (Child) -->
<script setup>
// Define props with types and defaults
const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  playable: {
    type: Boolean,
    default: false
  }
})

// Access: props.card, props.playable
</script>

<template>
  <div :class="{ disabled: !playable }">
    {{ card.type }}
  </div>
</template>
```

### Emits (Child → Parent)
```vue
<!-- Card.vue (Child) -->
<script setup>
const emit = defineEmits(['select', 'play'])

function handleClick() {
  emit('select', props.card)  // Emit with payload
}

function handleDoubleClick() {
  emit('play', { card: props.card, index: props.index })
}
</script>

<template>
  <div @click="handleClick" @dblclick="handleDoubleClick">
    {{ card.type }}
  </div>
</template>

<!-- Parent -->
<Card 
  :card="myCard" 
  @select="onCardSelect" 
  @play="onCardPlay"
/>
```

### v-model on Components
```vue
<!-- Parent - v-model is syntactic sugar -->
<PlayerInput v-model="playerName" />
<!-- Equivalent to: -->
<PlayerInput :modelValue="playerName" @update:modelValue="playerName = $event" />

<!-- PlayerInput.vue (Child) -->
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input 
    :value="modelValue" 
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
```

---

## 7. State Management (Pinia)

### Creating a Store
```js
// stores/game.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // State
  const game = ref(null)
  const playerIndex = ref(0)
  
  // Getters (computed)
  const currentRound = computed(() => game.value?.currentRound())
  const myHand = computed(() => currentRound.value?.playerHand(playerIndex.value))
  const isMyTurn = computed(() => 
    currentRound.value?.playerInTurn() === playerIndex.value
  )
  
  // Actions
  function startGame(players) {
    game.value = createGame({ players })
  }
  
  function playCard(cardIndex, color) {
    currentRound.value?.play(cardIndex, color)
  }
  
  return { game, playerIndex, currentRound, myHand, isMyTurn, startGame, playCard }
})
```

### Using Store in Components
```vue
<script setup>
import { useGameStore } from '@/stores/game'
import { storeToRefs } from 'pinia'

const gameStore = useGameStore()

// For reactive state, use storeToRefs
const { myHand, isMyTurn } = storeToRefs(gameStore)

// Actions can be destructured directly
const { playCard } = gameStore
</script>

<template>
  <Hand v-if="isMyTurn" :cards="myHand" @play="playCard" />
</template>
```

### Why Pinia over Local State?
1. **Shared state** across multiple components
2. **Devtools** integration for debugging
3. **Plugins** for persistence, etc.
4. **Server-side rendering** support

---

## Quick Reference for Exam

| Topic | Key Points |
|-------|------------|
| **v-bind (:)** | One-way: data → DOM attribute |
| **v-model** | Two-way: data ↔ form input |
| **v-on (@)** | Event handling with modifiers (.prevent, .stop) |
| **v-if vs v-show** | v-if = DOM add/remove; v-show = CSS toggle |
| **v-for** | Always use :key for efficient updates |
| **ref()** | Reactive primitive (use .value in JS) |
| **reactive()** | Reactive object (no .value needed) |
| **computed()** | Cached derived state |
| **watch()** | Side effects on state change |
| **Slots** | Parent injects content into child |
| **Scoped Slots** | Child passes data back to parent's slot |
| **Props** | Data flows DOWN (parent → child) |
| **Emits** | Events flow UP (child → parent) |
| **Pinia** | Centralized state management |
