#!/usr/bin/env node
const chalk = require('chalk')
const { Command } = require('commander')
const program = new Command()

program.name('chance')

program.option('-i, --iterations <number>', 'Number of iterations', 10)
program.option('-c, --chance <number>', 'users chance of winning (fraction 0-1)', 0.2)
program.option('-s, --split <number>', 'number of chance to split over', 4)

program.action(function (options) {

    // more prizes when same chance split?
    let singleWinCounts = 0

    for (let i = 0; i < options.iterations; i++) {
        if (Math.random() < options.chance) {
            singleWinCounts++
        }
    }

    let splitWinCounts = 0

    for (let i = 0; i < options.split*options.iterations; i++) {
        if (Math.random() < (options.chance/options.split)) {
            splitWinCounts++
        }
    }

    console.log(chalk.cyan(`Split win counts: ${splitWinCounts}`))
    console.log(chalk.cyan(`Single win counts: ${singleWinCounts}`))
})

program.parse()
