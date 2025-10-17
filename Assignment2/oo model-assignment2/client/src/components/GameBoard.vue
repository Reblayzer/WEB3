<template>
  <div class="game-board">
    <div class="board-content">
      <!-- Discard Pile (Top Card) -->
      <div class="pile discard-pile">
        <h4>Top Card</h4>
        <UnoCard v-if="topCard" :card="topCard" :playable="false" />
        <div v-if="currentColor" class="current-color">
          Current Color: <span :class="`color-indicator ${currentColor.toLowerCase()}`">{{ currentColor }}</span>
        </div>
      </div>

      <!-- Draw Pile -->
      <div class="pile draw-pile">
        <h4>Draw Pile</h4>
        <div class="card-stack" @click="$emit('draw-card')">
          <div class="card-back"></div>
          <div class="card-back offset-1"></div>
          <div class="card-back offset-2"></div>
          <span class="draw-text">Draw Card</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import UnoCard from './UnoCard.vue'

defineProps({
  topCard: {
    type: Object,
    default: null
  },
  currentColor: {
    type: String,
    default: null
  }
})

defineEmits(['draw-card'])
</script>

<style scoped>
.game-board {
  grid-area: board;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-content {
  display: flex;
  gap: 40px;
  align-items: center;
}

.pile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pile h4 {
  color: white;
  margin: 0;
  font-size: 1.1em;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.discard-pile {
  position: relative;
}

.current-color {
  margin-top: 10px;
  color: white;
  font-weight: bold;
  background: rgba(0,0,0,0.3);
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-indicator {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
}

.color-indicator.red {
  background: #e53935;
  color: white;
}

.color-indicator.yellow {
  background: #fdd835;
  color: #333;
}

.color-indicator.green {
  background: #43a047;
  color: white;
}

.color-indicator.blue {
  background: #1e88e5;
  color: white;
}

.card-stack {
  position: relative;
  width: 80px;
  height: 120px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.card-stack:hover {
  transform: scale(1.05);
}

.card-stack:hover .draw-text {
  opacity: 1;
}

.card-back {
  position: absolute;
  width: 80px;
  height: 120px;
  background: linear-gradient(135deg, #333 0%, #666 100%);
  border-radius: 10px;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back::before {
  font-size: 3em;
}

.card-back.offset-1 {
  transform: translate(-3px, -3px);
  opacity: 0.8;
}

.card-back.offset-2 {
  transform: translate(-6px, -6px);
  opacity: 0.6;
}

.draw-text {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  padding: 5px 10px;
  border-radius: 5px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
}

@media (max-width: 768px) {
  .board-content {
    flex-direction: column;
    gap: 20px;
  }
}
</style>
