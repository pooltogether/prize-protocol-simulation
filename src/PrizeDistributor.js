function DrawDeposit(balance) {
    this.balance = balance
}

function Pinteg(tier) {
    return -1/2**tier
}

function tierPrizeFraction(tier) {
    return Pinteg(tier+1) - Pinteg(tier)
}

function tierRangePrizeFraction(fromTier, toTier) {
    return Pinteg(toTier) - Pinteg(fromTier)
}

function PrizeDistributor({ rollover, smoothingAlpha }) {
    if (rollover < 0 || rollover > 1) {
        throw new Error('Invalid rollover')
    }
    this.rollover = rollover
    this.smoothingAlpha = smoothingAlpha
    this.reserveBalance = 0

    // internal
    this.drawId = 0
    this.drawRandomNumber = 0
    
    this.setDraw = function (drawId, randomNumber) {
        this.drawId = drawId
        this.drawRandomNumber = randomNumber
    }

    this.totalDrawDeposits = []
    this.prizePoolDrawDeposits = {}

    this.depositPrizes = function (prizePoolKey, reserveTokens) {

    }

    this.prizeSize = function (tier, totalPrize) {
        return (tierPrizeFraction(tier) * totalPrize) / 2**tier
    }

    this.isWinner = function (userliq, totalliq, randomNumber, yieldAccrued, availablePrizeLiquidity) {
        const multiplier = parseInt(availablePrizeLiquidity / yieldAccrued)
        // console.log(`multiplier: ${multiplier}`)

        // const rolloverOdds = this.rollover**multiplier
        const rolloverOdds = this.rollover - this.rollover*(multiplier/20)**4
        // const rolloverOdds = 0.25 - multiplier/100
        // const rolloverOdds = this.rollover

        // if (tier == 0) console.log(`rolloverOdds: ${rolloverOdds}`)
        const rollover = (userliq * (1 - rolloverOdds))
        // console.log(`randomNumber: ${randomNumber}, totalliq: ${totalliq}, ${randomNumber % totalliq}`)
        const moduloRandom = randomNumber % totalliq
        const isWin = moduloRandom < rollover
        // console.log(`rollover: ${rollover}, isWin: ${isWin}`)
        return isWin
    }
}

module.exports = {
    tierPrizeFraction,
    tierRangePrizeFraction,
    PrizeDistributor
}
