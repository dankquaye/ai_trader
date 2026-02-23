// bot.js - Standard Execution System

/**
 * Standard Trading Bot
 * Modular Architecture: Signal -> Regime -> Risk -> Execution -> Watchdog
 */
class TradingBot {
    constructor(api) {
        this.api = api;

        // --- State ---
        this.isRunning = false;
        this.isBacktesting = false;
        this.isPaused = false;
        this.isParamLocked = false;

        // --- Config Defaults ---
        this.strategy = 'ultra_instinct';
        this.risk = 'medium';
        this.accountType = 'demo';
        this.currentSymbol = 'R_100';

        // --- Strategy Params ---
        this.rsiPeriod = 14;
        this.rsiOverbought = 70;
        this.rsiOversold = 30;
        this.smaPeriod = 20;
        this.bbPeriod = 20;
        this.bbStdDev = 2;

        // --- Risk Settings ---
        this.riskSettings = {
            maxDailyLoss: 0.05, // 5% max daily loss
            maxDailyProfit: 0.10, // 10% daily target
            kellyFraction: 0.5, // Half-Kelly
            minWinRate: 0.40, // Pause if WR < 40% (last 10)
            maxDrawdown: 0.10, // Hard stop at 10% equity drawdown
            riskPerTrade: 0.02 // 2% per trade
        };

        // --- Trading State ---
        this.balance = 0;
        this.startBalance = 0;
        this.dailyStartBalance = 0;
        this.equityHigh = 0;
        this.currentStake = 1;
        this.initialStake = 1;

        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.tradeHistory = [];
        this.recentTrades = []; // Last 10 trades for WR check

        this.hasOpenTrade = false;
        this.lastTradeTime = 0;
        this.cooldownUntil = 0;

        // --- Data ---
        this.ticks = []; // Raw ticks
        this.candles1m = [];
        this.maxTicks = 2000;
        this.maxCandles = 500;

        // --- Analysis State ---
        this.marketRegime = 'NEUTRAL'; // TRENDING_UP, TRENDING_DOWN, CHOPPY, VOLATILE
        this.currentSignal = null;
        this.confidence = 0;
        this.currentTradeReasoning = {};

        // --- Watchdog ---
        this.watchdog = { state: 'IDLE', timeout: null };
        this.activeContracts = new Map();

        // --- Learning ---
        this.learning = { totalTrades: 0, wins: 0 };
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.tradeHistory = [];
        this.recentTrades = [];

        // Sync Balance
        if (window.botBalance) {
            this.balance = window.botBalance;
            this.startBalance = this.balance;
            this.dailyStartBalance = this.balance;
            this.equityHigh = this.balance;
        }

        this.log('Bot System Started.');
    }

    stop() {
        this.isRunning = false;
        this.log('Bot Stopped.');
    }

    // ============================================================
    // Core Pipeline
    // ============================================================

    async processTick(tick) {
        if (!this.isRunning) return;
        if (tick.symbol !== this.currentSymbol) return;

        // 1. Data Ingestion
        this.ticks.push(tick.quote);
        if (this.ticks.length > this.maxTicks) this.ticks.shift();

        // 2. Microstructure Filters (Fast Fail)
        if (this._checkMicrostructureSpike()) return;

        // 3. Main Evaluation Loop (Throttled)
        this._evaluate();
    }

    processCandle(candle, granularity) {
        if (granularity !== 60) return; // Focus on 1m for now

        const c = {
            time: candle.epoch,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close)
        };

