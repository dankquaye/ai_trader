const fs = require('fs');
const vm = require('vm');

// Mock Browser Environment
const window = {
    console: console,
    document: {
        getElementById: () => ({ prepend: () => {} }),
        createElement: (tag) => ({ innerText: '' })
    },
    botBalance: 1000,
    updateTradeHistory: () => {}
};
const document = window.document;

// Mock DerivAPI
class DerivAPI {
    constructor() { this.pendingTrade = false; }
    placeTrade() { console.log('Mock: Trade Placed'); }
}

// Load bot.js source
const botSource = fs.readFileSync('bot.js', 'utf8');

// Sandbox
const sandbox = { window, document, console, DerivAPI };
vm.createContext(sandbox);

// Execute bot.js
try {
    vm.runInContext(botSource, sandbox);
    console.log('bot.js loaded successfully.');
} catch (e) {
    console.error('Error loading bot.js:', e);
    process.exit(1);
}

// Instantiate and Test
try {
    // Access TradingBot through the window object in the sandbox
    const TradingBot = sandbox.window.TradingBot;

    if (!TradingBot) {
        throw new Error('TradingBot not found on window object');
    }

    const api = new DerivAPI();
    const bot = new TradingBot(api);

    console.log('TradingBot instantiated.');

    bot.start();
    console.log('Bot started.');

    // Mock Tick
    bot.processTick({ symbol: 'R_100', quote: 123.45, epoch: Date.now()/1000 });
    console.log('Tick processed.');

    // Mock Candle
    bot.processCandle({ epoch: Date.now()/1000, open: 123, high: 124, low: 122, close: 123.5 }, 60);
    console.log('Candle processed.');

    // Verify setParamLock
    bot.setParamLock(true);
    if (bot.isParamLocked !== true) throw new Error('setParamLock failed');
    console.log('setParamLock verified.');

    console.log('Bot integrity verification passed.');

} catch (e) {
    console.error('Runtime Verification Failed:', e);
    process.exit(1);
}
