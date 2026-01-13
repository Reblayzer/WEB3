// Composable for game play logic
import { computed, ref, watch, type Ref, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { isWildCard } from '@/utils/cardUtils'
import type { Color } from 'domain/model/types/card-types'

interface PendingWildCard {
  card: any
  cardIndex: number
}

export function useGamePlay() {
  const router = useRouter()
  const gameStore = useGameStore()

  // Local UI state
  const showColorChooser = ref(false)
  const pendingWildCard: Ref<PendingWildCard | null> = ref(null)
  const unoCaught = ref(false)

  // Computed state
  const isGameReady = computed(() => {
    return gameStore.gameState === 'IN_PROGRESS' &&
      gameStore.players.length > 0 &&
      gameStore.players[0] !== undefined &&
      gameStore.drawPile !== undefined &&
      gameStore.drawPile !== null &&
      Array.isArray(gameStore.drawPile) &&
      gameStore.topCard !== null
  })

  const directionLabel = computed(() =>
    gameStore.direction === 1 ? 'clockwise' : 'counterclockwise'
  )

  const playableCards = computed(() => {
    if (!isGameReady.value) return []
    const hand = gameStore.players[0].hand
    return hand.map((card, index) => ({
      ...card,
      index,
      playable: gameStore.canPlayCard(card)
    }))
  })

  const canSayUno = computed(() => {
    if (!isGameReady.value) return false
    const player = gameStore.players[0]
    if (player.hand.length !== 2 || player.hasCalledUno) return false
    return player.hand.some(card => gameStore.canPlayCard(card))
  })

  const canCatchUnoFailure = computed(() => {
    if (!isGameReady.value || unoCaught.value) return false
    return gameStore.players.some((player, index) =>
      index !== 0 && player.hand.length === 1
    )
  })

  // Event handlers
  function handleDrawCard() {
    if (gameStore.currentPlayerIndex !== 0) return
    gameStore.drawCard()
  }

  function handlePlayCard(cardIndex: number) {
    const card = gameStore.players[0].hand[cardIndex]

    if (!gameStore.canPlayCard(card)) {
      gameStore.addLog('Cannot play that card!')
      return
    }

    if (isWildCard(card)) {
      pendingWildCard.value = { card, cardIndex }
      showColorChooser.value = true
      return
    }

    try {
      gameStore.playCard(cardIndex)
    } catch (error: any) {
      gameStore.addLog(error.message)
    }
  }

  function handleColorChosen(color: Color | null) {
    if (!color) {
      gameStore.addLog('Please choose a color for the wild card')
      return
    }

    showColorChooser.value = false

    if (pendingWildCard.value !== null) {
      try {
        gameStore.playCard(pendingWildCard.value.cardIndex, color)
      } catch (error: any) {
        gameStore.addLog(error.message)
      }
      pendingWildCard.value = null
    }
  }

  function handleSayUno() {
    gameStore.callUno()
  }

  function handleCatchUnoFailure() {
    const success = gameStore.catchUnoFailure(0)

    if (success) {
      unoCaught.value = true
    }
  }

  // Watchers
  watch(() => gameStore.currentPlayerIndex, () => {
    unoCaught.value = false
  })

  watch(() => gameStore.gameState, (newState) => {
    if (newState === 'FINISHED') {
      setTimeout(() => {
        router.push('/gameover')
      }, 1500)
    }
  }, { immediate: true })

  return {
    // State
    showColorChooser,
    isGameReady,
    directionLabel,
    playableCards,
    canSayUno,
    canCatchUnoFailure,

    // Actions
    handleDrawCard,
    handlePlayCard,
    handleColorChosen,
    handleSayUno,
    handleCatchUnoFailure
  }
}
