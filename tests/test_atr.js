const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Load bot.js content
const botJsPath = path.join(__dirname, '../bot.js');
const botJsContent = fs.readFileSync(botJsPath, 'utf8');

// Prepare mock environment
const mockWindow = {
    botBalance: 1000,
    updateWatchdogStatus: () => {},
    updateRecoveryStatus: () => {},
    updateTradeHistory: () => {},
    saveSettings: () => {}
};
mockWindow.window = mockWindow; // Circular reference for window.window

const mockDocument = {
    getElementById: () => ({
        prepend: () => {},
        innerHTML: ''
    }),
    createElement: () => ({
        innerHTML: '',
        className: ''
    })
};

class MockAIFilter {
    async init() {}
    async predict() { return { confidence: 0.5, regime: 'neutral' }; }
}

class MockAdaptiveOptimizer {
    constructor() {}
    reset() {}
    onTrade() {}
}

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
// Append code to expose TradingBot to window
const scriptContent = botJsContent + '\nwindow.TradingBot = TradingBot;';
vm.runInContext(scriptContent, context);

// Access TradingBot from the context
const TradingBot = context.window.TradingBot;

// Helper to create candle
const createCandle = (o, h, l, c) => ({ open: o, high: h, low: l, close: c });

// Test Suite
console.log('Running calculateATR tests...');

const bot = new TradingBot({});

// Test Case 1: Empty input
try {
    const result = bot.calculateATR([], 14);
    assert.deepStrictEqual([...result], [], 'Should return empty array for empty input');
    console.log('✅ Empty input test passed');
} catch (e) {
    console.error('❌ Empty input test failed:', e);
    process.exit(1);
}

// Test Case 2: Single candle input (insufficient for ATR calculation which needs prev close)
// loop starts at i=1, so if length is 1, loop doesn't run. result []
try {
    const candles = [createCandle(10, 12, 8, 11)];
    const result = bot.calculateATR(candles, 14);
    assert.deepStrictEqual([...result], [], 'Should return empty array for single candle');
    console.log('✅ Single candle test passed');
} catch (e) {
    console.error('❌ Single candle test failed:', e);
    process.exit(1);
}

// Test Case 3: Basic Calculation
// Period = 2
// Candles:
// 0: O:10, H:15, L:5, C:10  (Prev Close for next)
// 1: O:10, H:20, L:10, C:15. Prev Close: 10.
//    TR1 = Max(20-10, |20-10|=10, |10-10|=0) = 10.
// 2: O:15, H:25, L:15, C:20. Prev Close: 15.
//    TR2 = Max(25-15, |25-15|=10, |15-15|=0) = 10.
// 3: O:20, H:30, L:20, C:25. Prev Close: 20.
//    TR3 = Max(30-20, |30-20|=10, |20-20|=0) = 10.

// TR array: [10, 10, 10]
// SMA period 2:
// i=0 (TR[0]): null
// i=1 (TR[1]): (10+10)/2 = 10
// i=2 (TR[2]): (10+10)/2 = 10
// Result should be [null, 10, 10]

try {
    const candles = [
        createCandle(10, 15, 5, 10),
        createCandle(10, 20, 10, 15),
        createCandle(15, 25, 15, 20),
        createCandle(20, 30, 20, 25)
    ];
    const result = bot.calculateATR(candles, 2);

    // Check length
    // calculateATR loops i from 1 to 3 (length 4). tr has 3 elements.
    // calculateSMA returns array of same length as input (3).
    assert.strictEqual(result.length, 3, 'Result length mismatch');

    assert.strictEqual(result[0], null, 'First element should be null (period-1)');
    assert.strictEqual(result[1], 10, 'Second element should be 10');
    assert.strictEqual(result[2], 10, 'Third element should be 10');

    console.log('✅ Basic calculation test passed');
} catch (e) {
    console.error('❌ Basic calculation test failed:', e);
    process.exit(1);
}

// Test Case 4: Volatility Calculation Logic
// Check if it correctly picks the max of the 3 components.
// Case A: High-Low is max.
// Case B: |High-PrevClose| is max. (Gap up)
// Case C: |Low-PrevClose| is max. (Gap down)

try {
    // Case A: H-L is max. H:20, L:10. PrevC: 15.
    // H-L = 10. |20-15|=5. |10-15|=5. Max=10.
    const cA = [createCandle(10, 15, 10, 15), createCandle(15, 20, 10, 15)];
    // TR = [10]. SMA(1) -> [10]

    // Case B: Gap Up. PrevC: 10. Curr H: 25, L: 20.
    // H-L = 5. |25-10|=15. |20-10|=10. Max=15.
    const cB = [createCandle(10, 15, 10, 10), createCandle(20, 25, 20, 22)];
    // TR = [15]. SMA(1) -> [15]

    // Case C: Gap Down. PrevC: 30. Curr H: 20, L: 15.
    // H-L = 5. |20-30|=10. |15-30|=15. Max=15.
    const cC = [createCandle(25, 30, 25, 30), createCandle(20, 20, 15, 18)];
    // TR = [15]. SMA(1) -> [15]

    const resA = bot.calculateATR(cA, 1);
    assert.strictEqual(resA[0], 10, 'Failed to calculate max(H-L)');

    const resB = bot.calculateATR(cB, 1);
    assert.strictEqual(resB[0], 15, 'Failed to calculate max gap up');

    const resC = bot.calculateATR(cC, 1);
    assert.strictEqual(resC[0], 15, 'Failed to calculate max gap down');

    console.log('✅ Volatility logic test passed');

} catch (e) {
    console.error('❌ Volatility logic test failed:', e);
    process.exit(1);
}

console.log('All tests passed successfully!');
