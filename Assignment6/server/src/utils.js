export const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
export const sanitizeGame = (g) => {
    const { randomizer, shuffler, currentRound, ...rest } = g;
    const cleanRound = currentRound
        ? {
            ...currentRound,
            shuffler: undefined,
            randomizer: undefined,
        }
        : undefined;
    return { ...rest, currentRound: cleanRound };
};
