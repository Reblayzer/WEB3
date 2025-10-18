import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const playerName: Ref<string> = ref(localStorage.getItem('playerName') || '')
  const playerId: Ref<string> = ref(localStorage.getItem('playerId') || '')

  function setPlayerName(name: string): void {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }

  function setPlayerId(id: string): void {
    playerId.value = id
    localStorage.setItem('playerId', id)
  }

  function clearPlayer(): void {
    playerName.value = ''
    playerId.value = ''
    localStorage.removeItem('playerName')
    localStorage.removeItem('playerId')
  }

  return {
    playerName,
    playerId,
    setPlayerName,
    setPlayerId,
    clearPlayer
  }
})