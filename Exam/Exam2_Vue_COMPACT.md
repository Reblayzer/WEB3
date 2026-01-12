# Vue.js & State Management - Quick Reference

## Binding Syntax

| Syntax          | Purpose      | Example                |
| --------------- | ------------ | ---------------------- |
| `{{ }}`         | Text content | `{{ playerName }}`     |
| `:` or `v-bind` | Attribute    | `:disabled="!canPlay"` |
| `@` or `v-on`   | Event        | `@click="play"`        |
| `v-model`       | Two-way      | `v-model="name"`       |

### Dynamic Class/Style

```vue
:class="{ active: bool, disabled: bool }" :class="[base, { conditional: bool }]"
:style="{ color: cardColor, transform: `rotate(${angle}deg)` }"
```

## Control Structures

### `v-if` (Add/Remove DOM)

```vue
<div v-if="condition">Show</div>
<div v-else-if="other">Alternative</div>
<div v-else>Default</div>
```

Use when condition rarely changes

### `v-show` (Toggle CSS)

```vue
<div v-show="visible">Toggle</div>
```

Use for frequent toggling

### `v-for` (Lists)

```vue
<Card v-for="(card, i) in hand" :key="card.id" :card="card" />
```

**Always need `:key`** with unique identifier

## Reactivity

### `ref()` - Primitives

```ts
const count = ref(0);
count.value++; // In script: use .value
// {{ count }}       In template: auto-unwrapped
```

### `reactive()` - Objects

```ts
const game = reactive({ turn: 0, players: [] });
game.turn++; // Direct access, no .value
```

### `computed()` - Derived State

```ts
const isMyTurn = computed(() => game.turn === myIndex);
```

Cached, only recalculates when dependencies change

### `watch()` - Side Effects

```ts
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`);
});
```

## Lifecycle

```ts
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  // Component in DOM - do setup
});

onUnmounted(() => {
  // Cleanup - prevent memory leaks!
});
```

## Template Refs

```vue
<template>
  <input ref="inputElement" />
</template>

<script setup>
const inputElement = ref(null);
onMounted(() => inputElement.value.focus());
</script>
```

## Slots

### Default Slot

```vue
<!-- Parent -->
<Card>Content here</Card>

<!-- Card.vue -->
<slot>Fallback if empty</slot>
```

### Named Slots

```vue
<!-- Parent -->
<Card>
  <template #header>Title</template>
  <template #default>Body</template>
</Card>

<!-- Card.vue -->
<slot name="header"></slot>
<slot></slot>
```

### Scoped Slots (Pass Data Up)

```vue
<!-- Child passes data -->
<slot :card="card" :index="i"></slot>

<!-- Parent receives data -->
<template #default="{ card, index }">
  <Card :card="card" @click="play(index)" />
</template>
```

## Props & Emits

### Props (Parent → Child)

```vue
<script setup>
const props = defineProps<{ card: Card, playable: boolean }>()
</script>
```

### Emits (Child → Parent)

```vue
<script setup>
const emit = defineEmits(["play", "select"]);
function handleClick() {
  emit("play", props.card);
}
</script>

<!-- Parent listens -->
<Card @play="handlePlay" />
```

### v-model on Components

```vue
<!-- Parent -->
<Input v-model="name" />

<!-- Child implements contract -->
<script setup>
defineProps(["modelValue"]);
defineEmits(["update:modelValue"]);
</script>
<input
  :value="modelValue"
  @input="$emit('update:modelValue', $event.target.value)"
/>
```

## Routing (Vue Router)

### Routes Config

```js
const routes = [
  { path: "/", component: Home },
  { path: "/game/:gameId", name: "game", component: Game },
];
```

### Navigation

```vue
<router-link to="/">Home</router-link>
<router-link
  :to="{ name: 'game', params: { gameId: '123' } }"
>Play</router-link>
<router-view />
```

### Programmatic

```ts
const router = useRouter();
router.push("/game/123");

const route = useRoute();
const id = route.params.gameId;
```

## Pinia (State Management)

### Define Store

```ts
export const useGameStore = defineStore("game", () => {
  // State
  const game = ref(null);

  // Getters (computed)
  const isMyTurn = computed(() => game.value?.turn === myIndex);

  // Actions
  function playCard(i) {
    game.value.play(i);
  }

  return { game, isMyTurn, playCard };
});
```

### Use Store

```ts
const store = useGameStore();
const { isMyTurn } = storeToRefs(store); // Keep reactivity
const { playCard } = store; // Actions directly
```

## Quick Decision Tree

**Data binding?**

- Display text → `{{ }}`
- Attribute → `:`
- Event → `@`
- Form input → `v-model`

**Conditional rendering?**

- Rarely changes → `v-if`
- Frequent toggle → `v-show`

**Reactivity?**

- Primitive → `ref()`
- Object → `reactive()`
- Derived → `computed()`
- Side effect → `watch()`

**Component communication?**

- Parent → Child → Props
- Child → Parent → Emits
- Multiple components → Pinia store

## Memory Aid

**3 Core Concepts:**

1. **Binding** = Connect JS ↔ HTML
2. **Reactivity** = Auto-update when data changes
3. **Components** = Reusable pieces with props/emits
