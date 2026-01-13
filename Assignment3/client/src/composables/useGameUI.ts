// Composable for game UI state and player feedback
// Shows whose turn, active player highlight, game status
import { computed, type ComputedRef } from 'vue'
import { useNetworkGameStore } from '../stores/networkGame'
import { usePlayerStore } from '../stores/player'

/**
 * Helper composable for game display logic.
 * Provides computed properties for UI feedback.
 */
export function useGameUI() {
  const gameStore = useNetworkGameStore()
  const playerStore = usePlayerStore()

  /**
   * Current player name (whose turn it is)
   */
  const currentPlayerName: ComputedRef<string | undefined> = computed(() => {
    return gameStore.currentPlayer?.name
  })

  /**
   * Is it the current player's turn? (highlight UI)
   */
  const isCurrentPlayerTurn: ComputedRef<boolean> = computed(() => {
    return gameStore.isMyTurn
  })

  /**
   * Display text for turn status
   */
  const turnStatus: ComputedRef<string> = computed(() => {
    if (!gameStore.gameState) return 'Loading...'
    if (gameStore.status === 'FINISHED') {
      return gameStore.winner ? `${gameStore.winner} won!` : 'Game Over'
    }
    if (gameStore.isMyTurn) {
      return 'Your Turn'
    }
    return `${currentPlayerName.value}'s Turn`
  })

  /**
   * CSS class for turn indicator
   */
  const turnIndicatorClass: ComputedRef<string> = computed(() => {
    if (gameStore.isMyTurn) return 'bg-blue-500 text-white'
    return 'bg-gray-200 text-gray-800'
  })

  /**
   * Display message for game status
   */
  const statusMessage: ComputedRef<string> = computed(() => {
    const status = gameStore.status
    if (status === 'WAITING') return 'Waiting for more players...'
    if (status === 'IN_PROGRESS') return `${gameStore.players.length} players, ${gameStore.drawPileCount} cards in deck`
    if (status === 'FINISHED') return gameStore.winner ? `${gameStore.winner} won the round!` : 'Round Over'
    return 'Unknown status'
  })

  /**
   * Get player's card count for display
   */
  function getPlayerCardCount(playerName: string): number {
    const player = gameStore.players.find((p) => p.name === playerName)
    return player?.cardCount ?? 0
  }

  /**
   * Get player's score for display
   */
  function getPlayerScore(playerName: string): number {
    return gameStore.scores[playerName] ?? 0
  }

  /**
   * Get player card count formatted (e.g., "7 cards")
   */
  function formatCardCount(count: number): string {
    return count === 1 ? '1 card' : `${count} cards`
  }

  /**
   * Get player highlight class for active player
   */
  function getPlayerClass(playerName: string): string {
    if (playerName === currentPlayerName.value) {
      return 'ring-2 ring-blue-500 bg-blue-50'
    }
    return ''
  }

  return {
    currentPlayerName,
    isCurrentPlayerTurn,
    turnStatus,
    turnIndicatorClass,
    statusMessage,
    getPlayerCardCount,
    getPlayerScore,
    formatCardCount,
    getPlayerClass,
  }
}
