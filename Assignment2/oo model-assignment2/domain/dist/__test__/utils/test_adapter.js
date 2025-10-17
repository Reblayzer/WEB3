import { standardRandomizer, standardShuffler } from '../../src/utils/random_utils';
import { createStandardDeck, deckFromMemento } from '../../src/model/deck';
import { createRound as _createRound, createRoundFromMemento as _createRoundFromMemento, } from '../../src/model/round';
import { createGame as _createGame, createGameFromMemento as _createGameFromMemento, } from '../../src/model/game';
// Deck helpers
export function createInitialDeck() { return createStandardDeck(); }
export function createDeckFromMemento(cards) {
    return deckFromMemento(cards);
}
export function createRound(props) { return _createRound(props); }
export function createRoundFromMemento(m, shuffler) {
    return _createRoundFromMemento(m, shuffler);
}
export function createGame(props) {
    return _createGame({
        players: props.players,
        targetScore: props.targetScore,
        randomizer: props.randomizer,
        cardsPerPlayer: props.cardsPerPlayer
    });
}
export function createGameFromMemento(m, _r, _s) {
    return _createGameFromMemento(m);
}
export { standardShuffler, standardRandomizer };
//# sourceMappingURL=test_adapter.js.map