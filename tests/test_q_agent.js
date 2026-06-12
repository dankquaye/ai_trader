const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Read the source code
const aiFilterPath = path.join(__dirname, '../ai-filter.js');
const code = fs.readFileSync(aiFilterPath, 'utf8');

// 2. Prepare the sandbox
const sandbox = {
    window: {},
    console: console,
    tf: {}, // Mock tf just in case
    Math: {
        random: () => Math.random(),
        floor: Math.floor,
        max: Math.max,
        min: Math.min,
        abs: Math.abs,
        pow: Math.pow,
        sqrt: Math.sqrt
    }
};

// 3. Create context
vm.createContext(sandbox);

// 4. Modify code to expose QLAgent
const modifiedCode = code + ';\nwindow.QLAgent = QLAgent;';

// 5. Execute
try {
    vm.runInContext(modifiedCode, sandbox);
} catch (e) {
    console.error("Error executing ai-filter.js:", e);
    process.exit(1);
}

const QLAgent = sandbox.window.QLAgent;

// 6. Test Runner Helper
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(e);
        failed++;
    }
}

// 7. Tests

console.log("Running QLAgent tests...");

test('Initialization', () => {
    const agent = new QLAgent();
    assert.strictEqual(agent.alpha, 0.1, 'Alpha should be 0.1');
    assert.strictEqual(agent.gamma, 0.9, 'Gamma should be 0.9');
    assert.strictEqual(agent.epsilon, 0.1, 'Epsilon should be 0.1');
    assert.deepStrictEqual(Array.from(agent.actions), [0, 1, 2], 'Actions should be [0, 1, 2]');
    assert.deepStrictEqual({...agent.qTable}, {}, 'Q-Table should be empty');
});

test('Get State Key', () => {
    const agent = new QLAgent();
    const key = agent.getStateKey([1, 2]);
    assert.strictEqual(key, "1-2", "State key format should be 'regime-conf'");
});

test('Get Q (Initialization)', () => {
    const agent = new QLAgent();
    const q = agent.getQ([1, 2]);
    assert.deepStrictEqual(Array.from(q), [0, 0, 0], 'Should initialize new state with zeros');
    assert.deepStrictEqual(Array.from(agent.qTable["1-2"]), [0, 0, 0], 'Should store in qTable');
});

test('Get Action (Exploitation)', () => {
    const agent = new QLAgent();
    agent.epsilon = 0; // Force exploitation

    // Set up Q-values manually
    const state = [1, 2];
    const key = agent.getStateKey(state);
    agent.qTable[key] = [0.1, 0.5, 0.2]; // Action 1 is best

    // Check if exploit works
    const action = agent.getAction(state);
    assert.strictEqual(action, 1, 'Should choose action with highest Q-value');
});

test('Get Action (Exploration)', () => {
    const agent = new QLAgent();
    agent.epsilon = 1; // Force exploration

    const originalRandom = sandbox.Math.random;

    // Test index 0
    let callCount = 0;
    sandbox.Math.random = () => {
        callCount++;
        if (callCount === 1) return 0.5; // < 1 (epsilon), enter if
        return 0.1; // 0.1 * 3 = 0.3 -> floor -> 0
    };

    let action = agent.getAction([1, 2]);
    assert.strictEqual(action, 0, 'Should return random action 0');

    // Test index 2
    callCount = 0;
    sandbox.Math.random = () => {
        callCount++;
        if (callCount === 1) return 0.5;
        return 0.9; // 0.9 * 3 = 2.7 -> floor -> 2
    };

    action = agent.getAction([1, 2]);
    assert.strictEqual(action, 2, 'Should return random action 2');

    // Restore
    sandbox.Math.random = originalRandom;
});

test('Learn (Q-Update)', () => {
    const agent = new QLAgent();
    agent.alpha = 0.5;
    const state = [1, 2];
    const action = 1;
    const reward = 10;

    // Initial Q: [0, 0, 0]
    // Q[action] = currentQ + alpha * (reward - currentQ)
    // Q[1] = 0 + 0.5 * (10 - 0) = 5

    agent.learn(state, action, reward);
    const q = agent.getQ(state);
    assert.strictEqual(q[1], 5, 'Q-value should update correctly');

    // Update again
    // Q[1] = 5 + 0.5 * (-2 - 5) = 5 + 0.5 * (-7) = 5 - 3.5 = 1.5
    agent.learn(state, action, -2);
    const q2 = agent.getQ(state);
    assert.strictEqual(q2[1], 1.5, 'Q-value should update correctly on second step');
});

if (failed > 0) {
    console.log(`\nTests failed: ${failed}`);
    process.exit(1);
} else {
    console.log(`\nAll ${passed} tests passed!`);
}
