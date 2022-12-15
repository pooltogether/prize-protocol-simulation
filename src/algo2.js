// See Desmos: https://www.desmos.com/calculator/xutxkqpqli
const chalk = require('chalk')

function algo2CalculateTierPrizeCount(tier, numTiers) {
    return Math.floor(4**tier)
}

function algo2CalculateTierPrizeFraction(tier, numTiers, f) {
    const k = solveForK(f, numTiers)
    // console.log(k, numTiers, f)
    // const pStart = tier > 1 && algo2CalculateTierPrizeCount(tier-1, numTiers) == 0 ? 0 : Pinteg(f, k, numTiers, tier)
    const pStart = Pinteg(f, k, numTiers, tier)
    const pEnd = Pinteg(f, k, numTiers, tier+1)
    // console.log(`For tier ${tier}, numTiers: ${numTiers}, P(${pEnd}) - P(${pStart})`)
    const prizeFraction = pEnd - pStart
    return prizeFraction
}

function Pinteg(f, k, numTiers, tier) {
    return (
        (k**2*(2*tier-numTiers)**3)/24+(f*tier)/numTiers
    )
}

function solveForK(f, numTiers) {
    return Math.sqrt((12 - 12*f)/numTiers**3)
}

module.exports = {
    algo2CalculateTierPrizeCount,
    algo2CalculateTierPrizeFraction
}
