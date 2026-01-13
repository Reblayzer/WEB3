import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  // Player name is persistent (user remembers their name)
  const playerName: Ref<string> = ref(localStorage.getItem('playerName') || '')

  // Player ID is per-game and should NOT be persisted
  // Each game join generates a new ID from the server
  const playerId: Ref<string> = ref('')

  function setPlayerName(name: string): void {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }

  function setPlayerId(id: string): void {
    playerId.value = id
    // Do NOT persist playerId - it's per-game only
  }

  function clearPlayer(): void {
    playerName.value = ''
    playerId.value = ''
    localStorage.removeItem('playerName')
    // Don't remove playerId from localStorage since we don't store it anymore
  }

  return {
    playerName,
    playerId,
    setPlayerName,
    setPlayerId,
    clearPlayer
  }
})