const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Load bot.js content
let botCode = fs.readFileSync('./bot.js', 'utf8');
botCode += '\nwindow.TradingBot = TradingBot;'; // Expose class to window

// Mock browser environment
const sandbox = {
    window: {},
    document: {
        getElementById: () => null,
        createElement: () => ({ className: '', innerHTML: '' }),
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Map: Map,
    // Mock AIFilter class
    AIFilter: class AIFilter {
        constructor() {}
        init() { return Promise.resolve(); }
    },
    // Mock AdaptiveOptimizer class (optional, but good practice)
    AdaptiveOptimizer: class AdaptiveOptimizer {
        constructor() {}
        reset() {}
    }
};

// Create context and run bot.js
vm.createContext(sandbox);
vm.runInContext(botCode, sandbox);

const TradingBot = sandbox.window.TradingBot;

console.log('🧪 Running tests for gradeTrade...');

// Instantiate bot with mock API
const mockApi = {};
const bot = new TradingBot(mockApi);

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${description}`);
        passed++;
    } catch (e) {
        console.error(`❌ FAIL: ${description}`);
        console.error(e.message);
        failed++;
    }
}

// Test Suite
test('Win with no reasoning should be B', () => {
    const grade = bot.gradeTrade(true, null);
    assert.strictEqual(grade, 'B');
});

test('Loss with no reasoning should be D', () => {
    const grade = bot.gradeTrade(false, null);
    assert.strictEqual(grade, 'D');
});

test('Win with High Score (>0.85) should be A+', () => {
    const grade = bot.gradeTrade(true, { finalScore: 0.86 });
    assert.strictEqual(grade, 'A+');
});

test('Win with Medium Score (>0.75 and <=0.85) should be A', () => {
    const grade = bot.gradeTrade(true, { finalScore: 0.80 });
    assert.strictEqual(grade, 'A');
});

test('Win with Low Score (<=0.75) should be B', () => {
    const grade = bot.gradeTrade(true, { finalScore: 0.70 });
    assert.strictEqual(grade, 'B');
});

test('Loss with High Score (>0.85) should be C', () => {
    const grade = bot.gradeTrade(false, { finalScore: 0.90 });
    assert.strictEqual(grade, 'C');
});

test('Loss with Medium Score (>0.75 and <=0.85) should be D', () => {
    const grade = bot.gradeTrade(false, { finalScore: 0.80 });
    assert.strictEqual(grade, 'D');
});

test('Loss with Low Score (<=0.75) should be F', () => {
    const grade = bot.gradeTrade(false, { finalScore: 0.60 });
    assert.strictEqual(grade, 'F');
});

// Boundary checks
test('Win with Score 0.85 should be A (boundary)', () => {
    const grade = bot.gradeTrade(true, { finalScore: 0.85 });
    assert.strictEqual(grade, 'A');
});

test('Win with Score 0.75 should be B (boundary)', () => {
    const grade = bot.gradeTrade(true, { finalScore: 0.75 });
    assert.strictEqual(grade, 'B');
});

test('Loss with Score 0.85 should be D (boundary)', () => {
    const grade = bot.gradeTrade(false, { finalScore: 0.85 });
    assert.strictEqual(grade, 'D');
});

test('Loss with Score 0.75 should be F (boundary)', () => {
    const grade = bot.gradeTrade(false, { finalScore: 0.75 });
    assert.strictEqual(grade, 'F');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
    process.exit(1);
}
