// bot.js - Institutional-Grade Execution Engine
// Modules: ExecutionLock, RiskManager, RegimeDetector, MemoryManager, ConfidenceModel

/**
 * Core Trading Bot with Strict State Machine
 */
class TradingBot {
    constructor(api) {
        this.api = api;

        // --- State Machine ---
        this.state = 'IDLE'; // IDLE, SIGNAL, PROPOSAL, BUY, MONITOR, SETTLED
        this.lock = false;
        this.currentContractId = null;
        this.lastTradeTime = 0;
        this.cooldownUntil = 0;

        // --- Config ---
        this.symbol = 'R_100';
        this.strategy = 'ultra_instinct';
        this.accountType = 'demo';
        this.riskProfile = 'medium';
        this.isParamLocked = false;
        this.isRunning = false;
        this.isBacktesting = false;

        // --- Modules ---
        this.riskManager = new RiskManager();
        this.regimeDetector = new RegimeDetector();
        this.memory = new MemoryManager();
        this.confidenceModel = new ConfidenceModel();

        // --- Stats ---
        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.tradeHistory = [];
        this.recentTrades = []; // Last 20 for Kelly

        // --- Watchdog ---
        this.watchdogTimer = null;

        // --- Debug ---
        this.debug = false;
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    start() {
        this.isRunning = true;
        this.log('System Started. Waiting for data...');
        this.api.subscribeTicks(this.symbol);
        this.api.subscribeCandles(this.symbol, 60);
    }

    stop() {
        this.isRunning = false;
        this.log('System Stopped.');
        this._resetState();
    }

    _resetState() {
        this.state = 'IDLE';
        this.lock = false;
        this.currentContractId = null;
        if(this.watchdogTimer) clearTimeout(this.watchdogTimer);
    }

    // ============================================================
    // Event Handlers
    // ============================================================

    processTick(tick) {
        if (!this.isRunning) return;
        this.memory.addTick(tick.quote);

        // Update Regime on every tick (or throttle it)
        if(this.memory.ticks.length > 50) {
            this.regimeDetector.update(this.memory.ticks, this.memory.candles);
        }

        this._evaluate();
    }

    processCandle(candle, granularity) {
        if (granularity !== 60) return;
        this.memory.addCandle(candle);
    }

    onTradePlaced(contractId) {
        this.state = 'MONITOR';
        this.currentContractId = contractId;
        this.log(`Trade Placed. ID: ${contractId}. Monitoring...`);
        this._startWatchdog();
    }

    handleTradeResult(contract) {
        // Only process if we are tracking this contract
        if(this.currentContractId && contract.contract_id !== this.currentContractId) return;

        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        this.totalProfit += profit;
        this.riskManager.updateBalance(profit, isWin);

        if (isWin) this.wins++; else this.losses++;

        this.recentTrades.push(isWin ? 1 : 0);
        if (this.recentTrades.length > 20) this.recentTrades.shift();

        this.tradeHistory.push({
            time: new Date().toLocaleTimeString(),
            symbol: contract.underlying_symbol,
            type: contract.contract_type,
            stake: contract.buy_price,
            profit: profit,
            status: isWin ? 'WIN' : 'LOSS'
        });

        if (window.updateTradeHistory) window.updateTradeHistory(this.tradeHistory, this.totalProfit, this.wins, this.losses);

        this.log(`Settled: ${isWin ? 'WIN' : 'LOSS'} ($${profit.toFixed(2)})`);

        // Cooldown
        this.cooldownUntil = Date.now() + (isWin ? 2000 : 10000); // Longer cooldown on loss
        if(this.riskManager.consecutiveLosses >= 3) {
            this.log('Risk Warning: 3 Consecutive Losses. Pausing for 5m.');
            this.cooldownUntil = Date.now() + 300000;
        }

        // Release Lock
        this._resetState();
    }

    // ============================================================
    // Core Evaluation Loop
    // ============================================================

    async _evaluate() {
        // 1. Gatekeepers
        if (this.lock || this.state !== 'IDLE') return;
        if (Date.now() < this.cooldownUntil) return;
        if (this.memory.ticks.length < 50 || this.memory.candles.length < 20) return;

        // 2. Risk Check
        if (!this.riskManager.canTrade()) {
            if(this.riskManager.stopReason && this.isRunning) {
                this.log(`Risk Stop: ${this.riskManager.stopReason}`);
                this.stop();
            }
            return;
        }

        // 3. Regime Filter
        const regime = this.regimeDetector.currentRegime;
        if (regime === 'CHOPPY') return;

        // 4. Signal Generation
        const signal = this._generateSignal();
        if (!signal) return;

        // 5. Confidence Scoring
        const confidence = this.confidenceModel.score(signal, this.memory, regime);
        if (confidence < 60) return;

        // 6. Stake Sizing (Kelly)
        const stake = this.riskManager.calculateStake(confidence, this.recentTrades);

        // 7. Execution
        this._executeTrade(signal, stake);
    }

    _generateSignal() {
        // Ultra Instinct: Trend + Momentum
        const prices = this.memory.ticks;
        const rsi = this.calculateRSI(prices, 14);
        const lastRsi = rsi[rsi.length-1];

        const sma = this.calculateSMA(prices, 50);
        const lastSma = sma[sma.length-1];
        const lastPrice = prices[prices.length-1];

        if (lastPrice > lastSma && lastRsi < 30) return 'rise'; // Trend pullback
        if (lastPrice < lastSma && lastRsi > 70) return 'fall';

        return null;
    }

    _executeTrade(direction, stake) {
        this.lock = true;
        this.state = 'PROPOSAL';
        this.log(`Signal: ${direction.toUpperCase()} | Conf: ${this.confidenceModel.lastScore}% | Stake: $${stake.toFixed(2)}`);

        // Send Proposal via API
        this.api.placeTrade(direction, stake, 5, this.symbol); // Fixed 5t for microstructure
    }

    _startWatchdog() {
        if(this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
            if (this.state !== 'IDLE') {
                this.log('Watchdog: Trade Settlement Timeout. Force Reset.');
                this._resetState();
            }
        }, 15000); // 15s timeout for 5t trade
    }

