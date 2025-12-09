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
:root {
  --bg-dark: #0f0f0f;
  --bg-mid: #1d1d1d;
  --panel: #f5f5f5;
  --border: #2f2f2f;
  --primary: #111111;
  --secondary: #2e2e2e;
  --muted: #7a7a7a;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #111;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-mid) 100%);
  min-height: 100vh;
  color: #111;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(15, 15, 15, 0.9);
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  color: #f5f5f5;
}

.app-header h1 {
  font-size: 2.5rem;
  color: #f5f5f5;
  margin-bottom: 0.5rem;
  letter-spacing: 0.02em;
}

.player-info {
  color: #e0e0e0;
  font-size: 0.9rem;
}

.player-info strong {
  color: #fff;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  display: none;
}

.card {
  background: var(--panel);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
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
  background: var(--primary);
  color: #f5f5f5;
}

.btn-primary:hover:not(:disabled) {
  background: #000;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.btn-secondary {
  background: var(--secondary);
  color: #f5f5f5;
}

.btn-secondary:hover:not(:disabled) {
  background: #1c1c1c;
  transform: translateY(-2px);
}

.btn-danger {
  background: #3a3a3a;
  color: #f5f5f5;
}

.btn-danger:hover:not(:disabled) {
  background: #2a2a2a;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #f5f5f5;
}

.error {
  background: #2f2f2f;
  color: #f5f5f5;
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
