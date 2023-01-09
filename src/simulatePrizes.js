#!/usr/bin/env node
const chalk = require('chalk')
const { program } = require('commander')
const stats = require("stats-lite")
const { writeFileSync } = require('fs')

const MIN_PRIZE = 1

const USER_BALANCE = 1000

const command = function (options) {

    function log() {
        if (!options.csv) {
            console.log(...arguments)
        }
    }

    function logv() {
        if (!options.csv && options.verbosity) {
            console.log(...arguments)
        }
    }

    const iterationTierLiquidityState = []
    const prizes = []

    logv(chalk.dim(`Using --yield ${options.yield}`))
    logv(chalk.dim(`Using --iterations ${options.iterations}`))
    logv(chalk.dim(`Using --users ${options.users}`))
    logv(chalk.dim(`Using --tiers ${options.tiers}`))
    logv(chalk.dim(`Using --grandPrizeFrequency ${options.grandPrizeFrequency}`))
    logv(chalk.dim(`Using --claimThreshold ${options.claimThreshold}`))

    logv()

    if (options.tiers < 2) {
        throw new Error(`There must be more than 2 tiers`)
    }

    let iterationPrizeLiquidity = []
    let prizeLiquidity = 0
    let numTiers = options.tiers

    const GRAND_PRIZE_FREQUENCY = options.grandPrizeFrequency
    const SHARES_PER_TIER = 100
    const CANARY_SHARE = 10
    const TOTAL_SUPPLY = USER_BALANCE * options.users

    function getTotalShares(numTiers) {
        return numTiers * SHARES_PER_TIER + CANARY_SHARE
    }

    function prizeCount(tier) {
        return 4**tier
    }

    // Store the last exchange rate for tiers. This is the exchange rate they last claimed at
    let tierExchangeRates = {}
    let canaryExchangeRate = 0
    // Store the global yield share exchange rate.
    let yieldShareExchangeRate = 0
    let reserve = 0
    let canarySpent = 0
    let largestDeficit = 0
    let largestNumTiers = 0

    function getTierLiquidity(t) {
        let exchangeRate = tierExchangeRates[t]
        if (!exchangeRate) {
            exchangeRate = 0
        }
        const tierLiquidity = (yieldShareExchangeRate - exchangeRate)*SHARES_PER_TIER
        // if (tierExchangeRates[t] > yieldShareExchangeRate) {
        //     log(chalk.red(`WTF: ${tierLiquidity}`))
        //     process.exit(1)
        // }
        return tierLiquidity
    }

    for (let i = 0; i < options.iterations; i++) {
        // add yield
        prizeLiquidity += parseInt(options.yield)

        // update yield share exchange rate
        const totalShares = getTotalShares(numTiers)
        yieldShareExchangeRate = yieldShareExchangeRate + options.yield / totalShares

        // calculate canary liquidity
        const canaryLiquidity = (yieldShareExchangeRate - canaryExchangeRate)*CANARY_SHARE
        
        let iterationAwardedPrizeLiquidity = 0

        let largestTier = null
        let highestTierClaimPassed = false

        
        const iterationState = [i, options.yield]
        for (let t = 0; t < numTiers; t++) {
            iterationState.push(getTierLiquidity(t))
            iterationState.push(prizeCount(t))
            iterationState.push(getTierLiquidity(t) / prizeCount(t))
        }
        iterationState.push(canaryLiquidity)
        iterationTierLiquidityState.push(iterationState)

        if (prizeLiquidity < 0) {
            logv(chalk.red(`Prize liquidity less than zero ${prizeLiquidity}`))
            process.exit()
        }

        for (let t = 0; t < numTiers; t++) {

            let tierDroppedPrizes = 0

            if (!tierExchangeRates[t]) {
                tierExchangeRates[t] = 0
            }
            const tierLiquidity = getTierLiquidity(t)
            let remainingTierLiquidity = tierLiquidity
            if (tierLiquidity <= 0) {
                log(chalk.yellow(`Tier ${t} at ${tierLiquidity}`))
            }

            const tierPrizeCount = prizeCount(t)
            const prizeSize = Math.trunc(tierLiquidity) / tierPrizeCount
            const K = Math.log(1/GRAND_PRIZE_FREQUENCY)/(-1*numTiers+1)
            const tierOdds = Math.E**(K*(t - (numTiers - 1)))

            // log(`tier ${t}, k ${K}, odds ${tierOdds}, numTiers ${numTiers}`)

            let tierMatchingPrizeCount = 0
            let tierAwardedPrizeLiquidity = 0
            let tierAwardedPrizeCount = 0
            for (let u = 0; u < options.users; u++) {
                const divRand = (Math.random()*TOTAL_SUPPLY) / tierPrizeCount
                const totalOdds = tierOdds*USER_BALANCE
                const isWinner = divRand < totalOdds
                if (isWinner && prizeSize >= MIN_PRIZE) {
                    tierMatchingPrizeCount++
                    if (remainingTierLiquidity >= prizeSize) {
                        tierAwardedPrizeLiquidity += prizeSize
                        remainingTierLiquidity -= prizeSize
                        tierAwardedPrizeCount++
                    } else {
                        tierDroppedPrizes++
                    }
                }
            }
            
            if (tierDroppedPrizes > 0) {
                logv(chalk.red(`Iter ${i}: Tier: ${t}: dropped ${tierDroppedPrizes} prizes out of ${tierMatchingPrizeCount}. Insufficient tier liquidity: ${remainingTierLiquidity} with prize size ${prizeSize}`))
            }

            if (tierAwardedPrizeCount > 0) {
                // make sure we record the largest tier
                if (largestTier == null || t > largestTier) {
                    largestTier = t
                }
                // record prizes
                prizes.push({
                    iteration: i,
                    tier: t,
                    prizeCount: tierAwardedPrizeCount,
                    prizeSize
                })
            }

            iterationAwardedPrizeLiquidity += tierAwardedPrizeLiquidity
            prizeLiquidity -= tierAwardedPrizeLiquidity
            if (prizeLiquidity < 0) {
                log(chalk.red(`Warning: negative liquidity on iteration ${i} at tier ${t}: ${prizeLiquidity}.  Current reserve is ${reserve}.  Diff is ${prizeLiquidity + reserve}`))
                process.exit(1)
                // if (prizeLiquidity < largestDeficit) {
                //     largestDeficit = prizeLiquidity
                // }
            }

            const deltaExchangeRate = tierAwardedPrizeLiquidity / SHARES_PER_TIER
            tierExchangeRates[t] += deltaExchangeRate

            if (tierExchangeRates[t] > yieldShareExchangeRate) {
                const excess = tierAwardedPrizeLiquidity - tierLiquidity
                log(chalk.red(`Iter ${i}: Tier ${t} overallocated ${excess} with ${tierAwardedPrizeCount} total prizes each worth ${prizeSize}`))
                log(chalk.yellow(`Available liquidity: ${prizeLiquidity}`))
                log(chalk.redBright(`Ignoring debt and resetting tier ${t} to zero`))
                tierExchangeRates[t] = yieldShareExchangeRate
            }

            if (tierAwardedPrizeCount > options.claimThreshold*tierPrizeCount) {
                highestTierClaimPassed = true
            }
        }

        iterationPrizeLiquidity.push(iterationAwardedPrizeLiquidity)

        // now do Canary
        let canaryAvailableLiquidity = canaryLiquidity
        canaryExchangeRate = yieldShareExchangeRate

        const actualCanaryPrizeCount = prizeCount(numTiers)
        const m3 = CANARY_SHARE / getTotalShares(numTiers)
        const l3 = SHARES_PER_TIER / getTotalShares(numTiers+1)
        const prizeCountMultiplier = m3/l3
        const canaryPrizeCount = Math.round(actualCanaryPrizeCount * prizeCountMultiplier)
        const canaryPrizeSize = canaryLiquidity / canaryPrizeCount

        // log(`actualCanaryPrizeCount: ${actualCanaryPrizeCount}, CANARY_SHARE: ${CANARY_SHARE}, SHARES_PER_TIER: ${SHARES_PER_TIER}, numTiers: ${numTiers}, prizeCountMultiplier: ${prizeCountMultiplier}, canaryPrizeCount: ${canaryPrizeCount}`)

        let canaryAwardedPrizeLiquidity = 0
        let canaryAwardedPrizeCount = 0
        let canaryDroppedPrizes = 0
        for (let u = 0; u < options.users; u++) {
            // const divRand = (Math.random()*TOTAL_SUPPLY) / canaryPrizeCount
            const isWinner = Math.random() < (USER_BALANCE/TOTAL_SUPPLY) * canaryPrizeCount
            if (isWinner && canaryPrizeSize >= MIN_PRIZE) {
                // do the win
                if (canaryAvailableLiquidity >= canaryPrizeSize) {
                    canaryAwardedPrizeLiquidity += canaryPrizeSize
                    canaryAvailableLiquidity -= canaryPrizeSize
                    canaryAwardedPrizeCount++
                } else {
                    canaryDroppedPrizes++
                }
            }
        }

        if (canaryDroppedPrizes > 0) {
            logv(chalk.red(`Iter ${i}: canary: dropped ${canaryDroppedPrizes} prizes.`))
        }
        
        if (canaryAwardedPrizeLiquidity > canaryLiquidity) {
            throw new Error(`Iter ${i}: Too much: ${canaryAwardedPrizeLiquidity}, ${canaryLiquidity}, ${canaryPrizeSize}`)
        }

        if (canaryAwardedPrizeCount > 0) {
            canarySpent += canaryAwardedPrizeLiquidity
            prizeLiquidity -= canaryAwardedPrizeLiquidity
            // log(chalk.dim(`Canary: ${canaryAwardedPrizeLiquidity}`))
            reserve += canaryLiquidity - canaryAwardedPrizeLiquidity
            // record prizes
            prizes.push({
                iteration: i,
                tier: numTiers,
                prizeCount: canaryAwardedPrizeCount,
                prizeSize: canaryPrizeSize,
                canary: true
            })
        } else {
            reserve += canaryLiquidity
        }
        
        const canaryPassed = canaryAwardedPrizeCount > options.claimThreshold*canaryPrizeCount
        // if we are expanding the tiers
        if (highestTierClaimPassed && canaryPassed) {
            // set the expansion tier to the current exchange rate
            tierExchangeRates[numTiers] = yieldShareExchangeRate
            logv(chalk.green(`Iter ${i}: increased number of tiers from ${numTiers} to ${numTiers+1}`))
            numTiers++
        } else {
            const nextTiers = Math.max(largestTier+1, 2)
            let tierDeltaExchangeRate = 0
            if (numTiers > nextTiers) {
                logv(chalk.yellow(`Decreased tiers from ${numTiers} to ${nextTiers}`))
                // For each tier that will be removed
                for (let tier = numTiers - 1; tier != nextTiers; tier--) {
                    // redistribute remaining yield
                    
                    // determine how many tokens were allocated
                    let tokens = (yieldShareExchangeRate - tierExchangeRates[tier])*SHARES_PER_TIER

                    // add those tokens to the reserve
                    reserve += tokens

                    // reset that tier
                    tierExchangeRates[tier] = 0
                }
                yieldShareExchangeRate += tierDeltaExchangeRate
            }

            numTiers = nextTiers
            if (numTiers > largestNumTiers) {
                largestNumTiers = numTiers
            }
        }
    }

    let totalPrizeCount = 0
    let totalPrizeAmount = 0
    prizes.forEach(prize => {
        totalPrizeCount += prize.prizeCount
        totalPrizeAmount += prize.prizeSize*prize.prizeCount
    })

    if (options.outputTierFilepath) {
        const iterationTierLiquidityStateHeader = ['Iteration', 'NewYield']
        for (let tc = 0; tc < largestNumTiers; tc++) {
            iterationTierLiquidityStateHeader.push(`Tier${tc}Liquidity`)
            iterationTierLiquidityStateHeader.push(`Tier${tc}PrizeCount`)
            iterationTierLiquidityStateHeader.push(`Tier${tc}PrizeSize`)
        }
        iterationTierLiquidityStateHeader.push('CanaryLiquidity')
        writeFileSync(options.outputTierFilepath, iterationTierLiquidityStateHeader.join(',') + '\n' + iterationTierLiquidityState.map(state => state.join(',')).join('\n'))
    }

    if (options.outputPrizesFilepath) {
        writeFileSync(options.outputPrizesFilepath, prizes.map(prize => [prize.iteration, prize.tier, prize.prizeCount, prize.prizeSize].join(',')).join('\n'))
    }

    log("")
    log(chalk.magentaBright(`--- Final Prize Tiers ---`))
    log("")
    let totalPrizes = 0
    for (let i = 0; i < numTiers; i++) {
        totalPrizes += getTierLiquidity(i)
        log(chalk.magentaBright(`Tier ${i} prize size: ${getTierLiquidity(i) / prizeCount(i)}, count: ${prizeCount(i)}`))
    }

    log("")
    log(chalk.white(`--- Prizes ---`))
    log("")
    log(chalk.white(`Total number of prizes: ${totalPrizeCount}`))
    log(chalk.white(`Total prize amount given out: ${totalPrizeAmount}`))
    
    log("")
    log(chalk.cyan(`--- Final State ---`))

    log("")
    
    log(chalk.cyan(`Prize liquidity: ${prizeLiquidity}`))
    if (reserve < 0) {
        log(chalk.bgRedBright(`Reserve: ${reserve}`))
    } else {
        log(chalk.cyan(`Reserve: ${reserve}`))
    }
    
    log("")
    log(chalk.dim(`--- Stats ---`))
    log("")

    log(chalk.dim(`Canary spent: ${canarySpent}`))
    log(chalk.dim(`Largest deficit: ${largestDeficit}`))
    log(chalk.dim(`total yield: ${prizeLiquidity + totalPrizeAmount}`))
    log(chalk.dim(`Total available prizes at end: ${totalPrizes}`))
    log(chalk.dim(`Mean prizes: ${stats.mean(iterationPrizeLiquidity)}`))
    log(chalk.dim(`Median prizes: ${stats.median(iterationPrizeLiquidity)}`))
    log(chalk.dim(`Standard deviation: ${stats.stdev(iterationPrizeLiquidity)}`))
    log(chalk.dim(`Largest ${iterationPrizeLiquidity[0]}`))
    log(chalk.dim(`99.9th Percentile: ${stats.percentile(iterationPrizeLiquidity, 0.999)}`))

    log()

    log(chalk.green("Done!"))
}

program.option('-y, --yield <number>', 'The amount of yield per iteration', 2800)
program.option('-i, --iterations <number>', 'The number of iterations to run', 1)
program.option('-g, --grandPrizeFrequency <number>', 'The frequency of the grand prize', 52)
program.option('-ct, --claimThreshold <number>', 'The percentage of prizes that must be claimed to bump', 0.9)
program.option('-u, --users <number>', 'The number of users to randomize', 1000)
program.option('-t, --tiers <number>', 'The number of tiers (> 2)', 2)
program.option('-v, --verbosity', 'Verbose logging', false)
program.option('-otf, --outputTierFilepath <filepath>', 'Output the iteration tier liquidity as a csv')
program.option('-opf, --outputPrizesFilepath <filepath>', 'Output the prizes as a csv')

program.action(command)

program.parse()
