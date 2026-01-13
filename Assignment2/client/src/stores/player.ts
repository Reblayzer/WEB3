import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref<string>(localStorage.getItem('playerName') || '')

  function setPlayerName(name: string): void {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }

  function clearPlayer(): void {
    playerName.value = ''
    localStorage.removeItem('playerName')
  }

  return {
    playerName,
    setPlayerName,
    clearPlayer
  }
})
