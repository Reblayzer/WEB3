// Round interface and implementation

import type { Card, Color, Shuffler } from './types/card-types.js'
import type { Direction, RoundConfig, RoundMemento, EndListener } from './types/round-types.js'
import { colors } from './types/card-types.js'
import { createStandardDeck, deckFromMemento, type Deck } from './deck.js'

// Re-export for backwards compatibility
export type { RoundMemento } from './types/round-types'

export interface Round {
  readonly playerCount: number
  player(i: number): string
  playerHand(i: number): Readonly<Card[]>
  drawPile(): Deck
  discardPile(): Deck
  playerInTurn(): number | undefined
  dealer: number
  canPlay(i: number): boolean
  canPlayAny(): boolean
  play(i: number, chosenColor?: Color): Card
  draw(): void
  sayUno(player: number): void
  hasCalledUno(player: number): boolean
  isUnoWindowOpen(): boolean
  getUnoTarget(): number | undefined
  catchUnoFailure(args: { accuser: number; accused: number }): boolean
  hasEnded(): boolean
  winner(): number | undefined
  score(): number | undefined
  onEnd(l: EndListener): void
  toMemento(): RoundMemento
}

const mod = (a: number, n: number) => ((a % n) + n) % n
const pointsFor = (c: Card): number =>
  c.type === 'NUMBERED' ? c.number : c.type === 'WILD' || c.type === 'WILD DRAW' ? 50 : 20

class RoundImpl implements Round {
  players: string[]
  dealer: number
  private hands: Card[][] = []
  private drawCards: Card[] = []
  private discardCards: Card[] = [] // top is index 0
  private curColor: Color
  private dir: Direction = 'clockwise'
  private turn: number | undefined
  private ended = false
  private theWinner: number | undefined
  private listeners: EndListener[] = []
  private _drawPile: Deck | undefined
  private _discardPile: Deck | undefined
  private shufflerFn?: Shuffler<Card>

  // UNO state
  private unoOpen = false
  private unoTarget: number | undefined
  private unoSaid = false
  private preUno: boolean[] = [] // pre-announce flags per player (before playing penultimate card)

