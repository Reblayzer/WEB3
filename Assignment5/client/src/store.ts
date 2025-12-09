import { configureStore } from '@reduxjs/toolkit'
import unoReducer from './features/uno/unoSlice'

export const store = configureStore({
  reducer: {
    uno: unoReducer,
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
