// Bot Worker - Runs bot AI logic in a separate thread
// Uses only postMessage and onmessage as per assignment requirements

let botName = 'Bot'
let difficulty = 'medium' // Could be: easy, medium, hard

// Message handler
self.onmessage = function(e) {
  const { type, gameState, botName: name } = e.data
  
  if (type === 'INIT') {
    botName = name || 'Bot'
    return
  }
  
  if (type === 'YOUR_TURN') {
    // Simulate thinking time
    const thinkTime = 800 + Math.random() * 1200
    setTimeout(() => {
      makeDecision(gameState)
    }, thinkTime)
  }
}

function makeDecision(gameState) {
  const { hand, topCard, currentColor, otherPlayers } = gameState
  
  console.log('[Bot Worker] Making decision with:', {
    hand: hand,
    topCard: topCard,
    currentColor: currentColor
  })
  
  // Find playable cards
  const playableIndices = []
  hand.forEach((card, index) => {
    const isPlayable = canPlayCard(card, topCard, currentColor, hand)
    console.log(`[Bot Worker] Card ${index} (${card.color} ${card.type} ${card.number}): ${isPlayable ? 'PLAYABLE' : 'not playable'}`)
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
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
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
    const failedPlayer = otherPlayers.find(p => p.cardCount === 1 && !p.hasCalledUno)
    if (failedPlayer) {
      self.postMessage({
        type: 'CATCH_UNO_FAILURE',
        playerName: failedPlayer.name
      })
    }
  }
}

function canPlayCard(card, topCard, currentColor, hand) {
  if (!topCard) return true
  
  // Regular WILD cards can always be played
  if (card.type === 'WILD') {
    console.log(`[Bot Worker] ${card.color} ${card.type} - WILD always playable`)
    return true
  }
  
  // WILD DRAW can only be played if you have no other playable cards
  // This is a special UNO rule - you can't play +4 if you have any card matching the current color
  if (card.type === 'WILD DRAW') {
    // Check if hand has any cards matching the current color
    if (hand) {
      const hasColorMatch = hand.some(c => 
        c !== card && c.color === currentColor
      )
      // Can only play WILD DRAW if no color matches
      console.log(`[Bot Worker] WILD DRAW - hasColorMatch: ${hasColorMatch}, canPlay: ${!hasColorMatch}`)
      return !hasColorMatch
    }
    // If we don't have hand info (shouldn't happen), allow it
    return true
  }
  
  // Match color
  if (card.color === currentColor) {
    console.log(`[Bot Worker] ${card.color} ${card.type} ${card.number} - matches current color ${currentColor}`)
    return true
  }
  
  // Match type
  if (card.type === topCard.type) {
    console.log(`[Bot Worker] ${card.color} ${card.type} - matches top card type ${topCard.type}`)
    return true
  }
  
  // Match number
  if (card.type === 'NUMBERED' && topCard.type === 'NUMBERED' && card.number === topCard.number) {
    console.log(`[Bot Worker] ${card.color} ${card.number} - matches top card number ${topCard.number}`)
    return true
  }
  
  console.log(`[Bot Worker] ${card.color} ${card.type} ${card.number} - NO MATCH (topCard: ${topCard.color} ${topCard.type} ${topCard.number}, currentColor: ${currentColor})`)
  return false
}

function chooseCard(hand, playableIndices, topCard, currentColor, otherPlayers) {
  // Simple strategy with some randomness for bot imperfection
  
  // Prioritize special cards if someone has few cards
  const someoneCloseToWinning = otherPlayers.some(p => p.cardCount <= 2)
  if (someoneCloseToWinning) {
    const specialCards = playableIndices.filter(i => {
      const card = hand[i]
      return ['SKIP', 'REVERSE', 'DRAW', 'WILD DRAW'].includes(card.type)
    })
    if (specialCards.length > 0) {
      return specialCards[Math.floor(Math.random() * specialCards.length)]
    }
  }
  
  // Try to play wild cards last (save them)
  const nonWildCards = playableIndices.filter(i => {
    const card = hand[i]
    return card.type !== 'WILD' && card.type !== 'WILD DRAW'
  })
  
  if (nonWildCards.length > 0) {
    // Prefer cards that match color
    const colorMatches = nonWildCards.filter(i => hand[i].color === currentColor)
    if (colorMatches.length > 0 && Math.random() > 0.3) {
      return colorMatches[Math.floor(Math.random() * colorMatches.length)]
    }
    
    // Otherwise random non-wild card
    return nonWildCards[Math.floor(Math.random() * nonWildCards.length)]
  }
  
  // Must play wild card
  return playableIndices[Math.floor(Math.random() * playableIndices.length)]
}

function chooseColor(hand) {
  // Count cards of each color
  const colorCounts = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 }
  
  hand.forEach(card => {
    if (card.color && colorCounts.hasOwnProperty(card.color)) {
      colorCounts[card.color]++
    }
  })
  
  // Choose color with most cards
  let maxColor = 'RED'
  let maxCount = 0
  
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count
      maxColor = color
    }
  }
  
  // Add some randomness (bot imperfection)
  if (Math.random() < 0.2) {
    const colors = ['RED', 'YELLOW', 'GREEN', 'BLUE']
    return colors[Math.floor(Math.random() * colors.length)]
  }
  
  return maxColor
}

// Error handler
self.onerror = function(error) {
  console.error('Worker error:', error)
}
