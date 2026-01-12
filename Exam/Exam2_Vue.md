# Exam 2: Vue.js and State Management

> **Exam Topics:** binding, control structures, re-rendering, components with slots, routing, props and emits, state management

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
<img :src="cardImage">
```

### Dynamic Class Binding
For conditional CSS classes, use object or array syntax. This is common for applying styles based on component state.

```vue
<!-- Object syntax: class applied when condition is true -->
<div :class="{ active: isSelected, disabled: !canPlay }"></div>

<!-- Array syntax: combine static and dynamic classes -->
<div :class="[baseClass, { highlighted: isMyTurn }]"></div>

<!-- Dynamic inline styles -->
<div :style="{ backgroundColor: cardColor, transform: `rotate(${angle}deg)` }"></div>
```

### Event Binding (`v-on` or `@`)
Event binding connects DOM events to methods in your component. When the event fires, Vue calls your method. Modifiers like `.prevent` add common behaviors without extra code.

```vue
<button @click="playCard">Play</button>
<button @click="playCard(index)">Play Card</button>
<form @submit.prevent="save"></form>    <!-- .prevent calls preventDefault() -->
```

### Two-Way Binding (`v-model`)
Two-way binding synchronizes data in both directions. When the user types in an input, your data updates. When your code changes the data, the input updates. This is syntactic sugar combining `:value` and `@input`.

```vue
<input v-model="playerName" />

<!-- Modifiers customize the behavior -->
<input v-model.trim="name" />      <!-- Removes whitespace -->
<input v-model.number="age" />     <!-- Converts to number -->
<input v-model.lazy="name" />      <!-- Updates on blur, not every keystroke -->
```

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

---

## 3. Re-rendering (Reactivity)

### What is it?
Reactivity is Vue's system for automatically updating the view when data changes. You don't manually update the DOM - you just change your data, and Vue figures out what needs to re-render. This is the core feature that makes Vue a reactive framework.

### `ref()` for Primitives
`ref()` creates a reactive wrapper around a value. In JavaScript code, you access the value through `.value`. In templates, Vue automatically unwraps it. Use `ref()` for primitive values like strings, numbers, and booleans.

```ts
const count = ref(0)
count.value++            // In script: use .value
// {{ count }}           In template: auto-unwrapped
```

### `reactive()` for Objects
`reactive()` makes an entire object reactive without needing `.value`. You access properties directly. Use this for objects where you want to track changes to multiple properties.

```ts
const game = reactive({ turn: 0, players: [] })
game.turn++              // Direct property access, no .value
```

### `computed()` for Derived State
`computed()` creates a value that depends on other reactive values. Vue tracks the dependencies automatically and only recalculates when they change. The result is cached - multiple accesses don't recalculate.

```ts
const isMyTurn = computed(() => game.turn === myIndex)
// Recalculates only when game.turn or myIndex changes
```

### `watch()` for Side Effects
`watch()` runs code when specific values change. Use this for side effects like API calls, logging, or updating non-reactive systems. Unlike computed, watch is for actions, not derived values.

```ts
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})
```

### Lifecycle Hooks
Lifecycle hooks let you run code at specific points in a component's life. The most important are `onMounted` (component is in DOM) and `onUnmounted` (component is being removed). Use these for setup and cleanup.

```ts
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  // Component is now in the DOM
  console.log('Component mounted')
  startSubscription()
})

onUnmounted(() => {
  // Cleanup before component is removed
  stopSubscription()  // Prevent memory leaks!
})
```

### Template Refs
Template refs give you direct access to DOM elements. Use the `ref` attribute in the template and a matching `ref()` in script. Access the element after mounting.

```vue
<template>
  <input ref="inputElement" />
</template>

<script setup>
const inputElement = ref(null)

onMounted(() => {
  inputElement.value.focus()  // Focus the input when mounted
})
</script>
```

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

---

## 5. Routing (Vue Router)

### What is it?
Routing maps URLs to components. When the URL changes, the corresponding component renders. This creates a single-page application where navigation feels instant because you're not loading new HTML pages - just swapping components.

### Route Configuration
You define routes as an array mapping paths to components. Dynamic segments like `:gameId` capture variable parts of the URL.

```js
const routes = [
  { path: '/', component: Home },
  { path: '/game/:gameId', name: 'game', component: Game }
]
```

### Navigation
`<router-link>` creates navigation links that don't reload the page. `<router-view>` is where the matched component renders. Together they create seamless navigation.

```vue
<router-link to="/">Home</router-link>
<router-link :to="{ name: 'game', params: { gameId: '123' } }">Play</router-link>
<router-view />   <!-- Matched component renders here -->
```

### Programmatic Navigation
Sometimes you need to navigate from code, like after form submission. Use `useRouter()` to get the router instance and call `push()` to navigate.

```ts
const router = useRouter()
router.push('/game/123')

