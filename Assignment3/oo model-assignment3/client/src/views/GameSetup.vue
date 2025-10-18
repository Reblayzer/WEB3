<template>
  <div class="game-setup">
    <div class="card setup-card">
      <h2>Welcome to UNO!</h2>
      
      <div class="form-group">
        <label for="playerName">Your Name:</label>
        <input 
          id="playerName"
          v-model="playerName" 
          type="text" 
          placeholder="Enter your name"
          @keyup.enter="startGame"
          class="input-field"
        />
      </div>
      
      <div class="form-group">
        <label>Number of Bot Players:</label>
        <div class="bot-selector">
          <button 
            v-for="num in [1, 2, 3]" 
            :key="num"
            @click="numBots = num"
            :class="['bot-btn', { active: numBots === num }]"
          >
            {{ num }} Bot{{ num > 1 ? 's' : '' }}
          </button>
        </div>
      </div>
      
      <div class="info-box">
        <p><strong>Game Rules:</strong></p>
        <ul>
          <li>First player to reach {{ gameStore.targetScore }} points wins!</li>
          <li>Match colors or numbers to play cards</li>
          <li>Special cards: SKIP, REVERSE, DRAW +2</li>
          <li>Wild cards can be played anytime</li>
          <li>Say UNO when you have 1 card left!</li>
        </ul>
      </div>
      
      <button 
        @click="startGame" 
        class="btn btn-primary btn-large"
        :disabled="!playerName.trim()"
      >
        Start Game
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'
import { useGameStore } from '../stores/game'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const playerName = ref(playerStore.playerName || '')
const numBots = ref(2)

async function startGame() {
  if (!playerName.value.trim()) return
  
  playerStore.setPlayerName(playerName.value)
  gameStore.setupGame(numBots.value)
  
  // Wait for Vue to process reactive updates before navigating
  await new Promise(resolve => setTimeout(resolve, 100))
  router.push('/play')
}
</script>

<style scoped>
.game-setup {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.setup-card {
  max-width: 500px;
  width: 100%;
}

.setup-card h2 {
  text-align: center;
  color: #667eea;
  margin-bottom: 2rem;
  font-size: 2rem;
}

.form-group {
  margin-bottom: 2rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
}

.bot-selector {
  display: flex;
  gap: 1rem;
}

.bot-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.bot-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.bot-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.info-box {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.info-box p {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.info-box ul {
  margin: 0.5rem 0 0 1.5rem;
  color: #666;
}

.info-box li {
  margin-bottom: 0.25rem;
}

.btn-large {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
}
</style>