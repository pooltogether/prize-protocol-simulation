#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')
const { tierRangePrizeFraction, PrizeDistributor } = require('./PrizeDistributor')

program.option('-u, --users <number>', 'The number of users to generate', 100)
program.option('-b, --balance <number>', 'The largest deposit for users', 10000)
program.option('-y, --yield <number>', 'The amount of yield per iteration', 200*7)
program.option('-i, --iterations <number>', 'The number of iterations to run', 52)
program.option('-r, --rollover <number>', 'The rollover fraction', 51/52.0)
program.option('-t, --tiers <number>', 'Maximum tiers to check', 10)

const MIN_PRIZE = 1

// const LP_AMOUNT = 100000
// const PRIZE_UTILIZATION_RATE = 0.5
const LP_AMOUNT = 0
const PRIZE_UTILIZATION_RATE = 1

program.action((options) => {

    console.log(chalk.white(`Users: ${options.users}`))
    console.log(chalk.white(`Max User Balance: ${options.balance}`))
    console.log(chalk.white(`Yield per iteration: ${options.yield}`))
    console.log(chalk.white(`Iterations: ${options.iterations}`))
    console.log(chalk.white(`Rollover chance: ${options.rollover}`))

    const users = []
    let totalLiquidity = 0
    for (let i = 0; i < options.users; i++) {
        const balance = Math.random() * options.balance
        // console.log(chalk.dim(`User ${i} balance: ${balance}`))
        users.push({
            balance,
            prizes: []
        })
        totalLiquidity += balance
    }

    let totalUnaccounted = 0
    const pd = new PrizeDistributor({ rollover: options.rollover })
    let prizeLiquidity = LP_AMOUNT;
    for (let i = 0; i < options.iterations; i++) {
        prizeLiquidity += options.yield
        
        let largestTier = 0

        for (let u = 0; u < users.length; u++) {
            const user = users[u]
            
            for (let tier = 0; tier < options.tiers; tier++) {
                const availablePrizeLiquidity = PRIZE_UTILIZATION_RATE*prizeLiquidity
                const maxIndex = 2**tier
                const prizeSize = pd.prizeSize(tier, availablePrizeLiquidity)
                if (prizeSize < MIN_PRIZE) {
                    break;
                }
                if (tier > largestTier) {
                    largestTier = tier
                }
                for (let index = 0; index < maxIndex; index++) {
                    const randomNumber = Math.random()
                    if (pd.isWinner(user.balance, totalLiquidity, randomNumber * totalLiquidity*10, options.yield, prizeLiquidity)) {
                        if (prizeLiquidity < prizeSize) {
                            throw new Error(`No more prize liquidity at iteration ${i}, user ${u}, tier ${tier}, index ${index}`)
                        }
                        prizeLiquidity -= prizeSize
                        user.prizes.push({
                            tier, index, prizeSize, user: u
                        })
                    }
                }
            }
        }

        const fraction = tierRangePrizeFraction(largestTier, 100000)
        const unaccounted = prizeLiquidity*fraction
        totalUnaccounted += unaccounted
        // console.log(chalk.bold(`Iteration ${i} had highest tier ${largestTier} with remaining at ${unaccounted} out of ${prizeLiquidity}`))
    }

    let tierPrizes = {}

    for (let u = 0; u < users.length; u++) {
        const user = users[u]
        for (let p = 0; p < user.prizes.length; p++) {
            const prize = user.prizes[p]
            if (!tierPrizes[prize.tier]) {
                tierPrizes[prize.tier] = []
            }
            tierPrizes[prize.tier].push(prize)
        }
    }

    let totalPrizeCount = 0
    let totalPrizes = 0
    for (let i = 0; i < options.tiers; i++) {
        const tierPrize = tierPrizes[i]
        if (tierPrize) {
            const largest = tierPrize.reduce((prev, current) => prev.prizeSize < current.prizeSize ? current : prev)
            const smallest = tierPrize.reduce((prev, current) => prev.prizeSize > current.prizeSize ? current : prev)
            const total = tierPrize.reduce((prev, current) => prev + current.prizeSize, 0)
            totalPrizeCount += tierPrize.length
            totalPrizes += total
            console.log(chalk.dim(`Tier ${i}: expected: ${options.iterations * 2**i}, prize count: ${tierPrize.length}, largest ${Math.round(largest.prizeSize)}, smallest ${Math.round(smallest.prizeSize)}, total: ${total}`))
        }
    }

    // console.log(chalk.cyan(`Unaccounted tier funds: ${tierRangePrizeFraction(options.tiers, 9999) * (prizeLiquidity+totalPrizes)}`))
    console.log(chalk.cyan(`Total number of prizes: ${totalPrizeCount}`))
    console.log(chalk.cyan(`Total prize amount given out: ${totalPrizes}`))
    console.log(chalk.cyan(`Total unaccounted: ${totalUnaccounted}`))
    console.log(chalk.dim(`prize liquidity remaining: ${prizeLiquidity}`))
    if (LP_AMOUNT > 0) {
        if (prizeLiquidity > LP_AMOUNT) {
            console.log(chalk.green(`LP made ${prizeLiquidity - LP_AMOUNT} dollars, or ${100*(prizeLiquidity - LP_AMOUNT) / LP_AMOUNT}%`))
        } else {
            console.log(chalk.red(`LP lost ${LP_AMOUNT - prizeLiquidity} dollars`))
        }
    }

    console.log(chalk.green("Ok!"))
})

program.parse()
