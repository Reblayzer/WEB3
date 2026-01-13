import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import GameSetup from '../views/GameSetup.vue'
import GamePlay from '../views/GamePlay.vue'
import GameOver from '../views/GameOver.vue'
import { useGameStore } from '@/stores/game'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'setup',
    component: GameSetup
  },
  {
    path: '/play',
    name: 'play',
    component: GamePlay,
    beforeEnter: (to, from) => {
      const gameStore = useGameStore()
      // Guard: redirect if no game initialized
      if (!gameStore.game) {
        console.log('Navigation guard: No game found, redirecting to setup')
        return '/'
      }
    }
  },
  {
    path: '/gameover',
    name: 'gameover',
    component: GameOver,
    beforeEnter: (to, from) => {
      const gameStore = useGameStore()
      // Guard: redirect if no game or game not finished
      if (!gameStore.game || gameStore.gameWinner === null) {
        console.log('Navigation guard: Game not finished, redirecting')
        return '/'
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
