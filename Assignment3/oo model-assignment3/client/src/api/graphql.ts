// GraphQL API for UNO multiplayer
import { ApolloClient, InMemoryCache, gql, split, HttpLink, type DocumentNode } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import type { Game, AvailableGame, PlayerHand, GameUpdate } from './types'
import type { Color } from '../../../domain/dist/model/types/card-types.js'

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
  })
)

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
})

// Split link: use WebSocket for subscriptions, HTTP for everything else
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  httpLink
)

// Apollo Client instance
const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
})

// Helper functions for queries and mutations
async function query<T = any>(queryDoc: DocumentNode, variables: Record<string, any> = {}): Promise<T> {
  const result = await apolloClient.query({
    query: queryDoc,
    variables,
    fetchPolicy: 'network-only',
  })
  return result.data as T
}

async function mutate<T = any>(mutationDoc: DocumentNode, variables: Record<string, any> = {}): Promise<T> {
  const result = await apolloClient.mutate({
    mutation: mutationDoc,
    variables,
    fetchPolicy: 'network-only',
  })
  return result.data as T
}

// ==================== QUERIES ====================

export async function getAvailableGames(): Promise<AvailableGame[]> {
  const data = await query<{ availableGames: AvailableGame[] }>(gql`
    query GetAvailableGames {
      availableGames {
        id
        createdBy
        playerCount
        maxPlayers
        status
      }
    }
  `)
  return data.availableGames
}

export async function getGame(gameId: string): Promise<Game> {
  const data = await query<{ game: Game }>(
    gql`
      query GetGame($id: ID!) {
        game(id: $id) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
          unoWindowOpen
          unoTarget
        }
      }
    `,
    { id: gameId }
  )
  return data.game
}

export async function getPlayerHand(gameId: string, playerId: string): Promise<PlayerHand> {
  const data = await query<{ playerHand: PlayerHand }>(
    gql`
      query GetPlayerHand($gameId: ID!, $playerId: ID!) {
        playerHand(gameId: $gameId, playerId: $playerId) {
          gameId
          playerId
          cards {
            type
            color
            number
          }
        }
      }
    `,
    { gameId, playerId }
  )
  return data.playerHand
}

// ==================== MUTATIONS ====================

export async function createGame(playerName: string, maxPlayers: number = 4): Promise<Game> {
  const data = await mutate<{ createGame: Game }>(
    gql`
      mutation CreateGame($playerName: String!, $maxPlayers: Int) {
        createGame(playerName: $playerName, maxPlayers: $maxPlayers) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
        }
      }
    `,
    { playerName, maxPlayers }
  )
  return data.createGame
}

export async function joinGame(gameId: string, playerName: string): Promise<Game> {
  const data = await mutate<{ joinGame: Game }>(
    gql`
      mutation JoinGame($gameId: ID!, $playerName: String!) {
        joinGame(gameId: $gameId, playerName: $playerName) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
        }
      }
    `,
    { gameId, playerName }
  )
  return data.joinGame
}

export async function startGame(gameId: string, playerId: string): Promise<Game> {
  const data = await mutate<{ startGame: Game }>(
    gql`
      mutation StartGame($gameId: ID!, $playerId: ID!) {
        startGame(gameId: $gameId, playerId: $playerId) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
        }
      }
    `,
    { gameId, playerId }
  )
  return data.startGame
}

export async function playCard(gameId: string, playerId: string, cardIndex: number, chosenColor: Color | null = null): Promise<Game> {
  const data = await mutate<{ playCard: Game }>(
    gql`
      mutation PlayCard($gameId: ID!, $playerId: ID!, $cardIndex: Int!, $chosenColor: String) {
        playCard(gameId: $gameId, playerId: $playerId, cardIndex: $cardIndex, chosenColor: $chosenColor) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
        }
      }
    `,
    { gameId, playerId, cardIndex, chosenColor }
  )
  return data.playCard
}

export async function drawCard(gameId: string, playerId: string): Promise<Game> {
  const data = await mutate<{ drawCard: Game }>(
    gql`
      mutation DrawCard($gameId: ID!, $playerId: ID!) {
        drawCard(gameId: $gameId, playerId: $playerId) {
          id
          players {
            id
            name
            cardCount
            hasCalledUno
            score
          }
          currentPlayerIndex
          topCard {
            type
            color
            number
          }
          currentColor
          direction
          drawPileCount
          status
          targetScore
          winner
          createdBy
          maxPlayers
        }
      }
    `,
    { gameId, playerId }
  )
  return data.drawCard
}

export async function sayUno(gameId: string, playerId: string): Promise<boolean> {
  const data = await mutate<{ sayUno: boolean }>(
    gql`
      mutation SayUno($gameId: ID!, $playerId: ID!) {
        sayUno(gameId: $gameId, playerId: $playerId)
      }
    `,
    { gameId, playerId }
  )
  return data.sayUno
}

export async function catchUnoFailure(gameId: string, accuserId: string, accusedId: string): Promise<boolean> {
  const data = await mutate<{ catchUnoFailure: boolean }>(
    gql`
      mutation CatchUnoFailure($gameId: ID!, $accuserId: ID!, $accusedId: ID!) {
        catchUnoFailure(gameId: $gameId, accuserId: $accuserId, accusedId: $accusedId)
      }
    `,
    { gameId, accuserId, accusedId }
  )
  return data.catchUnoFailure
}

export async function leaveGame(gameId: string, playerId: string): Promise<boolean> {
  const data = await mutate<{ leaveGame: boolean }>(
    gql`
      mutation LeaveGame($gameId: ID!, $playerId: ID!) {
        leaveGame(gameId: $gameId, playerId: $playerId)
      }
    `,
    { gameId, playerId }
  )
  return data.leaveGame
}

// ==================== SUBSCRIPTIONS ====================

export function subscribeToGameUpdates(gameId: string, callback: (update: GameUpdate) => void) {
  const subscription = apolloClient.subscribe<{ gameUpdated: GameUpdate }>({
    query: gql`
      subscription GameUpdated($gameId: ID!) {
        gameUpdated(gameId: $gameId) {
          gameId
          eventType
          data
          timestamp
        }
      }
    `,
    variables: { gameId },
  })

  return subscription.subscribe({
    next({ data }) {
      if (data) {
        callback(data.gameUpdated)
      }
    },
    error(err) {
      console.error('Subscription error:', err)
    },
  })
}

export function subscribeToGamesListUpdates(callback: (games: AvailableGame[]) => void) {
  const subscription = apolloClient.subscribe<{ gamesListUpdated: AvailableGame[] }>({
    query: gql`
      subscription GamesListUpdated {
        gamesListUpdated {
          id
          createdBy
          playerCount
          maxPlayers
          status
        }
      }
    `,
  })

  return subscription.subscribe({
    next({ data }) {
      if (data) {
        callback(data.gamesListUpdated)
      }
    },
    error(err) {
      console.error('Subscription error:', err)
    },
  })
}
