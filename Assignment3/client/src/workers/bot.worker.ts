// Bot Worker - Runs bot AI logic in a separate thread
// Uses only postMessage and onmessage as per assignment requirements

import type { Card, Color } from 'domain/src/model/types/card-types'

interface OtherPlayer {
  name: string
  cardCount: number
  hasCalledUno: boolean
}

interface GameState {
  hand: Card[]
  topCard: Card | null
  currentColor: Color | null
  otherPlayers: OtherPlayer[]
}

interface InitMessage {
  type: 'INIT'
  botName?: string
}

interface YourTurnMessage {
  type: 'YOUR_TURN'
  gameState: GameState
}

type WorkerMessage = InitMessage | YourTurnMessage

let botName: string = 'Bot'
let difficulty: string = 'medium' // Could be: easy, medium, hard

// Message handler
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const { type } = e.data

  if (type === 'INIT') {
    botName = e.data.botName || 'Bot'
    return
  }

  if (type === 'YOUR_TURN') {
    const { gameState } = e.data
    // Simulate thinking time
    const thinkTime = 800 + Math.random() * 1200
    setTimeout(() => {
      makeDecision(gameState)
    }, thinkTime)
  }
}

function makeDecision(gameState: GameState): void {
  const { hand, topCard, currentColor, otherPlayers } = gameState

  console.log('[Bot Worker] Making decision with:', {
    hand: hand,
    topCard: topCard,
    currentColor: currentColor
  })

  // Find playable cards
  const playableIndices: number[] = []
  hand.forEach((card: Card, index: number) => {
    const isPlayable = canPlayCard(card, topCard, currentColor, hand)
    const cardColor = 'color' in card ? card.color : 'N/A'
    const cardNum = card.type === 'NUMBERED' ? card.number : ''
    console.log(`[Bot Worker] Card ${index} (${cardColor} ${card.type} ${cardNum}): ${isPlayable ? 'PLAYABLE' : 'not playable'}`)
    if (isPlayable) {
      playableIndices.push(index)
    }
  })

  console.log('[Bot Worker] Playable indices:', playableIndices)

  if (playableIndices.length > 0) {
    // Choose which card to play
    const cardIndex = chooseCard(hand, playableIndices, topCard, currentColor, otherPlayers)
    const card = hand[cardIndex]

    // If wild card, choose color
    let chosenColor = null
    if (card && (card.type === 'WILD' || card.type === 'WILD DRAW')) {
      chosenColor = chooseColor(hand)
    }

    // Sometimes forget to say UNO (bot imperfection as per requirements)
    const shouldSayUno = hand.length === 2 && Math.random() > 0.3

    self.postMessage({
      type: 'PLAY_CARD',
      cardIndex,
      card: card, // Send the actual card for verification
      chosenColor,
      sayUno: shouldSayUno
    })
  } else {
    // No playable cards - draw
    self.postMessage({
      type: 'DRAW_CARD'
    })
  }

  // Sometimes catch other players' UNO failures
  if (Math.random() > 0.5) {
    const failedPlayer = otherPlayers.find((p: OtherPlayer) => p.cardCount === 1 && !p.hasCalledUno)
    if (failedPlayer) {
      self.postMessage({
        type: 'CATCH_UNO_FAILURE',
        playerName: failedPlayer.name
      })
    }
  }
}

