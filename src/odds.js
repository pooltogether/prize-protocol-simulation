function oddsIntegral(k, tier, numTiers) {
    return k*(4**(tier-numTiers))
}

function calculateOddsRange(from, to, numTiers) {
    const k = calcK(numTiers)
    const start = oddsIntegral(k, from, numTiers)
    const end = oddsIntegral(k, to, numTiers)
    return end - start
}

function calculateOddsForTier(tier, numTiers) {
    return calculateOddsRange(tier, tier+1, numTiers)
}

function calcK(numTiers) {
    return 1 / (1 - 4**(-numTiers))
}

module.exports = {
    calcK,
    oddsIntegral,
    calculateOddsRange,
    calculateOddsForTier
}
