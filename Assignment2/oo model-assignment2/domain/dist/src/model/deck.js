// Deck interface and implementation
import { colors } from './types/card-types';
// Re-export commonly used types and constants for backwards compatibility
export { colors } from './types/card-types';
export { hasColor, hasNumber } from './card';
class ArrayDeck {
    cards;
    constructor(cards) { this.cards = cards; }
    get size() { return this.cards.length; }
    shuffle(s) { s(this.cards); }
    deal() { return this.cards.shift(); }
    peek() { return this.cards[0]; }
    top() { return this.peek(); }
    filter(pred) {
        return new ArrayDeck(this.cards.filter(pred));
    }
    toMemento() { return this.cards.map(c => ({ ...c })); }
}
const makeStandardCards = () => {
    const cards = [];
    for (const color of colors) {
        // one 0
        cards.push({ type: 'NUMBERED', color, number: 0 });
        // two of each 1..9
        for (let n = 1; n <= 9; n = (n + 1)) {
            cards.push({ type: 'NUMBERED', color, number: n });
            cards.push({ type: 'NUMBERED', color, number: n });
        }
        // two of each action card
        cards.push({ type: 'SKIP', color });
        cards.push({ type: 'SKIP', color });
        cards.push({ type: 'REVERSE', color });
        cards.push({ type: 'REVERSE', color });
        cards.push({ type: 'DRAW', color });
        cards.push({ type: 'DRAW', color });
    }
    // 4 wild + 4 wild draw
    for (let i = 0; i < 4; i++)
        cards.push({ type: 'WILD' });
    for (let i = 0; i < 4; i++)
        cards.push({ type: 'WILD DRAW' });
    return cards;
};
export const createStandardDeck = () => new ArrayDeck(makeStandardCards());
export const deckFromMemento = (cards) => {
    const parsed = cards.map(raw => {
        if (raw.type === 'WILD')
            return { type: 'WILD' };
        if (raw.type === 'WILD DRAW')
            return { type: 'WILD DRAW' };
        if (raw.type === 'NUMBERED') {
            if (raw.color === undefined || raw.number === undefined)
                throw new Error('Invalid NUMBERED memento');
            return { type: 'NUMBERED', color: raw.color, number: raw.number };
        }
        if (raw.type === 'SKIP' || raw.type === 'REVERSE' || raw.type === 'DRAW') {
            if (raw.color === undefined)
                throw new Error('Missing color for action card');
            return { type: raw.type, color: raw.color };
        }
        throw new Error('Unknown card type');
    });
    return new ArrayDeck(parsed);
};
//# sourceMappingURL=deck.js.map