import { createInitialDeck, colors, type Card, type Color, pointsFor } from './deck'
import type { Shuffler } from '../utils/random_utils'
import { standardShuffler } from '../utils/random_utils'
import * as _ from 'lodash'

export type Direction = 'clockwise' | 'counterclockwise'

export type Round = {
  readonly players: readonly string[]
  readonly playerCount: number
  readonly dealer: number
  readonly cardsPerPlayer: number
  readonly shuffler: Shuffler<Card>
  readonly hands: readonly Card[][]
  readonly drawPile: readonly Card[]
  readonly discardPile: readonly Card[]
  readonly currentColor: Color
  readonly currentDirection: Direction
  readonly playerInTurn?: number
  readonly ended: boolean
  readonly winner?: number
  readonly unoOpen: boolean
  readonly unoTarget?: number
  readonly unoSaid: boolean
  readonly preUno: readonly boolean[]
}

type RoundArgs = {
  players: string[]
  dealer: number
  shuffler?: Shuffler<Card>
  cardsPerPlayer?: number
}

const mod = (a: number, n: number) => ((a % n) + n) % n

const drawFromPile = (
  count: number,
  drawPile: readonly Card[],
  discardPile: readonly Card[],
  shuffler: Shuffler<Card>
): { cards: Card[]; drawPile: Card[]; discardPile: Card[] } => {
  let pile = [...drawPile]
  let discard = [...discardPile]
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    if (pile.length === 0 && discard.length > 1) {
      const top = discard[0]
      const rest = discard.slice(1)
      pile = shuffler(rest)
      discard = [top]
    }
    if (pile.length === 0) break
    cards.push(pile[0])
    pile = pile.slice(1)
  }
  return { cards, drawPile: pile, discardPile: discard }
}

const initialState = (args: RoundArgs): Round => {
  const { players, dealer, shuffler = standardShuffler, cardsPerPlayer = 7 } = args
  if (players.length < 2) throw new Error('Need at least 2 players')
  if (players.length > 10) throw new Error('Too many players')
  const n = players.length
  const deck = shuffler(createInitialDeck())

  // deal
  const hands: Card[][] = Array.from({ length: n }, (_, i) =>
    deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer)
  )
  let discardIdx = cardsPerPlayer * n

  let drawPile = deck.slice(discardIdx + 1)
  let discardTop = deck[discardIdx]

  // if top is wild/wild draw, reshuffle remaining until non-wild or no shuffler changes
  let shuffledDeck = deck
  while ((discardTop.type === 'WILD' || discardTop.type === 'WILD DRAW')) {
    const remaining = shuffledDeck.slice(cardsPerPlayer * n)
    const reshuffled = shuffler(remaining)
    discardTop = reshuffled[0]
    drawPile = reshuffled.slice(1)
    shuffledDeck = deck.slice(0, cardsPerPlayer * n).concat(reshuffled)
    if (discardTop.type !== 'WILD' && discardTop.type !== 'WILD DRAW') break
  }
  let discardPile: Card[] = [discardTop]
  const currentColor: Color = 'color' in discardTop && discardTop.color ? discardTop.color : colors[0]
  let dir: Direction = 'clockwise'
  let playerInTurn: number | undefined
  const left = mod(dealer + 1, n)
  if (discardTop.type === 'REVERSE') {
    dir = 'counterclockwise'
    playerInTurn = mod(dealer - 1, n)
  } else if (discardTop.type === 'SKIP') {
    playerInTurn = mod(dealer + 2, n)
  } else if (discardTop.type === 'DRAW') {
    const victim = left
    const res = drawFromPile(2, drawPile, discardPile, shuffler)
    hands[victim] = hands[victim].concat(res.cards)
    drawPile = res.drawPile
    discardPile = res.discardPile
    playerInTurn = mod(dealer + 2, n)
  } else {
    playerInTurn = left
  }

  return {
    players: [...players],
    playerCount: n,
    dealer,
    cardsPerPlayer,
    shuffler,
    hands: hands.map(h => [...h]),
    drawPile: [...drawPile],
    discardPile,
    currentColor,
    currentDirection: dir,
    playerInTurn,
    ended: false,
    winner: undefined,
    unoOpen: false,
    unoTarget: undefined,
    unoSaid: false,
    preUno: Array(n).fill(false)
  }
}

