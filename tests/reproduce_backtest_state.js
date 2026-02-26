const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Mock Browser Environment
const window = {
    logBacktest: console.log,
    updateTradeHistory: () => {},
    botBalance: 10000
};
const document = {
    createElement: () => ({ className: '', innerHTML: '' }),
    getElementById: () => null
};

// Load Sources
const loadFile = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

const botSource = loadFile('bot.js');
const backtestSource = loadFile('backtest.js');
const aiFilterSource = loadFile('ai-filter.js');
const optimizerSource = loadFile('optimizer.js');

// Create Sandbox
const sandbox = {
    window,
    document,
    console,
    setTimeout: (fn, delay) => fn(),
    clearTimeout: () => {},
    Date: Date,
    Math: Math,
    AIFilter: class {},
    AdaptiveOptimizer: class {}
};

vm.createContext(sandbox);

// Load Scripts
vm.runInContext(aiFilterSource, sandbox);
vm.runInContext(optimizerSource, sandbox);
vm.runInContext(botSource + "; this.TradingBot = TradingBot;", sandbox);
vm.runInContext(backtestSource + "; this.Backtester = Backtester;", sandbox);

const TradingBot = sandbox.TradingBot;
const Backtester = sandbox.Backtester;

// Mock API
const api = {
    getHistoricalCandles: async () => [],
    placeTrade: () => {},
    latency: 50
};

// Run Reproduction
async function runTest() {
    console.log("Starting Reproduction Test...");

    const bot = new TradingBot(api);
    bot.start(); // Initialize

    const backtester = new Backtester(api, bot);

    // Simulate setup
    backtester.isBacktesting = true;
    backtester.data = Array(1000).fill({ epoch: 1000, close: 100 }); // Dummy data
    bot.currentStake = 10;
    bot.initialStake = 10;
    bot.useMartingale = true;
    bot.martingaleMultiplier = 2.0;
    bot.consecutiveLosses = 0; // Ensure 0 start

    console.log(`Initial consecutiveLosses: ${bot.consecutiveLosses}`);
    console.log(`Initial currentStake: ${bot.currentStake}`);

    // Simulate 1st Loss
    console.log("Executing Trade 1 (Loss)...");
    // direction, currentIndex, entryPrice. Exit will be entry - 1 (Loss for call)
    backtester.data[10] = { epoch: 1000, close: 100 };
    backtester.data[10 + backtester.tradeDuration] = { epoch: 1005, close: 90 }; // Price dropped -> Loss for 'rise'

    backtester.executeSimulatedTrade('rise', 10, 100);

    console.log(`After Trade 1 - consecutiveLosses: ${bot.consecutiveLosses}`);
    console.log(`After Trade 1 - currentStake: ${bot.currentStake}`);

    if (bot.consecutiveLosses === 0) {
        console.log("FAIL: consecutiveLosses did not increment.");
        process.exit(1);
    } else {
        console.log("PASS: consecutiveLosses incremented.");
    }

    if (bot.currentStake === 10) {
        console.log("FAIL: Stake did not increase (Martingale failed).");
        process.exit(1);
    } else {
        console.log("PASS: Stake increased.");
    }
}

runTest();
