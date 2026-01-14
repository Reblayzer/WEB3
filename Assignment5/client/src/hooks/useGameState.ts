import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import * as Round from 'domain/src/model/round'

/**
 * Custom hook for derived game state
 * Encapsulates game state logic and computed values
 * 
 * @returns Derived game state values
 */
export function useGameState() {
  const { game, playerIndex, connected, roomId, rooms, playerName } = useSelector((state: RootState) => state.uno)
  const round = game.currentRound

  const currentPlayer = round?.playerInTurn ?? -1

  const canAct = useMemo(
    () => connected && roomId !== undefined && playerIndex !== undefined && playerIndex === currentPlayer,
    [connected, roomId, playerIndex, currentPlayer]
  )

  const myName = useMemo(() => {
    if (playerIndex === undefined || !round) return ''
    return round.players[playerIndex]
  }, [round, playerIndex])

  const myHandLength = useMemo(() => {
    if (playerIndex === undefined || !round) return 0
    return round.hands[playerIndex].length
  }, [round, playerIndex])

  const alreadyCalledUno = useMemo(() => {
    if (playerIndex === undefined || !round) return false
    return round.preUno[playerIndex] === true
  }, [round, playerIndex])

  const canPlayAny = useMemo(() => {
    if (!canAct || playerIndex === undefined || !round) return false
    return Round.canPlayAny(round)
  }, [canAct, playerIndex, round])

  const canCallUno = useMemo(
    () => canAct && myHandLength === 2 && canPlayAny && !alreadyCalledUno,
    [canAct, myHandLength, canPlayAny, alreadyCalledUno]
  )

  const canCatchUno = useMemo(() => {
    if (!round) return false
    return (
      round.unoOpen &&
      !round.unoSaid &&
      round.unoTarget !== undefined &&
      playerIndex !== undefined &&
      playerIndex !== round.unoTarget
    )
  }, [round, playerIndex])

  const directionLabel = useMemo(() => {
    if (!round) return 'Unknown'
    return round.currentDirection === 'clockwise' ? 'Clockwise' : 'Counter-clockwise'
  }, [round?.currentDirection])

  const isMyTurn = canAct
  const isGameOver = !round && game.winner !== undefined
  const isWaiting = !round && game.winner === undefined

  return {
    game,
    round,
    playerIndex,
    currentPlayer,
    canAct,
    myName,
    myHandLength,
    alreadyCalledUno,
    canPlayAny,
    canCallUno,
    canCatchUno,
    directionLabel,
    isMyTurn,
    isGameOver,
    isWaiting,
    connected,
    roomId,
    rooms,
    playerName,
  }
}
