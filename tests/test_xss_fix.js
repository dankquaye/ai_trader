const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const mockElement = {
    classList: { add: () => {}, remove: () => {} },
    innerHTML: '',
    value: '',
    innerText: '',
    addEventListener: () => {},
    appendChild: () => {},
    querySelectorAll: () => [],
    style: {},
    setAttribute: () => {},
    click: () => {},
    parentNode: { removeChild: () => {} }
};

const mockModalBody = { ...mockElement, innerHTML: '' };
const mockHistoryTable = { ...mockElement, innerHTML: '', appendChild: (child) => {
    // Simulate appending to check its content. Child is a mock element with innerHTML property.
    mockHistoryTable.innerHTML += child.innerHTML;
}};

const mockDocument = {
    body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, removeChild: () => {} },
    getElementById: (id) => {
        if (id === 'modal-body') return mockModalBody;
        if (id === 'trade-history-body') return mockHistoryTable;
        return { ...mockElement };
    },
    querySelectorAll: () => [mockElement],
    createElement: (tag) => {
        if (tag === 'tr') return { ...mockElement, innerHTML: '', className: '' };
        if (tag === 'a') return { ...mockElement, setAttribute: () => {}, click: () => {} };
        if (tag === 'div') return { ...mockElement, className: '', innerHTML: '' };
        return { ...mockElement };
    },
    addEventListener: () => {}
};

const mockWindow = {
    document: mockDocument,
    console: console,
    setTimeout: (fn) => fn(), // Execute immediately to avoid hanging
    setInterval: () => {},    // Ignore intervals to avoid hanging
    AudioContext: class {
        constructor() { this.state = 'suspended'; }
        createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
        createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
        resume() {}
    },
    ResizeObserver: class { observe() {} },
    DerivAPI: class { on() {} subscribeTicks() {} subscribeCandles() {} getHistory() {} },
    TradingBot: class {
        constructor() {
            this.tradeHistory = [];
            this.activeContracts = new Map();
            this.gradeStats = { A: 0, B: 0, C: 0, D: 0, F: 0, Total: 0 };
        }
        setStrategyParams() {}
        getLearningState() {}
    },
    AIFilter: class {},
    Backtester: class {},
    AdaptiveOptimizer: class {},
    HTMLElement: class {},
    Event: class {},
    location: { href: '' },
    localStorage: { getItem: () => null, setItem: () => {} },
    alert: () => {},
};

mockWindow.window = mockWindow;
mockWindow.global = mockWindow;

const context = vm.createContext(mockWindow);

// Read and execute app.js
try {
    const code = fs.readFileSync('./app.js', 'utf8');
    vm.runInContext(code, context);
} catch (e) {
    console.error('Error loading app.js:', e);
    process.exit(1);
}

// Helper to check for XSS
function checkXSS(html, contextName) {
    if (html.includes('<img src=x onerror=alert(1)>')) {
        console.error(`FAIL: ${contextName} is vulnerable to XSS!`);
        console.error('Content:', html);
        return false;
    } else {
        console.log(`PASS: ${contextName} appears safe.`);
        if (!html.includes('&lt;img')) {
             console.warn(`WARNING: ${contextName} escaping check might be flawed or payload missing. Content:`, html);
        }
        return true;
    }
}

// Test openModal
console.log('--- Testing openModal XSS ---');
const bot = context.window.bot;

// Inject malicious trade
bot.tradeHistory.push({
    symbol: '<img src=x onerror=alert(1)>',
    status: 'WIN',
    profit: 100,
    grade: 'A',
    reasoning: { finalScore: 0.9 },
    time: '12:00:00',
    type: 'CALL',
    stake: 10
});

let openModalSafe = false;
try {
    // openModal is global function
    context.window.openModal(0);
    openModalSafe = checkXSS(mockModalBody.innerHTML, 'openModal');
} catch (e) {
    console.error('Error testing openModal:', e);
}

// Test updateTradeHistory
console.log('\n--- Testing updateTradeHistory XSS ---');
let updateHistorySafe = false;
try {
    // Reset mockHistoryTable
    mockHistoryTable.innerHTML = '';

    // updateTradeHistory is global function
    context.window.updateTradeHistory(bot.tradeHistory, 100, 1, 0);
    updateHistorySafe = checkXSS(mockHistoryTable.innerHTML, 'updateTradeHistory');

} catch (e) {
    console.error('Error testing updateTradeHistory:', e);
}

if (!openModalSafe || !updateHistorySafe) {
    console.log('\nVulnerability confirmed.');
    process.exit(1); // Fail
} else {
    console.log('\nAll checks passed.');
    process.exit(0); // Pass
}
