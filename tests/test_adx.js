const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Read bot.js
const botCode = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');

// Mock Globals
const mockWindow = {
    botBalance: 1000,
    DerivAPI: class {},
    TradingBot: null,
    AIFilter: class {
        init() { return Promise.resolve(); }
        isReliable() { return true; }
    },
    AdaptiveOptimizer: class {
        reset() {}
        onTrade() {}
    },
    document: {
        getElementById: () => ({
            prepend: () => {},
            innerHTML: ''
        }),
        createElement: () => ({
            className: '',
            innerHTML: ''
        })
    },
    console: console,
    updateWatchdogStatus: () => {},
    updateRecoveryStatus: () => {},
    updateTradeHistory: () => {},
    saveSettings: () => {}
};

mockWindow.window = mockWindow; // Simulate browser global window

// Create Context
const context = vm.createContext(mockWindow);

// Expose TradingBot to global scope in sandbox so we can access it
// By default, top-level classes in a script run in vm are not automatically added to the context object unless assigned to window/global
// But in browser JS, `class X` at top level is global.
// We can append `window.TradingBot = TradingBot;` to the code.
const codeToRun = botCode + '\nwindow.TradingBot = TradingBot;';

try {
    vm.runInContext(codeToRun, context);
} catch (e) {
    console.error("Error loading bot.js:", e);
    process.exit(1);
}

const TradingBot = mockWindow.TradingBot;
const bot = new TradingBot(new mockWindow.DerivAPI());

console.log("TradingBot loaded successfully.");

// --- Tests ---

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

function assertDeepEqual(actual, expected, message) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr === expStr) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        console.error(`   Expected: ${expStr}`);
        console.error(`   Actual:   ${actStr}`);
        failed++;
    }
}

function assertClose(actual, expected, tolerance = 0.01, message) {
    if (Math.abs(actual - expected) < tolerance) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        console.error(`   Expected: ${expected} +/- ${tolerance}`);
        console.error(`   Actual:   ${actual}`);
        failed++;
    }
}

// Test 1: Function Existence
assert(typeof bot.calculateADX === 'function', 'calculateADX is a function');

// Test 2: Basic Structure (Length & Nulls)
// Data: 20 points
const data20 = Array.from({length: 20}, (_, i) => 10 + i); // 10, 11, ... 29
const period14 = 14;
const adx20 = bot.calculateADX(data20, period14);

// Expected length: 20 - 1 = 19 (because of `tr` calculation starts at i=1)
// Wait, calculateSMA returns array of length `data.length`.
// `tr` has length `data.length - 1`.
// So `adx` has length `data.length - 1`.
// Final SMA has length `adx.length` = `data.length - 1`.
// So result length is 19.
assert(adx20.length === 19, `Output length for 20 inputs should be 19. Got ${adx20.length}`);

// First `period - 1` elements should be null (from final SMA)
// Wait, `sTR` has nulls for 0..12.
// `adx` replaces them with 0.
// Then `calculateSMA(adx, period)` is called.
// This introduces nulls for 0..12.
// So result[0..12] should be null.
// result[13] should be a number.
for(let i=0; i<13; i++) {
    assert(adx20[i] === null, `Index ${i} should be null`);
}
assert(typeof adx20[13] === 'number', `Index 13 should be a number. Got ${adx20[13]}`);

// Test 3: Value Range (0-100)
const randomData = Array.from({length: 50}, () => Math.random() * 100);
const adxRandom = bot.calculateADX(randomData, 14);
const validAdx = adxRandom.filter(x => x !== null);
const inRange = validAdx.every(x => x >= 0 && x <= 100);
assert(inRange, 'All ADX values should be between 0 and 100');

// Test 4: Flat Data (Zero ADX)
const flatData = Array.from({length: 20}, () => 100);
const adxFlat = bot.calculateADX(flatData, 14);
// `tr` will be all 0s.
// `sTR` will be all 0s (after nulls).
// `adx` calculation: `if(!sTR[i]) { adx.push(0); continue; }`
// So `adx` array will be all 0s.
// Final SMA of 0s is 0.
// So result should be nulls then 0s.
const validFlat = adxFlat.filter(x => x !== null);
const allZero = validFlat.every(x => x === 0);
assert(allZero, 'Flat data should result in 0 ADX');

// Test 5: Manual Calculation Verification
// Data: [10, 12, 11, 13, 15] (5 elements)
// Period: 2
const dataSmall = [10, 12, 11, 13, 15];
const periodSmall = 2;
const adxSmall = bot.calculateADX(dataSmall, periodSmall);

// Expected Trace:
// tr: [|12-10|=2, |11-12|=1, |13-11|=2, |15-13|=2] -> [2, 1, 2, 2]
// dmPlus: [12>10?2:0, 11>12?0:0, 13>11?2:0, 15>13?2:0] -> [2, 0, 2, 2]
// dmMinus: [12<10?0:0, 11<12?1:0, 13<11?0:0, 15<13?0:0] -> [0, 1, 0, 0]

// SMA(period 2) of tr (sTR):
// i=0: null
// i=1: (2+1)/2 = 1.5
// i=2: (1+2)/2 = 1.5
// i=3: (2+2)/2 = 2.0
// sTR: [null, 1.5, 1.5, 2.0]

// SMA(period 2) of dmPlus (sPlus):
// i=0: null
// i=1: (2+0)/2 = 1.0
// i=2: (0+2)/2 = 1.0
// i=3: (2+2)/2 = 2.0
// sPlus: [null, 1.0, 1.0, 2.0]

// SMA(period 2) of dmMinus (sMinus):
// i=0: null
// i=1: (0+1)/2 = 0.5
// i=2: (1+0)/2 = 0.5
// i=3: (0+0)/2 = 0.0
// sMinus: [null, 0.5, 0.5, 0.0]

// ADX Array Calculation:
// i=0: sTR=null -> 0
// i=1: sTR=1.5, sPlus=1.0, sMinus=0.5.
//      diPlus = 100 * 1.0 / 1.5 = 66.666...
//      diMinus = 100 * 0.5 / 1.5 = 33.333...
//      dx = 100 * |66.66 - 33.33| / (66.66 + 33.33) = 100 * 33.33 / 100 = 33.333...
// i=2: sTR=1.5, sPlus=1.0, sMinus=0.5. dx = 33.333...
// i=3: sTR=2.0, sPlus=2.0, sMinus=0.0.
//      diPlus = 100 * 2.0 / 2.0 = 100
//      diMinus = 0
//      dx = 100 * |100 - 0| / 100 = 100
// ADX Array: [0, 33.333..., 33.333..., 100]

// Final SMA(period 2) of ADX Array:
// i=0: null
// i=1: (0 + 33.333)/2 = 16.666...
// i=2: (33.333 + 33.333)/2 = 33.333...
// i=3: (33.333 + 100)/2 = 66.666...

// Expected Result: [null, 16.666..., 33.333..., 66.666...]

// Verify length
assert(adxSmall.length === 4, `Small test length should be 4. Got ${adxSmall.length}`);

// Verify values
assert(adxSmall[0] === null, 'adxSmall[0] should be null');
assertClose(adxSmall[1], 16.666, 0.01, 'adxSmall[1] should be ~16.66');
assertClose(adxSmall[2], 33.333, 0.01, 'adxSmall[2] should be ~33.33');
assertClose(adxSmall[3], 66.666, 0.01, 'adxSmall[3] should be ~66.66');


console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