  constructor(cfg: RoundConfig)
  constructor(m: RoundMemento, _shuffler?: Shuffler<Card>)
  constructor(arg: RoundConfig | RoundMemento, _shuffler?: Shuffler<Card>) {
    if ('hands' in arg) {
      const m = arg as RoundMemento
      // Store the shuffler for later use
      this.shufflerFn = _shuffler

      // Validation
      if (m.players.length < 2) throw new Error('Need at least 2 players')
      if (m.hands.length !== m.players.length) throw new Error('Hands count must match players count')
      if (m.discardPile.length === 0) throw new Error('Discard pile cannot be empty')
      if (!colors.includes(m.currentColor)) throw new Error('Invalid current color')
      if (m.dealer < 0 || m.dealer >= m.players.length) throw new Error('Invalid dealer')
      if (m.playerInTurn !== undefined && (m.playerInTurn < 0 || m.playerInTurn >= m.players.length)) {
        throw new Error('Invalid player in turn')
      }

      // Check for multiple winners (empty hands)
      const emptyHands = m.hands.filter(hand => hand.length === 0).length
      if (emptyHands > 1) throw new Error('Multiple winners not allowed')

      // Check if game should be finished but playerInTurn is provided
      const hasWinner = emptyHands === 1
      if (!hasWinner && m.playerInTurn === undefined) {
        throw new Error('PlayerInTurn required when game is not finished')
      }

      // Validate current color consistency with top discard card
      const topCard = m.discardPile[0] as Card
      if (topCard.type !== 'WILD' && topCard.type !== 'WILD DRAW') {
        if ('color' in topCard && topCard.color !== m.currentColor) {
          throw new Error('Current color inconsistent with top discard card')
        }
      }
      this.players = m.players.slice()
      this.dealer = m.dealer
      this.hands = m.hands.map((h) => h.slice())

      // Convert CardMemento arrays to Card arrays
      this.drawCards = m.drawPile.map(cardMemento => {
        if (cardMemento.type === 'WILD') return { type: 'WILD' }
        if (cardMemento.type === 'WILD DRAW') return { type: 'WILD DRAW' }
        if (cardMemento.type === 'NUMBERED') {
          if (!cardMemento.color || cardMemento.number === undefined) throw new Error('Invalid NUMBERED memento')
          return { type: 'NUMBERED', color: cardMemento.color, number: cardMemento.number }
        }
        if (cardMemento.type === 'SKIP' || cardMemento.type === 'REVERSE' || cardMemento.type === 'DRAW') {
          if (!cardMemento.color) throw new Error('Missing color for action card')
          return { type: cardMemento.type, color: cardMemento.color }
        }
        throw new Error('Unknown card type')
      })

      this.discardCards = m.discardPile.map(cardMemento => {
        if (cardMemento.type === 'WILD') return { type: 'WILD' }
        if (cardMemento.type === 'WILD DRAW') return { type: 'WILD DRAW' }
        if (cardMemento.type === 'NUMBERED') {
          if (!cardMemento.color || cardMemento.number === undefined) throw new Error('Invalid NUMBERED memento')
          return { type: 'NUMBERED', color: cardMemento.color, number: cardMemento.number }
        }
        if (cardMemento.type === 'SKIP' || cardMemento.type === 'REVERSE' || cardMemento.type === 'DRAW') {
          if (!cardMemento.color) throw new Error('Missing color for action card')
          return { type: cardMemento.type, color: cardMemento.color }
        }
        throw new Error('Unknown card type')
      })
      this.curColor = m.currentColor
      this.dir = m.currentDirection
      this.turn = m.playerInTurn
      this.preUno = new Array(this.players.length).fill(false)

      // Create deck instances that will maintain state
      this._drawPile = deckFromMemento(this.drawCards)
      this._discardPile = deckFromMemento(this.discardCards)

      // Set ended state and winner if there's a winner
      if (hasWinner) {
        this.ended = true
        this.theWinner = m.hands.findIndex(hand => hand.length === 0)
        this.turn = undefined
      }

      return
    }

    const cfg = arg as RoundConfig
    // Store the shuffler for later use
    this.shufflerFn = cfg.shuffler

    if (cfg.players.length < 2) throw new Error('Need at least 2 players')
    if (cfg.players.length > 10) throw new Error('Cannot have more than 10 players')
    const n = cfg.players.length
    const k = cfg.cardsPerPlayer ?? 7
    this.players = cfg.players.slice()
    this.dealer = cfg.dealer
    this.preUno = new Array(n).fill(false)

    // Build & (optionally) shuffle deck once before dealing
    const deck = createStandardDeck()
    if (cfg.shuffler) deck.shuffle(cfg.shuffler)

    // Deal k cards to each player sequentially
    this.hands = Array.from({ length: n }, () => [])
    for (let p = 0; p < n; p++) {
      for (let j = 0; j < k; j++) {
        const c = deck.deal()!
        this.hands[p].push(c)
      }
    }

    // Flip first non-wild to discard; reshuffle remaining if wilds appear first
    let first = deck.deal()!
    while (first.type === 'WILD' || first.type === 'WILD DRAW') {
      if (!cfg.shuffler) break
      deck.shuffle(cfg.shuffler)
      first = deck.deal()!
    }
    this.discardCards = [first]

    // Remaining cards are draw pile (front = top)
    this.drawCards = []
    for (; ;) {
      const c = deck.deal()
      if (!c) break
      this.drawCards.push(c)
    }

    this.curColor = 'color' in first ? first.color : colors[0]

    // Start player & initial effect
    const left = mod(this.dealer + 1, n)
    if (first.type === 'REVERSE') {
      this.dir = 'counterclockwise'
      this.turn = mod(this.dealer - 1, n)
    } else if (first.type === 'SKIP') {
      this.turn = mod(this.dealer + 2, n)
    } else if (first.type === 'DRAW') {
      this.giveCards(left, 2)
      this.turn = mod(this.dealer + 2, n)
    } else {
      this.turn = left
    }

    // Initialize deck instances for regular constructor too
    this._drawPile = deckFromMemento(this.drawCards)
    this._discardPile = deckFromMemento(this.discardCards)
  }

  get playerCount() {
    return this.players.length
  }

  player(i: number) {
    if (i < 0 || i >= this.players.length) throw new Error('Player index out of bounds')
    return this.players[i]
  }

  playerHand(i: number) {
    return this.hands[i]
  }

  drawPile(): Deck {
    if (!this._drawPile) {
      this._drawPile = deckFromMemento(this.drawCards)
    }
    return this._drawPile
  }

  discardPile(): Deck {
    if (!this._discardPile) {
      this._discardPile = deckFromMemento(this.discardCards)
    }
    return this._discardPile
  }

  playerInTurn() {
    return this.turn
  }

