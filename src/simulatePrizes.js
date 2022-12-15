#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')
const { 
    algo1CalculateTierPrizeCount,
    algo1CalculateTierPrizeFraction
} = require('./algo1')
const { 
    algo2CalculateTierPrizeCount,
    algo2CalculateTierPrizeFraction
} = require('./algo2')
const { 
    algo3CalculateTierPrizeCount,
    algo3CalculateTierPrizeFraction
} = require('./algo3')
const { calculateOddsForTier } = require('./odds')

const command = function (options) {

    console.log(chalk.dim(`Using -y ${options.yield}`))
    console.log(chalk.dim(`Using -i ${options.iterations}`))
    console.log(chalk.dim(`Using -l ${options.liquidity}`))
    console.log(chalk.dim(`Using -r ${options.rollover}`))
    console.log(chalk.dim(`Using -t ${options.tiers}`))
    console.log(chalk.dim(`Using -f ${options.fraction}`))
    console.log(chalk.dim(`Using -u ${options.utilization}`))

    let calculateTierPrizeCount
    let calculateTierPrizeFraction
    switch (options.algorithm) {
        case 1:
            calculateTierPrizeCount = algo1CalculateTierPrizeCount
            calculateTierPrizeFraction = function () { return algo1CalculateTierPrizeFraction(...arguments, options.fraction) }
            break
        case 2:
            calculateTierPrizeCount = algo2CalculateTierPrizeCount
            calculateTierPrizeFraction = function () { return algo2CalculateTierPrizeFraction(...arguments, options.fraction) }
            break
        case 3:
            calculateTierPrizeCount = algo3CalculateTierPrizeCount
            calculateTierPrizeFraction = algo3CalculateTierPrizeFraction
            break
        default:
            throw new Error(`Unknown algorithm ${options.algorithm}`)
    }

    let largestClaimedTierSmoothed = 0

    let iterationPrizes = []
    let prizeLiquidity = parseInt(options.liquidity)
    let numTiers = options.tiers
    for (let i = 0; i < options.iterations; i++) {
        const prizes = []
        let largestTier = null
        prizeLiquidity += parseInt(options.yield)
        const iterationLiquidity = prizeLiquidity
        const multiplier = iterationLiquidity / options.yield
        console.log(`Iteration ${i} multiplier: ${multiplier}`)
        for (let t = 0; t < numTiers; t++) {
            const prizeCount = calculateTierPrizeCount(t, numTiers)
            if (prizeCount == 0) continue
            const tierFraction = calculateTierPrizeFraction(t, numTiers)
            const tierLiquidity = tierFraction * iterationLiquidity
            const prizeSize = tierLiquidity / prizeCount
            if (prizeSize < MIN_PRIZE) {
                // console.log(`Tier ${t}: No prize`)
                continue
            }

            // console.log(chalk.dim(`Tier ${t} fraction ${tierFraction} has ${prizeCount} prizes worth ${prizeSize} each`))
            let awardedPrizeCount = 0
            const odds = 1
            // const odds = calculateOddsForTier(t, numTiers)
            // const odds = calculateOddsForTier(t, numTiers, 1, 100, 100)
            for (let p = 0; p < prizeCount; p++) {
                const rand = Math.random()
                // console.log(multiplier, rand, odds, options.rollover)
                if (rand > odds) {
                    continue;
                }
                // if (prizeLiquidity < prizeSize) {
                //     throw new Error(`Insufficient prize liquidity ${prizeLiquidity} for prize ${prizeSize} for i ${i}, t ${t}`)
                // }
                awardedPrizeCount++
                prizeLiquidity -= prizeSize
            }

            if (awardedPrizeCount > 0) {
                if (largestTier == null || t > largestTier) {
                    largestTier = t
                }
                // console.log(`Tier ${t} odds: ${odds} and prize count: ${prizeCount} actual: ${awardedPrizeCount}, odds: ${odds}`)
                prizes.push({
                    tier: t,
                    prizeCount: awardedPrizeCount,
                    prizeSize
                })
            }
        }
        // if a prize wasn't awarded then reduce the num tiers
        if (largestTier == null && numTiers > 1) {
            numTiers--
        } else {
            numTiers = largestTier + 2
        }
        // console.log(`Iteration ${i}: numTiers: ${numTiers} prizeLiquidity: ${prizeLiquidity}`)
        // console.log(`largestClaimedTierSmoothed: ${largestClaimedTierSmoothed}, largestTier: ${largestTier}`)
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
    console.log(chalk.cyan(`Total prize amount given out: ${totalPrizeAmount}`))
    console.log(chalk.dim(`prize liquidity remaining: ${prizeLiquidity}`))
    console.log(chalk.green("Done!"))
}

program.option('-y, --yield <number>', 'The amount of yield per iteration', 200)
program.option('-i, --iterations <number>', 'The number of iterations to run', 365)
program.option('-l, --liquidity <number>', 'The starting prize liquidity', 0)
program.option('-r, --rollover <number>', 'The rollover fraction', 364/365.0)
program.option('-t, --tiers <number>', 'Starting number of tiers', 1)
program.option('-f, --fraction <number>', 'Floor fraction for algo2', 0.2)
program.option('-a, --algorithm <number>', 'Pick algorithm number', 3)
program.option('-u, --utilization <number>', 'The utilization of the yield', 0.9)

const MIN_PRIZE = 0.5

program.action(command)

program.parse()
