// deriv-api.js - Deriv WebSocket API Wrapper

/**
 * DerivAPI - Manages WebSocket connection and messaging
 */
class DerivAPI {
    constructor() {
        this.ws = null;
        this.token = null;
        this.appId = null;
        this.isConnected = false;
        this.msgHandlers = {};
        this.activeSymbol = 'R_100';
        this.streamIds = [];
        this.pendingRequests = {}; // Request matching

        // Auto-Recovery & Latency
        this.shouldReconnect = true;
        this.reconnectInterval = 2000;
        this.pingInterval = null;
        this.latency = 0;
        this.activeSubscriptions = {
            ticks: null,
            candles: null
        };

        // Credentials
        this.credentials = {
            demo: {
                appId: 71238,
                token: localStorage.getItem('deriv_token_demo') || null
            },
            live: {
                appId: 71236,
                token: localStorage.getItem('deriv_token_live') || null
            }
        };

        this.accountType = 'demo';
    }

    setToken(token) {
        if (this.credentials[this.accountType]) {
            this.credentials[this.accountType].token = token;
            localStorage.setItem(`deriv_token_${this.accountType}`, token);
        }
    }

    setAccountType(type) {
        if (type !== 'demo' && type !== 'live') return;
        this.accountType = type;
        this.disconnect();
        // Do not auto-connect if token is missing
        if (this.credentials[this.accountType].token) {
            this.connect();
        }
    }

    connect() {
        this.shouldReconnect = true;
        const creds = this.credentials[this.accountType];
        this.appId = creds.appId;
        this.token = creds.token;

        if (!this.token) {
            console.warn('Cannot connect: Missing API Token');
            return;
        }

        const url = `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`;
        console.log(`Connecting to ${this.accountType} account via ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket Connected');
            this.isConnected = true;
            this.authorize();
            // Reset bot state on reconnect to avoid stuck locks
            if (window.bot && typeof window.bot.resetState === 'function') {
                window.bot.resetState();
            }
        };

        this.ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                this.handleMessage(data);
            } catch (e) {
                console.error('WebSocket Message Error:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
            this.isConnected = false;
            this.streamIds = [];
            this.stopPing();

            if (this.shouldReconnect) {
                console.log(`Reconnecting in ${this.reconnectInterval}ms...`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Error', err);
        };
    }

    disconnect() {
        this.shouldReconnect = false;
        this.stopPing();
        if (this.ws) {
            this.ws.close();
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not ready. Cannot send:', data);
        }
    }

    /**
     * Send a request and wait for the response
     * @param {Object} data - Request payload
     * @param {boolean} suppressGlobal - If true, do not emit global events for this response
     * @returns {Promise<Object>}
     */
    sendRequest(data, suppressGlobal = false) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) return reject(new Error('Not connected'));
            const reqId = Date.now() + Math.floor(Math.random() * 1000);
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

    authorize() {
        this.send({ authorize: this.token });
    }

    startPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            const start = Date.now();
            this.sendRequest({ ping: 1 }, true)
                .then(() => {
                    this.latency = Date.now() - start;
                    if (this.latency > 1000) {
                        console.warn(`High Latency: ${this.latency}ms`);
                        if(this.msgHandlers['latency_warning']) this.msgHandlers['latency_warning'](this.latency);
                    }
                })
                .catch(() => {});
        }, 15000); // Check every 15s
    }

    stopPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
    }

    subscribeTicks(symbol) {
        this.send({ ticks: symbol, subscribe: 1 });
        this.activeSymbol = symbol;
        this.activeSubscriptions.ticks = symbol;
    }

    subscribeCandles(symbol, granularity) {
        this.send({ ticks_history: symbol, end: 'latest', count: 100, style: 'candles', granularity: granularity, subscribe: 1 });
        this.activeSubscriptions.candles = { symbol, granularity };
    }

    unsubscribeAll() {
        this.send({ forget_all: ['ticks', 'candles'] });
        this.streamIds = [];
        this.activeSubscriptions = { ticks: null, candles: null };
    }

    getHistory(symbol, count = 100) {
        this.send({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: count,
            end: 'latest',
            style: 'ticks'
        });
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

    placeTrade(direction, amount, duration, symbol) {
        const contractType = direction === 'rise' ? 'CALL' : 'PUT';

        const proposalReq = {
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            duration: duration,
            duration_unit: 't',
            symbol: symbol
        };

        this.pendingTrade = true;
        this.send(proposalReq);
    }

    handleMessage(data) {
        let suppressed = false;

        // Request Matching
        if (data.req_id && this.pendingRequests[data.req_id]) {
            const req = this.pendingRequests[data.req_id];
            clearTimeout(req.timeoutId);
            req.resolve(data);
            if (req.suppressGlobal) suppressed = true;
            delete this.pendingRequests[data.req_id];
        } else if (data.echo_req && data.echo_req.req_id && this.pendingRequests[data.echo_req.req_id]) {
            const req = this.pendingRequests[data.echo_req.req_id];
            clearTimeout(req.timeoutId);
            req.resolve(data);
            if (req.suppressGlobal) suppressed = true;
            delete this.pendingRequests[data.echo_req.req_id];
        }

        const msgType = data.msg_type;

        if (data.error) {
            console.error('API Error:', data.error.message);
             if (data.echo_req && data.echo_req.req_id && this.pendingRequests[data.echo_req.req_id]) {
                const req = this.pendingRequests[data.echo_req.req_id];
                clearTimeout(req.timeoutId);
                req.reject(new Error(data.error.message));
                delete this.pendingRequests[data.echo_req.req_id];
             }
            if (this.msgHandlers['error']) this.msgHandlers['error'](data.error);
            return;
        }

        if (suppressed) return;

        switch (msgType) {
            case 'authorize':
                console.log('Authorized:', data.authorize.email);
                if (this.msgHandlers['authorize']) this.msgHandlers['authorize'](data.authorize);
                this.send({ balance: 1, subscribe: 1 });
                this.startPing();
                break;

            case 'balance':
                if (this.msgHandlers['balance']) this.msgHandlers['balance'](data.balance);
                break;

            case 'tick':
                if (this.msgHandlers['tick']) this.msgHandlers['tick'](data.tick);
                break;

            case 'history':
                if (this.msgHandlers['history']) this.msgHandlers['history'](data.history);
                break;

            case 'ohlc':
                if (this.msgHandlers['ohlc']) this.msgHandlers['ohlc'](data.ohlc);
                break;

            case 'candles':
                if (this.msgHandlers['candles']) this.msgHandlers['candles'](data.candles);
                break;

            case 'proposal':
                if (this.pendingTrade) {
                    this.pendingTrade = false;
                    const id = data.proposal.id;
                    this.send({ buy: id, price: data.proposal.ask_price });
                }
                break;

            case 'buy':
                console.log('Trade placed:', data.buy);
                if (this.msgHandlers['buy']) this.msgHandlers['buy'](data.buy);

                const contractId = data.buy.contract_id;
                if(window.bot && window.bot.onTradePlaced) window.bot.onTradePlaced(contractId);

                this.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
                break;

            case 'proposal_open_contract':
                const contract = data.proposal_open_contract;
                const isSold = contract.is_sold;

                if (isSold) {
                    if (this.msgHandlers['contract_finish']) {
                        this.msgHandlers['contract_finish'](contract);
                    }
                } else {
                     if (this.msgHandlers['contract_update']) {
                         this.msgHandlers['contract_update'](contract);
                     }
                }
                break;
        }
    }

    on(type, callback) {
        this.msgHandlers[type] = callback;
    }
}