  canPlay(i: number): boolean {
    if (this.ended || this.turn === undefined) return false
    const p = this.turn
    if (i < 0 || i >= this.hands[p].length) return false

    const card = this.hands[p][i]
    const top = this.discardCards[0]

    // Special validation for WILD DRAW cards
    if (card.type === 'WILD DRAW') {
      // WILD DRAW can only be played if no cards of the current color are in hand
      const hand = this.hands[p]
      for (let j = 0; j < hand.length; j++) {
        if (j === i) continue // Skip the WILD DRAW card itself
        const otherCard = hand[j]
        if ('color' in otherCard && otherCard.color === this.curColor) {
          return false // Found a card of current color, so WILD DRAW is illegal
        }
      }
      return true // No cards of current color found, so WILD DRAW is legal
    }

    // Regular playability check for all other cards
    return this.playableAgainst(card, top, this.curColor, true) || card.type === 'WILD'
  }

  private playableAgainst(card: Card, top: Card, currentColor: Color, allowTypeMatch: boolean): boolean {
    if (top.type === 'WILD' || top.type === 'WILD DRAW') {
      if ('color' in card) return card.color === currentColor
      return true
    }
    if (card.type === 'NUMBERED') {
      if (top.type === 'NUMBERED') return card.color === currentColor || card.number === top.number
      return card.color === currentColor
    }
    if (card.type === 'SKIP' || card.type === 'REVERSE' || card.type === 'DRAW') {
      if (allowTypeMatch && top.type === card.type) return true
      return card.color === currentColor
    }
    return true
  }

  play(i: number, chosenColor?: Color): Card {
    if (!this.canPlay(i)) throw new Error('Illegal play')
    const p = this.turn!
    const card = this.hands[p].splice(i, 1)[0]

    // Validate color parameter usage
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      if (!chosenColor) throw new Error('Chosen color required for wild')
      this.curColor = chosenColor
    } else {
      if (chosenColor) throw new Error('Cannot specify color for non-wild cards')
      if ('color' in card) {
        this.curColor = card.color
      }
    }

    this.discardCards.unshift(card)

    // Update discard pile deck instance
    if (this._discardPile) {
      // Recreate the discard pile deck to reflect the new top card
      this._discardPile = deckFromMemento(this.discardCards)
    }

    // Open UNO window if player now has exactly one card.
    const nowHasOne = this.hands[p].length === 1
    this.unoOpen = nowHasOne
    this.unoTarget = nowHasOne ? p : undefined
    // honor pre-announce if they said UNO just before playing
    this.unoSaid = nowHasOne ? !!this.preUno[p] : false
    // clear pre-announce flag once the window opens
    this.preUno[p] = false

    this.advanceAfterPlay(card)

    if (this.hands[p].length === 0) {
      this.ended = true
      this.theWinner = p
      this.turn = undefined
      this.unoOpen = false
      this.listeners.forEach((l) => l({ winner: p }))
    }

