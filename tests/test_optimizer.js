
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- 1. Load the Code to Test ---
const optimizerCode = fs.readFileSync(path.join(__dirname, '../optimizer.js'), 'utf8');

// Append assignment to window to expose the class in the sandbox
const wrappedCode = optimizerCode + "; window.AdaptiveOptimizer = AdaptiveOptimizer;";

// --- 2. Setup Mock Environment ---
const mockWindow = {
    showToast: (msg, type) => { /* console.log(`[Toast] ${type}: ${msg}`); */ },
    updateHealthStatus: (rate) => { /* console.log(`[Health] Rate: ${rate}`); */ },
    updateUIStrategy: (strat) => { /* console.log(`[Strategy] Switch to: ${strat}`); */ }
};

const sandbox = {
    window: mockWindow,
    console: console,
    Date: Date // Use real Date
};

vm.createContext(sandbox);
try {
    vm.runInContext(wrappedCode, sandbox);
} catch (e) {
    console.error("Error running code in sandbox:", e);
}

const AdaptiveOptimizer = sandbox.window.AdaptiveOptimizer || sandbox.AdaptiveOptimizer;

if (!AdaptiveOptimizer) {
    console.error("FAILED: AdaptiveOptimizer class not found in sandbox.");
    process.exit(1);
}

