// Network game store - manages multiplayer game state via GraphQL
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './player'
import {
  getGame,
  getPlayerHand,
  playCard as apiPlayCard,
  drawCard as apiDrawCard,
  sayUno as apiSayUno,
  startGame as apiStartGame,
  subscribeToGameUpdates,
} from '../api/graphql'

export const useNetworkGameStore = defineStore('networkGame', () => {
  const playerStore = usePlayerStore()
  
  // Game state from server
  const gameState = ref(null)
  const playerHand = ref([])
  const gameLog = ref([])
  const subscription = ref(null)
  
  // Loading states
  const loading = ref(false)
  const error = ref(null)
  
  // Computed properties
  const gameId = computed(() => gameState.value?.id)
  
  const players = computed(() => gameState.value?.players || [])
  
  const currentPlayerIndex = computed(() => gameState.value?.currentPlayerIndex ?? 0)
  
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])
  
  const humanPlayerIndex = computed(() => 
    players.value.findIndex(p => p.name === playerStore.playerName)
  )
  
  const isMyTurn = computed(() => 
    currentPlayer.value?.name === playerStore.playerName
  )
  
  const topCard = computed(() => gameState.value?.topCard)
  
  const currentColor = computed(() => gameState.value?.currentColor)
  
  const direction = computed(() => gameState.value?.direction === 'clockwise' ? 1 : -1)
  
  const drawPileCount = computed(() => gameState.value?.drawPileCount ?? 0)
  
  const status = computed(() => gameState.value?.status)
  
  const winner = computed(() => gameState.value?.winner)
  
  const scores = computed(() => {
    const result = {}
    players.value.forEach(p => {
      result[p.name] = p.score
    })
    return result
  })
  
  // Actions
  async function loadGame(id) {
    loading.value = true
    error.value = null
    
    try {
      // Load game state
      gameState.value = await getGame(id)
      
      // Load player's hand
      if (playerStore.playerId) {
        const handData = await getPlayerHand(id, playerStore.playerId)
        playerHand.value = handData.cards
      }
      
      // Subscribe to game updates
      if (subscription.value) {
        subscription.value.unsubscribe()
      }
      
      subscription.value = subscribeToGameUpdates(id, handleGameUpdate)
      
      return gameState.value
    } catch (err) {
      console.error('Error loading game:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  function handleGameUpdate(event) {
    console.log('Game update:', event)
    
    // Add to game log
    gameLog.value.push({
      type: event.eventType,
      data: JSON.parse(event.data),
      timestamp: event.timestamp,
    })
    
    // Reload game state
    if (gameState.value) {
      reloadGameState()
    }
  }
  
  async function reloadGameState() {
    if (!playerStore.playerId) return
    
    try {
      const [newGameState, handData] = await Promise.all([
        getGame(gameState.value.id),
        getPlayerHand(gameState.value.id, playerStore.playerId),
      ])
      
      gameState.value = newGameState
      playerHand.value = handData.cards
    } catch (err) {
      console.error('Error reloading game state:', err)
    }
  }
  
  async function startGame() {
    if (!gameId.value || !playerStore.playerId) return
    
    try {
      loading.value = true
      const updatedGame = await apiStartGame(gameId.value, playerStore.playerId)
      gameState.value = updatedGame
      
      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards
      
      addLog('Game started!')
    } catch (err) {
      console.error('Error starting game:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function playCard(cardIndex, chosenColor = null) {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return
    
    try {
      loading.value = true
      const updatedGame = await apiPlayCard(gameId.value, playerStore.playerId, cardIndex, chosenColor)
      gameState.value = updatedGame
      
      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards
      
      const card = playerHand.value[cardIndex]
      addLog(`You played ${formatCard(card)}`)
    } catch (err) {
      console.error('Error playing card:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function drawCard() {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return
    
    try {
      loading.value = true
      const updatedGame = await apiDrawCard(gameId.value, playerStore.playerId)
      gameState.value = updatedGame
      
      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards
      
      addLog('You drew a card')
    } catch (err) {
      console.error('Error drawing card:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function callUno() {
    if (!gameId.value || !playerStore.playerId) return
    
    try {
      await apiSayUno(gameId.value, playerStore.playerId)
      addLog('You called UNO!')
    } catch (err) {
      console.error('Error calling UNO:', err)
      error.value = err.message
    }
  }
  
  function addLog(message) {
    gameLog.value.push({
      type: 'LOG',
      data: { message },
      timestamp: new Date().toISOString(),
    })
  }
  
  function formatCard(card) {
    if (!card) return ''
    
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      return card.type
    }
    
    return `${card.color} ${card.value || card.type}`
  }
  
  function clearGame() {
    if (subscription.value) {
      subscription.value.unsubscribe()
      subscription.value = null
    }
    
    gameState.value = null
    playerHand.value = []
    gameLog.value = []
    error.value = null
  }
  
  return {
    // State
    gameState,
    playerHand,
    gameLog,
    loading,
    error,
    
    // Computed
    gameId,
    players,
    currentPlayerIndex,
    currentPlayer,
    humanPlayerIndex,
    isMyTurn,
    topCard,
    currentColor,
    direction,
    drawPileCount,
    status,
    winner,
    scores,
    
    // Actions
    loadGame,
    startGame,
    playCard,
    drawCard,
    callUno,
    clearGame,
    reloadGameState,
  }
})
