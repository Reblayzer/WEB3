// Network game store - manages multiplayer game state
// Uses validated types from Zod schemas via service layer
import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { usePlayerStore } from './player'
import { networkGameService, ApiValidationError } from '../services/networkGameService'
import type { Game, Player, Card, Color } from '../api/schemas'

interface GameLogEntry {
  type: string
  message: string
  timestamp: string
}

export const useNetworkGameStore = defineStore('networkGame', () => {
  const playerStore = usePlayerStore()

  // State
  const gameState: Ref<Game | null> = ref(null)
  const playerHand: Ref<Card[]> = ref([])
  const gameLog: Ref<GameLogEntry[]> = ref([])
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  // Computed properties
  const gameId: ComputedRef<string | undefined> = computed(() => gameState.value?.id)

  const players: ComputedRef<Player[]> = computed(() => gameState.value?.players || [])

  const currentPlayerIndex: ComputedRef<number> = computed(() => gameState.value?.currentPlayerIndex ?? 0)

  const currentPlayer: ComputedRef<Player | undefined> = computed(
    () => players.value[currentPlayerIndex.value]
  )

  const humanPlayerIndex: ComputedRef<number> = computed(() =>
    players.value.findIndex(p => p.name === playerStore.playerName)
  )

  const isMyTurn: ComputedRef<boolean> = computed(() =>
    currentPlayer.value?.name === playerStore.playerName
  )

  const topCard: ComputedRef<Card | null | undefined> = computed(() => gameState.value?.topCard)

  const currentColor: ComputedRef<string | null | undefined> = computed(() => gameState.value?.currentColor)

  const direction: ComputedRef<1 | -1> = computed(() =>
    gameState.value?.direction === 'clockwise' ? 1 : -1
  )

  const drawPileCount: ComputedRef<number> = computed(() => gameState.value?.drawPileCount ?? 0)

  const status: ComputedRef<string | undefined> = computed(() => gameState.value?.status)

  const winner: ComputedRef<string | null | undefined> = computed(() => gameState.value?.winner)

  const scores: ComputedRef<Record<string, number>> = computed(() => {
    const result: Record<string, number> = {}
    players.value.forEach(p => {
      result[p.name] = p.score
    })
    return result
  })

  // Actions - public API
  async function loadGame(id: string): Promise<Game> {
    loading.value = true
    error.value = null

    try {
      gameState.value = await networkGameService.fetchGame(id)

      // Sync game log from server (source of truth)
      if (gameState.value?.gameLog) {
        gameLog.value = gameState.value.gameLog
      }

      if (playerStore.playerId) {
        playerHand.value = await networkGameService.fetchPlayerHand(id, playerStore.playerId)
      }

      return gameState.value
    } catch (err: any) {
      const message = err instanceof ApiValidationError
        ? `Validation error from ${err.endpoint}: ${err.validationError.message}`
        : err.message
      console.error('Error loading game:', err)
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startGame(): Promise<void> {
    if (!gameId.value || !playerStore.playerId) return

    try {
      loading.value = true
      gameState.value = await networkGameService.startGame(gameId.value, playerStore.playerId)
      // Small delay to ensure server has fully processed game initialization
      await new Promise(resolve => setTimeout(resolve, 100))
      playerHand.value = await networkGameService.fetchPlayerHand(gameId.value, playerStore.playerId)
    } catch (err: any) {
      const message = err instanceof ApiValidationError
        ? `Validation error from ${err.endpoint}: ${err.validationError.message}`
        : err.message
      console.error('Error starting game:', err)
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function playCard(cardIndex: number, chosenColor: Color | null = null): Promise<void> {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return

    try {
      loading.value = true
      gameState.value = await networkGameService.playCard(
        gameId.value,
        playerStore.playerId,
        cardIndex,
        chosenColor
      )
      playerHand.value = await networkGameService.fetchPlayerHand(gameId.value, playerStore.playerId)
    } catch (err: any) {
      const message = err instanceof ApiValidationError
        ? `Validation error from ${err.endpoint}: ${err.validationError.message}`
        : err.message
      console.error('Error playing card:', err)
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function drawCard(): Promise<void> {
    if (!gameId.value || !isMyTurn.value || !playerStore.playerId) return

    try {
      loading.value = true
      gameState.value = await networkGameService.drawCard(gameId.value, playerStore.playerId)
      playerHand.value = await networkGameService.fetchPlayerHand(gameId.value, playerStore.playerId)
    } catch (err: any) {
      const message = err instanceof ApiValidationError
        ? `Validation error from ${err.endpoint}: ${err.validationError.message}`
        : err.message
      console.error('Error drawing card:', err)
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function callUno(): Promise<boolean> {
    if (!gameId.value || !playerStore.playerId) return false

    try {
      const success = await networkGameService.callUno(gameId.value, playerStore.playerId)
      return success
    } catch (err: any) {
      console.error('Error calling UNO:', err)
      error.value = err.message
      return false
    }
  }

  async function catchUnoFailure(accusedPlayerId: string): Promise<boolean> {
    if (!gameId.value || !playerStore.playerId) return false

    try {
      const success = await networkGameService.catchUnoFailure(
        gameId.value,
        playerStore.playerId,
        accusedPlayerId
      )

      return success
    } catch (err: any) {
      console.error('Error catching UNO failure:', err)
      error.value = err.message
      return false
    }
  }

  async function leaveGame(): Promise<void> {
    if (!gameId.value || !playerStore.playerId) return

    try {
      loading.value = true
      await networkGameService.leaveGame(gameId.value, playerStore.playerId)
      clearGame()
    } catch (err: any) {
      const message = err instanceof ApiValidationError
        ? `Validation error from ${err.endpoint}: ${err.validationError.message}`
        : err.message
      console.error('Error leaving game:', err)
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  // State update - called by subscription
  function updateGameState(newGameState: Game): void {
    gameState.value = newGameState
  }

  // Helpers
  function addLog(message: string): void {
    gameLog.value.push({
      type: 'LOG',
      message,
      timestamp: new Date().toISOString(),
    })
  }

  function clearGame(): void {
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
    catchUnoFailure,
    leaveGame,
    updateGameState,
    clearGame,
  }
})
