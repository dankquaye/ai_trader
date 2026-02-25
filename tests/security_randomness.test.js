const fs = require('fs');
const vm = require('vm');
const path = require('path');

const botCode = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');

let cryptoCalled = false;
let randomCalled = false;

// Mock browser environment
const mockWindow = {
    botBalance: 1000,
    crypto: {
        getRandomValues: (array) => {
            cryptoCalled = true;
            for (let i = 0; i < array.length; i++) {
                array[i] = 128;
            }
            return array;
        }
    }
};

const mockDocument = {
    createElement: () => ({ innerHTML: '', className: '' }),
    getElementById: () => ({ prepend: () => {} })
};

const mockMath = Object.create(Math);
Object.defineProperty(mockMath, 'random', {
    value: () => {
        randomCalled = true;
        return 0.6;
    },
    writable: true,
    configurable: true
});

const sandbox = {
    window: mockWindow,
    document: mockDocument,
    console: console,
    AIFilter: class { init() {} },
    AdaptiveOptimizer: class {},
    Math: mockMath,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Uint8Array: Uint8Array
};

vm.createContext(sandbox);
vm.runInContext(botCode, sandbox);

// Instantiate Bot
vm.runInContext('var api = { placeTrade: () => {} }; this.bot = new TradingBot(api);', sandbox);

// Test
sandbox.bot.strategy = 'random';
const result = sandbox.bot.analyze();

let failed = false;

if (randomCalled) {
    console.error('FAIL: Math.random() was called.');
    failed = true;
} else {
    console.log('PASS: Math.random() was NOT called.');
}

if (cryptoCalled) {
    console.log('PASS: crypto.getRandomValues() was called.');
} else {
    console.error('FAIL: crypto.getRandomValues() was NOT called.');
    failed = true;
}

if (failed) {
    process.exit(1);
} else {
    process.exit(0);
}