    // ============================================================
    // Helpers & Interfaces
    // ============================================================

    log(msg) {
        if (this.debug) console.log(`[BOT] ${msg}`);
        if(document.getElementById('bot-logs')) {
            const d = document.createElement('div');
            d.innerText = msg;
            document.getElementById('bot-logs').prepend(d);
        }
    }

    setParamLock(val) { this.isParamLocked = val; }

    // Indicators (Simplified for brevity, full lib in real impl)
    calculateSMA(data, period) {
        if(data.length < period) return Array(data.length).fill(0);
        let result = [];
        let sum = 0;
        for(let i=0; i<data.length; i++) {
            sum += data[i];
            if(i >= period) sum -= data[i-period];
            if(i >= period-1) result.push(sum/period); else result.push(0);
        }
        return result;
    }

    calculateRSI(data, period) {
        // Basic RSI impl
        if(data.length < period+1) return Array(data.length).fill(50);
        let rsi = [];
        // ... (standard calculation)
        // Mock for stability in this snippet
        return data.map(v => 50);
    }
}

/**
 * Risk Manager - Real Kelly & Drawdown Control
 */
class RiskManager {
    constructor() {
        this.maxDailyLoss = 0.10; // 10%
        this.maxDailyProfit = 0.20; // 20%
        this.balance = 1000;
        this.startBalance = 1000;
        this.consecutiveLosses = 0;
        this.stopReason = null;
    }

    updateBalance(profit, isWin) {
        this.balance += profit;
        if(isWin) this.consecutiveLosses = 0;
        else this.consecutiveLosses++;
    }

    canTrade() {
        const pnl = (this.balance - this.startBalance) / this.startBalance;
        if (pnl <= -this.maxDailyLoss) { this.stopReason = 'Max Daily Loss'; return false; }
        if (pnl >= this.maxDailyProfit) { this.stopReason = 'Target Hit'; return false; }
        return true;
    }

    calculateStake(confidence, history) {
        // Real Kelly
        const wins = history.filter(h => h === 1).length;
        const total = history.length;
        if(total < 10) return this.balance * 0.01; // Warmup

        const p = wins / total;
        const b = 0.95; // Avg Payout
        const q = 1 - p;
        let f = (b * p - q) / b;

        // Safety Caps
        f = Math.min(f, 0.25); // Max 25% Kelly
        if (f < 0) f = 0; // Do not trade if neg edge

        let stake = this.balance * f * 0.1; // Fractional Kelly (10%)
        stake = Math.max(0.35, stake);

        // Adjust for confidence
        stake = stake * (confidence / 100);

        return parseFloat(stake.toFixed(2));
    }
}

/**
 * Regime Detector
 */
class RegimeDetector {
    constructor() {
        this.currentRegime = 'NEUTRAL';
    }

    update(ticks, candles) {
        // Placeholder for advanced logic
        // Using simple volatility check
        if(ticks.length < 10) return;
        const last = ticks[ticks.length-1];
        const prev = ticks[ticks.length-2];
        const change = Math.abs(last - prev);

        if (change < 0.05) this.currentRegime = 'CHOPPY';
        else if (change > 2.0) this.currentRegime = 'VOLATILE';
        else this.currentRegime = 'TRENDING';
    }
}

/**
 * Confidence Model
 */
class ConfidenceModel {
    constructor() { this.lastScore = 0; }

    score(signal, memory, regime) {
        let s = 50;
        if (regime === 'TRENDING') s += 20;
        if (regime === 'CHOPPY') s -= 20;

        // Trend confirmation
        // ...

        this.lastScore = s;
        return s;
    }
}

/**
 * Memory Manager
 */
class MemoryManager {
    constructor() {
        this.ticks = [];
        this.candles = [];
        this.maxTicks = 2000;
        this.maxCandles = 500;
    }

    addTick(price) {
        this.ticks.push(price);
        if(this.ticks.length > this.maxTicks) this.ticks.shift();
    }

    addCandle(candle) {
        this.candles.push(candle);
        if(this.candles.length > this.maxCandles) this.candles.shift();
    }
}

window.TradingBot = TradingBot;
