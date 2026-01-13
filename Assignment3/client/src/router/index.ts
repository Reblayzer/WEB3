import { createRouter, createWebHistory, type RouteRecordRaw, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
import Login from '../views/Login.vue'
import Lobby from '../views/Lobby.vue'
import GamePlayNetwork from '../views/GamePlayNetwork.vue'
import { usePlayerStore } from '@/stores/player'
import { useNetworkGameStore } from '@/stores/networkGame'

/**
 * Auth guard: ensure player is logged in before accessing protected routes
 * For lobby: just need playerName
 * For game: need both playerName and gameId (will be in the route)
 */
function requireAuth(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void {
  const playerStore = usePlayerStore()
  if (!playerStore.playerName) {
    console.warn('Auth guard: Not logged in, redirecting to login')
    next('/')
  } else {
    next()
  }
}

/**
 * Game auth guard: ensure player has joined a game before accessing game view
 */
function requireGameAuth(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void {
  const playerStore = usePlayerStore()
  const gameStore = useNetworkGameStore()

  // Must be logged in
  if (!playerStore.playerName) {
    console.warn('Game auth guard: Not logged in, redirecting to login')
    next('/')
    return
  }

  // Must have a game loaded with playerId set
  if (!gameStore.gameId || !playerStore.playerId) {
    console.warn('Game auth guard: No game joined, redirecting to lobby')
    next('/lobby')
    return
  }

  // Verify we're accessing the correct game
  if (to.params.gameId !== gameStore.gameId) {
    console.warn('Game auth guard: Game ID mismatch, redirecting to lobby')
    next('/lobby')
    return
  }

  next()
}

/**
 * Login guard: redirect to lobby if already logged in
 */
function requireLogout(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void {
  const playerStore = usePlayerStore()
  if (playerStore.playerName) {
    console.log('Already logged in, redirecting to lobby')
    next('/lobby')
  } else {
    next()
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'login',
    component: Login,
    beforeEnter: requireLogout
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: Lobby,
    beforeEnter: requireAuth
  },
  {
    path: '/game/:gameId',
    name: 'game',
    component: GamePlayNetwork,
    beforeEnter: requireGameAuth
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Global after-navigation hook for cleanup and state management
 */
router.afterEach((to, from) => {
  // Clear game state when leaving game
  if (from.name === 'game' && to.name !== 'game') {
    const gameStore = useNetworkGameStore()
    gameStore.clearGame()
  }
})

export default router
