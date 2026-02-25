// verification/test_bot_integrity.js - Institutional Integrity Check

const fs = require('fs');
const vm = require('vm');

// Mocks
const window = {
    console: console,
    document: {
        getElementById: () => ({ prepend: () => {} }),
        createElement: (tag) => ({ innerText: '' })
    },
    updateTradeHistory: () => {},
    DerivConfig: {}
};
const document = window.document;

class WebSocket {
    constructor(url) {}
    send(data) {}
    close() {}
}
global.WebSocket = WebSocket;

// Load Sources
const load = (file) => fs.readFileSync(file, 'utf8');
const sources = [
    load('deriv-api.js'),
    load('bot.js')
];

// Sandbox
const sandbox = { window, document, console, WebSocket, setTimeout, clearTimeout, Date };
vm.createContext(sandbox);

try {
    sources.forEach(src => vm.runInContext(src, sandbox));
    console.log('[TEST] Sources loaded.');

    const { DerivAPI, TradingBot } = sandbox.window;

    // 1. Instantiation
    const api = new DerivAPI();
    const bot = new TradingBot(api);
    console.log('[TEST] Instantiated Bot & API.');

    // 2. Risk Manager Check
    if(!bot.riskManager) throw new Error('RiskManager missing');
    if(bot.riskManager.calculateStake(80, []) <= 0) throw new Error('RiskManager stake calc failed');
    console.log('[TEST] RiskManager verified.');

    // 3. Regime Detector
    bot.memory.ticks = [100, 100.1, 100.2, 100.3, 100.4, 100.5, 100.6]; // Trendish
    bot.regimeDetector.update(bot.memory.ticks, []);
    console.log(`[TEST] Regime: ${bot.regimeDetector.currentRegime}`);

    // 4. Execution Lock
    bot.start();
    bot._executeTrade('rise', 10);
    if(!bot.lock) throw new Error('Execution Lock failed to engage');
    if(bot.state !== 'PROPOSAL') throw new Error('State Machine failed');
    console.log('[TEST] Execution Lock verified.');

    console.log('[SUCCESS] Institutional Integrity Verified.');

} catch (e) {
    console.error('[FAIL]', e);
    process.exit(1);
}