    return card
  }

  canPlayAny(): boolean {
    if (this.ended || this.turn === undefined) return false
    return this.hands[this.turn].some((_, i) => this.canPlay(i))
  }

  private advanceAfterPlay(card: Card) {
    const n = this.playerCount
    const step = this.dir === 'clockwise' ? 1 : -1
    const next = (x: number, s = step) => mod(x + s, n)

    if (card.type === 'SKIP') {
      this.turn = next(this.turn!, step * 2) // Skip one player
      return
    }
    if (card.type === 'REVERSE') {
      if (n === 2) {
        // In 2-player game, reverse acts like skip
        this.turn = next(this.turn!, step * 2)
        return
      }
      // Change direction and move to next player in new direction
      this.dir = this.dir === 'clockwise' ? 'counterclockwise' : 'clockwise'
      const newStep = this.dir === 'clockwise' ? 1 : -1
      this.turn = mod(this.turn! + newStep, n)
      return
    }
    if (card.type === 'DRAW') {
      const victim = next(this.turn!)
      this.giveCards(victim, 2)
      this.turn = next(victim)
      return
    }
    if (card.type === 'WILD DRAW') {
      const victim = next(this.turn!)
      this.giveCards(victim, 4)
      this.turn = next(victim)
      return
    }
    this.turn = next(this.turn!)
  }

  draw(): void {
    if (this.ended || this.turn === undefined) throw new Error('Round ended')
    // A draw ends any open UNO window and clears pre-announce for this player
    this.unoOpen = false
    this.unoTarget = undefined
    this.unoSaid = false
    this.preUno[this.turn] = false

    if (this.drawCards.length === 0) this.rebuildDrawFromDiscard()
    const card = this.drawCards.shift()
    if (!card) return

    // Update the deck instance
    if (this._drawPile) {
      this._drawPile.deal()
    }

    const p = this.turn
    this.hands[p].push(card)

    // Check if we need to rebuild after drawing (when draw pile is now empty)
    if (this.drawCards.length === 0) {
      this.rebuildDrawFromDiscard()
    }

    const top = this.discardCards[0]
    const playable =
      this.playableAgainst(card, top, this.curColor, true) ||
      card.type === 'WILD' ||
      card.type === 'WILD DRAW'
    if (!playable) {
      const n = this.playerCount
      const step = this.dir === 'clockwise' ? 1 : -1
      this.turn = mod(this.turn + step, n)
    }
  }

  private giveCards(player: number, k: number) {
    for (let i = 0; i < k; i++) {
      if (this.drawCards.length === 0) this.rebuildDrawFromDiscard()
      const c = this.drawCards.shift()
      if (c) {
        this.hands[player].push(c)
        // Update the deck instance
        if (this._drawPile) {
          this._drawPile.deal()
        }
      }
    }
  }

  private rebuildDrawFromDiscard() {
    if (this.discardCards.length <= 1) {
      // Can't rebuild if we only have the top card or no cards
      return
    }

    // Remove all cards except the top one
    const top = this.discardCards[0]
    const cardsToShuffle = this.discardCards.slice(1)

    // Clear discard pile except for top card
    this.discardCards = [top]

    // Shuffle the cards if we have a shuffler, otherwise use default
    if (this.shufflerFn) {
      this.shufflerFn(cardsToShuffle)
    } else {
      cardsToShuffle.sort(() => Math.random() - 0.5)
    }

    // Add shuffled cards to draw pile
    this.drawCards = cardsToShuffle

    // Recreate deck instances to reflect the changes
    this._drawPile = deckFromMemento(this.drawCards)
    this._discardPile = deckFromMemento(this.discardCards)
  }

  sayUno(player: number) {
    // boundaries
    if (player < 0 || player >= this.playerCount) throw new Error('Invalid player')
    // cannot say UNO after hand has ended
    if (this.ended) throw new Error('Round ended')

    // Pre-announce: current player can say UNO before playing the penultimate card
    if (this.turn !== undefined && player === this.turn) {
      this.preUno[player] = true
      return
    }

    // Post-play window: accused player can still say UNO until accused/drawn/next move
    if (this.unoOpen && this.unoTarget === player) {
      this.unoSaid = true
      return
    }
    // Otherwise ignore silently (tests don't require a throw in this case)
  }

  hasCalledUno(player: number): boolean {
    // boundaries
    if (player < 0 || player >= this.playerCount) throw new Error('Invalid player')

    // Return true if:
    // 1. Player has pre-announced UNO (before playing to 1 card), OR
    // 2. Player is the UNO target (has 1 card) and said UNO (unoSaid = true)
    return this.preUno[player] || (this.unoTarget === player && this.unoSaid)
  }

  isUnoWindowOpen(): boolean {
    return this.unoOpen
  }

  getUnoTarget(): number | undefined {
    return this.unoTarget
  }

  catchUnoFailure({ accuser, accused }: { accuser: number; accused: number }): boolean {
    // boundaries
    if (accused < 0 || accused >= this.playerCount) throw new Error('Invalid accused')
    if (accuser < 0 || accuser >= this.playerCount) throw new Error('Invalid accuser')

    if (!this.unoOpen || this.unoTarget !== accused) return false
    if (this.unoSaid) return false

    this.giveCards(accused, 4)
    this.unoOpen = false
    this.unoTarget = undefined
    this.unoSaid = false
    this.preUno[accused] = false
    return true
  }

  hasEnded() {
    return this.ended
  }
  winner() {
    return this.theWinner
  }

  score(): number | undefined {
    if (!this.ended || this.theWinner === undefined) return undefined
    let sum = 0
    for (let p = 0; p < this.playerCount; p++) {
      if (p === this.theWinner) continue
      sum += this.hands[p].reduce((a, c) => a + pointsFor(c), 0)
    }
    return sum
  }

  onEnd(l: EndListener) {
    this.listeners.push(l)
  }

  toMemento(): RoundMemento {
    return {
      players: this.players.slice(),
      hands: this.hands.map((h) => h.slice()),
      drawPile: this.drawCards.map((c) => ({ ...c })),
      discardPile: this.discardCards.map((c) => ({ ...c })),
      currentColor: this.curColor,
      currentDirection: this.dir,
      dealer: this.dealer,
      playerInTurn: this.turn,
    }
  }
}

export type { RoundImpl }
export const createRound = (cfg: RoundConfig): Round => new RoundImpl(cfg)
export const createRoundFromMemento = (m: RoundMemento, _shuffler?: Shuffler<Card>): Round =>
  new RoundImpl(m, _shuffler)
export const pointsForCard = pointsFor
