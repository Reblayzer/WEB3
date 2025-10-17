export const standardRandomizer = n => Math.floor(Math.random() * n);
export function standardShuffler(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
        const j = Math.floor(Math.random() * (cards.length - i) + i);
        const tmp = cards[j];
        cards[j] = cards[i];
        cards[i] = tmp;
    }
}
// helpful in tests/adapters to capture a shuffled order
export function memoizingShuffler(base) {
    const memo = [];
    const shuffler = (arr) => {
        const tmp = arr.slice();
        base(tmp);
        memo.splice(0, memo.length, ...tmp);
        for (let i = 0; i < tmp.length; i++)
            arr[i] = tmp[i];
    };
    return { shuffler, memo: memo };
}
//# sourceMappingURL=random_utils.js.map