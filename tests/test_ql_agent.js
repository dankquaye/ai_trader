const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Read the source file
const aiFilterPath = path.join(__dirname, '../ai-filter.js');
const aiFilterCode = fs.readFileSync(aiFilterPath, 'utf8');

// Mock browser globals
const sandbox = {
    window: {},
    console: console,
    tf: {
        sequential: () => ({ add: () => {}, compile: () => {}, predict: () => ({ dataSync: () => [0] }) }),
        layers: {
            lstm: () => {},
            dropout: () => {},
            dense: () => {}
        },
        train: {
            adam: () => {}
        },
        tensor3d: () => {},
        tensor2d: () => {},
        tidy: (fn) => fn()
    }
};

// Create a context
vm.createContext(sandbox);

// Execute the code
const scriptCode = aiFilterCode + ';\nthis.QLAgent = QLAgent;';
vm.runInContext(scriptCode, sandbox);

const QLAgent = sandbox.QLAgent;

console.log('Running QLAgent tests...');

try {
    // Test 1: Initialization
    const agent = new QLAgent();
    assert.strictEqual(agent.alpha, 0.1, 'Default alpha should be 0.1');

    // Check if qTable is empty. Use Object.keys to avoid cross-context object identity issues
    assert.strictEqual(Object.keys(agent.qTable).length, 0, 'Initial Q-table should be empty');
    console.log('✅ Initialization passed');

    // Test 2: Learn - New State
    const state1 = [0, 0];
    const action1 = 0; // Tighten
    const reward1 = 1; // Win

    agent.learn(state1, action1, reward1);

    const key1 = agent.getStateKey(state1);
    const qs1 = agent.qTable[key1];

    assert(qs1, 'State should exist in Q-table');
    assert.strictEqual(qs1.length, 3, 'Q-values array should have 3 actions');

    const closeTo = (actual, expected, tolerance = 0.0001) => Math.abs(actual - expected) < tolerance;

    assert(closeTo(qs1[0], 0.1), `Expected Q[0] to be 0.1, got ${qs1[0]}`);
    assert.strictEqual(qs1[1], 0, 'Other actions should remain 0');
    assert.strictEqual(qs1[2], 0, 'Other actions should remain 0');
    console.log('✅ Learn (New State) passed');

    // Test 3: Learn - Update Existing State
    const reward2 = 1;
    // newQ = 0.1 + 0.1 * (1 - 0.1) = 0.19
    agent.learn(state1, action1, reward2);

    const qs2 = agent.qTable[key1];
    assert(closeTo(qs2[0], 0.19), `Expected Q[0] to be 0.19, got ${qs2[0]}`);
    console.log('✅ Learn (Update State) passed');

    // Test 4: Learn - Different Action
    const action2 = 2; // Loosen
    const reward3 = -1; // Loss
    // newQ = 0 + 0.1 * (-1 - 0) = -0.1
    agent.learn(state1, action2, reward3);

    const qs3 = agent.qTable[key1];
    assert(closeTo(qs3[0], 0.19), 'Action 0 should not change');
    assert(closeTo(qs3[2], -0.1), `Expected Q[2] to be -0.1, got ${qs3[2]}`);
    console.log('✅ Learn (Different Action) passed');

    // Test 5: Verify getAction uses the learned values
    agent.epsilon = 0;
    const chosenAction = agent.getAction(state1);
    assert.strictEqual(chosenAction, 0, 'Should choose action with highest Q-value');
    console.log('✅ getAction (Exploit) passed');

    // Test 6: Verify getAction with negative values
    // Create a NEW state to avoid conflict with previous test
    const state2 = [1, 1];
    // We can manually set the Q-table for this test to ensure precise values
    // But let's use learn() to be integration-style

    // We want Q values: [-0.1, -0.05, -0.2]
    // To get -0.1: learn(..., -1) -> 0.1 * -1 = -0.1
    agent.learn(state2, 0, -1);

    // To get -0.05: learn(..., -0.5) -> 0.1 * -0.5 = -0.05
    agent.learn(state2, 1, -0.5);

    // To get -0.2: learn(..., -2) -> 0.1 * -2 = -0.2
    agent.learn(state2, 2, -2);

    // Verify values first
    const key2 = agent.getStateKey(state2);
    const qsNegative = agent.qTable[key2];

    // Debug output if fails
    // console.log('Negative QS:', qsNegative);

    assert(closeTo(qsNegative[0], -0.1));
    assert(closeTo(qsNegative[1], -0.05));
    assert(closeTo(qsNegative[2], -0.2));

    const chosenActionNegative = agent.getAction(state2);
    assert.strictEqual(chosenActionNegative, 1, 'Should choose action with highest Q-value (-0.05 is > -0.1)');
    console.log('✅ getAction (Negative Values) passed');


} catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
}

console.log('🎉 All tests passed!');
