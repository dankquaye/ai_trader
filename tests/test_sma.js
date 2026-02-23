const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Mocks
const mockWindow = {
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

const mockAIFilter = class {
    init() {}
    isReliable() { return false; }
};

const mockAdaptiveOptimizer = class {
    reset() {}
};

const sandbox = {
    window: mockWindow,
    document: mockDocument,
    AIFilter: mockAIFilter,
    AdaptiveOptimizer: mockAdaptiveOptimizer,
    console: console
};

// Load bot.js
const botPath = path.join(__dirname, '../bot.js');
let botCode = fs.readFileSync(botPath, 'utf8');

// Expose TradingBot to window so we can access it from sandbox
botCode += '\nwindow.TradingBot = TradingBot;';

// Run in context
vm.createContext(sandbox);
vm.runInContext(botCode, sandbox);

const TradingBot = sandbox.window.TradingBot;
if (!TradingBot) {
    console.error("TradingBot class not found in sandbox.window!");
    process.exit(1);
}

// Instantiate bot (mock API can be null as we test calculateSMA)
const bot = new TradingBot(null);

console.log("Running calculateSMA tests...");
let passed = 0;
let failed = 0;

function assertDeepEqual(actual, expected, message) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr === expStr) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: ${expStr}`);
        console.error(`   Actual:   ${actStr}`);
        failed++;
    }
}

// Test Case 1: Simple SMA
const data1 = [10, 20, 30, 40, 50];
const period1 = 3;
// Expected:
// i=0: null (0 < 2)
// i=1: null (1 < 2)
// i=2: (30+20+10)/3 = 20
// i=3: (40+30+20)/3 = 30
// i=4: (50+40+30)/3 = 40
const expected1 = [null, null, 20, 30, 40];
const result1 = bot.calculateSMA(data1, period1);
assertDeepEqual(result1, expected1, "Simple SMA (period 3)");

// Test Case 2: Period equals length
const data2 = [1, 2, 3, 4, 5];
const period2 = 5;
// Expected: [null, null, null, null, (1+2+3+4+5)/5 = 3]
const expected2 = [null, null, null, null, 3];
const result2 = bot.calculateSMA(data2, period2);
assertDeepEqual(result2, expected2, "Period equals data length");

// Test Case 3: Period greater than length
const data3 = [1, 2];
const period3 = 5;
// Expected: [null, null] because i never reaches period-1 (4)
// Wait, loop goes 0..1. condition if (i < 4) continues.
// So pushes null for i=0, i=1.
const expected2_long = [null, null];
const result3 = bot.calculateSMA(data3, period3);
assertDeepEqual(result3, expected2_long, "Period greater than length");

// Test Case 4: Empty data
const data4 = [];
const period4 = 3;
const expected4 = [];
const result4 = bot.calculateSMA(data4, period4);
assertDeepEqual(result4, expected4, "Empty data");

// Test Case 5: Single element, period 1
const data5 = [100];
const period5 = 1;
// i=0: i < 0 is false. sum = data[0] = 100. res = 100/1 = 100.
const expected5 = [100];
const result5 = bot.calculateSMA(data5, period5);
assertDeepEqual(result5, expected5, "Single element, period 1");


console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
