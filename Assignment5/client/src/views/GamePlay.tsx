import type { Card } from 'domain/src/model/deck'
import { useGameState } from '../hooks/useGameState'
import { useGameActions } from '../hooks/useGameActions'
import { useServerConnection } from '../hooks/useServerConnection'
import GameHeader from '../components/GameHeader'
import GameBoard from '../components/GameBoard'
import PlayersList from '../components/PlayersList'
import HandCard from '../components/HandCard'
import ColorChooser from '../components/ColorChooser'
import { colorToHex } from '../utils/colorUtils'

/**
 * Main game play page - active gameplay
 */
export default function GamePlayView() {
  const gameState = useGameState()
  const { send } = useServerConnection()
  const {
    handleCardClick,
    handleWildColorChosen,
    handleDraw,
    handleSayUno,
    handleCatchUno,
    showColorChooser,
    isCardPlayable,
  } = useGameActions(send, gameState.round, gameState.canAct)

  const { game, round, playerIndex, currentPlayer, isMyTurn, directionLabel, canCallUno, canCatchUno, connected } = gameState

  // Loading/reconnecting state
  if (!connected) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Reconnecting to the game...</p>
      </div>
    )
  }

  if (!round) return null

  const drawPileCount = round.drawPile.length
  const currentColorHex = colorToHex(round.currentColor)
  const myHand = playerIndex !== undefined ? round.hands[playerIndex] : []
  const myHandLength = myHand.length
  const currentPlayerName = round.players[currentPlayer]

  return (
    <div className="game-play-container">
      <GameHeader
        isMyTurn={isMyTurn}
        currentPlayer={currentPlayerName}
        directionLabel={directionLabel}
        drawPileCount={drawPileCount}
        targetScore={game.targetScore}
      />

      <GameBoard
        topCard={round.discardPile[0]}
        currentColor={round.currentColor}
        currentColorHex={currentColorHex}
        isMyTurn={isMyTurn}
        onDraw={() => handleDraw()}
      />

      <PlayersList
        players={round.players}
        handSizes={round.hands.map((h) => h.length)}
        scores={game.scores}
        hasUnoBadge={round.preUno.map((p, idx) => p || (round.unoOpen && round.unoTarget === idx))}
        currentPlayerIdx={currentPlayer}
        myPlayerIdx={playerIndex}
      />

      <div className="player-hand">
        <h3>Your Hand ({myHandLength} cards)</h3>
        <div className="hand-cards">
          {myHandLength > 0 ? (
            myHand.map((card, cardIdx) => (
              <HandCard
                key={`${cardIdx}-${card.type}`}
                card={card}
                index={cardIdx}
                playable={isCardPlayable(cardIdx)}
                disabled={!isMyTurn}
                onClick={() => isCardPlayable(cardIdx) && isMyTurn && handleCardClick(cardIdx, card)}
              />
            ))
          ) : (
            <span className="muted">Join a room to see your hand</span>
          )}
        </div>

        <div className="hand-actions">
          {canCallUno && (
            <button className="uno-button" onClick={() => handleSayUno()}>
              Call UNO!
            </button>
          )}
          {canCatchUno && round.unoTarget !== undefined && (
            <button className="catch-button" onClick={() => handleCatchUno(round.unoTarget!)}>
              Catch UNO Failure
            </button>
          )}
        </div>
      </div>

      {showColorChooser && (
        <ColorChooser
          onChooseColor={(color) => handleWildColorChosen(color)}
          onCancel={() => handleWildColorChosen(null as any)}
        />
      )}
    </div>
  )
}
