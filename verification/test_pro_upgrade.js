// verification/test_pro_upgrade.js

const fs = require('fs');
const vm = require('vm');

// Mocks
const mockElement = {
    prepend: () => {},
    lastChild: { remove: () => {} },
    children: [] // Mock children array
};

const window = {
    console: console,
    document: {
        getElementById: () => mockElement,
        createElement: (tag) => ({ innerText: '', className: '' })
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
    load('src/core/State.js'),
    load('src/core/Logger.js'),
    load('src/modules/RegimeDetector.js'),
    load('src/modules/SignalEngine.js'),
    load('src/modules/ReinforcementEngine.js'),
    load('src/modules/RiskManager.js'),
    load('src/modules/ExecutionEngine.js'),
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
    console.log('[TEST] Instantiated BotController.');

    // 2. Regime Detection with Structured Output
    // Mock candles - Steady Uptrend
    const candles = [];
    for(let i=0; i<50; i++) {
        candles.push({ epoch: i*60, open: 100+(i*0.1), high: 100+(i*0.1)+0.05, low: 100+(i*0.1)-0.05, close: 100+(i*0.1)+0.02 });
    }
    bot.state.candles = candles;
    bot.regime.update([], candles);

    const regime = bot.regime.currentRegime;
    console.log(`[TEST] Regime Type: ${regime.type}, Strength: ${regime.strength}`);
    if(!regime.type) throw new Error('Regime type missing');

    // 3. Scoring Matrix Test
    bot.state.ticks = [105, 105.1, 105.2, 105.3, 105.4];
    const evalResult = bot.signal.evaluate(bot.state.ticks, bot.state.candles);

    console.log(`[TEST] Signal: ${evalResult ? evalResult.signal : 'NONE'} (Conf: ${evalResult ? evalResult.confidence : 0})`);

    // 4. Execution Hard Lock
    bot.start();
    bot.execution.lastTradeCandleTime = 5000;
    bot.execution.attemptExecution('rise', 10, 5, 5000); // Should fail (Same Candle)
    if(bot.state.executionLock) throw new Error('Hard Lock failed: Allowed trade on same candle');
    console.log('[TEST] One-Trade-Per-Candle Lock verified.');

    bot.execution.attemptExecution('rise', 10, 5, 5060); // Should pass
    if(!bot.state.executionLock) throw new Error('Execution failed for fresh candle');
    console.log('[TEST] Execution Success verified.');

    console.log('[SUCCESS] Pro Upgrade Verified.');

} catch (e) {
    console.error('[FAIL]', e);
    process.exit(1);
}
