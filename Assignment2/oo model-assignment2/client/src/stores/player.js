import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref(localStorage.getItem('playerName') || '')
  
  function setPlayerName(name) {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }
  
  function clearPlayer() {
    playerName.value = ''
    localStorage.removeItem('playerName')
  }
  
  return {
    playerName,
    setPlayerName,
    clearPlayer
  }
})