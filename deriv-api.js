// deriv-api.js - Robust WebSocket API Wrapper
// Implements: Auto-Reconnect (Exponential Backoff), State Restoration, Subscription Management

class DerivAPI {
    constructor() {
        this.ws = null;
        this.token = null;
        this.appId = null;
        this.accountType = 'demo';
        this.isConnected = false;
        this.msgHandlers = {};

        // Subscription Management
        this.activeSubscriptions = {
            ticks: null,
            candles: null
        };
        this.pendingRequests = {};

        // Reconnection Logic
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.baseReconnectDelay = 1000;
        this.pingInterval = null;
        this.latency = 0;

        this.debug = false;

        // Credentials
        this.credentials = {
            demo: { appId: 71238, token: '' },
            live: { appId: 71236, token: '' }
        };

        // Load Config
        if (typeof window.DerivConfig !== 'undefined') {
            if (window.DerivConfig.demo) {
                this.credentials.demo.appId = window.DerivConfig.demo.appId || 71238;
                this.credentials.demo.token = window.DerivConfig.demo.token;
            }
            if (window.DerivConfig.live) {
                this.credentials.live.appId = window.DerivConfig.live.appId || 71236;
                this.credentials.live.token = window.DerivConfig.live.token;
            }
        }
    }

    // --- Configuration ---

    setAccountType(type) {
        if (type !== 'demo' && type !== 'live') return;
        if (this.accountType === type && this.isConnected) return;

        this.accountType = type;
        this.disconnect();

        // Reset state for clean switch
        this.reconnectAttempts = 0;

        // Connect if credentials exist
        const creds = this.credentials[this.accountType];
        if (creds && creds.token) {
            this.connect();
        } else {
            console.warn(`[DerivAPI] No token for ${type}. Waiting for user input.`);
        }
    }

    setToken(token) {
        if (this.credentials[this.accountType]) {
            this.credentials[this.accountType].token = token;
        }
    }

    // --- Connection Lifecycle ---

