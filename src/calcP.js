#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')

function Pinteg(f, k, r, t) {
    return (
        (k**2*t**3) / 3 - (k**2*r*t**2) / 2 + (f*t**2) / (2*r) + (k**2*r**2*t)/4
    )
}

function solveForK(f, r) {
    return Math.sqrt((12 - 6*f*r)/r**3)
}

program.option('-t, --tiers <number>', 'Number of tiers', 8)
program.option('-f, --floor <number>', 'Floor fraction', 0.05)
program.option('-y, --yield <number>', 'Yield per iteration', 1000)
program.option('-i, --iterations <number>', 'Number of iterations', 1)
program.option('-r, --rollover <number>', 'Chance of rolling over', 0)
program.option('-v, --verbose', 'Be verbose')
program.action((options) => {
    console.log(chalk.dim(`Using -r ${options.tiers} for tiers`))
    console.log(chalk.dim(`Using -f ${options.floor} for floor`))
    console.log(chalk.dim(`Using -p ${options.yield} for yield`))

    const k = solveForK(options.floor, options.tiers)
    console.log(k)
    const P = (tier) => Pinteg(options.floor, k, options.tiers, tier)

    let prizeLiquidity = 0

    for (let iter = 0; iter < options.iterations; iter++) {
        prizeLiquidity += options.yield

        console.log(chalk.dim(`iter ${iter} prizeLiquidity: ${prizeLiquidity}`))

        const iterationPrizeLiquidity = prizeLiquidity
        for (let i = 0; i < options.tiers; i++) {
            const fraction = Math.max(0, P(i+1) - P(i))
            console.log(chalk.dim(`iter ${iter} i ${i} fraction: ${fraction}`))
            const prizeAllocation = fraction * iterationPrizeLiquidity
            const prizeCount = 2**i
            const prizeSize = prizeAllocation / prizeCount
            if (options.verbose) console.log(`Tier ${i} fraction: ${fraction}, prizeAllocation: ${prizeAllocation}, prizeSize: ${prizeSize}, prizeCount: ${prizeCount}`)

            for (let p = 0; p < prizeCount; p++) {
                // if (Math.random()<options.rollover) {
                //     continue;
                // }
                if ((0.9999*prizeSize) > prizeLiquidity) {
                    throw new Error(`Insufficient prize liquidity iter ${iter} i ${i} p ${p} prizeSize ${prizeSize} prizeLiquidity ${prizeLiquidity}`)
                }
                prizeLiquidity -= prizeSize
            }
        }

        
    }
})

program.parse()
