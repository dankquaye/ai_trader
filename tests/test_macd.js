const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Setup Environment
const sandbox = {
    window: {
        botBalance: 1000,
        saveSettings: () => {},
        showToast: () => {},
        updateRecoveryStatus: () => {},
        updateWatchdogStatus: () => {},
        updateHealthStatus: () => {},
        updateUIStrategy: () => {},
        updateTradeHistory: () => {},
        DerivConfig: { appId: 12345 }
    },
    document: {
        getElementById: () => ({
            prepend: () => {},
            innerHTML: ''
        }),
        createElement: () => ({ className: '', innerHTML: '' })
    },
    console: console,
    AIFilter: class {
        async init() {}
        async predict() { return null; }
    },
    AdaptiveOptimizer: class {
        constructor() {}
        reset() {}
        onTrade() {}
    },
    // Placeholders for globals that might be accessed
    TradingBot: null
};

// 2. Read bot.js and export TradingBot
let botCode = fs.readFileSync('./bot.js', 'utf8');
// Append export
botCode += '\n;TradingBot;';

// 3. Run in Sandbox
vm.createContext(sandbox);
// Evaluate and capture the last expression result
const TradingBotClass = vm.runInContext(botCode, sandbox);

// 4. Test Setup
const mockApi = {
    latency: 100,
    placeTrade: () => {},
    pendingTrade: false
};

const bot = new TradingBotClass(mockApi);

// 5. Test calculateMACD
console.log('Testing calculateMACD...');

// Test Case 1: Simple increasing sequence
const data = Array.from({length: 50}, (_, i) => i + 1);

// Fast EMA lags less than Slow EMA. So MACD (Fast - Slow) should be positive for an uptrend.
const result = bot.calculateMACD(data, 12, 26, 9);

assert.ok(result.macdLine, 'macdLine should exist');
assert.ok(result.signalLine, 'signalLine should exist');
assert.ok(result.histogram, 'histogram should exist');
assert.strictEqual(result.macdLine.length, data.length, 'macdLine length mismatch');
assert.strictEqual(result.signalLine.length, data.length, 'signalLine length mismatch');
assert.strictEqual(result.histogram.length, data.length, 'histogram length mismatch');

// Check values at the end (where EMAs are stable)
const lastIndex = data.length - 1;
const lastMacd = result.macdLine[lastIndex];
console.log(`Last MACD for increasing series: ${lastMacd}`);
assert.ok(lastMacd > 0, 'MACD should be positive for increasing series');

// Test Case 2: Decreasing sequence
const decreasingData = Array.from({length: 50}, (_, i) => 50 - i);
const resultDec = bot.calculateMACD(decreasingData, 12, 26, 9);
const lastMacdDec = resultDec.macdLine[lastIndex];
console.log(`Last MACD for decreasing series: ${lastMacdDec}`);
assert.ok(lastMacdDec < 0, 'MACD should be negative for decreasing series');

// Test Case 3: Flat sequence
const flatData = Array.from({length: 50}, () => 100);
const resultFlat = bot.calculateMACD(flatData, 12, 26, 9);
const lastMacdFlat = resultFlat.macdLine[lastIndex];
console.log(`Last MACD for flat series: ${lastMacdFlat}`);
// Should be very close to 0
assert.ok(Math.abs(lastMacdFlat) < 0.0001, 'MACD should be near 0 for flat series');

// Test Case 4: Verify Signal Line Logic
// Signal line is EMA of MACD line.
// For increasing data, MACD is roughly constant positive (after stabilization).
// So signal line should be close to MACD line, and histogram (MACD - Signal) should be close to 0.
const lastSignal = result.signalLine[lastIndex];
const lastHistogram = result.histogram[lastIndex];
console.log(`Last Signal: ${lastSignal}, Last Histogram: ${lastHistogram}`);
// We can assert that histogram is calculated correctly: Hist = MACD - Signal
// Floating point math might introduce small errors, so use epsilon check
assert.ok(Math.abs(result.histogram[lastIndex] - (result.macdLine[lastIndex] - result.signalLine[lastIndex])) < 0.0001, 'Histogram calculation check');

console.log('All tests passed!');
