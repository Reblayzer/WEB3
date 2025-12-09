<template>
  <div class="game-over">
    <div class="game-over-container">
      <h1 class="game-over-title">Game Over!</h1>
      
      <div class="winner-announcement">
        <h2>{{ winner.name }} Wins!</h2>
        <div class="winner-score">Final Score: {{ winner.score }} points</div>
        <div v-if="winner.isHuman" class="celebration">
          Congratulations! You reached {{ gameStore.targetScore }} points!
        </div>
        <div v-else class="bot-win">
          Better luck next time! {{ winner.name }} reached {{ gameStore.targetScore }} points!
        </div>
      </div>

      <div class="final-scores">
        <h3>Final Scores</h3>
        <div class="scores-list">
          <div 
            v-for="(player, index) in sortedPlayers" 
            :key="index"
            :class="['score-item', { 
              'winner': player.name === winner.name,
              'human': player.isHuman 
            }]"
          >
            <div class="score-rank">
              {{ index + 1 }}.
            </div>
            <div class="score-player">
              {{ player.name }}
            </div>
            <div class="score-points">
              {{ player.score }} points
            </div>
          </div>
        </div>
      </div>

      <div class="game-stats">
        <h3>Game Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Target Score</div>
            <div class="stat-value">{{ gameStore.targetScore }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Players</div>
            <div class="stat-value">{{ gameStore.players.length }}</div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="backToLobby" class="back-to-lobby-button">
          Back to Lobby
        </button>
        <button @click="playAgain" class="play-again-button">
          Play Again (Same Setup)
        </button>
        <button @click="viewLog" class="view-log-button">
          View Game Log
        </button>
      </div>

      <div v-if="showLog" class="game-log-modal">
        <div class="log-content">
          <h3>Complete Game Log</h3>
          <div class="log-entries">
            <div 
              v-for="(entry, index) in gameStore.gameLog" 
              :key="index"
              class="log-entry"
            >
              <span class="log-number">{{ index + 1 }}.</span>
              {{ entry.timestamp }} - 
              {{ entry.message }}
            </div>
          </div>
          <button @click="showLog = false" class="close-log-button">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { usePlayerStore } from '../stores/player'

const router = useRouter()
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const showLog = ref(false)

// Redirect if no game data
onMounted(() => {
  if (gameStore.gameState !== 'FINISHED') {
    router.push('/')
  }
})

const winner = computed(() => {
  // Get the actual game winner from the domain model
  const winnerIndex = gameStore.gameWinner
  if (winnerIndex !== null && winnerIndex !== undefined) {
    const winnerName = gameStore.game.player(winnerIndex)
    const winnerScore = gameStore.game.score(winnerIndex)
    return {
      name: winnerName,
      score: winnerScore,
      isHuman: winnerName === playerStore.playerName
    }
  }
  
  // Fallback: find player with highest score
  const winningPlayer = gameStore.players.reduce((prev, current) => 
    current.score > prev.score ? current : prev
  )
  return {
    ...winningPlayer,
    isHuman: winningPlayer.name === playerStore.playerName
  }
})

const sortedPlayers = computed(() => {
  return [...gameStore.players]
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      ...p,
      isHuman: p.name === playerStore.playerName
    }))
})

const playAgain = async () => {
  // Reset game with same number of bots
  const numBots = gameStore.players.length - 1
  gameStore.resetGame()
  gameStore.setupGame(numBots)
  router.push('/play')
}

const backToLobby = () => {
  // Clear player name and reset game completely
  playerStore.clearPlayer()
  gameStore.resetGame()
  router.push('/')
}

const viewLog = () => {
  showLog.value = true
}
</script>

<style scoped>
.game-over {
  padding: 20px;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-over-container {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  padding: 40px;
}

.game-over-title {
  text-align: center;
  color: #333;
  margin: 0 0 30px 0;
  font-size: 2.5em;
  animation: fadeInDown 0.8s ease;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.winner-announcement {
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #0f0f0f 0%, #1d1d1d 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 30px;
  animation: fadeIn 1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.trophy {
  font-size: 4em;
  margin-bottom: 10px;
  animation: bounce 2s infinite;
}

.winner-announcement h2 {
  margin: 10px 0;
  font-size: 2em;
}

.winner-score {
  font-size: 1.5em;
  font-weight: bold;
  margin: 15px 0;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: inline-block;
}

.celebration, .bot-win {
  font-size: 1.2em;
  margin-top: 10px;
}

.final-scores {
  margin-bottom: 30px;
}

.final-scores h3 {
  color: #333;
  margin-bottom: 15px;
}

.scores-list {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
}

.score-item {
  display: grid;
  grid-template-columns: 40px 1fr auto 40px;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.score-item:hover {
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.score-item.winner {
  background: linear-gradient(135deg, #efefef 0%, #e5e5e5 100%);
  border: 2px solid #ffd54f;
  font-weight: bold;
}

.score-item.human .score-player {
  color: #1a1a1a;
}

.score-rank {
  font-size: 1.2em;
  font-weight: bold;
  color: #666;
}

.score-player {
  font-size: 1.1em;
}

.score-points {
  font-size: 1.1em;
  font-weight: bold;
  color: #2e2e2e;
}

.winner-badge {
  font-size: 1.5em;
}

.game-stats {
  margin-bottom: 30px;
}

.game-stats h3 {
  color: #333;
  margin-bottom: 15px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-item {
  background: linear-gradient(135deg, #0f0f0f 0%, #1d1d1d 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2em;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

.actions button {
  padding: 15px 30px;
  border: none;
  border-radius: 25px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-to-lobby-button {
  background: linear-gradient(135deg, #1a1a1a 0%, #111111 100%);
  color: white;
}

.back-to-lobby-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
}

.play-again-button {
  background: linear-gradient(135deg, #2e2e2e 0%, #1f1f1f 100%);
  color: white;
}

.play-again-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.view-log-button {
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  color: white;
}

.view-log-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
}

.game-log-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.log-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.log-content h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.log-entries {
  margin-bottom: 20px;
}

.log-entry {
  padding: 10px;
  margin-bottom: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  border-left: 3px solid #1a1a1a;
  font-size: 0.9em;
}

.log-number {
  color: #666;
  margin-right: 5px;
  font-weight: bold;
}

.close-log-button {
  width: 100%;
  padding: 12px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
}

.close-log-button:hover {
  background: #111111;
}

@media (max-width: 768px) {
  .game-over-container {
    padding: 20px;
  }

  .game-over-title {
    font-size: 2em;
  }

  .trophy {
    font-size: 3em;
  }

  .winner-announcement h2 {
    font-size: 1.5em;
  }

  .actions {
    flex-direction: column;
  }

  .actions button {
    width: 100%;
  }
}
</style>
