const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Load bot.js
let botCode = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');
// Explicitly expose TradingBot to the sandbox global scope
botCode += '\nthis.TradingBot = TradingBot;';

// Mock browser globals
const sandbox = {
    window: {},
    document: {
        getElementById: () => null,
        createElement: () => ({ innerHTML: '', className: '' }),
    },
    console: console,
    AIFilter: class {
        init() {}
        isReliable() { return false; }
    },
    AdaptiveOptimizer: class {
        reset() {}
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Math: Math
};

// Execute bot.js in the sandbox
vm.createContext(sandbox);
vm.runInContext(botCode, sandbox);

const TradingBot = sandbox.TradingBot;
const bot = new TradingBot({});

// Helper to create mock candles
function createCandles(prices) {
    return prices.map((p, i) => ({
        close: p,
        open: p,
        high: p,
        low: p,
        time: i
    }));
}

// Test Suite
console.log('Running tests for calculateShannonEntropy...');

try {
    // Test 1: Insufficient candles
    // The function checks if candles.length < period + 1
    const candlesShort = createCandles([100, 101]);
    const period = 5;
    const entropyShort = bot.calculateShannonEntropy(candlesShort, period);
    assert.strictEqual(entropyShort, 0, 'Should return 0 for insufficient candles (2 candles vs period 5)');
    console.log('✅ Test 1 Passed: Insufficient candles');

    // Test 2: Zero volatility (all prices same)
    // If all prices are the same, binSize = 0, so it returns 0.
    const candlesFlat = createCandles(new Array(10).fill(100));
    const entropyFlat = bot.calculateShannonEntropy(candlesFlat, 5);
    assert.strictEqual(entropyFlat, 0, 'Should return 0 for zero volatility');
    console.log('✅ Test 2 Passed: Zero volatility');

    // Test 3: Normal case with mixed returns
    // Just verifying it produces a valid positive number
    const prices = [100, 101, 100.5, 102, 101.5, 103, 102.5, 104, 103.5, 105];
    const candlesNormal = createCandles(prices);
    const entropyNormal = bot.calculateShannonEntropy(candlesNormal, 9);
    assert.ok(typeof entropyNormal === 'number', 'Should return a number');
    assert.ok(entropyNormal >= 0, 'Entropy should be non-negative');
    console.log(`✅ Test 3 Passed: Normal case (entropy: ${entropyNormal.toFixed(4)})`);

    // Test 4: Known distribution check
    // Create a scenario where returns are distributed equally across bins.
    // Period = 4, so binCount = sqrt(4) = 2.
    // We need 4 returns. 2 low, 2 high.
    // Returns are log(close[i]/close[i-1]).
    // Let's use alternating prices: 100, 110, 100, 110, 100
    // returns:
    // log(110/100) approx 0.0953
    // log(100/110) approx -0.0953
    // log(110/100) approx 0.0953
    // log(100/110) approx -0.0953
    // min = -0.0953, max = 0.0953
    // binSize = (0.0953 - (-0.0953)) / 2 = 0.0953
    // bin 0 range: [-0.0953, 0.0) -> contains -0.0953 (2 items)
    // bin 1 range: [0.0, 0.0953] -> contains 0.0953 (2 items)
    // Probability for bin 0 = 2/4 = 0.5
    // Probability for bin 1 = 2/4 = 0.5
    // Entropy = - (0.5*ln(0.5) + 0.5*ln(0.5)) = -ln(0.5) approx 0.6931

    const pricesMixed = [100, 110, 100, 110, 100];
    const candlesMixed = createCandles(pricesMixed);
    const entropyMixed = bot.calculateShannonEntropy(candlesMixed, 4);

    // Check if close to ln(2)
    const expected = Math.log(2);
    const diff = Math.abs(entropyMixed - expected);

    // We allow some tolerance because binning logic might put max value in a new bin or edge case
    // But with 2 bins and min/max as boundaries, it should be fairly clean.
    // However, floating point math might cause slight drift.

    if (diff < 0.0001) {
         console.log(`✅ Test 4 Passed: Entropy matches expected ln(2) (${entropyMixed.toFixed(4)})`);
    } else {
         console.warn(`⚠️ Test 4 Warning: Entropy (${entropyMixed.toFixed(4)}) differs from expected (${expected.toFixed(4)}). Logic check needed.`);
         // If it's slightly off due to bin boundary inclusion (e.g., max value creates a third bin if key=binCount),
         // let's debug.
         // If key calculation is floor((r-min)/binSize).
         // For max value: floor((max-min)/binSize) = floor(range/(range/binCount)) = floor(binCount) = binCount.
         // So key becomes equal to binCount (index out of 0..binCount-1).
         // The implementation uses an object for bins: const bins = {}; bins[key] = ...
         // So it will create a key '2'.
         // Keys present: 0 and 2.
         // Probabilities are still 0.5 and 0.5.
         // Entropy calculation iterates `for (const key in bins)`.
         // So it sums over 2 keys. Result should still be correct.
         // Let's assert it passes.
         assert.ok(diff < 0.0001, `Entropy ${entropyMixed} should be close to ${expected}`);
    }

} catch (e) {
    console.error('❌ Test Failed:', e);
    process.exit(1);
}
