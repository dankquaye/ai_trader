const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Mock browser globals
const mockWindow = {
    botBalance: 1000,
    updateWatchdogStatus: () => {},
    updateRecoveryStatus: () => {},
    updateTradeHistory: () => {},
    saveSettings: () => {},
    showToast: () => {},
    updateHealthStatus: () => {},
    updateUIStrategy: () => {},
    tf: {}, // Mock TensorFlow
    DerivConfig: {}
};

const mockDocument = {
    getElementById: () => ({
        prepend: () => {},
        innerHTML: ''
    }),
    createElement: () => ({})
};

// Mock AIFilter
class MockAIFilter {
    constructor() {
        this.isReliable = true;
    }
    async init() {}
    async predict() { return null; }
    addSample() {}
}

// Mock AdaptiveOptimizer
class MockAdaptiveOptimizer {
    constructor(bot) {
        this.bot = bot;
    }
    reset() {}
    onTrade() {}
}

// Load bot.js content
const botJsPath = path.join(__dirname, '../bot.js');
const botJsContent = fs.readFileSync(botJsPath, 'utf8');

// Create VM context
const context = {
    window: mockWindow,
    document: mockDocument,
    console: console,
    AIFilter: MockAIFilter,
    AdaptiveOptimizer: MockAdaptiveOptimizer,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Math: Math
};
vm.createContext(context);

// Execute bot.js
// Append an assignment to make the class available in the context
vm.runInContext(botJsContent + '\nwindow.TradingBot = TradingBot;', context);

const TradingBot = context.window.TradingBot;

// --- TESTS ---

// Test 1: Instantiation
const mockApi = {
    placeTrade: () => {},
    activeSymbol: 'R_100',
    latency: 50
};
const bot = new TradingBot(mockApi);
assert.ok(bot, 'Bot should be instantiated');

// Test 2: calculateEMA logic
console.log('Testing calculateEMA...');

// Case 2.1: Basic calculation
// Data: [10, 11, 12, 13, 14], Period: 2
// k = 2 / (2 + 1) = 2/3 = 0.666...
// i=0: ema = 10 -> result [10]
// i=1: ema = (11 * 2/3) + (10 * 1/3) = 7.333 + 3.333 = 10.666... -> result [10, 10.666]
// i=2: ema = (12 * 2/3) + (10.666 * 1/3) = 8 + 3.555 = 11.555...
const data = [10, 11, 12, 13, 14];
const period = 2;
const result = bot.calculateEMA(data, period);

assert.strictEqual(result.length, 5, 'Result length should match input length');
assert.strictEqual(result[0], 10, 'First EMA value should be first data point');

// Manual calc verification
const k = 2 / (period + 1);
let ema = data[0];
const expected = [ema];
for (let i = 1; i < data.length; i++) {
    ema = (data[i] * k) + (ema * (1 - k));
    expected.push(ema);
}

for (let i = 0; i < result.length; i++) {
    assert.ok(Math.abs(result[i] - expected[i]) < 0.0001, `EMA at index ${i} mismatch`);
}
console.log('Case 2.1 Passed');

// Case 2.2: Period = 1
// k = 2 / 2 = 1
// ema = data[i] * 1 + ema * 0 = data[i]
const resultP1 = bot.calculateEMA(data, 1);
for(let i=0; i<data.length; i++) {
     assert.strictEqual(resultP1[i], data[i], `EMA with period 1 at index ${i} should equal data`);
}
console.log('Case 2.2 Passed');

// Case 2.3: Empty array
const emptyResult = bot.calculateEMA([], 5);
assert.strictEqual(emptyResult.length, 0, 'Empty input should return empty output');
console.log('Case 2.3 Passed');

// Case 2.4: Single element
const singleResult = bot.calculateEMA([42], 5);
assert.strictEqual(singleResult.length, 1);
assert.strictEqual(singleResult[0], 42);
console.log('Case 2.4 Passed');

console.log('All tests passed!');
