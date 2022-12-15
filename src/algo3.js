// See Desmos: https://www.desmos.com/calculator/qhyrgrons0
const chalk = require('chalk')

function algo3CalculateTierPrizeCount(tier) {
    return Math.floor(4**tier)
}

function algo3CalculateTierPrizeFraction(tier, numTiers) {
    const k = solveForK(numTiers)
    const pStart = Pinteg(k, numTiers, tier)
    const pEnd = Pinteg(k, numTiers, tier+1)
    const prizeFraction = pEnd - pStart
    // console.log(chalk.dim(`algo3CalculateTierPrizeFraction: numTiers ${numTiers}, k: ${k}, tier: ${tier}, prizeCount: ${algo3CalculateTierPrizeCount(tier)} prizeFraction: ${prizeFraction}`))
    return prizeFraction
}

function Pinteg(k, numTiers, tier) {
    return (
        (k**4*(2*tier-numTiers)**5)/160
    )
}

function solveForK(numTiers) {
    return Math.sqrt(Math.sqrt(80/numTiers**5))
}

module.exports = {
    algo3CalculateTierPrizeCount,
    algo3CalculateTierPrizeFraction
}
