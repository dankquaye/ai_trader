const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Read bot.js source
const botSource = fs.readFileSync(path.join(__dirname, '../bot.js'), 'utf8');

// Mock browser environment
const sandbox = {
    window: {},
    document: {
        getElementById: () => null,
        createElement: () => ({ className: '', innerHTML: '' })
    },
    console: console,
    AIFilter: class {
        async init() {}
    },
    AdaptiveOptimizer: class {
        reset() {}
    },
    Date: Date,
    Math: Math,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Map: Map
};

// Execute bot.js in sandbox
vm.createContext(sandbox);
vm.runInContext(botSource + '\nwindow.TradingBot = TradingBot;', sandbox);

// Expose TradingBot
const TradingBot = sandbox.window.TradingBot;

function verify() {
    const apiMock = { latency: 100 };
    const bot = new TradingBot(apiMock);

    // Fill with dummy candles
    const candles = [];
    let price = 1000;
    let seed = 12345;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    for (let i = 0; i < 500; i++) {
        price = price * (1 + (random() - 0.5) * 0.001);
        candles.push({
            time: 1000000 + i * 60,
            open: price,
            high: price * 1.001,
            low: price * 0.999,
            close: price * 1.0005
        });
    }

    bot.candles1m = candles;

    const seq = bot.extractSequence(bot.candles1m.length - 1, 10);

    // Output result for diffing
    console.log(JSON.stringify(seq, null, 2));
}

verify();
