export type Randomizer = (bound: number) => number
export const standardRandomizer: Randomizer = (n: number): number => Math.floor(Math.random() * n)
export type Shuffler<T> = (xs: T[]) => void

export function standardShuffler<T>(cards: T[]): void {
  for (let i = 0; i < cards.length - 1; i++) {
    const j = Math.floor(Math.random() * (cards.length - i) + i)
    const tmp = cards[j]; cards[j] = cards[i]; cards[i] = tmp
  }
}

// Helper to capture shuffled order for testing/debugging
export function memoizingShuffler<T>(base: Shuffler<T>): { shuffler: Shuffler<T>, memo: readonly T[] } {
  const memo: T[] = []
  const shuffler: Shuffler<T> = (arr: T[]): void => {
    const tmp = arr.slice()
    base(tmp)
    memo.splice(0, memo.length, ...tmp)
    for (let i = 0; i < tmp.length; i++) arr[i] = tmp[i]
  }
  return { shuffler, memo: memo as readonly T[] }
}