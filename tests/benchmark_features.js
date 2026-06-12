const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Read bot.js source
const botSource = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');

// Mock browser environment
const sandbox = {
    window: {},
    document: {
        getElementById: () => null,
        createElement: () => ({ className: '', innerHTML: '' })
    },
    console: console,
    AIFilter: class {
        async init() {}
    },
    AdaptiveOptimizer: class {
        reset() {}
    },
    Date: Date,
    Math: Math,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Map: Map
};

// Execute bot.js in sandbox
vm.createContext(sandbox);
vm.runInContext(botSource + '\nwindow.TradingBot = TradingBot;', sandbox);

// Expose TradingBot
const TradingBot = sandbox.window.TradingBot;

// Benchmark Logic
function runBenchmark() {
    const apiMock = {
        latency: 100
    };
    const bot = new TradingBot(apiMock);

    // Fill with dummy candles
    // We need at least 500 candles to simulate full load
    const candles = [];
    let price = 1000;
    for (let i = 0; i < 500; i++) {
        price = price * (1 + (Math.random() - 0.5) * 0.001);
        candles.push({
            time: 1000000 + i * 60,
            open: price,
            high: price * 1.001,
            low: price * 0.999,
            close: price * 1.0005
        });
    }

    // Inject candles
    bot.candles1m = candles;

    console.log(`Starting benchmark with ${bot.candles1m.length} candles...`);

    const iterations = 100;
    const start = process.hrtime();

    for (let i = 0; i < iterations; i++) {
        // qtAIEngine calls: extractSequence(this.candles1m.length - 1, 10);
        bot.extractSequence(bot.candles1m.length - 1, 10);
    }

    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1000 + diff[1] / 1e6);

    console.log(`Total time for ${iterations} iterations: ${timeInMs.toFixed(2)}ms`);
    console.log(`Average time per iteration: ${(timeInMs / iterations).toFixed(2)}ms`);
}

runBenchmark();
