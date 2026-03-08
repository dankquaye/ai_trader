const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Load the source code
const botCode = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');

/**
 * Setup a mock browser environment
 */
function setupSandbox() {
    const sandbox = {
        console: {
            log: () => {},
            error: () => {},
            warn: () => {}
        },
        window: {},
        document: {
            getElementById: (id) => ({
                prepend: () => {},
                innerHTML: ''
            }),
            createElement: (tag) => ({
                className: '',
                innerHTML: ''
            })
        },
        setTimeout: (fn, delay) => {
            if (typeof fn === 'function') fn();
            return 1;
        },
        clearTimeout: () => {},
        Map: Map,
        Date: Date,
        Math: Math,
        parseFloat: parseFloat,
        parseInt: parseInt,
        Array: Array,
        Object: Object,
        Promise: Promise,
        // Mock components
        AIFilter: class {
            constructor() {
                this.isReliable = true;
            }
            init() { return Promise.resolve(); }
        },
        AdaptiveOptimizer: class {
            constructor() {
                this.isActive = false;
            }
            reset() { this.isActive = true; }
            onTrade() {}
        }
    };
    sandbox.window = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(botCode, sandbox);

    // Expose TradingBot to the test script
    sandbox.TradingBot = vm.runInContext('TradingBot', sandbox);

    return sandbox;
}

const tests = {
    testConstructor: () => {
        console.log('Running: testConstructor');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        assert.strictEqual(bot.isRunning, false, 'isRunning should be false');
        assert.strictEqual(bot.initialStake, 1, 'initialStake should be 1');
        assert.strictEqual(bot.strategy, 'ultra_instinct', 'strategy should be ultra_instinct');
        assert.ok(Array.isArray(bot.ticks), 'ticks should be an array');
        assert.strictEqual(bot.ticks.length, 0, 'ticks should be empty');
    },

    testStartStop: async () => {
        console.log('Running: testStartStop');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        await bot.start();
        assert.strictEqual(bot.isRunning, true, 'isRunning should be true after start()');

        bot.stop();
        assert.strictEqual(bot.isRunning, false, 'isRunning should be false after stop()');
    },

    testTogglePause: () => {
        console.log('Running: testTogglePause');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        assert.strictEqual(bot.isPaused, false, 'isPaused should be false initially');
        bot.togglePause();
        assert.strictEqual(bot.isPaused, true, 'isPaused should be true after toggle');
        bot.togglePause();
        assert.strictEqual(bot.isPaused, false, 'isPaused should be false after second toggle');
    },

    testSetStake: () => {
        console.log('Running: testSetStake');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        bot.setStake(5);
        assert.strictEqual(bot.initialStake, 5, 'initialStake should be updated');
        assert.strictEqual(bot.currentStake, 5, 'currentStake should be updated when bot is not running');
    },

    testSetDuration: () => {
        console.log('Running: testSetDuration');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        bot.setDuration(10, 'm');
        assert.strictEqual(bot.duration, 10, 'duration should be updated');
        assert.strictEqual(bot.durationUnit, 'm', 'durationUnit should be updated');
    },

    testSetSymbol: () => {
        console.log('Running: testSetSymbol');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        bot.ticks = [1.23, 1.24];
        bot.candles1m = [{ close: 1.24 }];

        bot.setSymbol('R_50');
        assert.strictEqual(bot.currentSymbol, 'R_50', 'currentSymbol should be updated');
        assert.strictEqual(bot.ticks.length, 0, 'ticks should be cleared');
        assert.strictEqual(bot.candles1m.length, 0, 'candles1m should be cleared');
    },

    testProcessTick: async () => {
        console.log('Running: testProcessTick');
        const sandbox = setupSandbox();
        const api = { latency: 100 };
        const bot = new sandbox.TradingBot(api);

        // Mock evaluate to avoid deep logic
        bot.evaluate = () => {};

        await bot.start();
        bot.processTick({ symbol: 'R_100', quote: 123.45 });

        assert.strictEqual(bot.ticks[0], 123.45, 'Tick quote should be added to ticks array');
    },

    testHandleTradeResult: async () => {
        console.log('Running: testHandleTradeResult');
        const sandbox = setupSandbox();
        const api = { latency: 100, activeSymbol: 'R_100' };
        const bot = new sandbox.TradingBot(api);

        await bot.start();

        // Mock internal methods called by handleTradeResult
        bot.gradeTrade = () => 'A';
        bot.updateGradeDrift = () => {};
        bot.updateLearning = () => {};

        // Win
        bot.handleTradeResult({ profit: '10.50', contract_id: 123, contract_type: 'CALL' });
        assert.strictEqual(bot.totalProfit, 10.50, 'totalProfit should increase by 10.50');
        assert.strictEqual(bot.wins, 1, 'wins should increment');
        assert.strictEqual(bot.losses, 0, 'losses should remain 0');

        // Loss
        bot.handleTradeResult({ profit: '-5.00', contract_id: 124, contract_type: 'CALL' });
        assert.strictEqual(bot.totalProfit, 5.50, 'totalProfit should decrease by 5.00');
        assert.strictEqual(bot.wins, 1, 'wins should remain 1');
        assert.strictEqual(bot.losses, 1, 'losses should increment');
    }
};

async function runTests() {
    let failed = 0;
    for (const testName in tests) {
        try {
            await tests[testName]();
            console.log(`✅ ${testName} passed`);
        } catch (e) {
            console.error(`❌ ${testName} failed: ${e.message}`);
            failed++;
        }
    }

    if (failed > 0) {
        console.log(`\nTest suite failed: ${failed} tests failed.`);
        process.exit(1);
    } else {
        console.log('\nTest suite passed! All tests successful.');
    }
}

runTests();
