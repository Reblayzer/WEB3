import { useState, useCallback } from 'react'
import type { Color, Card } from 'domain/src/model/deck'
import * as Round from 'domain/src/model/round'
import type { OutgoingMessage } from '../types/serverTypes'

/**
 * Custom hook for game actions (play card, draw, UNO calls)
 * Encapsulates game interaction logic
 * 
 * @param send - Function to send messages to server
 * @param round - Current round state
 * @param canAct - Whether the player can perform actions
 * @returns Game action handlers and state
 */
export function useGameActions(
  send: (msg: OutgoingMessage) => void,
  round: any,
  canAct: boolean
) {
  const [pendingWildIndex, setPendingWildIndex] = useState<number | null>(null)
  const [showColorChooser, setShowColorChooser] = useState(false)

  const handleCardClick = useCallback(
    (index: number, card: Card) => {
      if (!round || !canAct) return

      // Wild cards need color selection
      if (card.type === 'WILD' || card.type === 'WILD DRAW') {
        setPendingWildIndex(index)
        setShowColorChooser(true)
        return
      }

      send({ type: 'play', index })
    },
    [round, canAct, send]
  )

  const handleWildColorChosen = useCallback(
    (color: Color) => {
      if (pendingWildIndex === null) return

      send({ type: 'play', index: pendingWildIndex, color })
      setPendingWildIndex(null)
      setShowColorChooser(false)
    },
    [pendingWildIndex, send]
  )

  const handleCancelColorChoice = useCallback(() => {
    setShowColorChooser(false)
    setPendingWildIndex(null)
  }, [])

  const handleDraw = useCallback(() => {
    send({ type: 'draw' })
  }, [send])

  const handleSayUno = useCallback(() => {
    send({ type: 'say-uno' })
  }, [send])

  const handleCatchUno = useCallback(
    (accused: number) => {
      send({ type: 'catch-uno', accused })
    },
    [send]
  )

  const handleStartGame = useCallback(() => {
    send({ type: 'start-game' })
  }, [send])

  const handleReset = useCallback(() => {
    send({ type: 'reset' })
  }, [send])

  const isCardPlayable = useCallback(
    (cardIndex: number): boolean => {
      if (!round || !canAct) return false
      return Round.canPlay(cardIndex, round)
    },
    [round, canAct]
  )

  return {
    handleCardClick,
    handleWildColorChosen,
    handleCancelColorChoice,
    handleDraw,
    handleSayUno,
    handleCatchUno,
    handleStartGame,
    handleReset,
    isCardPlayable,
    showColorChooser,
  }
}
