import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as Uno from 'domain/src/model/uno'
import type { RoomSummary } from '../../types/serverTypes'
import { sanitizeGame } from '../../utils/gameUtils'

type UnoState = {
  game: Uno.Game
  playerIndex: number | undefined
  connected: boolean
  roomId: string | undefined
  rooms: RoomSummary[]
  playerName: string | undefined
}

const defaultPlayers = ['Alice', 'Bob', 'Cara', 'Dan']

const initialState: UnoState = {
  game: sanitizeGame(Uno.createGame({ players: defaultPlayers, targetScore: 200 })),
  playerIndex: undefined,
  connected: false,
  roomId: undefined,
  rooms: [],
  playerName: undefined,
}

/**
 * Redux slice for UNO game state
 * Manages game state, connection status, room info, and player data
 */
const slice = createSlice({
  name: 'uno',
  initialState,
  reducers: {
    setGame(state, action: PayloadAction<Uno.Game>) {
      state.game = action.payload as any
    },
    setPlayerIndex(state, action: PayloadAction<number | undefined>) {
      state.playerIndex = action.payload
    },
    setRoomId(state, action: PayloadAction<string | undefined>) {
      state.roomId = action.payload
    },
    setPlayerName(state, action: PayloadAction<string | undefined>) {
      state.playerName = action.payload
    },
    setRooms(state, action: PayloadAction<RoomSummary[]>) {
      state.rooms = action.payload
    },
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload
    },
    /**
     * Reset state when disconnected from server
     */
    setDisconnected(state) {
      state.connected = false
      state.roomId = undefined
      state.playerIndex = undefined
      state.rooms = []
    },
  },
})

export const { setGame, setPlayerIndex, setRoomId, setRooms, setConnected, setDisconnected, setPlayerName } = slice.actions

export default slice.reducer

