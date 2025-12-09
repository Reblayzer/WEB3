<template>
  <div class="login-container">
    <div class="login-card">
      <h1>UNO Multiplayer</h1>
      <p class="subtitle">Enter your name to start playing</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <input
          v-model="playerName"
          type="text"
          placeholder="Enter your name"
          maxlength="20"
          required
          class="player-input"
          autofocus
        />
        <button type="submit" class="login-button" :disabled="!playerName.trim()">
          Play UNO
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'

const router = useRouter()
const playerStore = usePlayerStore()
const playerName = ref(playerStore.playerName || '')

function handleLogin() {
  const trimmedName = playerName.value.trim()
  if (trimmedName) {
    playerStore.setPlayerName(trimmedName)
    router.push('/lobby')
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 2.5rem;
  font-weight: bold;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
  font-size: 1rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.player-input {
  padding: 15px;
  font-size: 1.1rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.player-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-button {
  padding: 15px;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.login-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
