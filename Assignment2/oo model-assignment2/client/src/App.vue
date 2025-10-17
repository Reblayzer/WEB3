<template>
  <div id="app">
    <header class="app-header">
      <h1>UNO Game</h1>
      <p v-if="playerStore.playerName" class="player-info">
        Playing as: <strong>{{ playerStore.playerName }}</strong>
      </p>
    </header>
    
    <main class="app-main">
      <RouterView />
    </main>
    
    <footer class="app-footer">
      <p>Assignment 2 - Browser-only UNO with Bot Players</p>
    </footer>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { usePlayerStore } from './stores/player'

const playerStore = usePlayerStore()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.app-header h1 {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.player-info {
  color: #666;
  font-size: 0.9rem;
}

.player-info strong {
  color: #667eea;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  background: rgba(0, 0, 0, 0.2);
  color: white;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #48bb78;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-2px);
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #e53e3e;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: white;
}

.error {
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 1.8rem;
  }
  
  .app-main {
    padding: 1rem;
  }
}
</style>