    connect() {
        this.shouldReconnect = true;
        const creds = this.credentials[this.accountType];
        this.appId = creds.appId;
        this.token = creds.token;

        if (!this.token) {
            console.warn('[DerivAPI] Cannot connect: Missing Token');
            return;
        }

        const url = `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`;
        if(this.debug) console.log(`[DerivAPI] Connecting to ${this.accountType}...`);

        try {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => this._onOpen();
            this.ws.onmessage = (msg) => this._onMessage(msg);
            this.ws.onclose = () => this._onClose();
            this.ws.onerror = (err) => this._onError(err);
        } catch (e) {
            console.error('[DerivAPI] Socket Init Error:', e);
            this._scheduleReconnect();
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        this._stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    _onOpen() {
        if(this.debug) console.log('[DerivAPI] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // 1. Authorize
        this.authorize();
    }

    _onClose() {
        if(this.debug) console.log('[DerivAPI] Disconnected');
        this.isConnected = false;
        this._stopPing();
        if (this.shouldReconnect) {
            this._scheduleReconnect();
        }
    }

    _onError(err) {
        console.error('[DerivAPI] Error:', err);
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[DerivAPI] Max reconnect attempts reached. Giving up.');
            return;
        }

        const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
        if(this.debug) console.log(`[DerivAPI] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);

        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }

    // --- Messaging ---

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            // console.warn('[DerivAPI] Socket not ready, dropping:', data);
        }
    }

    _onMessage(msg) {
        try {
            const data = JSON.parse(msg.data);

            // Request Matching
            if (data.req_id || (data.echo_req && data.echo_req.req_id)) {
                const reqId = data.req_id || data.echo_req.req_id;
                if (this.pendingRequests[reqId]) {
                    const req = this.pendingRequests[reqId];
                    clearTimeout(req.timeoutId);
                    if (data.error) req.reject(new Error(data.error.message));
                    else req.resolve(data);
                    delete this.pendingRequests[reqId];
                    if (req.suppressGlobal) return;
                }
            }

            // Global Handlers
            if (data.error) {
                console.error('[DerivAPI] API Error:', data.error.message);
                if (this.msgHandlers['error']) this.msgHandlers['error'](data.error);
                return;
            }

            const type = data.msg_type;

            // Internal Handling
            if (type === 'authorize') {
                if(this.debug) console.log(`[DerivAPI] Authorized: ${data.authorize.email}`);
                this._restoreSubscriptions(); // Restore state after auth
                this._startPing();
            }

            // Dispatch
            if (this.msgHandlers[type]) {
                this.msgHandlers[type](type === 'tick' ? data.tick : (type === 'history' ? data.history : (type === 'candles' ? data.candles : data[type])));
            }

            // Special handling for contracts
            if (type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract.is_sold && this.msgHandlers['contract_finish']) {
                    this.msgHandlers['contract_finish'](contract);
                } else if (!contract.is_sold && this.msgHandlers['contract_update']) {
                    this.msgHandlers['contract_update'](contract);
                }
            }

        } catch (e) {
            console.error('[DerivAPI] Message Parse Error:', e);
        }
    }

    sendRequest(data, suppressGlobal = false) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) return reject(new Error('Not connected'));
            const reqId = Date.now() + Math.floor(Math.random() * 100000);
            data.req_id = reqId;

            const timeoutId = setTimeout(() => {
                if (this.pendingRequests[reqId]) {
                    delete this.pendingRequests[reqId];
                    reject(new Error('Request Timeout'));
                }
            }, 30000);

            this.pendingRequests[reqId] = { resolve, reject, suppressGlobal, timeoutId };
            this.send(data);
        });
    }

    // --- Actions ---

    authorize(token) {
        const t = token || this.token;
        if (!t) return;
        this.send({ authorize: t });
    }

    subscribeTicks(symbol) {
        if(this.activeSubscriptions.ticks === symbol) return; // Prevent duplicate

        // Forget previous if exists? Ideally yes, but simplified here.
        // We will just subscribe new.
        this.send({ ticks: symbol, subscribe: 1 });
        this.activeSubscriptions.ticks = symbol;
    }

    subscribeCandles(symbol, granularity) {
        // If same subscription exists, skip
        if(this.activeSubscriptions.candles &&
           this.activeSubscriptions.candles.symbol === symbol &&
           this.activeSubscriptions.candles.granularity === granularity) return;

        this.send({ ticks_history: symbol, end: 'latest', count: 100, style: 'candles', granularity: granularity, subscribe: 1 });
        this.activeSubscriptions.candles = { symbol, granularity };
    }

    _restoreSubscriptions() {
        this.send({ balance: 1, subscribe: 1 });
        if (this.activeSubscriptions.ticks) {
            this.send({ ticks: this.activeSubscriptions.ticks, subscribe: 1 });
        }
        if (this.activeSubscriptions.candles) {
            const c = this.activeSubscriptions.candles;
            this.send({ ticks_history: c.symbol, end: 'latest', count: 100, style: 'candles', granularity: c.granularity, subscribe: 1 });
        }
    }

    placeTrade(direction, amount, duration, symbol) {
        const req = {
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: direction === 'rise' ? 'CALL' : 'PUT',
            currency: 'USD',
            duration: duration,
            duration_unit: 't',
            symbol: symbol
        };
        this.send(req);
    }

    buyContract(id, price) {
        this.send({ buy: id, price: price });
    }

    subscribeContract(contractId) {
        this.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
    }

    getHistory(symbol, count = 100) {
        this.send({ ticks_history: symbol, adjust_start_time: 1, count: count, end: 'latest', style: 'ticks' });
    }

    fetchCandles(symbol, granularity) {
        return this.sendRequest({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 50,
            end: 'latest',
            style: 'candles',
            granularity: granularity
        }, true).then(resp => resp.candles || []);
    }

    // --- Ping/Pong ---

    _startPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            const start = Date.now();
            this.sendRequest({ ping: 1 }, true)
                .then(() => {
                    this.latency = Date.now() - start;
                    if(this.latency > 1000) console.warn(`[DerivAPI] High Latency: ${this.latency}ms`);
                })
                .catch(() => {});
        }, 15000);
    }

    _stopPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
    }

    on(type, callback) {
        this.msgHandlers[type] = callback;
    }
}

window.DerivAPI = DerivAPI;