        if (this.candles1m.length === 0 || c.time > this.candles1m[this.candles1m.length - 1].time) {
            this.candles1m.push(c);
            if (this.candles1m.length > this.maxCandles) this.candles1m.shift();
        } else {
            this.candles1m[this.candles1m.length - 1] = c;
        }
    }

    async _evaluate() {
        if (this.isPaused || this.hasOpenTrade || Date.now() < this.cooldownUntil) return;
        if (this.ticks.length < 50 || this.candles1m.length < 20) return;

        // Pipeline Step 1: Detect Market Regime
        this.marketRegime = this._detectMarketRegime();

        // Filter: Reject Choppy/High Volatility if strict
        if (this.marketRegime === 'CHOPPY' || this.marketRegime === 'VOLATILE_UNSAFE') {
            return;
        }

        // Pipeline Step 2: Generate Signal
        const signal = await this._generateSignal();
        if (!signal) return;

        // Pipeline Step 3: Risk Engine Validation & Sizing
        const riskParams = this._riskEngineCheck();
        if (!riskParams.approved) {
            this.log(`Risk Engine Blocked: ${riskParams.reason}`);
            if (riskParams.reason === 'STOP_TRADING') this.stop();
            return;
        }

        // Pipeline Step 4: Microstructure Confirmation (Tick Acceleration)
        if (!this._confirmMicrostructure(signal)) {
            return;
        }

        // Store Reasoning for UI
        this.currentTradeReasoning = {
            marketCondition: this.marketRegime,
            finalScore: this.confidence,
            volatility: 0
        };

        // Pipeline Step 5: Execution
        this._executeTrade(signal, riskParams.stake);
    }

    // ============================================================
    // Module 1: Market Regime Filter
    // ============================================================

    _detectMarketRegime() {
        const closes = this.candles1m.map(c => c.close);
        const chopIndex = this.calculateChoppinessIndex(this.candles1m, 14);
        const atr = this.calculateATR(this.candles1m, 14);
        const lastATR = atr[atr.length - 1];
        const lastChop = chopIndex[chopIndex.length - 1];

        // 1. Choppiness Check
        if (lastChop > 60) return 'CHOPPY';

        // 2. Volatility Check (Relative ATR)
        const avgPrice = closes[closes.length-1];
        const volatilityPct = (lastATR / avgPrice) * 100;

        if (volatilityPct > 0.5) return 'VOLATILE_UNSAFE';

        // 3. Trend Detection (Simple EMA)
        const ema20 = this.calculateEMA(closes, 20);
        const lastEma = ema20[ema20.length-1];

        if (avgPrice > lastEma) return 'TRENDING_UP';
        if (avgPrice < lastEma) return 'TRENDING_DOWN';

        return 'NEUTRAL';
    }

    // ============================================================
    // Module 2: Signal Generator
    // ============================================================

    async _generateSignal() {
        // Strategy Router
        if (this.strategy === 'ultra_instinct') return this._stratUltraInstinct();
        if (this.strategy === 'rsi') return this.analyzeRSI(this.ticks, this.ticks[this.ticks.length-1]);
        if (this.strategy === 'bb') return this.analyzeBB(this.ticks, this.ticks[this.ticks.length-1]);
        if (this.strategy === 'sma') return this.analyzeSMA(this.ticks);

        return null;
    }

    _stratUltraInstinct() {
        // Confluence Strategy: Trend + Momentum + Volatility
        const pTrend = this.qtTrendEngine();
        const pMom = this.qtMomentumEngine();

        // Require alignment
        if (pTrend.buy > 0.6 && pMom.buy > 0.6) return 'rise';
        if (pTrend.sell > 0.6 && pMom.sell > 0.6) return 'fall';

        return null;
    }

    // ============================================================
    // Module 3: Risk Engine
    // ============================================================

    _riskEngineCheck() {
        // 1. Capital Protection
        const currentDrawdown = (this.equityHigh - this.balance) / this.equityHigh;
        if (currentDrawdown >= this.riskSettings.maxDrawdown) {
            return { approved: false, reason: 'STOP_TRADING' }; // Equity Lock
        }

        const dailyPL = (this.balance - this.dailyStartBalance) / this.dailyStartBalance;
        if (dailyPL <= -this.riskSettings.maxDailyLoss) {
            return { approved: false, reason: 'STOP_TRADING' };
        }
        if (dailyPL >= this.riskSettings.maxDailyProfit) {
            return { approved: false, reason: 'STOP_TRADING' };
        }

        // 2. Performance Degradation Check
        if (this.recentTrades.length >= 10) {
            const wins = this.recentTrades.filter(r => r === 'WIN').length;
            const wr = wins / this.recentTrades.length;
            if (wr < this.riskSettings.minWinRate) {
                this.log('Performance degraded (WR < 40%). Pausing for 5 minutes.');
                this.cooldownUntil = Date.now() + 300000;
                return { approved: false, reason: 'PERFORMANCE_PAUSE' };
            }
        }

        // 3. Position Sizing
        let stake = this.initialStake;

        if (this.accountType === 'live') {
            stake = this.balance * this.riskSettings.riskPerTrade;
        }

        stake = Math.max(0.35, parseFloat(stake.toFixed(2))); // Min stake 0.35

        return { approved: true, stake: stake };
    }

    // ============================================================
    // Module 4: Microstructure & Execution
    // ============================================================

    _checkMicrostructureSpike() {
        if (this.ticks.length < 20) return false;

        const last10 = this.ticks.slice(-10);
        const mean = last10.reduce((a,b)=>a+b,0)/10;
        const sqDiff = last10.map(v => Math.pow(v - mean, 2));
        const std = Math.sqrt(sqDiff.reduce((a,b)=>a+b,0)/10);

        const lastTick = this.ticks[this.ticks.length-1];
        if (Math.abs(lastTick - mean) > std * 4) {
            return true;
        }
        return false;
    }

    _confirmMicrostructure(direction) {
        // Ensure acceleration aligns with direction
        const acc = this.calculateTickAcceleration();
        if (direction === 'rise' && acc < 0) return false;
        if (direction === 'fall' && acc > 0) return false;
        return true;
    }

    _executeTrade(direction, stake) {
        if (this.hasOpenTrade || this.api.pendingTrade) return;

        this.hasOpenTrade = true;
        this.currentStake = stake;
        this.currentTradeExpectedPrice = this.ticks[this.ticks.length-1];

        this.log(`EXECUTING ${direction.toUpperCase()} | Stake: $${stake} | Regime: ${this.marketRegime}`);

        // Use shorter duration for volatile markets
        const duration = this.marketRegime === 'TRENDING_UP' || this.marketRegime === 'TRENDING_DOWN' ? 5 : 3;

        this.api.placeTrade(direction, stake, duration, this.currentSymbol);

        // Watchdog
        this.watchdog.timeout = setTimeout(() => {
            if (this.hasOpenTrade) {
                this.log('Watchdog: Trade Timeout. Resetting.');
                this.hasOpenTrade = false;
                this.api.pendingTrade = false;
            }
        }, 5000);
    }

    // ============================================================
    // Handlers
    // ============================================================

    onTradePlaced(contractId) {
        if (this.watchdog.timeout) clearTimeout(this.watchdog.timeout);
        this.activeContracts.set(contractId, {
            symbol: this.currentSymbol,
            startTime: Date.now()
        });
    }

    handleTradeResult(contract) {
        this.hasOpenTrade = false;
        this.api.pendingTrade = false;

        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        // Update Stats
        this.totalProfit += profit;
        this.balance += profit + (isWin ? this.currentStake : 0); // Approx balance update
        this.equityHigh = Math.max(this.equityHigh, this.balance);

        if (isWin) this.wins++; else this.losses++;

        this.recentTrades.push(isWin ? 'WIN' : 'LOSS');
        if (this.recentTrades.length > 10) this.recentTrades.shift();

        this.learning.totalTrades++;
        if (isWin) this.learning.wins++;

        this.tradeHistory.push({
            time: new Date().toLocaleTimeString(),
            symbol: contract.underlying_symbol,
            type: contract.contract_type,
            stake: contract.buy_price,
            profit: profit,
            status: isWin ? 'WIN' : 'LOSS'
        });

        if (window.updateTradeHistory) window.updateTradeHistory(this.tradeHistory, this.totalProfit, this.wins, this.losses);

        this.log(`Trade Closed: ${isWin ? 'WIN' : 'LOSS'} (+$${profit.toFixed(2)})`);

        // Cooldown
        this.cooldownUntil = Date.now() + 2000; // 2s standard cooldown
    }

    // ============================================================
    // Calculations & Indicators
    // ============================================================

    // Analysis Methods
    analyzeRSI(ticks, lastPrice) {
        const rsi = this.calculateRSI(ticks, this.rsiPeriod);
        const lastRSI = rsi[rsi.length - 1];
        if (lastRSI < this.rsiOversold) return 'rise';
        if (lastRSI > this.rsiOverbought) return 'fall';
        return null;
    }

    analyzeBB(ticks, lastPrice) {
        const bb = this.calculateBollingerBands(ticks, this.bbPeriod, this.bbStdDev);
        const lastBB = bb[bb.length - 1];
        if (lastPrice < lastBB.lower) return 'rise';
        if (lastPrice > lastBB.upper) return 'fall';
        return null;
    }

    analyzeSMA(ticks) {
        const sma = this.calculateSMA(ticks, this.smaPeriod);
        const lastSMA = sma[sma.length - 1];
        const lastPrice = ticks[ticks.length - 1];
        if (lastPrice > lastSMA) return 'rise';
        if (lastPrice < lastSMA) return 'fall';
        return null;
    }

    calculateChoppinessIndex(candles, period) {
        if (candles.length < period + 1) return Array(candles.length).fill(50);

        const results = [];
        // ATR part
        const tr = [];
        for(let i=1; i<candles.length; i++) {
            const c = candles[i];
            const p = candles[i-1];
            tr.push(Math.max(c.high-c.low, Math.abs(c.high-p.close), Math.abs(c.low-p.close)));
        }

        // Calculate CI
        // CI = 100 * log10(Sum(TR, n) / (MaxHigh(n) - MinLow(n))) / log10(n)
        for (let i = period; i < candles.length; i++) {
            // Sum TR for last period
            let sumTR = 0;
            for(let j=0; j<period; j++) sumTR += tr[i-1-j]; // tr is index shifted by 1 relative to candles

            let maxHigh = -Infinity;
            let minLow = Infinity;
            for(let j=0; j<period; j++) {
                maxHigh = Math.max(maxHigh, candles[i-j].high);
                minLow = Math.min(minLow, candles[i-j].low);
            }

            const range = maxHigh - minLow;
            if (range === 0) results.push(50);
            else {
                const ci = 100 * Math.log10(sumTR / range) / Math.log10(period);
                results.push(ci);
            }
        }

        // Pad beginning
        while(results.length < candles.length) results.unshift(50);
        return results;
    }

    // Standard Indicators
    calculateSMA(data, period) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) { result.push(null); continue; }
            let sum = 0;
            for (let j = 0; j < period; j++) sum += data[i - j];
            result.push(sum / period);
        }
        return result;
    }
    calculateEMA(data, period) {
        let result = [];
        const k = 2 / (period + 1);
        let ema = data[0];
        for(let i=0; i<data.length; i++) {
            if(i === 0) result.push(ema);
            else {
                ema = (data[i] * k) + (ema * (1 - k));
                result.push(ema);
            }
        }
        return result;
    }
    calculateRSI(data, period) {
        let rsi = [];
        for(let i=0; i<period; i++) rsi.push(50);
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const change = data[i] - data[i-1];
            if (change > 0) gains += change; else losses += Math.abs(change);
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i] - data[i-1];
            let gain = change > 0 ? change : 0;
            let loss = change < 0 ? Math.abs(change) : 0;
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
            let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
        return rsi;
    }
    calculateBollingerBands(data, period, stdDev) {
        const sma = this.calculateSMA(data, period);
        return data.map((val, i) => {
            if (i < period) return { upper: 0, lower: 0, middle: 0 };
            const slice = data.slice(i - period + 1, i + 1);
            const mean = sma[i];
            const sumSq = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
            const sd = Math.sqrt(sumSq / period);
            return { middle: mean, upper: mean + sd * stdDev, lower: mean - sd * stdDev };
        });
    }
    calculateADX(data, period) {
        let tr = [], dmPlus = [], dmMinus = [];
        for(let i=1; i<data.length; i++) {
            tr.push(Math.abs(data[i] - data[i-1]));
            dmPlus.push(data[i] > data[i-1] ? data[i]-data[i-1] : 0);
            dmMinus.push(data[i] < data[i-1] ? data[i-1]-data[i] : 0);
        }
        const sTR = this.calculateSMA(tr, period);
        const sPlus = this.calculateSMA(dmPlus, period);
        const sMinus = this.calculateSMA(dmMinus, period);
        let adx = [];
        for(let i=0; i<sTR.length; i++) {
            if(!sTR[i]) { adx.push(0); continue; }
            let diPlus = 100 * sPlus[i] / sTR[i];
            let diMinus = 100 * sMinus[i] / sTR[i];
            let dx = 100 * Math.abs(diPlus - diMinus) / (diPlus + diMinus);
            adx.push(dx);
        }
        return this.calculateSMA(adx, period);
    }
    calculateATR(candles, period) {
        let tr = [];
        for(let i=1; i<candles.length; i++) {
            const c = candles[i];
            const prev = candles[i-1];
            tr.push(Math.max(c.high-c.low, Math.abs(c.high-prev.close), Math.abs(c.low-prev.close)));
        }
        return this.calculateSMA(tr, period);
    }
    calculateTickAcceleration() {
        if (this.ticks.length < 5) return 0;
        const t = this.ticks;
        const v1 = t[t.length-1] - t[t.length-2];
        const v2 = t[t.length-2] - t[t.length-3];
        const v3 = t[t.length-3] - t[t.length-4];
        const a1 = v1 - v2;
        const a2 = v2 - v3;
        return (a1 + a2) / 2;
    }

    // Quantum Engines (Preserved)
    qtTrendEngine() {
        const c1m = this.candles1m;
        if (c1m.length < 20) return { buy: 0.5, sell: 0.5 };
        const closes = c1m.map(c => c.close);
        const ema20 = this.calculateEMA(closes, 20);
        const last = closes[closes.length-1];
        const e = ema20[ema20.length-1];
        return { buy: last > e ? 0.7 : 0.3, sell: last < e ? 0.7 : 0.3 };
    }
    qtMomentumEngine() {
        const rsi = this.calculateRSI(this.ticks, 14);
        const last = rsi[rsi.length-1];
        return { buy: last < 30 ? 0.8 : 0.4, sell: last > 70 ? 0.8 : 0.4 };
    }

    setBacktestMode(enabled) { this.isBacktesting = enabled; }
    setAccountType(type) { this.accountType = type; this.log('Account: ' + type); }
    togglePause() { this.isPaused = !this.isPaused; return this.isPaused; }
    log(msg) { console.log('[BOT]', msg); if(document.getElementById('bot-logs')) { const d = document.createElement('div'); d.innerText = msg; document.getElementById('bot-logs').prepend(d); } }
    setStrategyParams(params) {
        if (params.rsiPeriod) this.rsiPeriod = parseInt(params.rsiPeriod);
        if (params.rsiOverbought) this.rsiOverbought = parseInt(params.rsiOverbought);
        if (params.rsiOversold) this.rsiOversold = parseInt(params.rsiOversold);
        if (params.bbPeriod) this.bbPeriod = parseInt(params.bbPeriod);
        if (params.bbStdDev) this.bbStdDev = parseFloat(params.bbStdDev);
        if (params.smaPeriod) this.smaPeriod = parseInt(params.smaPeriod);
        this.log('Strategy Params Updated');
    }
    getLearningState() { return this.learning; }
    setLearningState(state) { this.learning = state; }
    evaluateScore(candles) {
        // Simple score for auto-selector
        const tr = this.calculateATR(candles, 14);
        const vol = tr[tr.length-1];
        return vol * 1000; // Crude volatility score
    }
}

window.TradingBot = TradingBot;
