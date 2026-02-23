const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Read the bot.js file
const botPath = path.join(__dirname, '../bot.js');
let botCode = fs.readFileSync(botPath, 'utf8');

// Append export to window for access in sandbox
botCode += '\nthis.TradingBot = TradingBot;\n';

// 2. Create a mock browser environment
const mockWindow = {
    DerivConfig: {},
    botBalance: 1000,
    updateWatchdogStatus: () => {},
    updateRecoveryStatus: () => {},
    updateTradeHistory: () => {},
    saveSettings: () => {}
};

const mockDocument = {
    getElementById: () => ({
        prepend: () => {}
    }),
    createElement: () => ({
        className: '',
        innerHTML: ''
    })
};

class MockAIFilter {
    async init() {}
    isReliable = true;
    async predict() { return { confidence: 0.8, regime: 'Trending' }; }
    addSample() {}
}

class MockAdaptiveOptimizer {
    reset() {}
    onTrade() {}
}

const sandbox = {
    window: mockWindow,
    document: mockDocument,
    AIFilter: MockAIFilter,
    AdaptiveOptimizer: MockAdaptiveOptimizer,
    console: console, // Use real console for logs
    TradingBot: null // Will be populated
};

// 3. Execute the code in the sandbox
vm.createContext(sandbox);
try {
    vm.runInContext(botCode, sandbox);
} catch (e) {
    console.error("Error executing bot.js in sandbox:", e);
    process.exit(1);
}

const TradingBot = sandbox.TradingBot;
if (!TradingBot) {
    console.error("TradingBot class not found in sandbox!");
    process.exit(1);
}

// 4. Instantiate the bot
const bot = new TradingBot({});

// Helper for assertions
function assertCloseTo(actual, expected, tolerance = 0.0001, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: expected ${expected}, got ${actual} (diff: ${actual - expected})`);
    }
}

console.log('--- Running calculateBollingerBands Tests ---');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ Passed: ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ Failed: ${name}`);
        console.error(e.message);
        failed++;
    }
}

// Test Case 1: Standard Calculation
runTest('Standard Calculation (Period=3, StdDev=2)', () => {
    const data = [10, 20, 30, 40, 50];
    const period = 3;
    const stdDev = 2;
    const result = bot.calculateBollingerBands(data, period, stdDev);

    assert.strictEqual(result.length, 5, 'Result length should match input length');

    // Index 0, 1 should be 0s (insufficient data)
    assert.strictEqual(result[0].middle, 0, 'Index 0 middle should be 0');
    assert.strictEqual(result[1].middle, 0, 'Index 1 middle should be 0');

    // Index 2 should be valid (if fixed) or 0 (current bug)
    // We expect it to be valid in correct implementation
    // For now, let's verify index 3 (4th element) which definitely should be valid

    // Index 3: window [20, 30, 40]
    // Mean = 30
    // SumSq = (20-30)^2 + (30-30)^2 + (40-30)^2 = 100 + 0 + 100 = 200
    // SD = sqrt(200/3) ≈ 8.1649658
    // Upper = 30 + 2 * 8.1649658 ≈ 46.3299
    // Lower = 30 - 2 * 8.1649658 ≈ 13.6701

    const r3 = result[3];
    assertCloseTo(r3.middle, 30, 0.001, 'Middle band at index 3');
    const expectedSd = Math.sqrt(200/3);
    assertCloseTo(r3.upper, 30 + 2 * expectedSd, 0.001, 'Upper band at index 3');
    assertCloseTo(r3.lower, 30 - 2 * expectedSd, 0.001, 'Lower band at index 3');
});

// Test Case 2: Flat Data (Zero Variance)
runTest('Flat Data (Zero Variance)', () => {
    const data = [100, 100, 100, 100, 100];
    const result = bot.calculateBollingerBands(data, 3, 2);

    const r3 = result[3];
    assertCloseTo(r3.middle, 100, 0.001, 'Middle band for flat data');
    assertCloseTo(r3.upper, 100, 0.001, 'Upper band for flat data'); // SD is 0
    assertCloseTo(r3.lower, 100, 0.001, 'Lower band for flat data');
});

// Test Case 3: Boundary Condition (Input Length == Period)
runTest('Boundary Condition (Input Length == Period)', () => {
    // Data length 3, Period 3. Index 2 (last element) should be valid.
    const data = [10, 20, 30];
    const period = 3;
    const result = bot.calculateBollingerBands(data, period, 2);

    // Expected at index 2:
    // Window [10, 20, 30] -> Mean 20, SD sqrt(200/3) ≈ 8.165

    const r2 = result[2];

    // This assertion will likely fail currently due to the off-by-one error
    if (r2.middle === 0) {
        throw new Error('Boundary condition failed: Last element (index 2) returned 0s but should be valid.');
    }

    assertCloseTo(r2.middle, 20, 0.001, 'Middle band at index 2');
});

// Test Case 4: Insufficient Data
runTest('Insufficient Data (Length < Period)', () => {
    const data = [10, 20];
    const period = 3;
    const result = bot.calculateBollingerBands(data, period, 2);

    result.forEach((r, i) => {
        assert.strictEqual(r.middle, 0, `Index ${i} should be 0`);
        assert.strictEqual(r.upper, 0, `Index ${i} should be 0`);
        assert.strictEqual(r.lower, 0, `Index ${i} should be 0`);
    });
});

console.log('--- Test Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    console.log('Some tests failed as expected (for now).');
    process.exit(1);
} else {
    console.log('All tests passed!');
    process.exit(0);
}