export function createRound(args: RoundArgs): Round
export function createRound(players: string[], dealer: number, shuffler?: Shuffler<Card>, cardsPerPlayer?: number): Round
export function createRound(
  a: RoundArgs | string[],
  dealer?: number,
  shuffler?: Shuffler<Card>,
  cardsPerPlayer?: number
): Round {
  if (Array.isArray(a)) {
    return initialState({ players: a, dealer: dealer ?? 0, shuffler, cardsPerPlayer })
  }
  return initialState(a)
}

export const topOfDiscard = (round: Round) => round.discardPile[0]

const closeUnoWindow = (round: Round): Round => ({
  ...round,
  unoOpen: false,
  unoTarget: undefined,
  unoSaid: false
})

const updateAfterPlay = (round: Round, card: Card): Round => {
  const n = round.players.length
  let dir = round.currentDirection
  const step = dir === 'clockwise' ? 1 : -1
  const next = (x: number, s = step) => mod(x + s, n)
  let playerInTurn = round.playerInTurn
  let hands = round.hands.map(h => [...h])
  let drawPile = [...round.drawPile]
  let discardPile = [card, ...round.discardPile]

  if (card.type === 'SKIP') {
    playerInTurn = next(playerInTurn!, step * 2)
  } else if (card.type === 'REVERSE') {
    if (n === 2) {
      playerInTurn = next(playerInTurn!, step * 2)
    } else {
      dir = dir === 'clockwise' ? 'counterclockwise' : 'clockwise'
      const newStep = dir === 'clockwise' ? 1 : -1
      playerInTurn = mod(playerInTurn! + newStep, n)
    }
  } else if (card.type === 'DRAW') {
    const victim = next(playerInTurn!)
    const res = drawFromPile(2, drawPile, discardPile, round.shuffler)
    hands[victim] = hands[victim].concat(res.cards)
    drawPile = res.drawPile
    discardPile = res.discardPile
    playerInTurn = next(victim)
  } else if (card.type === 'WILD DRAW') {
    const victim = next(playerInTurn!)
    const res = drawFromPile(4, drawPile, discardPile, round.shuffler)
    hands[victim] = hands[victim].concat(res.cards)
    drawPile = res.drawPile
    discardPile = res.discardPile
    playerInTurn = next(victim)
  } else {
    playerInTurn = next(playerInTurn!)
  }

  return {
    ...round,
    hands,
    drawPile,
    discardPile,
    currentDirection: dir,
    playerInTurn,
  }
}

export const canPlay = (index: number, round: Round): boolean => {
  if (round.ended || round.playerInTurn === undefined) return false
  if (index < 0 || index >= round.hands[round.playerInTurn].length) return false
  const card = round.hands[round.playerInTurn][index]
  const top = topOfDiscard(round)

  if (card.type === 'WILD') return true
  if (card.type === 'WILD DRAW') {
    // only if no card of current color in hand excluding itself
    return !round.hands[round.playerInTurn].some((c, i) =>
      i !== index && 'color' in c && c.color === round.currentColor)
  }
  if (top.type === 'WILD' || top.type === 'WILD DRAW') {
    return 'color' in card && card.color === round.currentColor
  }
  if (card.type === 'NUMBERED') {
    if (top.type === 'NUMBERED') return card.color === round.currentColor || card.number === top.number
    return card.color === round.currentColor
  }
  // action card
  if (top.type === card.type) return true
  return 'color' in card && card.color === round.currentColor
}

export const canPlayAny = (round: Round): boolean => {
  if (round.ended || round.playerInTurn === undefined) return false
  return round.hands[round.playerInTurn].some((_, i) => canPlay(i, round))
}

