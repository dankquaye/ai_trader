const window = {
    console: console,
    location: { hostname: 'localhost' },
    localStorage: { getItem: () => null, setItem: () => null },
    Notification: { permission: 'denied', requestPermission: async () => 'denied' },
    AudioContext: class {},
    webkitAudioContext: class {},
    document: {
        getElementById: () => ({ addEventListener: () => {}, classList: { remove: () => {}, add: () => {} }, checked: false, value: '' }),
        querySelectorAll: () => [],
        createElement: () => ({ innerHTML: '', classList: { add: () => {} }, style: {} }),
        body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {} },
        addEventListener: () => {}
    }
};
global.window = window;
global.document = window.document;
global.Notification = window.Notification;
global.localStorage = window.localStorage;

// Mock WebSocket
global.WebSocket = class {
    constructor() {}
    send() {}
    close() {}
};

try {
    // Load deriv-api.js
    const derivApiContent = require('fs').readFileSync('deriv-api.js', 'utf8');
    eval(derivApiContent); // This defines class DerivAPI in global scope (which is 'global' in node)

    // Check if DerivAPI is defined on window
    if (typeof window.DerivAPI === 'undefined') {
        console.error('DerivAPI is undefined on window!');
    } else {
        console.log('DerivAPI loaded successfully on window.');
        global.DerivAPI = window.DerivAPI;
    }

    // Load patterns.js
    const patternsContent = require('fs').readFileSync('patterns.js', 'utf8');
    eval(patternsContent);

     // Load ai-filter.js
    const aiFilterContent = require('fs').readFileSync('ai-filter.js', 'utf8');
    eval(aiFilterContent);
    global.AIFilter = window.AIFilter;

    // Load bot.js
    const botContent = require('fs').readFileSync('bot.js', 'utf8');
    eval(botContent);
    global.TradingBot = window.TradingBot;

    // Load app.js
    const appContent = require('fs').readFileSync('app.js', 'utf8');
    eval(appContent);

    console.log('All scripts loaded successfully.');

} catch (e) {
    console.error('Error loading scripts:', e);
}
