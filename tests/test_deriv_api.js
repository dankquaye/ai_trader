const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Read the source code
const apiSource = fs.readFileSync(path.join(__dirname, '../deriv-api.js'), 'utf8');

// 2. Define Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.sentMessages = [];
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;

        // Simulate async connection
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) this.onopen();
        }, 10);
    }

    send(data) {
        this.sentMessages.push(JSON.parse(data));
    }

    close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose();
    }

    // Helper to simulate receiving a message
    receiveMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }
}

MockWebSocket.OPEN = 1;

// 3. Create VM Context
const context = {
    WebSocket: MockWebSocket,
    console: {
        log: () => {}, // Suppress logs during tests
        warn: () => {},
        error: () => {}
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    window: {
        bot: {
            onTradePlaced: (id) => {}
        }
    },
    Date: Date,
    Math: Math
};

vm.createContext(context);

// 4. Run the API code to define the class in the context
// Append assignment to expose the class
vm.runInContext(apiSource + ';\nthis.DerivAPI = DerivAPI;', context);

const DerivAPI = context.DerivAPI;

// 5. Test Runner
async function runTests() {
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

    async function testAsync(name, fn) {
        try {
            await fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (e) {
            console.error(`❌ ${name}`);
            console.error(e);
            failed++;
        }
    }

    console.log('--- Starting DerivAPI Tests ---');

    test('Initialization', () => {
        const api = new DerivAPI();
        assert.strictEqual(api.appId, null);
        assert.strictEqual(api.isConnected, false);
        assert.strictEqual(api.accountType, 'demo');
    });

    await testAsync('Connection and Authorization', async () => {
        const api = new DerivAPI();
        api.setToken('test-token');
        api.connect();

        // Wait for connection simulation
        await new Promise(r => setTimeout(r, 20));

        assert.strictEqual(api.isConnected, true);
        assert(api.ws instanceof MockWebSocket);

        // Check if authorize message was sent
        const authMsg = api.ws.sentMessages.find(m => m.authorize);
        assert(authMsg, 'Should send authorize message on connect');
        assert.strictEqual(authMsg.authorize, 'test-token');
    });

    await testAsync('Send Request & Receive Response', async () => {
        const api = new DerivAPI();
        api.setToken('test-token');
        api.connect();
        await new Promise(r => setTimeout(r, 20));

        // Mock sending a request
        const reqPromise = api.sendRequest({ test_req: 1 });

        // Find the request ID from sent message
        const sentMsg = api.ws.sentMessages.find(m => m.test_req === 1);
        assert(sentMsg, 'Request should be sent');
        const reqId = sentMsg.req_id;
        assert(reqId, 'Request should have req_id');

        // Simulate response
        api.ws.receiveMessage({ req_id: reqId, msg_type: 'test_resp', echo_req: { req_id: reqId } });

        const response = await reqPromise;
        assert.strictEqual(response.msg_type, 'test_resp');
    });

    await testAsync('Subscription: Ticks', async () => {
         const api = new DerivAPI();
         api.setToken('token');
         api.connect();
         await new Promise(r => setTimeout(r, 20));

         api.subscribeTicks('R_100');
         const msg = api.ws.sentMessages.find(m => m.ticks === 'R_100');
         assert(msg, 'Should send tick subscription');
         assert.strictEqual(msg.subscribe, 1);
         assert.strictEqual(api.activeSymbol, 'R_100');
    });

    await testAsync('Subscription: Candles', async () => {
        const api = new DerivAPI();
        api.setToken('token');
        api.connect();
        await new Promise(r => setTimeout(r, 20));

        api.subscribeCandles('R_50', 60);
        const msg = api.ws.sentMessages.find(m => m.ticks_history === 'R_50' && m.style === 'candles');
        assert(msg, 'Should send candle subscription');
        assert.strictEqual(msg.granularity, 60);
        assert.strictEqual(msg.subscribe, 1);
   });

   await testAsync('Handle Message Events', async () => {
       const api = new DerivAPI();
       api.setToken('token');
       api.connect();
       await new Promise(r => setTimeout(r, 20));

       let tickReceived = null;
       api.on('tick', (t) => { tickReceived = t; });

       const tickData = { quote: 123.45, epoch: 10000 };
       api.ws.receiveMessage({ msg_type: 'tick', tick: tickData });

       // Compare properties as objects from different contexts fail strict equality
       assert.strictEqual(tickReceived.quote, tickData.quote);
       assert.strictEqual(tickReceived.epoch, tickData.epoch);
   });

   await testAsync('Place Trade', async () => {
       const api = new DerivAPI();
       api.setToken('token');
       api.connect();
       await new Promise(r => setTimeout(r, 20));

       api.placeTrade('rise', 10, 5, 'R_100');

       const proposalMsg = api.ws.sentMessages.find(m => m.proposal === 1);
       assert(proposalMsg, 'Should send proposal request');
       assert.strictEqual(proposalMsg.contract_type, 'CALL');
       assert.strictEqual(proposalMsg.amount, 10);
       assert.strictEqual(proposalMsg.duration, 5);
       assert.strictEqual(api.pendingTrade, true);

       // Simulate proposal response
       api.ws.receiveMessage({ msg_type: 'proposal', proposal: { id: 'contract-123', ask_price: 10 } });

       // Should automatically send buy request
       const buyMsg = api.ws.sentMessages.find(m => m.buy === 'contract-123');
       assert(buyMsg, 'Should send buy request after proposal');
       assert.strictEqual(api.pendingTrade, false);
   });

   await testAsync('Error Handling', async () => {
       const api = new DerivAPI();
       api.setToken('token');
       api.connect();
       await new Promise(r => setTimeout(r, 20));

       let errorReceived = null;
       api.on('error', (e) => { errorReceived = e; });

       const errorData = { code: 'InvalidToken', message: 'Invalid Token' };
       api.ws.receiveMessage({ msg_type: 'error', error: errorData });

       assert.strictEqual(errorReceived.code, errorData.code);
       assert.strictEqual(errorReceived.message, errorData.message);
   });

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();
