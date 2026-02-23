const fs = require('fs');
const vm = require('vm');
const path = require('path');

// --- Mock DOM ---
class Element {
    constructor(tagName) {
        this.tagName = tagName;
        this.className = '';
        this.innerHTML = '';
        this.textContent = '';
        this.innerText = '';
        this.style = {};
        this.value = '';
        this.checked = false;
        this.children = [];
        this.parentNode = null;
        this.dataset = {};
        this.disabled = false;
        this.listeners = {};
        this.classList = {
            add: (cls) => this.className += ' ' + cls,
            remove: (cls) => this.className = this.className.replace(cls, ''),
            contains: (cls) => this.className.includes(cls),
            toggle: (cls) => this.className.includes(cls) ? this.className.replace(cls, '') : this.className += ' ' + cls
        };
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        // Basic innerHTML update simulation (very naive)
        this.innerHTML += child.outerHTML || '';
        return child;
    }

    querySelector(selector) {
        return new Element('div'); // Dummy return
    }

    querySelectorAll(selector) {
        return [new Element('div')]; // Dummy return
    }

    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }

    dispatchEvent(event) {}

    remove() {}
}

const document = {
    createElement: (tag) => new Element(tag),
    getElementById: (id) => new Element('div'),
    querySelectorAll: (sel) => [new Element('div')],
    body: new Element('body'),
    addEventListener: () => {},
};

document.body.classList = { add: () => {}, remove: () => {} };

const window = {
    document: document,
    console: console,
    location: { href: '' },
    localStorage: { getItem: () => null, setItem: () => {} },
    AudioContext: class { state='suspended'; resume(){} createOscillator(){return {connect:()=>{}, start:()=>{}, stop:()=>{}, frequency:{setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{}}}}},
    webkitAudioContext: class {},
    ResizeObserver: class { observe(){} },
    setInterval: () => {},
    setTimeout: (cb) => cb(), // Execute immediately for test
    clearInterval: () => {},
    LightweightCharts: { createChart: () => ({ addLineSeries: () => ({ setData: () => {} }), timeScale: () => ({ fitContent: () => {} }), resize: () => {} }) },
    alert: (msg) => console.log('ALERT:', msg),
    onerror: null,
};

window.window = window;
window.self = window;

// --- Mock Classes ---
class DerivAPI {
    on() {}
    subscribeTicks() {}
    subscribeCandles() {}
    getHistory() {}
}
window.DerivAPI = DerivAPI;

class TradingBot {
    constructor() {
        this.tradeHistory = [];
        this.isRunning = false;
        this.setBacktestMode = () => {};
        this.stop = () => {};
        this.updateConfig = () => {};
        this.setDuration = () => {};
        this.start = () => {};
    }
}
window.TradingBot = TradingBot;

class Backtester {
    async run() {
        // Return malicious data
        return {
            results: { totalTrades: 1, winRate: 100, totalProfit: 10, maxDrawdown: 0 },
            trades: [{
                time: '12:00:00',
                type: '<img src=x onerror=alert("XSS")>', // Malicious payload
                entry: 100,
                exit: 110,
                result: 'WIN',
                profit: 10
            }],
            equity: []
        };
    }
}
window.Backtester = Backtester;
window.backtester = new Backtester();

// --- Load app.js ---
const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// We need to expose ui.backtest.logBody to check its content
// Since ui is not global in app.js (it's const ui = ...), we can't access it easily from outside unless we attach it to window or intercept it.
// However, we can mock getElementById to return a specific object for 'bt-log-body' and hold a reference to it.

const logBody = new Element('tbody');
const originalGetElementById = document.getElementById;
document.getElementById = (id) => {
    if (id === 'bt-log-body') return logBody;
    // Return other mocks
    const el = new Element('div');
    if (id === 'api-token-input' || id === 'duration' || id === 'stake' || id === 'martingale-multiplier' || id === 'take-profit' || id === 'stop-loss' || id === 'adx-threshold') {
        el.value = '10';
    }
    if (id === 'bot-strategy') el.value = 'ultra_instinct';
    if (id === 'bt-asset') el.value = 'R_100';
    if (id === 'bt-count') el.value = '100';

    // Checkbox mocks
    if (id === 'use-martingale' || id === 'use-smart-risk' || id === 'use-filter' || id === 'avoid-squeeze' || id === 'auto-select-asset' || id === 'use-ai-filter' || id === 'lock-params') {
         el.checked = false;
    }

    return el;
};

// Execute app.js
vm.createContext(window);
vm.runInContext(appCode, window);

// Trigger the vulnerability
// runBacktest is a global function in app.js scope (which is window in vm)
// Wait, runBacktest is async.
(async () => {
    try {
        console.log("Running Backtest...");
        await window.runBacktest();

        console.log("Backtest complete.");

        // Inspect logBody.children
        // app.js appends tr elements.
        // We want to check the innerHTML of the tr.

        const rows = logBody.children;
        if (rows.length === 0) {
            console.error("No rows added!");
            process.exit(1);
        }

        const row = rows[0];
        console.log("Row innerHTML:", row.innerHTML);
        console.log("Row children count:", row.children.length);

        // Check for XSS
        // Case 1: innerHTML was set directly (Vulnerable code path in mock)
        if (row.innerHTML.includes('<img src=x onerror=alert("XSS")>')) {
             // If children is empty, it means innerHTML was assigned directly with the payload.
             // In a real browser this parses to HTML.
             if (row.children.length === 0) {
                 console.log("VULNERABILITY CONFIRMED: Malicious HTML string assigned to innerHTML.");
             } else {
                 // If children exist, we need to check if they are safely set.
                 // But my mock implementation of appendChild naively updates innerHTML which might confuse this check if not careful.
                 // Let's check the children directly.
                 checkChildren(row);
             }
        } else {
             // innerHTML might be empty or constructed safely. Check children.
             if (row.children.length > 0) {
                 checkChildren(row);
             } else {
                 console.log("SAFE (or empty): No malicious HTML in innerHTML and no children.");
             }
        }

        function checkChildren(row) {
             // The type is in the 2nd cell (index 1)
             const cells = row.children;
             if (cells.length > 1) {
                 const typeCell = cells[1];
                 console.log("Type Cell TextContent:", typeCell.textContent);
                 if (typeCell.textContent === '<img src=x onerror=alert("XSS")>') {
                     console.log("SAFE: Payload treated as text content.");
                 } else {
                     console.log("UNKNOWN: Payload not found in textContent.");
                 }
             } else {
                 console.log("WARN: Not enough cells found.");
             }
        }

    } catch (e) {
        console.error("Error running backtest:", e);
    }
})();
