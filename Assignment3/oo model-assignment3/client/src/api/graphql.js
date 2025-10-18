// GraphQL API for UNO multiplayer
import { ApolloClient, InMemoryCache, gql, split, HttpLink } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

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
async function query(queryDoc, variables = {}) {
  const result = await apolloClient.query({
    query: queryDoc,
    variables,
    fetchPolicy: 'network-only',
  })
  return result.data
}

async function mutate(mutationDoc, variables = {}) {
  const result = await apolloClient.mutate({
    mutation: mutationDoc,
    variables,
    fetchPolicy: 'network-only',
  })
  return result.data
}

// ==================== QUERIES ====================

export async function getAvailableGames() {
  const data = await query(gql`
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

export async function getGame(gameId) {
  const data = await query(
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
            value
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
    { id: gameId }
  )
  return data.game
}

export async function getPlayerHand(gameId, playerId) {
  const data = await query(
    gql`
      query GetPlayerHand($gameId: ID!, $playerId: ID!) {
        playerHand(gameId: $gameId, playerId: $playerId) {
          gameId
          playerId
          cards {
            type
            color
            value
          }
        }
      }
    `,
    { gameId, playerId }
  )
  return data.playerHand
}

// ==================== MUTATIONS ====================

export async function createGame(playerName, maxPlayers = 4) {
  const data = await mutate(
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
            value
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

export async function joinGame(gameId, playerName) {
  const data = await mutate(
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
            value
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

export async function startGame(gameId, playerId) {
  const data = await mutate(
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
            value
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

export async function playCard(gameId, playerId, cardIndex, chosenColor = null) {
  const data = await mutate(
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
            value
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

export async function drawCard(gameId, playerId) {
  const data = await mutate(
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
            value
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

export async function sayUno(gameId, playerId) {
  const data = await mutate(
    gql`
      mutation SayUno($gameId: ID!, $playerId: ID!) {
        sayUno(gameId: $gameId, playerId: $playerId)
      }
    `,
    { gameId, playerId }
  )
  return data.sayUno
}

export async function catchUnoFailure(gameId, accuserId, accusedId) {
  const data = await mutate(
    gql`
      mutation CatchUnoFailure($gameId: ID!, $accuserId: ID!, $accusedId: ID!) {
        catchUnoFailure(gameId: $gameId, accuserId: $accuserId, accusedId: $accusedId)
      }
    `,
    { gameId, accuserId, accusedId }
  )
  return data.catchUnoFailure
}

export async function leaveGame(gameId, playerId) {
  const data = await mutate(
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

export function subscribeToGameUpdates(gameId, callback) {
  const subscription = apolloClient.subscribe({
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
      callback(data.gameUpdated)
    },
    error(err) {
      console.error('Subscription error:', err)
    },
  })
}

export function subscribeToGamesListUpdates(callback) {
  const subscription = apolloClient.subscribe({
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
      callback(data.gamesListUpdated)
    },
    error(err) {
      console.error('Subscription error:', err)
    },
  })
}
