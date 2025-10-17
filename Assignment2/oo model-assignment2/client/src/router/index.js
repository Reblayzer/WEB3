import { createRouter, createWebHistory } from 'vue-router'
import GameSetup from '../views/GameSetup.vue'
import GamePlay from '../views/GamePlay.vue'
import GameOver from '../views/GameOver.vue'

const routes = [
  {
    path: '/',
    name: 'setup',
    component: GameSetup
  },
  {
    path: '/play',
    name: 'play',
    component: GamePlay
  },
  {
    path: '/gameover',
    name: 'gameover',
    component: GameOver
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
