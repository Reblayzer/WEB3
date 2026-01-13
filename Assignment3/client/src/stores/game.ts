import { defineStore } from 'pinia'
import { ref, computed, nextTick, type Ref, type ComputedRef } from 'vue'
import { createGame, type Game } from 'domain/src/model/game'
import type { Round } from 'domain/src/model/round'
import type { Card, Color, ActionCard } from 'domain/src/model/types/card-types'
import { usePlayerStore } from './player'
import { isWildCard, formatCard } from '@/utils/cardUtils'
import { useBotWorkers } from '@/composables/useBotWorkers'

// Type definitions for store state
interface PlayerInfo {
  name: string
  hand: readonly Card[]
  hasCalledUno: boolean
  score: number
}

interface OtherPlayerInfo {
  name: string
  cardCount: number
  hasCalledUno: boolean
}

type GameState = 'SETUP' | 'IN_PROGRESS' | 'ROUND_OVER' | 'FINISHED'

export const useGameStore = defineStore('game', () => {
  const playerStore = usePlayerStore()
  const { initializeBot, requestBotAction, terminateAllBots, isBotThinking } = useBotWorkers()

  // Core domain model instance
  const game: Ref<Game | null> = ref(null)

  // UI-only state
  const gameStarted = ref<boolean>(false)
  const roundOver = ref<boolean>(false)
  const roundWinner = ref<string | null>(null)
  const gameLog = ref<string[]>([])
  const roundKey = ref<number>(0) // Force reactivity when round changes

  // UNO state (UI tracking for pre-announce)
  const hasCalledUno = ref<Record<number, boolean>>({})
  const canCallUno = ref<Record<number, boolean>>({})

  // Computed properties delegating to domain model
  const currentRound: ComputedRef<Round | null> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    return game.value?.currentRound() ?? null
  })

  const players: ComputedRef<PlayerInfo[]> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!game.value) return []
    const count = game.value.playerCount
    return Array.from({ length: count }, (_, i) => ({
      name: game.value!.player(i),
      hand: currentRound.value?.playerHand(i) || [],
      hasCalledUno: hasCalledUno.value[i] || false,
      score: game.value!.score(i)
    }))
  })

  const scores: ComputedRef<Record<string, number>> = computed(() => {
    // Access roundKey to trigger reactivity when scores change
    roundKey.value
    if (!game.value) return {}
    const result: Record<string, number> = {}
    for (let i = 0; i < game.value.playerCount; i++) {
      result[game.value.player(i)] = game.value.score(i)
    }
    return result
  })

  const currentPlayerIndex: ComputedRef<number> = computed(() =>
    currentRound.value?.playerInTurn() ?? 0
  )

  const currentPlayer: ComputedRef<PlayerInfo | null> = computed(() => {
    const idx = currentPlayerIndex.value
    return players.value[idx] ?? null
  })

  const isHumanTurn: ComputedRef<boolean> = computed(() =>
    currentPlayer.value?.name === playerStore.playerName
  )

  const humanPlayer: ComputedRef<PlayerInfo | undefined> = computed(() =>
    players.value.find((p: PlayerInfo) => p.name === playerStore.playerName)
  )

  const humanHand: ComputedRef<readonly Card[]> = computed(() =>
    humanPlayer.value?.hand || []
  )

  const topCard: ComputedRef<Card | null> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    const discard = currentRound.value?.discardPile()
    return discard?.top() ?? null
  })

  const currentColor: ComputedRef<Color | null> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!currentRound.value) return null
    const memento = currentRound.value.toMemento()
    const color = memento.currentColor
    // Ensure we return a string, not an object
    return typeof color === 'string' ? (color as Color) : null
  })

  const direction: ComputedRef<1 | -1> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!currentRound.value) return 1
    const memento = currentRound.value.toMemento()
    return memento.currentDirection === 'clockwise' ? 1 : -1
  })

  const gameWinner: ComputedRef<number | null> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    return game.value?.winner() ?? null
  })

  const gameState: ComputedRef<GameState> = computed(() => {
    if (!game.value) return 'SETUP'
    if (gameWinner.value !== null && gameWinner.value !== undefined) return 'FINISHED'
    if (roundOver.value) return 'ROUND_OVER'
    if (!gameStarted.value) return 'SETUP'
    return 'IN_PROGRESS'
  })

  const targetScore: ComputedRef<number> = computed(() =>
    game.value?.targetScore ?? 500
  )

  const drawPile: ComputedRef<null[]> = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    const pile = currentRound.value?.drawPile()
    const size = pile?.size ?? 0
    // Return array-like object for backward compatibility with view
    // View checks Array.isArray and uses .length
    return Array(size).fill(null) // Array of nulls with correct length
  })

  const discardPile = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    const pile = currentRound.value?.discardPile()
    if (!pile) return []
    // Convert Deck to array - get all cards from memento
    const memento = currentRound.value!.toMemento()
    return memento.discardPile
  })

  // Initialize game
  function setupGame(numBotsOrPlayerNames: number | string[]): void {
    // Setup player names array
    let playerNames: string[]
    if (typeof numBotsOrPlayerNames === 'number') {
      const numBots = numBotsOrPlayerNames
      playerNames = [playerStore.playerName]
      for (let i = 0; i < numBots; i++) {
        playerNames.push(`Bot ${i + 1}`)
      }
    } else {
      playerNames = numBotsOrPlayerNames
    }

    // Create game from domain model
    game.value = createGame({
      players: playerNames,
      targetScore: 500
    })

    // Mark game as started
    gameStarted.value = true

    // Initialize bot workers for AI players
    playerNames.forEach((name) => {
      if (name !== playerStore.playerName) {
        initializeBot(name, (botName, action) => {
          if (action.type === 'PLAY') {
            try {
              playCard(action.cardIndex!, action.chosenColor)
            } catch (error) {
              console.error('Bot play error:', error)
              try {
                drawCard()
              } catch (drawError) {
                nextTurn()
              }
            }
          } else if (action.type === 'DRAW') {
            try {
              drawCard()
            } catch (error) {
              console.error('Bot draw error:', error)
            }
          }
        })
      }
    })

    if (!isHumanTurn.value) {
      setTimeout(() => botTurn(), 1000)
    }
  }

  // Play a card by index with optional color for wild cards
  function playCard(cardIndex: number, chosenColor: Color | null = null): void {
    const round = currentRound.value
    if (!round) return

    const pIdx = currentPlayerIndex.value

    if (pIdx !== round.playerInTurn()) return

    try {
      // Get the card being played to check if it's a wild card
      const hand = round.playerHand(pIdx)
      const card = hand[cardIndex]

      // Only pass color for wild cards (domain expects: play(index, color))
      if (isWildCard(card) && chosenColor) {
        round.play(cardIndex, chosenColor)
      } else {
        round.play(cardIndex)
      }

      const playedCard = round.discardPile().top()

      // Reset UNO call after playing (use spread for reactivity)
      hasCalledUno.value = { ...hasCalledUno.value, [pIdx]: false }
      canCallUno.value = { ...canCallUno.value, [pIdx]: false }

      if (playedCard) {
        addToLog(`${game.value!.player(pIdx)} played ${formatCard(playedCard)}`)
      }

      // Check if round ended by comparing round references
      const freshRound = currentRound.value

      if (!freshRound) {
        return
      }

      // If the round reference changed, the domain started a new round automatically
      if (freshRound !== round) {
        handleRoundEnd()
        return
      }

      // Round is still ongoing, continue to next turn
      nextTurn()
    } catch (error) {
      console.error('Error playing card:', error)

      // If it's a bot that made an illegal play, force them to draw and continue
      const player = game.value!.player(pIdx)
      if (player && player !== playerStore.playerName) {
        try {
          drawCard()
        } catch (drawError) {
          console.error('Failed to draw after illegal play:', drawError)
          nextTurn()
        }
      }
    }
  }

  // Draw a card
  function drawCard(): void {
    const round = currentRound.value
    if (!round) return

    const pIdx = currentPlayerIndex.value

    try {
      round.draw()

      hasCalledUno.value[pIdx] = false
      canCallUno.value[pIdx] = false

      addToLog(`${game.value!.player(pIdx)} drew a card`)

      nextTurn()
    } catch (error) {
      if (error instanceof Error && error.message && error.message.includes('Round ended')) {
        handleRoundEnd()
      } else {
        console.error('Error drawing card:', error)
      }
    }
  }

  // Call UNO
  function callUno(): void {
    const pIdx = currentPlayerIndex.value
    const round = currentRound.value
    if (!round) return

    const hand = round.playerHand(pIdx)

    if (hand.length === 2) {
      const hasPlayable = hand.some((_: Card, idx: number) => round.canPlay(idx))
      if (hasPlayable) {
        hasCalledUno.value = { ...hasCalledUno.value, [pIdx]: true }
        canCallUno.value = { ...canCallUno.value, [pIdx]: true }
        addToLog(`${game.value!.player(pIdx)} called UNO!`)
      }
    }
  }

  // Catch UNO failure
  function catchUnoFailure(accuserIndex: number): boolean {
    const round = currentRound.value
    if (!round) return false

    for (let i = 0; i < game.value!.playerCount; i++) {
      if (i === accuserIndex) continue

      const hand = round.playerHand(i)
      if (hand.length === 1) {
        try {
          const success = round.catchUnoFailure({ accuser: accuserIndex, accused: i })
          if (success) {
            addToLog(`${game.value!.player(accuserIndex)} caught ${game.value!.player(i)} for not calling UNO! +4 cards`)

            const freshRound = currentRound.value
            if (freshRound !== round) {
              handleRoundEnd()
            }

            return true
          }
        } catch (error) {
          console.error('Error catching UNO failure:', error)
        }
      }
    }
    return false
  }

  // Handle round end
  function handleRoundEnd(): void {
    const oldRound = currentRound.value
    if (!oldRound) return

    const winnerIdx = oldRound.winner()
    if (winnerIdx === null || winnerIdx === undefined) return

    roundWinner.value = game.value!.player(winnerIdx)
    const roundScore = oldRound.score()
    addToLog(`${roundWinner.value} won the round with ${roundScore} points!`)

    // Wait for domain model's event listeners to complete
    nextTick(() => {
      setTimeout(() => {
        roundKey.value++

        // Show current scores
        const scores: string[] = []
        for (let i = 0; i < game.value!.playerCount; i++) {
          scores.push(`${game.value!.player(i)}: ${game.value!.score(i)}`)
        }
        addToLog(`Scores: ${scores.join(', ')}`)

        const overallWinner = gameWinner.value

        if (overallWinner !== null && overallWinner !== undefined) {
          addToLog(`🎉 ${game.value!.player(overallWinner)} wins the game! 🎉`)
        } else {
          addToLog(`Starting new round... (target: ${targetScore.value} points)`)

          roundOver.value = false
          roundWinner.value = null
          hasCalledUno.value = {}
          canCallUno.value = {}

          setTimeout(() => {
            if (!isHumanTurn.value) {
              botTurn()
            }
          }, 1000)
        }
      }, 100)
    })
  }

  // Move to next turn
  function nextTurn(): void {
    const round = currentRound.value
    if (!round) return

    const winner = round.winner()
    if (winner !== null && winner !== undefined) {
      handleRoundEnd()
      return
    }

    if (!isHumanTurn.value) {
      setTimeout(() => botTurn(), 1000)
    }
  }

  // Bot turn
  function botTurn(): void {
    if (!currentPlayer.value || isHumanTurn.value) return

    const botName = currentPlayer.value.name
    if (isBotThinking(botName)) return

    const round = currentRound.value
    if (!round) return

    const hand = round.playerHand(currentPlayerIndex.value)
    const otherPlayers: OtherPlayerInfo[] = players.value
      .filter((_: PlayerInfo, idx: number) => idx !== currentPlayerIndex.value)
      .map((player: PlayerInfo) => ({
        name: player.name,
        cardCount: player.hand.length,
        hasCalledUno: player.hasCalledUno
      }))

    requestBotAction(botName, hand, topCard.value, currentColor.value, otherPlayers)
  }

  // Reset game
  function resetGame(): void {
    game.value = null
    gameStarted.value = false
    roundOver.value = false
    roundWinner.value = null
    hasCalledUno.value = {}
    canCallUno.value = {}
    gameLog.value = []

    // Terminate bot workers
    terminateAllBots()
  }

  // Check if card can be played (accepts card object or card index)
  function canPlayCard(cardOrIndex: Card | number): boolean {
    const round = currentRound.value
    if (!round) return false

    const pIdx = currentPlayerIndex.value
    if (pIdx !== round.playerInTurn()) return false

    let cardIndex = cardOrIndex as number
    if (typeof cardOrIndex === 'object' && cardOrIndex !== null) {
      const hand = round.playerHand(pIdx)
      cardIndex = hand.findIndex((c: Card) =>
        c.type === cardOrIndex.type &&
        (c as any).color === (cardOrIndex as any).color &&
        (c.type !== 'NUMBERED' || (c as any).number === (cardOrIndex as any).number)
      )
      if (cardIndex === -1) return false
    }

    return round.canPlay(cardIndex)
  }

  // Helper to add to game log
  function addToLog(message: string): void {
    gameLog.value.push(message)
  }

  return {
    // State
    game,
    players,
    scores,
    currentPlayerIndex,
    currentPlayer,
    isHumanTurn,
    humanPlayer,
    humanHand,
    topCard,
    currentColor,
    direction,
    drawPile,
    discardPile,
    gameState,
    gameStarted,
    roundOver,
    roundWinner,
    gameWinner,
    targetScore,
    gameLog,
    hasCalledUno,
    canCallUno,

    // Actions
    setupGame,
    playCard,
    drawCard,
    callUno,
    catchUnoFailure,
    resetGame,
    canPlayCard,
    formatCard,
    addLog: addToLog
  }
})
