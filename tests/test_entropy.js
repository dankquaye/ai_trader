
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Mock browser environment
const sandbox = {
    window: {
        botBalance: 1000,
        TradingBot: null, // Will be set by bot.js execution
        AIFilter: class {
            async init() {}
            isReliable() { return false; }
        },
        AdaptiveOptimizer: class {
            reset() {}
            onTrade() {}
        },
        document: {
            getElementById: () => null,
            createElement: () => ({ style: {}, className: '', innerHTML: '' }),
        },
        console: console,
        alert: console.log,
        localStorage: {
            getItem: () => null,
            setItem: () => {}
        },
        location: { reload: () => {} }
    },
    document: {
        getElementById: () => null,
        createElement: () => ({ style: {}, className: '', innerHTML: '' }),
    },
    console: console,
    AIFilter: class {
        async init() {}
        isReliable() { return false; }
    },
    AdaptiveOptimizer: class {
        reset() {}
        onTrade() {}
    },
    Date: Date,
    Math: Math,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
};

// Read bot.js
let botCode = fs.readFileSync('../bot.js', 'utf8');
// Append export to window
botCode += '\nwindow.TradingBot = TradingBot;\n';

// Execute bot.js in sandbox
vm.createContext(sandbox);
try {
    vm.runInContext(botCode, sandbox);
} catch (e) {
    console.error("Error loading bot.js:", e);
    // Print first few lines of error stack
    console.error(e.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
}

// Extract TradingBot class
const TradingBot = sandbox.window.TradingBot;

if (!TradingBot) {
    console.error("TradingBot class not found in sandbox window.");
    process.exit(1);
}

// Create instance
const bot = new TradingBot({});

// --- Tests ---

function test_entropy() {
    console.log("Running Entropy Tests...");

    // Test 1: Insufficient Data (Empty)
    const candlesEmpty = [];
    const entropy1 = bot.calculateShannonEntropy(candlesEmpty, 10);
    // Assuming current implementation returns 0
    assert.strictEqual(entropy1, 0, "Should return 0 for empty candles");

    // Test 2: Insufficient Data (Short)
    const candlesShort = Array(5).fill({ close: 100 });
    // period 10, length 5. length < period + 1 (5 < 11). Should return 0.
    const entropy2 = bot.calculateShannonEntropy(candlesShort, 10);
    assert.strictEqual(entropy2, 0, "Should return 0 for insufficient candles (length < period + 1)");

    // Test 3: Constant Data (Zero Entropy)
    // If prices are constant, returns are log(1) = 0.
    // All returns are 0. Min=0, Max=0. BinSize=0.
    // Should return 0.
    const candlesConst = Array(50).fill({ close: 100 });
    const entropy3 = bot.calculateShannonEntropy(candlesConst, 30);
    assert.strictEqual(entropy3, 0, "Should return 0 for constant prices (binSize=0)");

    // Test 4: Known Pattern
    // Period = 4. BinCount = sqrt(4) = 2.
    // Returns: [-1, 1, -1, 1].
    // Min = -1, Max = 1. BinSize = (1 - (-1)) / 2 = 1.
    // Bin Indices:
    // -1 -> floor((-1 - -1)/1) = 0
    // 1  -> floor((1 - -1)/1) = 2
    // Counts: {0: 2, 2: 2}.
    // Note: The loop `for (const key in bins)` iterates over keys '0' and '2'.
    // Total count = 4.
    // p0 = 2/4 = 0.5. p2 = 2/4 = 0.5.
    // Entropy = -0.5*ln(0.5) - 0.5*ln(0.5) = -ln(0.5) = ln(2) = 0.693147...

    // Construct candles such that log returns are -1, 1, -1, 1.
    // p0 = 100
    // p1 = p0 * exp(-1)
    // p2 = p1 * exp(1) = p0
    // p3 = p2 * exp(-1) = p1
    // p4 = p3 * exp(1) = p0
    const candlesPattern = [
        { close: 100 },
        { close: 100 * Math.exp(-1) },
        { close: 100 },
        { close: 100 * Math.exp(-1) },
        { close: 100 }
    ];
    // verify log returns
    // 0: log(p1/p0) = -1
    // 1: log(p2/p1) = 1
    // 2: log(p3/p2) = -1
    // 3: log(p4/p3) = 1

    const entropy4 = bot.calculateShannonEntropy(candlesPattern, 4);
    const expectedEntropy = Math.log(2);

    // Floating point check
    assert(Math.abs(entropy4 - expectedEntropy) < 1e-9, `Expected ${expectedEntropy}, got ${entropy4}`);

    // Test 5: Random Data Consistency check (run twice same data)
    const candlesRandom = [];
    let p = 100;
    for (let i = 0; i < 100; i++) {
        p *= (1 + (Math.random() - 0.5) * 0.1);
        candlesRandom.push({ close: p });
    }
    const e1 = bot.calculateShannonEntropy(candlesRandom, 30);
    const e2 = bot.calculateShannonEntropy(candlesRandom, 30);
    assert.strictEqual(e1, e2, "Entropy should be deterministic");

    console.log("All Entropy Tests Passed!");
}

test_entropy();
