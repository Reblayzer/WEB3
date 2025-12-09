import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as Uno from '../../model/uno'

type RoomSummary = { id: string; players: string[]; awaiting: number }

type UnoState = {
  game: Uno.Game
  playerIndex?: number
  connected: boolean
  roomId?: string
  rooms: RoomSummary[]
  playerName?: string
}

const defaultPlayers = ['Alice', 'Bob', 'Cara', 'Dan']

const sanitizeGame = (game: Uno.Game): Uno.Game => {
  const { randomizer, shuffler, currentRound, ...rest } = game as any
  const cleanRound = currentRound
    ? ({
        ...currentRound,
        shuffler: undefined,
        randomizer: undefined,
      } as any)
    : undefined
  return { ...(rest as Uno.Game), currentRound: cleanRound }
}

const initialState: UnoState = {
  game: sanitizeGame(Uno.createGame({ players: defaultPlayers, targetScore: 200 })),
  playerIndex: undefined,
  connected: false,
  roomId: undefined,
  rooms: [],
  playerName: undefined,
}

const slice = createSlice({
  name: 'uno',
  initialState,
  reducers: {
    setGame(state, action: PayloadAction<any>) {
      state.game = sanitizeGame(action.payload as Uno.Game)
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
