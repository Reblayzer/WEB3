import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref(localStorage.getItem('playerName') || '')
  const playerId = ref(localStorage.getItem('playerId') || '')
  
  function setPlayerName(name) {
    playerName.value = name
    localStorage.setItem('playerName', name)
  }
  
  function setPlayerId(id) {
    playerId.value = id
    localStorage.setItem('playerId', id)
  }
  
  function clearPlayer() {
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