// Access current route parameters
const route = useRoute()
const id = route.params.gameId
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
const emit = defineEmits(['play', 'select'])
function handleClick() {
  emit('play', props.card)  // Send card as payload
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
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
<template>
  <input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
</template>
```

---

## 7. State Management (Pinia)

### What is it?
Pinia is Vue's official state management library. It provides a centralized store for data that multiple components need to access. Instead of passing props through many levels of components, any component can access the store directly.

### Why use it?
When several components need the same data, lifting state to a common ancestor and passing it down becomes messy. A store provides a single source of truth that any component can read and update. It also integrates with Vue Devtools for debugging.

### Creating a Store
A store contains state (the data), getters (computed values derived from state), and actions (methods that modify state). The `defineStore` function creates a store with a unique name.

```ts
export const useGameStore = defineStore('game', () => {
  // State - the reactive data
  const game = ref(null)
  const playerIndex = ref(0)

  // Getters - derived state
  const myHand = computed(() => game.value?.playerHand(playerIndex.value))
  const isMyTurn = computed(() => game.value?.playerInTurn === playerIndex.value)

  // Actions - methods that modify state
  function playCard(index) { game.value.play(index) }

  return { game, playerIndex, myHand, isMyTurn, playCard }
})
```

### Using a Store
Import and call the store function in your component. Use `storeToRefs` to keep reactivity when destructuring state and getters. Actions can be destructured directly.

```ts
const store = useGameStore()
const { myHand, isMyTurn } = storeToRefs(store)  // Keep reactivity
const { playCard } = store                        // Actions directly
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| v-bind vs v-model? | v-bind is one-way (data to DOM), v-model is two-way (data syncs with form input) |
| v-if vs v-show? | v-if adds/removes from DOM (use for rare changes), v-show toggles CSS display (use for frequent toggling) |
| Why `:key` in v-for? | Vue uses keys to track elements and efficiently update the DOM when data changes |
| ref vs reactive? | ref wraps a single value (needs .value), reactive makes an object's properties reactive (no .value) |
| Props vs emits? | Props flow down (parent to child), emits flow up (child to parent) - one-way data flow |
| Why Pinia? | Centralized state for data shared across components, devtools support, simpler than passing props everywhere |
| onMounted vs onUnmounted? | onMounted runs after component enters DOM (setup), onUnmounted runs before removal (cleanup) |
| What are template refs? | Direct access to DOM elements using ref attribute and ref() - useful for focus, measurements |
| Dynamic :class syntax? | Object `{ active: bool }` or array `[base, { cond: bool }]` for conditional CSS classes |

---

## Where It's Applied in Assignment 2

| Concept | File | Location |
|---------|------|----------|
| **Text Binding `{{ }}`** | `App.vue`, `GamePlay.vue`, `GameOver.vue` | Player names, scores, turn indicators, game state |
| **Attribute Binding (`:`)** | `UnoCard.vue:3`, `PlayerHand.vue:7,10` | `:class`, `:card`, `:playable`, `:style` bindings |
| **Dynamic `:class`** | `UnoCard.vue:3`, `GamePlay.vue:37-39` | `['uno-card', colorClass, { playable, disabled }]` mixed syntax |
| **Event Binding (`@`)** | `ColorChooser.vue:2,10`, `GameBoard.vue:16` | `@click`, `@click.self`, `@draw-card` |
| **`v-model`** | `GameSetup.vue:10` | `v-model="playerNameModel"` on input |
| **`v-if/v-else-if/v-else`** | `UnoCard.vue:7-22`, `GamePlay.vue:7-13` | Card type rendering, turn display |
| **`v-for` with `:key`** | `ColorChooser.vue:7-10`, `PlayerHand.vue:4-11` | Iterating colors, cards, players |
| **`ref()`** | `ColorChooser.vue:23`, `GamePlay.vue:132-134` | `shaking`, `showColorChooser`, `pendingWildCard` |
| **`reactive()`** | `GameSetup.vue:64` | `formState = reactive({ playerName, numBots })` |
| **`computed()`** | `UnoCard.vue:45-50`, `GamePlay.vue:173-215` | `colorClass`, `isGameReady`, `playableCards`, `canSayUno` |
| **`watch()`** | `GamePlay.vue:138-140, 161-170` | Watch `currentPlayerIndex`, `gameState` changes |
| **`onMounted`** | `GameOver.vue:102-106`, `GamePlay.vue:143-158` | Check game state, initialize game |
| **Route Config** | `router/index.js:6-21` | Routes for `/`, `/play`, `/gameover` |
| **`<router-view>`** | `App.vue:11` | Renders matched route component |
| **`useRouter()`** | `GameOver.vue:96`, `GamePlay.vue:130` | Programmatic navigation with `router.push()` |
| **`defineProps()`** | `UnoCard.vue:32-41`, `PlayerHand.vue:19-28` | `card`, `playable`, `cards` props |
| **`defineEmits()`** | `ColorChooser.vue:25`, `UnoCard.vue:43` | `'choose-color'`, `'click'` events |
| **Pinia `defineStore()`** | `stores/game.js:7`, `stores/player.js:4` | `useGameStore`, `usePlayerStore` |
| **Pinia State/Getters** | `stores/game.js:29-131` | `currentRound`, `players`, `scores`, `topCard`, etc. |
| **Pinia Actions** | `stores/game.js:133-541` | `initGame`, `playCard`, `drawCard`, `sayUno` |