export const play = (index: number, chosenColor: Color | undefined, round: Round): Round => {
  round = closeUnoWindow(round)
  if (!canPlay(index, round)) throw new Error('Illegal play')
  const p = round.playerInTurn!
  let hands = round.hands.map(h => [...h])
  const card = hands[p][index]
  hands[p] = hands[p].filter((_, i) => i !== index)

  let currentColor = round.currentColor
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    if (!chosenColor) throw new Error('Must choose color for wild')
    currentColor = chosenColor
  } else {
    if (chosenColor) throw new Error('Cannot choose color for non-wild')
    if ('color' in card) currentColor = card.color
  }

  // open UNO window if player now has one card
  const unoOpen = hands[p].length === 1
  const unoTarget = unoOpen ? p : undefined
  const unoSaid = unoOpen ? round.preUno[p] : false
  const preUno = hands[p].length === 1 ? round.preUno.map((v, i) => i === p ? false : v) : round.preUno

  let nextRound: Round = {
    ...round,
    hands,
    currentColor,
    unoOpen,
    unoTarget,
    unoSaid,
    preUno,
  }

  nextRound = updateAfterPlay(nextRound, card)

  if (hands[p].length === 0) {
    return {
      ...nextRound,
      ended: true,
      winner: p,
      playerInTurn: undefined,
      unoOpen: false,
      unoTarget: undefined,
      unoSaid: false
    }
  }
  return nextRound
}

export const draw = (round: Round): Round => {
  round = closeUnoWindow(round)
  if (round.ended || round.playerInTurn === undefined) throw new Error('Round ended')

  let drawPile = [...round.drawPile]
  let discardPile = [...round.discardPile]
  let hands = round.hands.map(h => [...h])

  // rebuild draw pile if empty and discardPile has more than top
  if (drawPile.length === 0 && discardPile.length > 1) {
    const top = discardPile[0]
    const rest = discardPile.slice(1)
    const reshuffled = round.shuffler(rest)
    drawPile = reshuffled
    discardPile = [top]
  }
  if (drawPile.length === 0) throw new Error('No cards to draw')
  const card = drawPile[0]
  drawPile = drawPile.slice(1)
  const p = round.playerInTurn
  hands[p].push(card)

  const playable = canPlay(hands[p].length - 1, { ...round, hands, drawPile, discardPile })
  let playerInTurn = round.playerInTurn
  if (!playable) {
    const step = round.currentDirection === 'clockwise' ? 1 : -1
    playerInTurn = mod(playerInTurn + step, round.players.length)
  }
  // if we just emptied the draw pile, rebuild from discard for next player
  if (drawPile.length === 0 && discardPile.length > 1) {
    const top = discardPile[0]
    const rest = discardPile.slice(1)
    const reshuffled = round.shuffler(rest)
    drawPile = reshuffled
    discardPile = [top]
  }
  return closeUnoWindow({
    ...round,
    hands,
    drawPile,
    discardPile,
    playerInTurn
  })
}

export const sayUno = (player: number, round: Round): Round => {
  if (player < 0 || player >= round.players.length) throw new Error('Invalid player')
  if (round.ended) throw new Error('Round ended')
  // pre-announce if it's your turn
  if (round.playerInTurn === player) {
    const preUno = round.preUno.map((v, i) => i === player ? true : v)
    return { ...round, preUno }
  }
  if (round.unoOpen && round.unoTarget === player) {
    return { ...round, unoSaid: true }
  }
  return round
}

export const checkUnoFailure = ({ accuser, accused }: { accuser: number; accused: number }, round: Round): boolean => {
  if (accused < 0 || accused >= round.players.length) throw new Error('Invalid accused')
  if (accuser < 0 || accuser >= round.players.length) throw new Error('Invalid accuser')
  if (!round.unoOpen || round.unoTarget !== accused) return false
  if (round.unoSaid) return false
  return true
}

export const catchUnoFailure = ({ accuser, accused }: { accuser: number; accused: number }, round: Round): Round => {
  if (!checkUnoFailure({ accuser, accused }, round)) return round

  const res = drawFromPile(4, round.drawPile, round.discardPile, round.shuffler)
  const hands = round.hands.map((h, i) => i === accused ? h.concat(res.cards) : [...h])
  return closeUnoWindow({
    ...round,
    hands,
    drawPile: res.drawPile,
    discardPile: res.discardPile
  })
}

export const hasEnded = (round: Round) => round.ended
export const winner = (round: Round) => round.winner

export const score = (round: Round): number | undefined => {
  if (!round.ended || round.winner === undefined) return undefined
  const scores = round.hands.flatMap((h, idx) => (idx === round.winner ? [] : h.map(pointsFor)))
  return scores.reduce((acc, n) => acc + n, 0)
}
