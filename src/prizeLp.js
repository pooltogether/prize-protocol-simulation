#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')

function iterate(values) {

    const {
        yieldPerDay,
        lpAmount,
        lpPortion
    } = values

    // console.log('IN', values)

    const eligibleYield = (1-lpPortion) * yieldPerDay
    let nextLpAmount = lpAmount + yieldPerDay
    let nextPrizesAwarded = values.prizesAwarded
    let nextPrizeCount = values.prizeCount
    
    const numPrizes = 100
    const totalPrizes = (lpPortion * nextLpAmount)
    console.log(chalk.dim(`Total prizes: ${totalPrizes}`))
    const possiblePrize = totalPrizes / numPrizes
    const prizeOdds = 0.8 * (eligibleYield / possiblePrize) / numPrizes

    for (let i = 0; i < numPrizes; i++) {
        const rand = Math.random()
        if (rand < prizeOdds) {
            nextPrizesAwarded += possiblePrize
            nextLpAmount -= possiblePrize
            nextPrizeCount++
        }
    }

    const result = {
        yieldPerDay,
        lpPortion,
        lpAmount: nextLpAmount,
        prizesAwarded: nextPrizesAwarded,
        prizeCount: nextPrizeCount
    }

    // console.log('OUT', result)

    return result
}

program.option('-i, --iterations <number>', 'Number of iterations', 30)
program.option('-p, --lpPortion <number>', 'LP Portion of yield', 0.2)
program.option('-a, --lpAmount <number>', 'LP deposited amount', 1000000)
program.option('-y, --yield <number>', 'Yield per day', 500)
program.action((options) => {

    let values = {
        yieldPerDay: options.yield,
        lpAmount: options.lpAmount,
        lpPortion: parseFloat(options.lpPortion),
        prizesAwarded: 0,
        prizeCount: 0
    }
    
    for (let i = 0; i < options.iterations; i++) {
        values = iterate(values)
    }

    const expectedYieldPerDay = ((1-options.lpPortion) * options.yield)

    const totalGains = values.lpAmount - options.lpAmount
    const years = (options.iterations / 365)
    const yearlyGains = totalGains / years

    console.log(chalk.green('Done!'))
    console.log(chalk.dim(`lpAmount: ${values.lpAmount}`))
    console.log(chalk.dim(`prizes awarded:\t${parseInt(values.prizesAwarded)}`))
    console.log(chalk.dim(`total yield:\t${options.yield * options.iterations}`))
    console.log(chalk.dim(`expectedYieldPerDay: ${expectedYieldPerDay}`))
    console.log(chalk.dim(`totalGains: ${totalGains}`))
    console.log(chalk.dim(`Prize count: ${values.prizeCount}`))
    console.log(chalk.cyan(`Est. APR for LPs: ${parseInt(100*(yearlyGains) / options.lpAmount)}%`))

})

program.parse()
