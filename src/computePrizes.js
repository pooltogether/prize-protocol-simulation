#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')
const { tierPrizeFraction } = require('./PrizeDistributor')

program.option('-t, --tiers <number>', 'Number of tiers', 10)
program.option('-o, --odds <number>', 'Odds multiplier', 1)
program.option('-i, --iterations <number>', 'Number of iterations to show the count of', 1)
program.option('-tp, --totalPrize <number>', 'Total prize amount', 20000000)

program.action((options) => {

    let totalFraction = 0
    let totalPrizeCount = 0

    for (let i = 0; i < options.tiers; i++) {
        const fraction = tierPrizeFraction(i)
        const prizeCount = 2**i
        const prize = (fraction * options.totalPrize) / prizeCount
        const prizeCountPerIteration = prizeCount * parseFloat(options.odds)

        console.log(chalk.dim(`Tier ${i} count per iteration: ${prizeCountPerIteration} count over all iterations: ${prizeCountPerIteration*options.iterations}, fraction: ${fraction}, total prize: ${prize}`))
        totalFraction += fraction
        totalPrizeCount += prizeCount
    }

    console.log(chalk.green(`Total fraction: ${totalFraction}, Total prize count: ${totalPrizeCount}`))

})

program.parse()
