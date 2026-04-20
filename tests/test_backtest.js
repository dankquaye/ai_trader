const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Read backtest.js content and append export
const backtestPath = path.join(__dirname, '../backtest.js');
let backtestCode = fs.readFileSync(backtestPath, 'utf8');
backtestCode += '\n;this.Backtester = Backtester;';

// Define global context
const context = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    window: {
        logBacktest: (msg) => {} // Default dummy logger
    },
    // Placeholders for API/Bot, to be populated per test or defaults
    api: {},
    bot: {}
};

// Create script
const script = new vm.Script(backtestCode);
vm.createContext(context);
script.runInContext(context);

const Backtester = context.Backtester;

// --- Test Framework ---
let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
    try {
        console.log(`Running test: ${name}`);
        await fn();
        console.log(`✅ Passed: ${name}`);
        testsPassed++;
    } catch (e) {
        console.error(`❌ Failed: ${name}`);
        console.error(e);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// --- Helper: Generate Candles ---
function generateCandles(count, startPrice = 100) {
    const candles = [];
    let price = startPrice;
    let time = 1000000;
    for (let i = 0; i < count; i++) {
        price = price + (Math.random() - 0.5) * 2;
        candles.push({
            epoch: time + i * 60,
            open: price,
            high: price + 1,
            low: price - 1,
            close: price
        });
    }
    return candles;
}

// --- Tests ---

(async () => {

    await test('Initialization', async () => {
        const mockApi = {};
        const mockBot = {};
        const backtester = new Backtester(mockApi, mockBot);
        assert(backtester.isBacktesting === false, 'Should start with isBacktesting false');
        assert(backtester.currentBalance === 10000, 'Starting balance should be 10000');
    });

    await test('Simulation with Profit', async () => {
        const candleCount = 1200;
        const candles = generateCandles(candleCount);

        const mockApi = {
            getHistoricalCandles: async () => candles
        };

        const mockBot = {
            lastSignal: null,
            currentStake: 100,
            stop: () => {},
            start: () => {},
            setBacktestMode: () => {},
            updateConfig: () => {},
            setDuration: () => {},
            updateLearning: () => {},
            processCandle: function(candle, granularity) {
                // We spy on processCandle to inject signals
                // Note: 'this' inside here refers to mockBot if called as method
                if (granularity === 60) {
                    this._callCount = (this._callCount || 0) + 1;
                    // Signal every 100 candles starting at 300
                    if (this._callCount > 300 && this._callCount % 100 === 0) {
                        this.lastSignal = 'rise';
                    } else {
                        this.lastSignal = null;
                    }
                }
            }
        };

        const backtester = new Backtester(mockApi, mockBot);

        // Spy on logBacktest
        let logs = [];
        context.window.logBacktest = (msg) => logs.push(msg);

        const result = await backtester.run('R_100', 1000);

        assert(result.results.totalTrades > 0, 'Should execute trades');
        assert(result.trades.length > 0, 'Trades array should not be empty');
        console.log(`Executed ${result.results.totalTrades} trades.`);
    });

    await test('Insufficient Data Error', async () => {
        const mockApi = {
            getHistoricalCandles: async () => generateCandles(100) // Too few
        };
        const mockBot = {
            stop: () => {},
            setBacktestMode: () => {},
            updateConfig: () => {},
            setDuration: () => {},
            start: () => {}
        };
        const backtester = new Backtester(mockApi, mockBot);

        // Suppress console.error for expected error
        const originalError = context.console.error;
        context.console.error = () => {};

        let error = null;
        try {
            await backtester.run('R_100', 1000);
        } catch (e) {
            error = e;
        } finally {
            context.console.error = originalError;
        }

        assert(error !== null, 'Should throw error');
        assert(error.message === "Insufficient data for backtest", 'Error message mismatch');
    });

    console.log(`\nSummary: ${testsPassed} passed, ${testsFailed} failed.`);
    if (testsFailed > 0) process.exit(1);

})();
