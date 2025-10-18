<template>
  <div class="color-chooser-overlay" @click.self="handleOverlayClick">
    <div class="color-chooser-modal" :class="{ 'shake': shaking }">
      <h3>Choose a Color</h3>
      <div class="color-options">
        <button
          v-for="color in colors"
          :key="color"
          :class="['color-option', color.toLowerCase()]"
          @click="$emit('choose-color', color)"
        >
          <span class="color-name">{{ color }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const colors = ['RED', 'YELLOW', 'GREEN', 'BLUE']
const shaking = ref(false)

const emit = defineEmits(['choose-color'])

// Clicking outside the modal should not close it - player must choose a color
const handleOverlayClick = () => {
  // Shake the modal to indicate they must choose a color
  shaking.value = true
  setTimeout(() => {
    shaking.value = false
  }, 500)
}
</script>

<style scoped>
.color-chooser-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.color-chooser-modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

.color-chooser-modal.shake {
  animation: shake 0.5s ease;
}

.color-chooser-modal h3 {
  margin: 0 0 20px 0;
  text-align: center;
  color: #333;
  font-size: 1.5em;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.color-option {
  width: 120px;
  height: 120px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.color-option:active {
  transform: scale(0.95);
}

.color-option.red {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: white;
}

.color-option.yellow {
  background: linear-gradient(135deg, #fdd835 0%, #f9a825 100%);
  color: #333;
}

.color-option.green {
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
  color: white;
}

.color-option.blue {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
}

.color-name {
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

@media (max-width: 480px) {
  .color-options {
    grid-template-columns: 1fr;
  }
  
  .color-option {
    width: 200px;
  }
}
</style>
