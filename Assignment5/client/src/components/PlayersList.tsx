import PlayerCard from './PlayerCard'

type PlayersListProps = {
  players: readonly string[]
  handSizes: readonly number[]
  scores: readonly number[]
  hasUnoBadge: readonly boolean[]
  currentPlayerIdx: number
  myPlayerIdx: number | undefined
}

/**
 * Display all players in the game
 */
export default function PlayersList({
  players,
  handSizes,
  scores,
  hasUnoBadge,
  currentPlayerIdx,
  myPlayerIdx,
}: PlayersListProps) {
  return (
    <div className="players-display">
      {Array.from(players).map((name, idx) => (
        <PlayerCard
          key={name}
          name={name}
          handSize={handSizes[idx]}
          score={scores[idx]}
          isActive={idx === currentPlayerIdx}
          isCurrentUser={idx === myPlayerIdx}
          hasUno={hasUnoBadge[idx]}
        />
      ))}
    </div>
  )
}
