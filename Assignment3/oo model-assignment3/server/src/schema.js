// GraphQL Schema for UNO Game
export const typeDefs = `#graphql
  type Card {
    color: String!
    type: String!
    value: Int
  }
  
  type Player {
    id: ID!
    name: String!
    cardCount: Int!
    hasCalledUno: Boolean!
    score: Int!
  }
  
  enum GameStatus {
    WAITING
    IN_PROGRESS
    FINISHED
  }
  
  type Game {
    id: ID!
    players: [Player!]!
    currentPlayerIndex: Int!
    topCard: Card
    currentColor: String
    direction: String!
    drawPileCount: Int!
    status: GameStatus!
    targetScore: Int!
    winner: String
    createdBy: String!
    maxPlayers: Int!
  }
  
  type AvailableGame {
    id: ID!
    createdBy: String!
    playerCount: Int!
    maxPlayers: Int!
    status: GameStatus!
  }
  
  type PlayerHand {
    gameId: ID!
    playerId: ID!
    cards: [Card!]!
  }
  
  type GameEvent {
    gameId: ID!
    eventType: String!
    data: String!
    timestamp: String!
  }
  
  type Query {
    game(id: ID!): Game
    availableGames: [AvailableGame!]!
    playerHand(gameId: ID!, playerId: ID!): PlayerHand
  }
  
  type Mutation {
    createGame(playerName: String!, maxPlayers: Int): Game!
    joinGame(gameId: ID!, playerName: String!): Game!
    startGame(gameId: ID!, playerId: ID!): Game!
    playCard(gameId: ID!, playerId: ID!, cardIndex: Int!, chosenColor: String): Game!
    drawCard(gameId: ID!, playerId: ID!): Game!
    sayUno(gameId: ID!, playerId: ID!): Boolean!
    catchUnoFailure(gameId: ID!, accuserId: ID!, accusedId: ID!): Boolean!
    leaveGame(gameId: ID!, playerId: ID!): Boolean!
  }
  
  type Subscription {
    gameUpdated(gameId: ID!): GameEvent!
    gamesListUpdated: [AvailableGame!]!
  }
`;
