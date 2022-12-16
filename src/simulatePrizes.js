#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')

const MIN_PRIZE = 1

const USER_BALANCE = 1000

const command = function (options) {

    console.log(chalk.dim(`Using --yield ${options.yield}`))
    console.log(chalk.dim(`Using --iterations ${options.iterations}`))
    console.log(chalk.dim(`Using --users ${options.users}`))
    console.log(chalk.dim(`Using --tiers ${options.tiers}`))

    let iterationPrizes = []
    let prizeLiquidity = 0
    let numTiers = options.tiers

    const SHARES_PER_TIER = 100
    const CANARY_SHARE = 5
    const TOTAL_SUPPLY = USER_BALANCE*options.users

    function totalShares(numTiers) {
        return numTiers * SHARES_PER_TIER + CANARY_SHARE
    }
    
    // Store the last exchange rate for tiers. This is the exchange rate they last claimed at
    let tierExchangeRates = {}
    let canaryExchangeRate = 0
    // Store the global yield share exchange rate.
    let yieldShareExchangeRate = 0

    for (let i = 0; i < options.iterations; i++) {
        const prizes = []
        prizeLiquidity += parseInt(options.yield)
        yieldShareExchangeRate = yieldShareExchangeRate + options.yield / totalShares(numTiers)
        
        let largestTier = null
        let highestTierClaimPassed = false

        for (let t = 0; t < numTiers; t++) {
            if (!tierExchangeRates[t]) {
                tierExchangeRates[t] = 0
            }
            const tierLiquidity = (yieldShareExchangeRate - tierExchangeRates[t])*SHARES_PER_TIER

            const tierPrizeCount = 8**t
            const prizeSize = tierLiquidity / tierPrizeCount
            const tierOdds = 3**-(numTiers-1-t)

            let tierAwardedPrizeLiquidity = 0
            let tierAwardedPrizeCount = 0
            for (let u = 0; u < options.users; u++) {
                const divRand = (Math.random()*TOTAL_SUPPLY) / tierPrizeCount
                const totalOdds = tierOdds*USER_BALANCE
                const isWinner = divRand < totalOdds
                if (isWinner && prizeSize >= MIN_PRIZE) {
                    // do the win
                    tierAwardedPrizeLiquidity += prizeSize
                    tierAwardedPrizeCount++
                }
            }

            if (tierAwardedPrizeCount > 0) {
                // make sure we record the largest tier
                if (largestTier == null || t > largestTier) {
                    largestTier = t
                }
                // record prizes
                prizes.push({
                    tier: t,
                    prizeCount: tierAwardedPrizeCount,
                    prizeSize
                })
            }

            prizeLiquidity -= tierAwardedPrizeLiquidity
            const deltaExchangeRate = tierAwardedPrizeLiquidity / SHARES_PER_TIER
            tierExchangeRates[t] += deltaExchangeRate

            if (tierAwardedPrizeCount > 0.9*tierPrizeCount) {
                highestTierClaimPassed = true
            }
        }

        // now do Canary
        const canaryLiquidity = (yieldShareExchangeRate - canaryExchangeRate)*CANARY_SHARE
        const actualCanaryPrizeCount = 8**numTiers
        const m3 = CANARY_SHARE / totalShares(numTiers)
        const l3 = SHARES_PER_TIER / totalShares(numTiers+1)
        const prizeCountMultiplier = m3/l3
        const canaryPrizeCount = Math.round(actualCanaryPrizeCount * prizeCountMultiplier)
        const canaryPrizeSize = canaryLiquidity / canaryPrizeCount
        let canaryAwardedPrizeLiquidity = 0
        let canaryAwardedPrizeCount = 0
        for (let u = 0; u < options.users; u++) {
            const divRand = (Math.random()*TOTAL_SUPPLY) / canaryPrizeCount
            const isWinner = divRand < USER_BALANCE
            if (isWinner && canaryPrizeSize >= MIN_PRIZE) {
                // do the win
                canaryAwardedPrizeLiquidity += canaryPrizeSize
                canaryAwardedPrizeCount++
            }
        }

        if (canaryAwardedPrizeCount > 0) {
            prizeLiquidity -= canaryAwardedPrizeLiquidity
            const canaryDeltaExchangeRate = canaryAwardedPrizeLiquidity / CANARY_SHARE
            canaryExchangeRate += canaryDeltaExchangeRate

            // record prizes
            prizes.push({
                tier: numTiers,
                prizeCount: canaryAwardedPrizeCount,
                prizeSize: canaryPrizeSize
            })
        }

        const canaryPassed = canaryAwardedPrizeCount > 0.9*canaryPrizeCount
        if (highestTierClaimPassed && canaryPassed) {
            numTiers++
        } else {
            numTiers = largestTier+1
        }

        iterationPrizes.push(prizes)
    }

    let totalPrizeCount = 0
    let totalPrizeAmount = 0
    const tierPrizes = {}
    for (let i = 0; i < options.iterations; i++) {
        const iPrizes = iterationPrizes[i]
        iPrizes.forEach(prize => {
            if (!tierPrizes[prize.tier]) {
                tierPrizes[prize.tier] = []
            }
            tierPrizes[prize.tier].push(prize)
        })
        totalPrizeCount += iPrizes.reduce((total, prize) => (total + prize.prizeCount), 0)
        totalPrizeAmount += iPrizes.reduce((total, prize) => (total + prize.prizeSize*prize.prizeCount), 0)
    }

    let tierPrizesKeys = Object.keys(tierPrizes).sort()
    tierPrizesKeys.forEach(key => {
        const t = parseInt(key)
        tierPrize = tierPrizes[key]
        const largest = Math.floor(100*tierPrize.reduce((biggest, prize) => biggest < prize.prizeSize ? prize.prizeSize : biggest, 0))/100.0
        const smallest = Math.floor(100*tierPrize.reduce((smallest, prize) => smallest > prize.prizeSize ? prize.prizeSize : smallest, Infinity))/100.0
        const total = tierPrize.reduce((sum, prize) => sum + prize.prizeSize * prize.prizeCount, 0)
        const count = tierPrize.reduce((sum, prize) => sum + prize.prizeCount, 0)
        console.log(chalk.white(`Tier ${t} largest prize: ${largest}, count: ${count}, total: ${total}`))
    })

    console.log(chalk.cyan(`Total number of prizes: ${totalPrizeCount}`))
    console.log(chalk.cyan(`Prizes per iteration: ${totalPrizeCount / options.iterations}`))
    console.log(chalk.cyan(`Total prize amount given out: ${totalPrizeAmount}`))
    console.log(chalk.dim(`prize liquidity remaining: ${prizeLiquidity}`))
    console.log(chalk.green("Done!"))
}

program.option('-y, --yield <number>', 'The amount of yield per iteration', 300)
program.option('-i, --iterations <number>', 'The number of iterations to run', 1)
program.option('-u, --users <number>', 'The number of users to randomize', 1)
program.option('-t, --tiers <number>', 'The number of tiers', 1)

program.action(command)

program.parse()
