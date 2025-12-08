import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as Uno from '../../model/uno'

type UnoState = {
  game: Uno.Game
  playerIndex?: number
  connected: boolean
}

const defaultPlayers = ['Alice', 'Bob', 'Cara', 'Dan']

const initialState: UnoState = {
  game: Uno.createGame({ players: defaultPlayers, targetScore: 200 }),
  playerIndex: undefined,
  connected: false,
}

const slice = createSlice({
  name: 'uno',
  initialState,
  reducers: {
    setGame(state, action: PayloadAction<any>) {
      // Accept sanitized game payload from server
      state.game = action.payload as Uno.Game
      state.connected = true
    },
    setPlayerIndex(state, action: PayloadAction<number | undefined>) {
      state.playerIndex = action.payload
    },
    resetGameLocal(state) {
      state.game = Uno.createGame({ players: defaultPlayers, targetScore: 200 })
    },
    setDisconnected(state) {
      state.connected = false
    },
  },
})

export const { setGame, setPlayerIndex, resetGameLocal, setDisconnected } = slice.actions
export default slice.reducer
