// Network game store - manages multiplayer game state via GraphQL
import { defineStore } from 'pinia'
import { ref, computed, type Ref } from 'vue'
import { usePlayerStore } from './player'
import {
  getGame,
  getPlayerHand,
  playCard as apiPlayCard,
  drawCard as apiDrawCard,
  sayUno as apiSayUno,
  catchUnoFailure as apiCatchUnoFailure,
  startGame as apiStartGame,
  subscribeToGameUpdates,
} from '../api/graphql'
import type { Game, Player } from '../api/types'
import type { Card, Color } from '../../../domain/dist/model/types/card-types.js'

interface GameLogEntry {
  type: string
  data: any
  timestamp: string
}

export const useNetworkGameStore = defineStore('networkGame', () => {
  const playerStore = usePlayerStore()

  // Game state from server
  const gameState: Ref<Game | null> = ref(null)
  const playerHand: Ref<Card[]> = ref([])
  const gameLog: Ref<GameLogEntry[]> = ref([])
  const subscription: Ref<any> = ref(null)

  // Loading states
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

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

  const unoWindowOpen = computed(() => gameState.value?.unoWindowOpen ?? false)

  const unoTarget = computed(() => gameState.value?.unoTarget)

  const scores = computed(() => {
    const result: Record<string, number> = {}
    players.value.forEach(p => {
      result[p.name] = p.score
    })
    return result
  })

  // Actions
  async function loadGame(id: string): Promise<Game> {
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
    } catch (err: any) {
      console.error('Error loading game:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function handleGameUpdate(event: { eventType: string; data: string; timestamp: string }): void {
    console.log('Game update received:', event)

    // Add to game log
    gameLog.value.push({
      type: event.eventType,
      data: JSON.parse(event.data),
      timestamp: event.timestamp,
    })

    // Reload game state immediately
    if (gameState.value) {
      console.log('Reloading game state after update...')
      reloadGameState()
    }
  }

  async function reloadGameState(): Promise<void> {
    if (!playerStore.playerId || !gameState.value) {
      console.warn('Cannot reload: No player ID or game state')
      return
    }

    try {
      console.log('Fetching updated game state...')
      const [newGameState, handData] = await Promise.all([
        getGame(gameState.value.id),
        getPlayerHand(gameState.value.id, playerStore.playerId),
      ])

      console.log('Updated game state:', {
        currentPlayerIndex: newGameState.currentPlayerIndex,
        currentPlayer: newGameState.players[newGameState.currentPlayerIndex]?.name,
        topCard: newGameState.topCard
      })

      gameState.value = newGameState
      playerHand.value = handData.cards
      console.log('Game state updated successfully')
    } catch (err) {
      console.error('Error reloading game state:', err)
    }
  }

  async function startGame(): Promise<void> {
    if (!gameId.value || !playerStore.playerId) return

    try {
      loading.value = true
      const updatedGame = await apiStartGame(gameId.value, playerStore.playerId)
      gameState.value = updatedGame

      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards

      addLog('Game started!')
    } catch (err: any) {
      console.error('Error starting game:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function playCard(cardIndex: number, chosenColor: Color | null = null): Promise<void> {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return

    try {
      loading.value = true
      console.log('Playing card:', { cardIndex, chosenColor })

      const updatedGame = await apiPlayCard(gameId.value, playerStore.playerId, cardIndex, chosenColor)
      console.log('Card played, updated game:', {
        currentPlayerIndex: updatedGame.currentPlayerIndex,
        currentPlayer: updatedGame.players[updatedGame.currentPlayerIndex]?.name
      })

      gameState.value = updatedGame

      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards

      addLog(`You played a card`)
    } catch (err: any) {
      console.error('Error playing card:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function drawCard(): Promise<void> {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return

    try {
      loading.value = true
      console.log('Drawing card...')

      const updatedGame = await apiDrawCard(gameId.value, playerStore.playerId)
      console.log('Card drawn, updated game:', {
        currentPlayerIndex: updatedGame.currentPlayerIndex,
        currentPlayer: updatedGame.players[updatedGame.currentPlayerIndex]?.name
      })

      gameState.value = updatedGame

      // Reload hand
      const handData = await getPlayerHand(gameId.value, playerStore.playerId)
      playerHand.value = handData.cards

      addLog('You drew a card')
    } catch (err: any) {
      console.error('Error drawing card:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function callUno(): Promise<void> {
    if (!gameId.value || !playerStore.playerId) return

    try {
      await apiSayUno(gameId.value, playerStore.playerId)
      addLog('You called UNO!')
    } catch (err: any) {
      console.error('Error calling UNO:', err)
      error.value = err.message
    }
  }

  async function catchUnoFailure(accusedPlayerId: string): Promise<boolean> {
    if (!gameId.value || !playerStore.playerId) return false

    try {
      const success = await apiCatchUnoFailure(
        gameId.value,
        playerStore.playerId,
        accusedPlayerId
      )

      if (success) {
        const accusedPlayer = players.value.find(p => p.id === accusedPlayerId)
        addLog(`You caught ${accusedPlayer?.name || 'opponent'} not calling UNO!`)
      }

      return success
    } catch (err: any) {
      console.error('Error catching UNO failure:', err)
      error.value = err.message
      return false
    }
  }

  function addLog(message: string): void {
    gameLog.value.push({
      type: 'LOG',
      data: { message },
      timestamp: new Date().toISOString(),
    })
  }

  function formatCard(card: Card | null): string {
    if (!card) return ''

    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      return card.type
    }

    return `${card.color} ${(card as any).value || card.type}`
  }

  function clearGame(): void {
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
    unoWindowOpen,
    unoTarget,
    scores,

    // Actions
    loadGame,
    startGame,
    playCard,
    drawCard,
    callUno,
    catchUnoFailure,
    clearGame,
    reloadGameState,
  }
})
