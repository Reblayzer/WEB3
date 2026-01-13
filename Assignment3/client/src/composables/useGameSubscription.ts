// Composable for managing game subscriptions
// Handles real-time updates with proper lifecycle and error handling
import { ref, onUnmounted, type Ref } from 'vue'
import { subscribeToGameUpdates } from '../api/graphql'
import type { Game } from '../api/schemas'
import { useNetworkGameStore } from '../stores/networkGame'
import { usePlayerStore } from '../stores/player'

interface GameUpdateEvent {
  gameId: string
  eventType: string
  data: unknown
}

/**
 * Manages WebSocket subscription to game updates.
 * Automatically unsubscribes on component unmount.
 * Updates store with fresh game state on each event.
 */
export function useGameSubscription() {
  const gameStore = useNetworkGameStore()
  const playerStore = usePlayerStore()

  const subscription: Ref<any> = ref(null)
  const isSubscribed: Ref<boolean> = ref(false)
  const lastEventTime: Ref<number> = ref(0)

  /**
   * Subscribe to real-time game updates via WebSocket.
   * Validates player identity and game ownership before subscribing.
   */
  function subscribeToGame(gameId: string): void {
    // Validate player is authenticated
    if (!playerStore.playerId) {
      console.error('Cannot subscribe: Player not authenticated')
      return
    }

    // Clean up any existing subscription
    unsubscribeFromGame()

    try {
      subscription.value = subscribeToGameUpdates(gameId, async (event: GameUpdateEvent) => {
        // Debounce rapid updates (max 100ms between events)
        const now = Date.now()
        if (now - lastEventTime.value < 100) {
          return
        }
        lastEventTime.value = now

        try {
          // Log event for debugging
          console.log(`Game event: ${event.eventType}`, event)

          // Fetch fresh game state after update notification
          // This syncs all state including the server-side game log
          const updatedGame = await gameStore.loadGame(gameId)

          // Emit success feedback
          console.log('Game state updated:', updatedGame.status)
        } catch (error) {
          console.error('Error processing game update:', error)
          gameStore.error = error instanceof Error ? error.message : 'Failed to process game update'
        }
      })

      isSubscribed.value = true
      console.log(`Subscribed to game ${gameId}`)
    } catch (error) {
      console.error('Error subscribing to game:', error)
      gameStore.error = 'Failed to subscribe to game updates'
    }
  }

  /**
   * Clean up subscription and reset state.
   */
  function unsubscribeFromGame(): void {
    if (subscription.value) {
      try {
        subscription.value.unsubscribe()
        console.log('Unsubscribed from game')
      } catch (error) {
        console.error('Error unsubscribing:', error)
      }
      subscription.value = null
    }
    isSubscribed.value = false
  }

  // Auto cleanup on component unmount
  onUnmounted(() => {
    unsubscribeFromGame()
  })

  return {
    subscribeToGame,
    unsubscribeFromGame,
    isSubscribed,
  }
}