function canPlayCard(card: Card, topCard: Card | null, currentColor: Color | null, hand?: Card[]): boolean {
  if (!topCard) return true

  // Regular WILD cards can always be played
  if (card.type === 'WILD') {
    console.log(`[Bot Worker] ${card.type} - WILD always playable`)
    return true
  }

  // WILD DRAW can only be played if you have no other playable cards
  // This is a special UNO rule - you can't play +4 if you have any card matching the current color
  if (card.type === 'WILD DRAW') {
    // Check if hand has any cards matching the current color
    if (hand) {
      const hasColorMatch = hand.some((c: Card) =>
        c !== card && 'color' in c && c.color === currentColor
      )
      // Can only play WILD DRAW if no color matches
      console.log(`[Bot Worker] WILD DRAW - hasColorMatch: ${hasColorMatch}, canPlay: ${!hasColorMatch}`)
      return !hasColorMatch
    }
    // If we don't have hand info (shouldn't happen), allow it
    return true
  }

  // For cards with color property (numbered and action cards)
  if ('color' in card && card.color === currentColor) {
    const cardNum = card.type === 'NUMBERED' ? card.number : ''
    console.log(`[Bot Worker] ${card.color} ${card.type} ${cardNum} - matches current color ${currentColor}`)
    return true
  }

  // Match type
  if (card.type === topCard.type) {
    const cardColor = 'color' in card ? card.color : 'N/A'
    console.log(`[Bot Worker] ${cardColor} ${card.type} - matches top card type ${topCard.type}`)
    return true
  }

  // Match number
  if (card.type === 'NUMBERED' && topCard.type === 'NUMBERED' && card.number === topCard.number) {
    console.log(`[Bot Worker] ${card.color} ${card.number} - matches top card number ${topCard.number}`)
    return true
  }

  const cardColor = 'color' in card ? card.color : 'N/A'
  const cardNum = card.type === 'NUMBERED' ? card.number : ''
  const topCardColor = 'color' in topCard ? topCard.color : 'N/A'
  const topCardNum = topCard.type === 'NUMBERED' ? topCard.number : ''
  console.log(`[Bot Worker] ${cardColor} ${card.type} ${cardNum} - NO MATCH (topCard: ${topCardColor} ${topCard.type} ${topCardNum}, currentColor: ${currentColor})`)
  return false
}

function chooseCard(hand: Card[], playableIndices: number[], topCard: Card | null, currentColor: Color | null, otherPlayers: OtherPlayer[]): number {
  // Simple strategy with some randomness for bot imperfection

  // Prioritize special cards if someone has few cards
  const someoneCloseToWinning = otherPlayers.some((p: OtherPlayer) => p.cardCount <= 2)
  if (someoneCloseToWinning) {
    const specialCards = playableIndices.filter((i: number) => {
      const card = hand[i]
      return card && ['SKIP', 'REVERSE', 'DRAW', 'WILD DRAW'].includes(card.type)
    })
    if (specialCards.length > 0) {
      return specialCards[Math.floor(Math.random() * specialCards.length)]!
    }
  }

  // Try to play wild cards last (save them)
  const nonWildCards = playableIndices.filter((i: number) => {
    const card = hand[i]
    return card && card.type !== 'WILD' && card.type !== 'WILD DRAW'
  })

  if (nonWildCards.length > 0) {
    // Prefer cards that match color
    const colorMatches = nonWildCards.filter((i: number) => {
      const card = hand[i]
      return card && 'color' in card && card.color === currentColor
    })
    if (colorMatches.length > 0 && Math.random() > 0.3) {
      return colorMatches[Math.floor(Math.random() * colorMatches.length)]!
    }

    // Otherwise random non-wild card
    return nonWildCards[Math.floor(Math.random() * nonWildCards.length)]!
  }

  // Must play wild card
  return playableIndices[Math.floor(Math.random() * playableIndices.length)]!
}

function chooseColor(hand: Card[]): Color {
  // Count cards of each color
  const colorCounts: Record<string, number> = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 }

  hand.forEach(card => {
    if ('color' in card && card.color && colorCounts.hasOwnProperty(card.color)) {
      const colorKey = card.color as string
      const currentCount = colorCounts[colorKey]
      if (currentCount !== undefined) {
        colorCounts[colorKey] = currentCount + 1
      }
    }
  })

  // Choose color with most cards
  let maxColor: Color = 'RED'
  let maxCount = 0

  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count
      maxColor = color as Color
    }
  }

  // Add some randomness (bot imperfection)
  if (Math.random() < 0.2) {
    const colors: Color[] = ['RED', 'YELLOW', 'GREEN', 'BLUE']
    return colors[Math.floor(Math.random() * colors.length)]!
  }

  return maxColor
}

// Error handler
self.onerror = function (event: string | Event) {
  console.error('Worker error:', event)
}
