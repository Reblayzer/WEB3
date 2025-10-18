<template>
  <div class="game-play-network">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading game...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p>Error: {{ error }}</p>
      <button @click="goToLobby">Back to Lobby</button>
    </div>

    <!-- Waiting for Players -->
    <div v-else-if="gameStore.status === 'WAITING'" class="waiting-container">
      <h2>Waiting for Players...</h2>
      <div class="players-waiting">
        <div
          v-for="player in gameStore.players"
          :key="player.id"
          class="player-waiting"
        >
          ✓ {{ player.name }}
        </div>
        <div
          v-for="n in (gameState?.maxPlayers || 4) - gameStore.players.length"
          :key="`empty-${n}`"
          class="player-waiting empty"
        >
          Waiting...
        </div>
      </div>
      <button
        v-if="isCreator"
        @click="handleStartGame"
        :disabled="gameStore.players.length < 2"
        class="start-button"
      >
        {{
          gameStore.players.length < 2
            ? "Need at least 2 players"
            : "Start Game"
        }}
      </button>
      <button @click="goToLobby" class="back-button">Back to Lobby</button>
    </div>

    <!-- Game In Progress -->
    <div v-else-if="gameStore.status === 'IN_PROGRESS'" class="game-container">
      <!-- Game Info Header -->
      <div class="game-header">
        <div class="turn-info">
          <span v-if="gameStore.isMyTurn" class="your-turn">YOUR TURN</span>
          <span v-else>{{ gameStore.currentPlayer?.name }}'s turn</span>
        </div>
        <div class="game-stats">
          <span>Direction: {{ gameStore.direction === 1 ? "→" : "←" }}</span>
          <span>Draw Pile: {{ gameStore.drawPileCount }}</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="game-board">
        <div class="discard-pile">
          <UnoCard v-if="gameStore.topCard" :card="gameStore.topCard" />
          <div
            v-if="gameStore.currentColor"
            class="current-color"
            :style="{ backgroundColor: getColorHex(gameStore.currentColor) }"
          >
            Current Color: {{ gameStore.currentColor }}
          </div>
        </div>

        <button
          @click="handleDrawCard"
          :disabled="!gameStore.isMyTurn || gameStore.loading"
          class="draw-pile-button"
        >
          <div class="card-back">UNO</div>
          Draw Card
        </button>
      </div>

      <!-- Players Info -->
      <div class="players-display">
        <div
          v-for="(player, index) in gameStore.players"
          :key="player.id"
          :class="[
            'player-card',
            {
              active: index === gameStore.currentPlayerIndex,
              'current-user': player.name === playerStore.playerName,
            },
          ]"
        >
          <div class="player-header">
            <strong>{{ player.name }}</strong>
            <span v-if="player.hasCalledUno" class="uno-badge">UNO!</span>
          </div>
          <div class="player-stats">
            <span>Cards: {{ player.cardCount }}</span>
            <span>Score: {{ player.score }}</span>
          </div>
        </div>
      </div>

      <!-- Player's Hand -->
      <div class="player-hand">
        <h3>Your Hand ({{ gameStore.playerHand.length }} cards)</h3>
        <div class="hand-cards">
          <div
            v-for="(card, index) in gameStore.playerHand"
            :key="index"
            @click="handleCardClick(index, card)"
            :class="[
              'hand-card',
              {
                playable: isCardPlayable(card),
                disabled: !gameStore.isMyTurn || gameStore.loading,
              },
            ]"
          >
            <UnoCard :card="card" />
          </div>
        </div>

        <div class="hand-actions">
          <button v-if="canCallUno" @click="handleCallUno" class="uno-button">
            Call UNO!
          </button>
          <button
            v-if="canCatchUnoFailure"
            @click="handleCatchUno"
            class="catch-button"
          >
            Catch UNO Failure!
          </button>
        </div>
      </div>

      <!-- Color Chooser Modal -->
      <ColorChooser
        v-if="showColorChooser"
        @choose-color="handleColorChosen"
        @close="showColorChooser = false"
      />

      <!-- Game Log -->
      <div class="game-log">
        <h4>Game Log</h4>
        <div class="log-entries">
          <div v-for="(entry, i) in recentLogs" :key="i" class="log-entry">
            {{ formatLogEntry(entry) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Game Finished -->
    <div
      v-else-if="gameStore.status === 'FINISHED'"
      class="game-over-container"
    >
      <h1>🎉 Game Over! 🎉</h1>
      <h2>Winner: {{ gameStore.winner }}</h2>
      <div class="final-scores">
        <h3>Final Scores</h3>
        <div
          v-for="player in gameStore.players"
          :key="player.id"
          class="score-entry"
        >
          <span>{{ player.name }}</span>
          <span>{{ player.score }} points</span>
        </div>
      </div>
      <button @click="goToLobby" class="back-button">Back to Lobby</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNetworkGameStore } from "../stores/networkGame";
import { usePlayerStore } from "../stores/player";
import UnoCard from "../components/UnoCard.vue";
import ColorChooser from "../components/ColorChooser.vue";

const route = useRoute();
const router = useRouter();
const gameStore = useNetworkGameStore();
const playerStore = usePlayerStore();

const loading = ref(true);
const error = ref(null);
const showColorChooser = ref(false);
const pendingCardIndex = ref(null);

const gameState = computed(() => gameStore.gameState);
const recentLogs = computed(() => gameStore.gameLog.slice(-10).reverse());

const isCreator = computed(
  () => gameState.value?.createdBy === playerStore.playerName
);

const myPlayer = computed(() =>
  gameStore.players.find((p) => p.name === playerStore.playerName)
);

const canCallUno = computed(() => {
  // Can call UNO when you have 2 cards, at least 1 is playable, it's your turn, and you haven't called UNO yet
  if (gameStore.playerHand.length !== 2) return false;
  if (!gameStore.isMyTurn) return false;
  if (myPlayer.value?.hasCalledUno) return false;

  // Check if at least one card is playable
  const hasPlayableCard = gameStore.playerHand.some((card) =>
    isCardPlayable(card)
  );
  return hasPlayableCard;
});

const canCatchUnoFailure = computed(() => {
  // Show button if:
  // 1. UNO window is open (someone just played to 1 card)
  // 2. The target player is NOT yourself
  // 3. The target player did NOT call UNO (hasCalledUno = false)
  if (!gameStore.unoWindowOpen) return false;
  if (gameStore.unoTarget === undefined) return false;

  const targetPlayer = gameStore.players[gameStore.unoTarget];
  if (!targetPlayer) return false;
  if (targetPlayer.name === playerStore.playerName) return false;

  // Show if target player didn't call UNO
  return !targetPlayer.hasCalledUno;
});

onMounted(async () => {
  const gameId = route.params.gameId;

  if (!gameId) {
    router.push("/lobby");
    return;
  }

  if (!playerStore.playerName) {
    router.push("/");
    return;
  }

  if (!playerStore.playerId) {
    error.value =
      "Player ID not found. Please return to lobby and join the game again.";
    loading.value = false;
    return;
  }

  try {
    await gameStore.loadGame(gameId);
  } catch (err) {
    console.error("Error loading game:", err);
    error.value = err.message || "Game not found or not started";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  // Keep the subscription active but don't clear game state
  // gameStore.clearGame()
});

function isCardPlayable(card) {
  if (!gameStore.isMyTurn) return false;
  if (!gameStore.topCard) return true; // First card of round

  const top = gameStore.topCard;
  const currentCol = gameStore.currentColor;

  // Wild cards can always be played
  if (card.type === "WILD" || card.type === "WILD DRAW") {
    return true;
  }

  // Match color
  if (card.color === currentCol) return true;

  // Match number for numbered cards
  if (
    card.type === "NUMBERED" &&
    top.type === "NUMBERED" &&
    card.number === top.number
  ) {
    return true;
  }

  // Match type for action cards (SKIP, REVERSE, DRAW)
  if (card.type === top.type && card.type !== "NUMBERED") {
    return true;
  }

  return false;
}

async function handleCardClick(index, card) {
  if (!gameStore.isMyTurn || gameStore.loading) return;
  if (!isCardPlayable(card)) return;

  // If it's a wild card, show color chooser
  if (card.type === "WILD" || card.type === "WILD DRAW") {
    pendingCardIndex.value = index;
    showColorChooser.value = true;
  } else {
    // Play the card directly
    try {
      await gameStore.playCard(index, null);
    } catch (err) {
      console.error("Error playing card:", err);
      alert(err.message || "Could not play card");
    }
  }
}

async function handleColorChosen(color) {
  showColorChooser.value = false;

  if (pendingCardIndex.value !== null) {
    try {
      await gameStore.playCard(pendingCardIndex.value, color);
    } catch (err) {
      console.error("Error playing wild card:", err);
      alert(err.message || "Could not play card");
    } finally {
      pendingCardIndex.value = null;
    }
  }
}

async function handleDrawCard() {
  if (!gameStore.isMyTurn || gameStore.loading) return;

  try {
    await gameStore.drawCard();
  } catch (err) {
    console.error("Error drawing card:", err);
    alert(err.message || "Could not draw card");
  }
}

async function handleCallUno() {
  try {
    await gameStore.callUno();
  } catch (err) {
    console.error("Error calling UNO:", err);
  }
}

async function handleCatchUno() {
  try {
    // Get the UNO target from the store (the player who can be caught)
    if (gameStore.unoTarget === undefined) {
      console.log("No UNO window open");
      return;
    }

    const targetPlayer = gameStore.players[gameStore.unoTarget];
    if (!targetPlayer) {
      console.log("Invalid UNO target");
      return;
    }

    const success = await gameStore.catchUnoFailure(targetPlayer.id);

    if (!success) {
      console.log("Failed to catch UNO - window may have closed");
    }
  } catch (err) {
    console.error("Error catching UNO failure:", err);
  }
}

async function handleStartGame() {
  try {
    await gameStore.startGame();
  } catch (err) {
    console.error("Error starting game:", err);
    alert(err.message || "Could not start game");
  }
}

function goToLobby() {
  gameStore.clearGame();
  router.push("/lobby");
}

function getColorHex(color) {
  const colors = {
    RED: "#e74c3c",
    BLUE: "#3498db",
    GREEN: "#2ecc71",
    YELLOW: "#f1c40f",
  };
  return colors[color] || "#95a5a6";
}

function formatLogEntry(entry) {
  if (entry.type === "LOG") {
    return entry.data.message;
  }

  const data =
    typeof entry.data === "string" ? JSON.parse(entry.data) : entry.data;

  switch (entry.type) {
    case "PLAYER_JOINED":
      return `${data.playerName} joined the game`;
    case "GAME_STARTED":
      return "Game started!";
    case "CARD_PLAYED":
      return `${data.playerName} played a card`;
    case "CARD_DRAWN":
      return `${data.playerName} drew a card`;
    case "UNO_CALLED":
      return `${data.playerName} called UNO!`;
    case "ROUND_ENDED":
      return `${data.winnerName} won the round!`;
    default:
      return `${entry.type}`;
  }
}
</script>

<style scoped>
.game-play-network {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.waiting-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
}

.players-waiting {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 30px 0;
}

.player-waiting {
  padding: 15px;
  background: #f0f0f0;
  border-radius: 10px;
  font-size: 1.1rem;
}

.player-waiting.empty {
  opacity: 0.5;
  font-style: italic;
}

.start-button,
.back-button {
  margin: 10px;
  padding: 12px 30px;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.start-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.start-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-button {
  background: #95a5a6;
  color: white;
}

.game-container {
  max-width: 1400px;
  margin: 0 auto;
}

.game-header {
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.your-turn {
  color: #e74c3c;
  font-weight: bold;
  font-size: 1.2rem;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.game-board {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  margin-bottom: 20px;
}

.discard-pile {
  text-align: center;
}

.current-color {
  margin-top: 10px;
  padding: 10px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.draw-pile-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 15px 30px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.draw-pile-button:hover:not(:disabled) {
  transform: translateY(-3px);
}

.draw-pile-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-back {
  width: 80px;
  height: 120px;
  background: #2c3e50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-weight: bold;
  font-size: 1.2rem;
}

.players-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.player-card {
  background: white;
  padding: 15px;
  border-radius: 10px;
  border: 3px solid transparent;
}

.player-card.active {
  border-color: #e74c3c;
  box-shadow: 0 0 15px rgba(231, 76, 60, 0.5);
}

.player-card.current-user {
  background: #ecf0f1;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.uno-badge {
  background: #e74c3c;
  color: white;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: bold;
}

.player-stats {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
}

.player-hand {
  background: white;
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.hand-cards {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px 0;
}

.hand-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.3s ease;
  flex-shrink: 0;
}

.hand-card.playable {
  box-shadow: 0 0 25px 8px rgba(255, 215, 0, 0.9);
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px 5px rgba(255, 215, 0, 0.7);
  }
  50% {
    box-shadow: 0 0 35px 10px rgba(255, 215, 0, 1);
  }
}

.hand-card.playable:hover {
  transform: translateY(-15px) scale(1.05);
  box-shadow: 0 10px 35px 12px rgba(255, 215, 0, 1);
}

.hand-card:not(.playable) {
  opacity: 0.4;
  cursor: not-allowed;
}

.hand-card.disabled {
  cursor: not-allowed;
}

.hand-card.disabled:hover {
  transform: none;
}

.hand-actions {
  margin-top: 15px;
  text-align: center;
}

.uno-button {
  padding: 12px 30px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.uno-button:hover {
  transform: scale(1.05);
}

.catch-button {
  padding: 12px 30px;
  background: #f39c12;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin-left: 10px;
}

.catch-button:hover {
  transform: scale(1.05);
}

.hand-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.game-log {
  background: white;
  padding: 15px;
  border-radius: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 5px;
  font-size: 0.9rem;
}

.game-over-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
}

.final-scores {
  margin: 30px 0;
}

.score-entry {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
}
</style>