// --- 3. Test Runner Utilities ---
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function assertClose(actual, expected, tolerance = 0.0001, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message || "Assertion failed"}: Expected ${expected} (approx), got ${actual}`);
    }
}

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`✅ ${testName}`);
        passed++;
    } catch (error) {
        console.error(`❌ ${testName}`);
        console.error(`   ${error.message}`);
        failed++;
    }
}

// --- 4. Define Tests ---

console.log("Starting Tests for AdaptiveOptimizer...");

// Helper to create a fresh bot mock
function createMockBot() {
    return {
        params: {
            confidenceThreshold: 0.8,
            volatilityThreshold: 0.8,
            noiseThreshold: 0.8,
            wTrend: 0.2,
            wMom: 0.2,
            wVol: 0.2,
            wNoise: 0.2,
            wAI: 0.2,
            entropyClean: 0.9,
        },
        isParamLocked: false,
        isVirtualRecovery: false,
        marketCondition: 'Neutral',
        strategy: 'ultra_instinct',
        stopCalled: false,
        stop: function() { this.stopCalled = true; }
    };
}

runTest("Initialization", () => {
    const bot = createMockBot();
    const optimizer = new AdaptiveOptimizer(bot);

    assert(optimizer.bot === bot, "Bot reference should be stored");
    assert(optimizer.history.length === 0, "History should be empty");
    assert(optimizer.winStreak === 0, "Win streak should be 0");
    assert(optimizer.lossStreak === 0, "Loss streak should be 0");
    assert(optimizer.isActive === false, "Should be inactive initially");

    // Verify base params snapshot
    assert(optimizer.baseParams.confidenceThreshold === 0.8, "Base params should be copied");
    // Modify bot params to ensure deep copy (or at least shallow copy independent)
    bot.params.confidenceThreshold = 0.9;
    assert(optimizer.baseParams.confidenceThreshold === 0.8, "Base params should not change when bot params change");
});

runTest("Reset", () => {
    const bot = createMockBot();
    const optimizer = new AdaptiveOptimizer(bot);

    optimizer.history.push({ isWin: true });
    optimizer.winStreak = 5;
    optimizer.isActive = false;

    optimizer.reset();

    assert(optimizer.isActive === true, "Should be active after reset");
    assert(optimizer.history.length === 0, "History should be cleared");
    assert(optimizer.winStreak === 0, "Win streak should be reset");
});

runTest("OnTrade - Updates History & Streaks", () => {
    const bot = createMockBot();
    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.isActive = true;

    // Win
    optimizer.onTrade(true, 'Neutral');
    assert(optimizer.history.length === 1, "History length should be 1");
    assert(optimizer.history[0].isWin === true, "History item should be a win");
    assert(optimizer.winStreak === 1, "Win streak should increment");
    assert(optimizer.lossStreak === 0, "Loss streak should be 0");

    // Loss
    optimizer.onTrade(false, 'Neutral');
    assert(optimizer.history.length === 2, "History length should be 2");
    assert(optimizer.winStreak === 0, "Win streak should reset on loss");
    assert(optimizer.lossStreak === 1, "Loss streak should increment");
});

runTest("MonitorHealth - Critical Failure", () => {
    const bot = createMockBot();
    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.isActive = true;

    // Fill history with 20 losses
    for (let i = 0; i < 20; i++) {
        optimizer.history.push({ isWin: false, time: Date.now() });
    }

    // Trigger check (normally called inside onTrade, but we can call directly or via onTrade)
    optimizer.monitorHealth();

    assert(bot.stopCalled === true, "Bot.stop() should be called when win rate is 0%");
});

runTest("MonitorHealth - Healthy", () => {
    const bot = createMockBot();
    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.isActive = true;

    // Fill history with 20 wins
    for (let i = 0; i < 20; i++) {
        optimizer.history.push({ isWin: true, time: Date.now() });
    }

    optimizer.monitorHealth();

    assert(bot.stopCalled === false, "Bot.stop() should NOT be called when win rate is 100%");
});

runTest("Autocorrect - Scenario 0: Virtual Recovery (Stop Loss)", () => {
    const bot = createMockBot();
    bot.isVirtualRecovery = true;
    bot.marketCondition = 'Choppy';
    bot.params.wNoise = 0.2;
    bot.params.entropyClean = 0.9;

    const optimizer = new AdaptiveOptimizer(bot);
    // Mock normalizeWeights to test logic in isolation (prevents total sum normalization affecting raw checks)
    optimizer.normalizeWeights = () => {};
    optimizer.isActive = true;
    optimizer.lossStreak = 1; // Needs lossStreak > 0

    // NOTE: In the actual code, Scenario 3 (Choppy) runs AFTER Scenario 0 and overrides it.
    // To test Scenario 0 logic specifically, we must avoid triggering Scenario 3 override if possible,
    // OR we acknowledge that 'Choppy' triggers both.
    // However, Scenario 0 specific logic for 'Choppy' modifies wNoise.
    // Scenario 3 sets wNoise = 0.40.
    // So testing Scenario 0 with 'Choppy' is tricky because it gets overwritten.
    // Let's test the 'stop_loss' branch of Scenario 0 instead to verify that block runs.

    // Retrying with stop_loss branch
    bot.marketCondition = 'Neutral'; // Avoid Choppy override
    const exitReason = 'stop_loss';

    optimizer.autocorrect(exitReason);

    assertClose(bot.params.wVol, 0.30, 0.001, "wVol should increase by 0.10 (0.2+0.1)");
    assertClose(bot.params.volatilityThreshold, 0.85, 0.001, "volatilityThreshold should increase by 0.05");
});

runTest("Autocorrect - Scenario 1: Loss Streak >= 2 (Tighten)", () => {
    const bot = createMockBot();
    bot.params.confidenceThreshold = 0.80;
    bot.params.volatilityThreshold = 0.80;
    bot.params.wTrend = 0.2;

    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.normalizeWeights = () => {};
    optimizer.isActive = true;
    optimizer.lossStreak = 2;

    optimizer.autocorrect();

    assertClose(bot.params.confidenceThreshold, 0.85, 0.001, "confidenceThreshold should increase by 0.05");
    assertClose(bot.params.volatilityThreshold, 0.85, 0.001, "volatilityThreshold should increase by 0.05");
    assertClose(bot.params.wTrend, 0.25, 0.001, "wTrend should increase (safety shift)");
});

runTest("Autocorrect - Scenario 2: Win Streak >= 3 (Relax)", () => {
    const bot = createMockBot();
    bot.params.confidenceThreshold = 0.85;
    bot.marketCondition = 'Trending';
    bot.params.wTrend = 0.2;

    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.normalizeWeights = () => {};
    optimizer.isActive = true;
    optimizer.winStreak = 3;

    optimizer.autocorrect();

    assertClose(bot.params.confidenceThreshold, 0.84, 0.001, "confidenceThreshold should decrease by 0.01");
    assertClose(bot.params.wTrend, 0.21, 0.001, "wTrend should increase in Trending market");
});

runTest("Autocorrect - Scenario 3: Choppy Market Override", () => {
    const bot = createMockBot();
    bot.marketCondition = 'Choppy';
    bot.params.wNoise = 0.1;

    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.normalizeWeights = () => {};
    optimizer.isActive = true;

    optimizer.autocorrect();

    assertClose(bot.params.wNoise, 0.40, 0.001, "wNoise should be forced to 0.40 in Choppy market");
    assertClose(bot.params.wVol, 0.10, 0.001, "wVol should be forced to 0.10 in Choppy market");
});

runTest("Autocorrect - Strategy Rotation to Quantum", () => {
    const bot = createMockBot();
    bot.strategy = 'ultra_instinct';

    const optimizer = new AdaptiveOptimizer(bot);
    optimizer.isActive = true;
    optimizer.lossStreak = 4;

    optimizer.autocorrect();

    assert(bot.strategy === 'quantum', "Strategy should switch to 'quantum' after 4 losses");
});

// --- 5. Summary ---
console.log("\n--- Test Summary ---");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
