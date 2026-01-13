// Composable for managing bot workers
import { ref, type Ref } from 'vue'
import type { Card, Color } from 'domain/model/types/card-types'
import Worker from '../workers/bot.worker.ts?worker'

interface BotWorkerMessage {
  type: 'PLAY_CARD' | 'DRAW_CARD'
  cardIndex?: number
  card?: Card
  chosenColor?: Color
}

interface OtherPlayerInfo {
  name: string
  cardCount: number
  hasCalledUno: boolean
}

interface BotAction {
  type: 'PLAY' | 'DRAW'
  cardIndex?: number
  chosenColor?: Color | null
}

export function useBotWorkers() {
  const botWorkers = ref<Record<string, Worker>>({})
  const botThinking = ref<Record<string, boolean>>({})

  function initializeBot(botName: string, onAction: (botName: string, action: BotAction) => void) {
    const worker = new Worker()

    worker.postMessage({
      type: 'INIT',
      botName
    })

    worker.onmessage = (e: MessageEvent<BotWorkerMessage>) => {
      const { type, cardIndex, chosenColor } = e.data
      botThinking.value[botName] = false

      if (type === 'PLAY_CARD') {
        onAction(botName, {
          type: 'PLAY',
          cardIndex: cardIndex!,
          chosenColor
        })
      } else if (type === 'DRAW_CARD') {
        onAction(botName, {
          type: 'DRAW'
        })
      }
    }

    worker.onerror = (error: ErrorEvent) => {
      console.error('Bot worker error:', error)
      botThinking.value[botName] = false
    }

    botWorkers.value[botName] = worker
  }

  function requestBotAction(
    botName: string,
    hand: readonly Card[],
    topCard: Card | null,
    currentColor: Color | null,
    otherPlayers: OtherPlayerInfo[]
  ) {
    const worker = botWorkers.value[botName]
    if (!worker) {
      console.error('No worker found for bot:', botName)
      return
    }

    botThinking.value[botName] = true

    // Serialize cards to plain objects
    const serializeCard = (card: Card | null): Card | null =>
      card ? JSON.parse(JSON.stringify(card)) : null

    worker.postMessage({
      type: 'YOUR_TURN',
      gameState: {
        hand: hand.map(serializeCard),
        topCard: serializeCard(topCard),
        currentColor,
        otherPlayers
      }
    })
  }

  function terminateAllBots() {
    Object.values(botWorkers.value).forEach((worker: Worker) => worker.terminate())
    botWorkers.value = {}
    botThinking.value = {}
  }

  function isBotThinking(botName: string): boolean {
    return botThinking.value[botName] || false
  }

  return {
    botWorkers,
    botThinking,
    initializeBot,
    requestBotAction,
    terminateAllBots,
    isBotThinking
  }
}
