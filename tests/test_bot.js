const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Load bot.js source
const botSource = fs.readFileSync('./bot.js', 'utf8');

// 2. Define Mocks

class MockDerivAPI {
    constructor() {
        this.pendingTrade = false;
        this.activeSymbol = 'R_100';
    }
    placeTrade(direction, amount, duration, symbol) {
        console.log(`[MockAPI] Trade placed: ${direction}, ${amount}, ${symbol}`);
        this.pendingTrade = true;
    }
}

class MockAIFilter {
    async init() {}
    async predict() { return { confidence: 0.8 }; }
    addSample() {}
}

class MockAdaptiveOptimizer {
    constructor() {}
    reset() {}
    onTrade() {}
}

const mockWindow = {
    botBalance: 1000,
    saveSettings: () => {},
    updateWatchdogStatus: () => {},
    updateRecoveryStatus: () => {},
    updateTradeHistory: () => {},
    bot: null // Will be assigned
};

const mockDocument = {
    getElementById: (id) => ({
        prepend: () => {},
        innerHTML: ''
    }),
    createElement: (tag) => ({
        className: '',
        innerHTML: ''
    })
};

// 3. Create Sandbox
const sandbox = {
    window: mockWindow,
    document: mockDocument,
    console: console,
    DerivAPI: MockDerivAPI,
    AIFilter: MockAIFilter,
    AdaptiveOptimizer: MockAdaptiveOptimizer,
    TradingBot: null, // Will be defined by eval
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

vm.createContext(sandbox);

// 4. Run bot.js in sandbox
// We append "window.TradingBot = TradingBot;" to ensure it's exposed if it wasn't already (though class decl should be fine in scope)
vm.runInContext(botSource + "\nwindow.TradingBot = TradingBot;", sandbox);

// 5. Run Tests
console.log('--- Starting TradingBot Tests ---');

const TradingBot = sandbox.window.TradingBot;
const api = new MockDerivAPI();
const bot = new TradingBot(api);
sandbox.window.bot = bot; // Assign to global window for internal checks

// Test 1: Initialization
try {
    assert.strictEqual(bot.initialStake, 1, 'Initial stake should be 1');
    assert.strictEqual(bot.risk, 'medium', 'Default risk should be medium');
    console.log('✅ Test 1 Passed: Initialization');
} catch (e) {
    console.error('❌ Test 1 Failed:', e.message);
    process.exit(1);
}

// Test 2: Start/Stop
try {
    bot.start();
    assert.strictEqual(bot.isRunning, true, 'Bot should be running after start()');
    bot.stop();
    assert.strictEqual(bot.isRunning, false, 'Bot should not be running after stop()');
    console.log('✅ Test 2 Passed: Start/Stop');
} catch (e) {
    console.error('❌ Test 2 Failed:', e.message);
    process.exit(1);
}

// Test 3: Configuration
try {
    bot.updateConfig('rsi', 'high');
    assert.strictEqual(bot.strategy, 'rsi', 'Strategy should be updated');
    assert.strictEqual(bot.risk, 'high', 'Risk should be updated');

    bot.setStake(5);
    assert.strictEqual(bot.initialStake, 5, 'Stake should be updated');
    console.log('✅ Test 3 Passed: Configuration');
} catch (e) {
    console.error('❌ Test 3 Failed:', e.message);
    process.exit(1);
}

// Test 4: Data Ingestion (Ticks)
try {
    bot.start();
    bot.setSymbol('R_100');
    // Add some ticks
    for(let i=0; i<50; i++) {
        bot.processTick({ symbol: 'R_100', quote: 100 + i * 0.1 });
    }
    assert.strictEqual(bot.ticks.length, 50, 'Ticks should be stored');
    console.log('✅ Test 4 Passed: Data Ingestion (Ticks)');
} catch (e) {
    console.error('❌ Test 4 Failed:', e.message);
    process.exit(1);
}

// Test 5: Analysis Trigger
// We need to simulate enough data to trigger analysis
try {
    bot.stop();
    bot.setBacktestMode(true); // Easier to test logic
    bot.start();
    bot.updateConfig('sma', 'medium'); // Use simple strategy

    // Add candles
    for(let i=0; i<60; i++) {
         bot.processCandle({
             epoch: i * 60,
             open: 100 + i,
             high: 105 + i,
             low: 95 + i,
             close: 102 + i
         }, 60);
    }

    // Add ticks to trigger evaluate
    for(let i=0; i<30; i++) {
        bot.processTick({ symbol: 'R_100', quote: 150 + i });
    }

    // Check if evaluate ran safely (no error)
    console.log('✅ Test 5 Passed: Analysis Execution (No Crash)');
} catch (e) {
    console.error('❌ Test 5 Failed:', e.message);
    process.exit(1);
}


console.log('--- All Tests Passed ---');
