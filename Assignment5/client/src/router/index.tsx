import { createBrowserRouter, RouteObject } from 'react-router-dom'
import App from '../App'
import LoginView from '../views/Login'
import LobbyView from '../views/Lobby'
import GameRouter from '../views/GameRouter'

/**
 * Route definitions for the UNO game application
 * Structured to match the app's navigation flow:
 * / -> Login
 * /lobby -> Lobby (browse/create games)
 * /play -> Game state router (waiting, playing, or game over)
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <LoginView />,
      },
      {
        path: 'lobby',
        element: <LobbyView />,
      },
      {
        path: 'play',
        element: <GameRouter />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
