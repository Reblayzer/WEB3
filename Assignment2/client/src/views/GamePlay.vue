<template>
  <div class="game-play">
    <div v-if="isGameReady" class="game-container">
      <!-- Game Info Bar -->
      <div class="game-info">
        <div class="current-player">
          <span v-if="gameStore.currentPlayerIndex === 0" class="your-turn">
            YOUR TURN
          </span>
          <span v-else-if="gameStore.players[gameStore.currentPlayerIndex]">
            {{ gameStore.players[gameStore.currentPlayerIndex].name }}'s turn
          </span>
          <span v-else>
            Loading...
          </span>
        </div>
        <div class="direction">
          Direction: {{ directionLabel }}
        </div>
        <div class="cards-left">
          Draw Pile: {{ gameStore.drawPile.length }} cards
        </div>
      </div>

      <!-- Game Board -->
      <GameBoard 
        :topCard="gameStore.topCard"
        :currentColor="gameStore.currentColor"
        @draw-card="handleDrawCard"
      />

      <!-- Players List -->
      <div class="players-list">
        <div 
          v-for="(player, index) in gameStore.players" 
          :key="index"
          :class="['player-info', { 
            'active': index === gameStore.currentPlayerIndex,
            'human': index === 0 
          }]"
        >
          <div class="player-name">
            {{ player.name }}
            <span class="player-score">{{ gameStore.scores[player.name] || 0 }} pts</span>
          </div>
          <div class="player-cards">
            {{ player.hand.length }} cards
          </div>
          <div v-if="player.hasCalledUno" class="uno-badge">
            UNO!
          </div>
        </div>
      </div>

      <!-- Human Player's Hand -->
      <div v-if="gameStore.currentPlayerIndex === 0" class="player-hand-section">
        <h3>Your Hand</h3>
        <PlayerHand 
          :cards="gameStore.players[0].hand"
          :playableCards="playableCards"
          @play-card="handlePlayCard"
        />
        <div class="hand-actions">
          <button 
            v-if="canSayUno"
            @click="handleSayUno"
            class="uno-button"
          >
            Say UNO!
          </button>
          <button 
            v-if="canCatchUnoFailure"
            @click="handleCatchUnoFailure"
            class="catch-button"
          >
            Catch UNO Failure!
          </button>
        </div>
      </div>

      <!-- Bot Turn Indicator -->
      <div v-else class="bot-turn-indicator">
        <div class="spinner"></div>
        <p>{{ gameStore.players[gameStore.currentPlayerIndex].name }} is thinking...</p>
      </div>

      <!-- Color Chooser Modal -->
      <ColorChooser 
        v-if="showColorChooser"
        @choose-color="handleColorChosen"
      />

      <!-- Game Log -->
      <div class="game-log">
        <h4>Recent Actions</h4>
        <div class="log-entries">
          <div 
            v-for="(entry, index) in gameStore.gameLog.slice(-5).reverse()" 
            :key="index"
            class="log-entry"
          >
            {{ typeof entry === 'string' ? entry : entry.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStore.gameState === 'FINISHED'" class="loading">
      <h2>Game Over!</h2>
      <p>Calculating final scores...</p>
      <div class="spinner"></div>
    </div>

    <div v-else class="loading">
      <p>Loading game...</p>
      <p style="color: #999; font-size: 0.9em;">Current state: {{ gameStore.gameState }}</p>
      <p style="color: #999; font-size: 0.9em;">Players: {{ gameStore.players.length }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import GameBoard from '../components/GameBoard.vue'
import PlayerHand from '../components/PlayerHand.vue'
import ColorChooser from '../components/ColorChooser.vue'

const router = useRouter()
const gameStore = useGameStore()
const showColorChooser = ref(false)
const pendingWildCard = ref(null)
const unoCaught = ref(false) // Track if UNO was just caught
const directionLabel = computed(() => gameStore.direction === 1 ? 'clockwise' : 'counterclockwise')

// Reset unoCaught when turn changes
watch(() => gameStore.currentPlayerIndex, () => {
  unoCaught.value = false
})

// Check if game is initialized
onMounted(() => {
  // If there's no game at all, redirect immediately
  if (!gameStore.game) {
    console.log('No game found, redirecting to setup page')
    router.push('/')
    return
  }
  
  // Otherwise, give the game a moment to initialize from async startRound
  setTimeout(() => {
    if (!isGameReady.value) {
      console.log('Game not ready after initialization period, redirecting to setup page')
      router.push('/')
    }
  }, 1000) // Wait 1 second for workers to initialize
})

// Watch for game over
watch(() => gameStore.gameState, (newState, oldState) => {
  console.log('Game state changed from:', oldState, 'to:', newState)
  if (newState === 'FINISHED') {
    console.log('Game finished! Navigating to game over page in 1.5 seconds...')
    setTimeout(() => {
      console.log('Navigating to /gameover now')
      router.push('/gameover')
    }, 1500) // Short delay to show "Game Over" message
  }
}, { immediate: true })

// Computed properties
const isGameReady = computed(() => {
  return gameStore.gameState === 'IN_PROGRESS' && 
         gameStore.players.length > 0 && 
         gameStore.players[0] !== undefined &&
         gameStore.drawPile !== undefined &&
         gameStore.drawPile !== null &&
         Array.isArray(gameStore.drawPile) &&
         gameStore.topCard !== null
})

const playableCards = computed(() => {
  if (!isGameReady.value) return []
  // Explicitly depend on topCard and currentColor to trigger re-computation
  const top = gameStore.topCard
  const color = gameStore.currentColor
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
  // Can say UNO when you have 2 cards, at least 1 is playable, and you haven't called UNO yet
  if (player.hand.length !== 2 || player.hasCalledUno) return false
  
  // Check if at least one card is playable
  const hasPlayableCard = player.hand.some(card => gameStore.canPlayCard(card))
  return hasPlayableCard
})

const canCatchUnoFailure = computed(() => {
  if (!isGameReady.value || unoCaught.value) return false
  // Show button if any non-human player has exactly 1 card
  // Domain model will enforce UNO window timing
  return gameStore.players.some((player, index) => 
    index !== 0 && player.hand.length === 1
  )
})

// Event handlers
const handleDrawCard = async () => {
  if (gameStore.currentPlayerIndex !== 0) return
  
  await gameStore.drawCard()
}

const handlePlayCard = async (cardIndex) => {
  const card = gameStore.players[0].hand[cardIndex]
  
  if (!gameStore.canPlayCard(card)) {
    gameStore.addLog('Cannot play that card!')
    return
  }

  // If it's a wild card, show color chooser
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    pendingWildCard.value = { card, cardIndex }
    showColorChooser.value = true
    return
  }

  // Play the card - store handles everything
  try {
    await gameStore.playCard(cardIndex)
  } catch (error) {
    gameStore.addLog(error.message)
  }
}

const handleColorChosen = async (color) => {
  // Validate that a color was actually chosen
  if (!color) {
    gameStore.addLog('Please choose a color for the wild card')
    return
  }
  
  showColorChooser.value = false
  
  if (pendingWildCard.value !== null) {
    try {
      // Use cardIndex to play the wild card with chosen color
      await gameStore.playCard(pendingWildCard.value.cardIndex, color)
    } catch (error) {
      gameStore.addLog(error.message)
    }
    pendingWildCard.value = null
  }
}

const handleSayUno = () => {
  gameStore.callUno()
}

const handleCatchUnoFailure = () => {
  // Call the store's catchUnoFailure which delegates to domain model
  // Domain model handles giving penalty cards
  const success = gameStore.catchUnoFailure(0) // 0 = human player is accuser
  
  if (success) {
    console.log('Successfully caught UNO failure')
    unoCaught.value = true // Hide button after successful catch
    
    // Check if round ended after catching (player may have won)
    const round = gameStore.currentRound
    if (round && round.winner() !== null && round.winner() !== undefined) {
      console.log('Round ended after catching UNO, winner:', gameStore.game.player(round.winner()))
    }
  } else {
    console.log('Failed to catch UNO failure - window may have closed')
  }
}

// Reset unoCaught flag when turn changes
watch(() => gameStore.currentPlayerIndex, () => {
  unoCaught.value = false
})
</script>

<style scoped>
.game-play {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.game-container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto auto 1fr auto;
  gap: 20px;
  grid-template-areas:
    "info info info"
    "players board log"
    "players board log"
    "hand hand hand";
}

.game-info {
  grid-area: info;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f5f5f5;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.current-player {
  font-size: 1.2em;
  font-weight: bold;
}

.your-turn {
  color: #111;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.direction, .cards-left {
  font-size: 1em;
  color: #666;
}

.players-list {
  grid-area: players;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.player-info {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: #f5f5f5;
  transition: all 0.3s ease;
}

.player-info.active {
  background: #efefef;
  border-left: 4px solid #2f2f2f;
  transform: translateX(5px);
}

.player-info.human {
  font-weight: bold;
}

.player-name {
  font-size: 1.1em;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-score {
  margin-left: auto;
  font-size: 0.85em;
  color: #2f2f2f;
  font-weight: bold;
  background: #efefef;
  padding: 2px 8px;
  border-radius: 12px;
}

.player-cards {
  color: #666;
  font-size: 0.9em;
}

.uno-badge {
  color: #111;
  font-weight: bold;
  margin-top: 5px;
  animation: bounce 0.5s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.player-hand-section {
  grid-area: hand;
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.player-hand-section h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.hand-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

.uno-button {
  background: linear-gradient(135deg, #111 0%, #2e2e2e 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: glow 2s infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 10px rgba(244, 67, 54, 0.5); }
  50% { box-shadow: 0 0 20px rgba(244, 67, 54, 0.8); }
}

.uno-button:hover {
  transform: scale(1.05);
}

.catch-button {
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.catch-button:hover {
  transform: scale(1.05);
}

.bot-turn-indicator {
  grid-area: hand;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #2f2f2f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.game-log {
  grid-area: log;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-height: 400px;
  overflow-y: auto;
}

.game-log h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.log-entries {
  font-size: 0.9em;
}

.log-entry {
  padding: 8px;
  margin-bottom: 5px;
  background: #f5f5f5;
  border-radius: 4px;
  border-left: 3px solid #2f2f2f;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 1.2em;
  color: #666;
}

@media (max-width: 1024px) {
  .game-container {
    grid-template-columns: 1fr;
    grid-template-areas:
      "info"
      "board"
      "players"
      "log"
      "hand";
  }
}
</style>
