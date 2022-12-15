// See Desmos: https://www.desmos.com/calculator/xutxkqpqli
const chalk = require('chalk')

function algo1CalculateTierPrizeCount(tier, numTiers) {
    const count = Math.floor(2**tier)
    return count
}

function algo1CalculateTierPrizeFraction(tier, numTiers, f) {
    const k = solveForK(f, numTiers)
    const pStart = Pinteg(f, k, numTiers, tier)
    const pEnd = Pinteg(f, k, numTiers, tier+1)
    const prizeFraction = pEnd - pStart
    return prizeFraction
}

function Pinteg(f, k, numTiers, tier) {
    return (
        (k**2*tier**3) / 3 - (k**2*numTiers*tier**2) / 2 + (f*tier**2) / (2*numTiers) + (k**2*numTiers**2*tier)/4
    )
}

function solveForK(f, numTiers) {
    return Math.sqrt((12 - 6*f*numTiers)/numTiers**3)
}

module.exports = {
    algo1CalculateTierPrizeCount,
    algo1CalculateTierPrizeFraction
}
