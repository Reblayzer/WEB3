import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as Uno from '../../model/uno'

type RoomSummary = { id: string; players: string[]; awaiting: number }

type UnoState = {
  game: Uno.Game
  playerIndex?: number
  connected: boolean
  roomId?: string
  rooms: RoomSummary[]
}

const defaultPlayers = ['Alice', 'Bob', 'Cara', 'Dan']

const initialState: UnoState = {
  game: Uno.createGame({ players: defaultPlayers, targetScore: 200 }),
  playerIndex: undefined,
  connected: false,
  roomId: undefined,
  rooms: [],
}

const slice = createSlice({
  name: 'uno',
  initialState,
  reducers: {
    setGame(state, action: PayloadAction<any>) {
      state.game = action.payload as Uno.Game
    },
    setPlayerIndex(state, action: PayloadAction<number | undefined>) {
      state.playerIndex = action.payload
    },
    setRoomId(state, action: PayloadAction<string | undefined>) {
      state.roomId = action.payload
    },
    setRooms(state, action: PayloadAction<RoomSummary[]>) {
      state.rooms = action.payload
    },
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload
    },
    setDisconnected(state) {
      state.connected = false
      state.roomId = undefined
      state.playerIndex = undefined
    },
  },
})

export const { setGame, setPlayerIndex, setRoomId, setRooms, setConnected, setDisconnected } = slice.actions
export default slice.reducer
