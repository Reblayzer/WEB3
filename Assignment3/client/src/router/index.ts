import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Lobby from '../views/Lobby.vue'
import GamePlayNetwork from '../views/GamePlayNetwork.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'login',
    component: Login
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: Lobby
  },
  {
    path: '/game/:gameId',
    name: 'game',
    component: GamePlayNetwork
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
