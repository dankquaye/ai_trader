const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Mock dependencies
const sandbox = {
    window: {
        updateTradeHistory: () => {},
        saveSettings: () => {},
        updateWatchdogStatus: () => {},
        updateRecoveryStatus: () => {},
        tf: {
            sequential: () => ({ add: () => {}, compile: () => {}, fit: () => ({ history: { acc: [0] } }), predict: () => ({ dataSync: () => [0.5] }) }),
            layers: { lstm: () => {}, dense: () => {}, dropout: () => {} },
            train: { adam: () => {} },
            tensor3d: () => ({ dispose: () => {} }),
            tensor2d: () => ({ dispose: () => {} }),
            setBackend: async () => {},
            getBackend: () => 'cpu',
            tidy: (fn) => fn(),
        },
        DerivAPI: class {},
    },
    document: {
        getElementById: () => null,
        createElement: () => ({ innerHTML: '' }),
    },
    console: console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Date: Date,
    Math: Math,
    AIFilter: null,
    AdaptiveOptimizer: class {},
};

vm.createContext(sandbox);

const aiFilterPath = path.resolve(__dirname, '../ai-filter.js');
const aiFilterSource = fs.readFileSync(aiFilterPath, 'utf8') + ';\nthis.AIFilter = AIFilter;';
vm.runInContext(aiFilterSource, sandbox);

const botPath = path.resolve(__dirname, '../bot.js');
// Inject log at start of handleTradeResult manually here if needed, but let's try patch first
const botSource = fs.readFileSync(botPath, 'utf8') + ';\nthis.TradingBot = TradingBot;';
vm.runInContext(botSource, sandbox);

async function runTest() {
    console.log('--- Starting Verification Test ---');
    const { TradingBot, AIFilter } = sandbox;

    const bot = new TradingBot({ placeTrade: () => {}, activeSymbol: 'R_100' });
    bot.useAIFilter = true;
    bot.isRunning = true; // IMPORTANT: bot must be running to process ticks/results fully?
    // handleTradeResult checks isRunning?
    // "if (!this.isRunning) return;" is AFTER cooldown.
    // So it runs up to cooldown.
    // The RL update is AFTER that check.
    // So "isRunning" MUST be true.

    // In reproduction script I didn't set isRunning=true?
    // bot.isRunning defaults to false.
    // Let's check bot.js logic.
    /*
        this.setWatchdogState('COOLDOWN');
        setTimeout(() => this.setWatchdogState('IDLE'), cooldownTime);

        if (!this.isRunning) return; // <--- RETURNS HERE IF NOT RUNNING

        this.totalProfit += profit;
        // ...
        // ...
        // RL Update is here
    */

    console.log('Setting bot.isRunning = true');
    bot.isRunning = true;

    const aiInstance = bot.aiFilter;
    Object.defineProperty(aiInstance, 'isReliable', { value: true, configurable: true });

    let updateRLCalled = false;
    let updateRLArgs = null;

    aiInstance.updateRL = (s, a, r) => {
        updateRLCalled = true;
        updateRLArgs = [s, a, r];
        console.log('SPY: updateRL called with', s, a, r);
    };

    aiInstance.predict = async () => ({
        probability: 0.8,
        confidence: 0.9,
        regime: 'Uptrend',
        regimeId: 0,
        threshold: 0.6,
        rlAction: 2, // Loosen
        confBucket: 4,
        rawPredictions: [0.8, 0.8, 0.8]
    });

    bot.candles1m = new Array(60).fill({ close: 100, open: 99, high: 101, low: 98, time: Date.now() });
    bot.extractSequence = () => [[0]];
    bot.calculateRSI = () => new Array(60).fill(50);
    bot.calculateEMA = () => new Array(60).fill(100);
    bot.calculateBollingerBands = () => new Array(60).fill({ upper: 110, lower: 90, middle: 100 });
    bot.calculateShannonEntropy = () => 0.5;
    bot.calculateTickAcceleration = () => 0;

    bot.qtTrendEngine = () => ({ buy: 1.0, sell: 0.0 });
    bot.qtMomentumEngine = () => ({ buy: 1.0, sell: 0.0 });
    bot.qtNoiseEngine = () => 1.0;

    bot.params.wAI = 1.0;
    bot.params.confidenceThreshold = 0.1;
    bot.currentSymbol = 'R_100';

    console.log('1. Running Analysis...');
    await bot.analyzeQuantumEnlargement();

    console.log('Reasoning AI:', bot.currentTradeReasoning ? bot.currentTradeReasoning.ai : 'None');

    console.log('2. Simulating Trade Execution...');
    bot.hasOpenTrade = true;
    bot.activeContracts.set('123', 'R_100');

    console.log('3. Simulating Trade Result (WIN)...');
    try {
        bot.handleTradeResult({
            profit: 10,
            contract_type: 'call',
            date_start: Date.now(),
            buy_price: 10,
            underlying_symbol: 'R_100',
            contract_id: '123'
        });
    } catch (e) {
        console.log('ERROR:', e);
    }

    if (updateRLCalled) {
        console.log('PASS: updateRL WAS called.');
        process.exit(0);
    } else {
        console.log('FAIL: updateRL was NOT called.');
        process.exit(1);
    }
}

runTest();
