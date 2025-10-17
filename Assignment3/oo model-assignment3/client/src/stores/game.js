import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { createGame } from '../../../domain/src/model/game'
import { usePlayerStore } from './player'
import Worker from '../workers/bot.worker.js?worker'

export const useGameStore = defineStore('game', () => {
  const playerStore = usePlayerStore()
  
  // Core domain model instance
  const game = ref(null)
  
  // UI-only state
  const gameStarted = ref(false)
  const roundOver = ref(false)
  const roundWinner = ref(null)
  const gameLog = ref([])
  const roundKey = ref(0) // Force reactivity when round changes
  
  // Bot workers
  const botWorkers = ref({})
  const botThinking = ref({})
  
  // UNO state (UI tracking for pre-announce)
  const hasCalledUno = ref({})
  const canCallUno = ref({})

  // Computed properties delegating to domain model
  const currentRound = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    return game.value?.currentRound()
  })
  
  const players = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!game.value) return []
    const count = game.value.playerCount
    return Array.from({ length: count }, (_, i) => ({
      name: game.value.player(i),
      hand: currentRound.value?.playerHand(i) || [],
      hasCalledUno: hasCalledUno.value[i] || false,
      score: game.value.score(i)
    }))
  })
  
  const scores = computed(() => {
    // Access roundKey to trigger reactivity when scores change
    roundKey.value
    if (!game.value) return {}
    const result = {}
    for (let i = 0; i < game.value.playerCount; i++) {
      result[game.value.player(i)] = game.value.score(i)
    }
    return result
  })
  
  const currentPlayerIndex = computed(() => currentRound.value?.playerInTurn() ?? 0)
  
  const currentPlayer = computed(() => {
    const idx = currentPlayerIndex.value
    return players.value[idx] ?? null
  })
  
  const isHumanTurn = computed(() => currentPlayer.value?.name === playerStore.playerName)
  
  const humanPlayer = computed(() => players.value.find(p => p.name === playerStore.playerName))
  
  const humanHand = computed(() => humanPlayer.value?.hand || [])
  
  const topCard = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    const discard = currentRound.value?.discardPile()
    return discard?.top() ?? null
  })
  
  const currentColor = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!currentRound.value) return null
    const memento = currentRound.value.toMemento()
    const color = memento.currentColor
    // Ensure we return a string, not an object
    return typeof color === 'string' ? color : null
  })
  
  const direction = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    if (!currentRound.value) return 1
    const memento = currentRound.value.toMemento()
    return memento.currentDirection === 'clockwise' ? 1 : -1
  })
  
  const gameWinner = computed(() => {
    // Access roundKey to trigger reactivity
    roundKey.value
    return game.value?.winner() ?? null
  })
  
  const gameState = computed(() => {
    if (!game.value) return 'SETUP'
    if (gameWinner.value !== null && gameWinner.value !== undefined) return 'FINISHED'
    if (roundOver.value) return 'ROUND_OVER'
    if (!gameStarted.value) return 'SETUP'
    return 'IN_PROGRESS'
  })
  
  const targetScore = computed(() => game.value?.targetScore ?? 500)
  
  const drawPile = computed(() => {
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
    const memento = currentRound.value.toMemento()
    return memento.discardPile
  })

  // Initialize game
  function setupGame(numBotsOrPlayerNames) {
    // Setup player names array
    let playerNames
    if (typeof numBotsOrPlayerNames === 'number') {
      const numBots = numBotsOrPlayerNames
      playerNames = [playerStore.playerName]
      for (let i = 0; i < numBots; i++) {
        playerNames.push(`Bot ${i + 1}`)
      }
    } else {
      playerNames = numBotsOrPlayerNames
    }

    // Create game from domain model with Fisher-Yates shuffler for card randomization
    game.value = createGame({
      players: playerNames,
      targetScore: 500,
      shuffler: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]]
        }
      }
    })
    
    // Mark game as started
    gameStarted.value = true
    
    // Initialize bot workers for AI players
    playerNames.forEach((name, index) => {
      if (name !== playerStore.playerName) {
        botWorkers.value[name] = new Worker()
        
        botWorkers.value[name].postMessage({
          type: 'INIT',
          botName: name
        })
        
        botWorkers.value[name].onmessage = (e) => {
          const { type, cardIndex, card: expectedCard, chosenColor } = e.data
          botThinking.value[name] = false
          
          if (type === 'PLAY_CARD') {
            const round = currentRound.value
            if (!round) return
            
            const botPlayerIndex = players.value.findIndex(p => p.name === name)
            if (botPlayerIndex === -1 || botPlayerIndex !== round.playerInTurn()) return
            
            // Verify the card at this index is still the same card the bot intended
            const currentHand = round.playerHand(botPlayerIndex)
            const actualCard = currentHand[cardIndex]
            
            if (!actualCard || !expectedCard) return
            
            const cardMatches = actualCard.type === expectedCard.type &&
                                actualCard.color === expectedCard.color &&
                                (actualCard.type !== 'NUMBERED' || actualCard.number === expectedCard.number)
            
            if (!cardMatches) {
              // Game state changed while bot was thinking
              try {
                drawCard()
              } catch (error) {
                console.error('Bot failed to draw:', error)
              }
              return
            }
            
            // Play the bot's card
            try {
              playCard(cardIndex, chosenColor)
            } catch (error) {
              // Bot made illegal play - draw as penalty
              try {
                drawCard()
              } catch (drawError) {
                nextTurn()
              }
            }
          } else if (type === 'DRAW_CARD') {
            try {
              drawCard()
            } catch (error) {
              console.error('Bot failed to draw:', error)
            }
          }
        }
        
        botWorkers.value[name].onerror = (error) => {
          console.error('Bot worker error:', error)
        }
      }
    })
    
    if (!isHumanTurn.value) {
      setTimeout(() => botTurn(), 1000)
    }
  }

  // Play a card by index with optional color for wild cards
  function playCard(cardIndex, chosenColor = null) {
    const round = currentRound.value
    if (!round) return

    const pIdx = currentPlayerIndex.value
    
    if (pIdx !== round.playerInTurn()) return
    
    try {
      // Get the card being played to check if it's a wild card
      const hand = round.playerHand(pIdx)
      const card = hand[cardIndex]
      const isWild = card && (card.type === 'WILD' || card.type === 'WILD DRAW')
      
      // Only pass color for wild cards (domain expects: play(index, color))
      if (isWild && chosenColor) {
        round.play(cardIndex, chosenColor)
      } else {
        round.play(cardIndex)
      }
      
      const playedCard = round.discardPile().top()
      
      // Reset UNO call after playing (use spread for reactivity)
      hasCalledUno.value = { ...hasCalledUno.value, [pIdx]: false }
      canCallUno.value = { ...canCallUno.value, [pIdx]: false }
      
      addToLog(`${game.value.player(pIdx)} played ${formatCard(playedCard)}`)

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
      const player = game.value.player(pIdx)
      if (player && player !== 'Alex') {
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
  function drawCard() {
    const round = currentRound.value
    if (!round) return

    const pIdx = currentPlayerIndex.value
    
    try {
      const winner = round.winner()
      if (winner !== null && winner !== undefined) {
        handleRoundEnd()
        return
      }
      
      round.draw()
      
      hasCalledUno.value[pIdx] = false
      canCallUno.value[pIdx] = false
      
      addToLog(`${game.value.player(pIdx)} drew a card`)
      
      nextTurn()
    } catch (error) {
      if (error.message && error.message.includes('Round ended')) {
        handleRoundEnd()
      } else {
        console.error('Error drawing card:', error)
      }
    }
  }

  // Call UNO
  function callUno() {
    const pIdx = currentPlayerIndex.value
    const round = currentRound.value
    if (!round) return

    const hand = round.playerHand(pIdx)
    
    if (hand.length === 2) {
      const hasPlayable = hand.some((_, idx) => round.canPlay(idx))
      if (hasPlayable) {
        hasCalledUno.value = { ...hasCalledUno.value, [pIdx]: true }
        canCallUno.value = { ...canCallUno.value, [pIdx]: true }
        addToLog(`${game.value.player(pIdx)} called UNO!`)
      }
    }
  }

  // Catch UNO failure
  function catchUnoFailure(accuserIndex) {
    const round = currentRound.value
    if (!round) return false

    for (let i = 0; i < game.value.playerCount; i++) {
      if (i === accuserIndex) continue
      
      const hand = round.playerHand(i)
      if (hand.length === 1) {
        try {
          const success = round.catchUnoFailure({ accuser: accuserIndex, accused: i })
          if (success) {
            addToLog(`${game.value.player(accuserIndex)} caught ${game.value.player(i)} for not calling UNO! +4 cards`)
            
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
  function handleRoundEnd() {
    const oldRound = currentRound.value
    if (!oldRound) return
    
    const winnerIdx = oldRound.winner()
    if (winnerIdx === null || winnerIdx === undefined) return
    
    roundWinner.value = game.value.player(winnerIdx)
    const roundScore = oldRound.score()
    addToLog(`${roundWinner.value} won the round with ${roundScore} points!`)
    
    // Wait for domain model's event listeners to complete
    nextTick(() => {
      setTimeout(() => {
        roundKey.value++
        
        // Show current scores
        const scores = []
        for (let i = 0; i < game.value.playerCount; i++) {
          scores.push(`${game.value.player(i)}: ${game.value.score(i)}`)
        }
        addToLog(`Scores: ${scores.join(', ')}`)
        
        const overallWinner = gameWinner.value
        
        if (overallWinner !== null && overallWinner !== undefined) {
          addToLog(`🎉 ${game.value.player(overallWinner)} wins the game! 🎉`)
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
  function nextTurn() {
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
  function botTurn() {
    console.log('[botTurn] Called - currentPlayer:', currentPlayer.value?.name, 'isHumanTurn:', isHumanTurn.value)
    
    if (!currentPlayer.value || isHumanTurn.value) {
      console.log('[botTurn] Skipping - no current player or is human turn')
      return
    }
    
    const botName = currentPlayer.value.name
    if (botThinking.value[botName]) {
      console.log('[botTurn] Bot already thinking:', botName)
      return
    }
    
    const round = currentRound.value
    if (!round) {
      console.log('[botTurn] No current round')
      return
    }

    const worker = botWorkers.value[botName]
    if (!worker) {
      console.error('[botTurn] No worker found for bot:', botName, 'Available workers:', Object.keys(botWorkers.value))
      return
    }
    
    console.log('[botTurn] Sending game state to bot:', botName)
    botThinking.value[botName] = true
    
    const hand = round.playerHand(currentPlayerIndex.value)
    const serializeCard = (card) => card ? JSON.parse(JSON.stringify(card)) : null
    
    const otherPlayers = players.value
      .filter((_, idx) => idx !== currentPlayerIndex.value)
      .map((player, idx) => ({
        name: player.name,
        cardCount: player.hand.length,
        hasCalledUno: hasCalledUno.value[idx] || false
      }))
    
    worker.postMessage({
      type: 'YOUR_TURN',
      gameState: {
        hand: hand.map(serializeCard),
        topCard: serializeCard(topCard.value),
        currentColor: currentColor.value,
        otherPlayers: otherPlayers
      }
    })
  }

  // Reset game
  function resetGame() {
    game.value = null
    gameStarted.value = false
    roundOver.value = false
    roundWinner.value = null
    hasCalledUno.value = {}
    canCallUno.value = {}
    gameLog.value = []
    
    // Terminate bot workers
    Object.values(botWorkers.value).forEach(worker => worker.terminate())
    botWorkers.value = {}
  }

  // Check if card can be played (accepts card object or card index)
  function canPlayCard(cardOrIndex) {
    const round = currentRound.value
    if (!round) return false
    
    const pIdx = currentPlayerIndex.value
    if (pIdx !== round.playerInTurn()) return false
    
    let cardIndex = cardOrIndex
    if (typeof cardOrIndex === 'object' && cardOrIndex !== null) {
      const hand = round.playerHand(pIdx)
      cardIndex = hand.findIndex(c => 
        c.type === cardOrIndex.type && 
        c.color === cardOrIndex.color && 
        (c.type !== 'NUMBERED' || c.number === cardOrIndex.number)
      )
      if (cardIndex === -1) return false
    }
    
    return round.canPlay(cardIndex)
  }

  // Helper to format card for display
  function formatCard(card) {
    if (!card) return '?'
    if (card.type === 'NUMBERED') {
      return `${card.color} ${card.number}`
    }
    // Wild cards don't have a color property
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      return card.type
    }
    return `${card.color} ${card.type}`
  }

  // Helper to add to game log
  function addToLog(message) {
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
