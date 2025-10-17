<template>
  <div 
    :class="['uno-card', colorClass, { 'playable': playable, 'disabled': !playable }]"
    @click="handleClick"
  >
    <div class="card-content">
      <div v-if="card.type === 'NUMBERED'" class="card-number">
        {{ card.number }}
      </div>
      <div v-else-if="card.type === 'SKIP'" class="card-symbol">
        🚫
      </div>
      <div v-else-if="card.type === 'REVERSE'" class="card-symbol">
        🔄
      </div>
      <div v-else-if="card.type === 'DRAW'" class="card-symbol">
        +2
      </div>
      <div v-else-if="card.type === 'WILD'" class="card-symbol wild">
        🌈
      </div>
      <div v-else-if="card.type === 'WILD DRAW'" class="card-symbol wild">
        +4
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

const emit = defineEmits(['click'])

const colorClass = computed(() => {
  if (props.card.type === 'WILD' || props.card.type === 'WILD DRAW') {
    return 'wild-card'
  }
  return `color-${props.card.color?.toLowerCase() || 'none'}`
})

const handleClick = () => {
  if (props.playable) {
    emit('click', props.card)
  }
}
</script>

<style scoped>
.uno-card {
  width: 80px;
  height: 120px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  border: 3px solid rgba(255,255,255,0.3);
  position: relative;
  user-select: none;
}

.uno-card:hover {
  transform: translateY(-10px) scale(1.05);
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
}

.uno-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uno-card.disabled:hover {
  transform: none;
}

.uno-card.playable {
  border-color: #ffd700;
  animation: glow 1.5s infinite;
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 10px rgba(255,215,0,0.5);
  }
  50% {
    box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 20px rgba(255,215,0,0.8);
  }
}

.color-red {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: white;
}

.color-yellow {
  background: linear-gradient(135deg, #fdd835 0%, #f9a825 100%);
  color: #333;
}

.color-green {
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
  color: white;
}

.color-blue {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
}

.wild-card {
  background: linear-gradient(135deg, 
    #e53935 0%, 
    #fdd835 25%, 
    #43a047 50%, 
    #1e88e5 75%, 
    #e53935 100%);
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.card-content {
  font-size: 2em;
  font-weight: bold;
}

.card-number {
  font-size: 3em;
}

.card-symbol {
  font-size: 2em;
}

.card-symbol.wild {
  font-size: 2.5em;
  animation: rainbow 3s infinite;
}

@keyframes rainbow {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(360deg); }
}
</style>
