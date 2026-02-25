const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

// Read the optimizer.js file
const code = fs.readFileSync(path.join(__dirname, '../optimizer.js'), 'utf8');

// Prepare the sandbox environment
const sandbox = {
    window: {
        showToast: (msg, type) => {
            console.log(`[Toast] ${type}: ${msg}`);
        },
        updateHealthStatus: (rate) => {
            console.log(`[Health] ${rate}`);
        },
        updateUIStrategy: (strategy) => {
            console.log(`[UI] Strategy updated to ${strategy}`);
        },
    },
    console: console,
    Date: Date,
};

// Create the context
vm.createContext(sandbox);

// Execute the code and expose the class
// Appending assignment to expose the class since it's not exported
vm.runInContext(code + '; this.AdaptiveOptimizer = AdaptiveOptimizer;', sandbox);

const AdaptiveOptimizer = sandbox.AdaptiveOptimizer;

// Mock Bot structure
class MockBot {
    constructor() {
        this.params = {
            wTrend: 0.2, wMom: 0.2, wVol: 0.2, wNoise: 0.2, wAI: 0.2,
            confidenceThreshold: 0.8,
            volatilityThreshold: 0.8,
            noiseThreshold: 0.8,
            entropyClean: 0.9,
        };
        this.isParamLocked = false;
        this.isVirtualRecovery = false;
        this.marketCondition = 'Stable';
        this.strategy = 'normal';
    }

    stop() {
        console.log('[Bot] Stopped');
    }
}

// Test Suite
console.log('Running AdaptiveOptimizer tests...');

try {
    // --- Test 1: Initialization ---
    const bot = new MockBot();
    const optimizer = new AdaptiveOptimizer(bot);

    assert.strictEqual(optimizer.isActive, false, 'Optimizer should be inactive initially');
    assert.strictEqual(optimizer.winStreak, 0);
    assert.strictEqual(optimizer.lossStreak, 0);
    assert.strictEqual(optimizer.history.length, 0);
    console.log('✅ Test 1 Passed: Initialization');

    // --- Test 2: onTrade when inactive ---
    optimizer.onTrade(true, 'Stable');
    assert.strictEqual(optimizer.history.length, 0, 'Should not record trade when inactive');
    console.log('✅ Test 2 Passed: Inactive check');

    // --- Test 3: onTrade Win ---
    optimizer.reset(); // Sets isActive = true
    optimizer.onTrade(true, 'Stable');

    assert.strictEqual(optimizer.history.length, 1);
    assert.strictEqual(optimizer.history[0].isWin, true);
    assert.strictEqual(optimizer.winStreak, 1);
    assert.strictEqual(optimizer.lossStreak, 0);
    console.log('✅ Test 3 Passed: Win update');

    // --- Test 4: onTrade Loss ---
    // Reset to clear previous state cleanly or just continue
    // Let's continue from previous state: winStreak=1, lossStreak=0
    optimizer.onTrade(false, 'Stable');

    assert.strictEqual(optimizer.history.length, 2);
    assert.strictEqual(optimizer.history[1].isWin, false);
    assert.strictEqual(optimizer.winStreak, 0); // Reset on loss
    assert.strictEqual(optimizer.lossStreak, 1); // Incremented on loss
    console.log('✅ Test 4 Passed: Loss update');

    // --- Test 5: History Limit ---
    // Fill history to 50 (we already have 2)
    for (let i = 0; i < 48; i++) {
        optimizer.onTrade(true, 'Stable');
    }
    assert.strictEqual(optimizer.history.length, 50, 'History should have 50 items');

    // Add one more to trigger shift
    const now = Date.now();
    optimizer.onTrade(false, 'Choppy', 'test_exit');

    assert.strictEqual(optimizer.history.length, 50, 'History should remain capped at 50');
    assert.strictEqual(optimizer.history[49].exitReason, 'test_exit', 'Last item should be the new trade');
    // The first item (from Test 3) should have been shifted out.
    // Index 0 should now be the one from Test 4 (which was a loss)
    // Wait, let's trace:
    // [Win, Loss, Win...Win(48 times)] -> Total 50.
    // Add Loss.
    // Should be [Loss, Win...Win, Loss].

    // Actually, let's just verify the length. The implementation logic is:
    // push, then if > 50 shift.

    console.log('✅ Test 5 Passed: History limit');

    // --- Test 6: Auto-Correction Triggering (Basic) ---
    // Force a loss streak to trigger "Scenario 1: Loss Streak"
    // Current state: winStreak=0, lossStreak=1 (from the last trade in Test 5)
    // Add another loss
    const initialConfidence = bot.params.confidenceThreshold;
    optimizer.onTrade(false, 'Stable');

    // Now lossStreak should be 2.
    assert.strictEqual(optimizer.lossStreak, 2);

    // Check if confidenceThreshold increased (tightened)
    // Code: bot.params.confidenceThreshold = Math.min(0.98, bot.params.confidenceThreshold + 0.05);
    // Initial default 0.8. New should be 0.85.

    // Floating point comparison
    assert.ok(Math.abs(bot.params.confidenceThreshold - (initialConfidence + 0.05)) < 0.0001,
             `Confidence threshold should increase. Expected ~${initialConfidence + 0.05}, got ${bot.params.confidenceThreshold}`);

    console.log('✅ Test 6 Passed: Auto-correction trigger');

} catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
}

console.log('🎉 All tests passed successfully!');
