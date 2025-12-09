<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h1>UNO Lobby</h1>
      <div class="player-info">
        <span
          >Welcome, <strong>{{ playerStore.playerName }}</strong
          >!</span
        >
        <button @click="handleLogout" class="logout-button">Logout</button>
      </div>
    </div>

    <div class="lobby-content">
      <!-- Create New Game Section -->
      <div class="create-game-section">
        <h2>Create New Game</h2>
        <div class="create-game-form">
          <label>
            Maximum Players:
            <select v-model="maxPlayers" class="player-select">
              <option :value="2">2 Players</option>
              <option :value="3">3 Players</option>
              <option :value="4">4 Players</option>
            </select>
          </label>
          <button
            @click="handleCreateGame"
            class="create-button"
            :disabled="creating"
          >
            {{ creating ? "Creating..." : "Create Game" }}
          </button>
        </div>
      </div>

      <!-- Available Games Section -->
      <div class="available-games-section">
        <h2>Available Games ({{ availableGames.length }})</h2>
        <div v-if="loading" class="loading">Loading games...</div>
        <div v-else-if="availableGames.length === 0" class="no-games">
          No games available. Create one to start playing!
        </div>
        <div v-else class="games-list">
          <div
            v-for="game in availableGames"
            :key="game.id"
            class="game-card"
            @click="handleJoinGame(game.id)"
          >
            <div class="game-info">
              <h3>Game #{{ game.id.substring(0, 8) }}</h3>
              <p class="game-creator">Created by: {{ game.createdBy }}</p>
              <p class="game-players">
                Players: {{ game.playerCount }} / {{ game.maxPlayers }}
              </p>
            </div>
            <button class="join-button">Join</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePlayerStore } from "../stores/player";
import {
  getAvailableGames,
  createGame,
  joinGame,
  subscribeToGamesListUpdates,
} from "../api/graphql";

const router = useRouter();
const playerStore = usePlayerStore();

const maxPlayers = ref(4);
const availableGames = ref([]);
const loading = ref(true);
const creating = ref(false);
let gamesSubscription = null;

onMounted(async () => {
  // Check if player is logged in
  if (!playerStore.playerName) {
    router.push("/");
    return;
  }

  // Load available games
  try {
    availableGames.value = await getAvailableGames();
  } catch (error) {
    console.error("Error loading games:", error);
  } finally {
    loading.value = false;
  }

  // Subscribe to games list updates
  gamesSubscription = subscribeToGamesListUpdates((games) => {
    availableGames.value = games;
  });
});

onUnmounted(() => {
  if (gamesSubscription) {
    gamesSubscription.unsubscribe();
  }
});

async function handleCreateGame() {
  creating.value = true;
  try {
    const game = await createGame(playerStore.playerName, maxPlayers.value);
    // Find and store the player ID (creator is first player)
    const player = game.players.find((p) => p.name === playerStore.playerName);
    if (player) {
      playerStore.setPlayerId(player.id);
    }
    // Navigate to the game after a short delay to ensure state is updated
    setTimeout(() => {
      router.push(`/game/${game.id}`);
    }, 100);
  } catch (error) {
    console.error("Error creating game:", error);
    alert(error.message || "Failed to create game. Please try again.");
  } finally {
    creating.value = false;
  }
}

async function handleJoinGame(gameId) {
  try {
    const game = await joinGame(gameId, playerStore.playerName);
    // Find and store the player ID
    const player = game.players.find((p) => p.name === playerStore.playerName);
    if (player) {
      playerStore.setPlayerId(player.id);
    }
    // Navigate to the game after a short delay to ensure state is updated
    setTimeout(() => {
      router.push(`/game/${game.id}`);
    }, 100);
  } catch (error) {
    console.error("Error joining game:", error);
    alert(
      error.message || "Failed to join game. It may be full or already started."
    );
  }
}

function handleLogout() {
  playerStore.clearPlayer();
  router.push("/");
}
</script>

<style scoped>
.lobby-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.lobby-header {
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.lobby-header h1 {
  margin: 0;
  color: #333;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-button {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.logout-button:hover {
  background: #c82333;
}

.lobby-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.create-game-section,
.available-games-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.create-game-section h2,
.available-games-section h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.create-game-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.create-game-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 500;
  color: #555;
}

.player-select {
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 5px;
  font-size: 1rem;
}

.create-button {
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.create-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.create-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading,
.no-games {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.game-card:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(5px);
}

.game-info h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.game-creator,
.game-players {
  margin: 4px 0;
  color: #666;
  font-size: 0.9rem;
}

.join-button {
  padding: 8px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease;
}

.join-button:hover {
  background: #218838;
}

@media (max-width: 768px) {
  .lobby-content {
    grid-template-columns: 1fr;
  }
}
</style>
