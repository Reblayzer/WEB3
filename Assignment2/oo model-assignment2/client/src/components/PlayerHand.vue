<template>
  <div class="player-hand">
    <div class="cards-container">
      <UnoCard
        v-for="(cardData, index) in playableCards"
        :key="index"
        :card="cardData"
        :playable="cardData.playable"
        @click="handleCardClick(index)"
        :style="{ transform: `translateX(${index * 20}px)` }"
      />
    </div>
  </div>
</template>

<script setup>
import UnoCard from './UnoCard.vue'

defineProps({
  cards: {
    type: Array,
    required: true
  },
  playableCards: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['play-card'])

const handleCardClick = (index) => {
  emit('play-card', index)
}
</script>

<style scoped>
.player-hand {
  display: flex;
  justify-content: center;
  padding: 20px;
  min-height: 150px;
}

.cards-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  position: relative;
}

.cards-container > * {
  margin: 0 -10px;
}

@media (max-width: 768px) {
  .cards-container {
    gap: 5px;
  }
  
  .cards-container > * {
    margin: 0 -15px;
  }
}
</style>
