// bot.js - Advanced AI Bot Logic with Quantum Enlargement Architecture

/**
 * Main Trading Bot Class
 * Handles:
 * 1. Data Ingestion (Ticks/Candles)
 * 2. Signal Analysis (Strategies, AI Integration)
 * 3. Risk Management
 * 4. Execution (Watchdog)
 */
class TradingBot {
    constructor(api) {
        this.api = api;

        // --- State Flags ---
        this.isRunning = false;
        this.isBacktesting = false;
        this.isPaused = false;
        this.isParamLocked = false;

        // --- Components ---
        this.aiFilter = new AIFilter();
        this.useAIFilter = false;
        this.optimizer = null;

        // --- Config Defaults ---
        this.strategy = 'ultra_instinct';
        this.risk = 'medium';
        this.accountType = 'demo';
        this.currentSymbol = 'R_100';

        // --- Strategy Parameters ---
        this.rsiPeriod = 14;
        this.rsiOverbought = 70;
        this.rsiOversold = 30;
        this.smaPeriod = 20;
        this.bbPeriod = 20;
        this.bbStdDev = 2;
        this.emaShortPeriod = 50;
        this.emaLongPeriod = 200;
        this.adxPeriod = 14;

        // --- Optimization Parameters (Dynamic) ---
        this.params = {
            wTrend: 0.30, wMom: 0.15, wVol: 0.20, wNoise: 0.20, wAI: 0.15,
            confidenceThreshold: 0.85,
            volatilityThreshold: 0.75,
            noiseThreshold: 0.75,
            rsiHigh: 65, rsiLow: 35, entropyClean: 1.1
        };

        // --- Trading Config ---
        this.initialStake = 1;
        this.currentStake = 1;
        this.duration = 5;
        this.durationUnit = 't';
        this.martingaleMultiplier = 1.5;
        this.useMartingale = false;
        this.useSmartRisk = true;
        this.takeProfit = 0;
        this.stopLoss = 0;
        this.useFilter = true;
        this.adxThreshold = 25;
        this.avoidSqueeze = true;
        this.useDynamicDuration = false;
        this.isSmallAccount = false;

        // --- Runtime State ---
        this.ticks = [];
        this.candles1m = [];
        this.candles5m = [];
        this.maxTicks = 1000;
        this.maxCandles = 500;
        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.consecutiveLosses = 0;
        this.lastTradeTime = 0;
        this.tradeHistory = [];
        this.hasOpenTrade = false;
        this.sessionPeakProfit = 0;
        this.riskState = 'NORMAL'; // NORMAL, AGGRESSIVE, PROTECT, WAIT
        this.marketCondition = 'Analyzing';
        this.confidence = 0;
        this.dailyStartBalance = 0;
        this.maxDailyLoss = 0.15;
        this.cooldownEndTime = 0;
        this.currentEntropy = 0;

        // --- Advanced State ---
        this.quantumState = { pendingSignal: null, startTickIndex: 0, confirmationTicks: 0 };
        this.watchdog = { state: 'IDLE', lastTransition: 0, timeoutId: null };
        this.gradeHistory = [];
        this.gradeStats = { A: 0, B: 0, C: 0, D: 0, F: 0, Total: 0 };
        this.activeContracts = new Map();
        this.pendingSymbol = null;

        // --- Learning ---
        this.learning = { totalTrades: 0, wins: 0, threshold: 4.5 };

        // --- Virtual Trading (Recovery) ---
        this.isVirtualRecovery = false;
        this.virtualWins = 0;
        this.virtualLosses = 0;

        this.currentTradeReasoning = null;
        this.currentTradeExpectedPrice = 0;
    }

    // ============================================================
    // Lifecycle Methods
    // ============================================================

    async start() {
        this.isRunning = true;
        this.isPaused = false;
        this.currentStake = this.initialStake;
        this.totalProfit = 0;
        this.sessionPeakProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.consecutiveLosses = 0;
        this.tradeHistory = [];

        if (window.botBalance) this.dailyStartBalance = window.botBalance;

        // Init AI
        if (this.useAIFilter) {
            await this.aiFilter.init();
        }

        // Init Optimizer
        if (typeof AdaptiveOptimizer !== 'undefined') {
            this.optimizer = new AdaptiveOptimizer(this);
            this.optimizer.reset();
            this.log('Optimizer: Active & Monitoring');
        }

        this.log('Bot started. Analyzing market...');
    }

    stop() {
        this.isRunning = false;
        this.log('Bot stopped.');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.log(this.isPaused ? 'Bot PAUSED by user.' : 'Bot RESUMED by user.');
        return this.isPaused;
    }

    // ============================================================
    // Configuration Setters
    // ============================================================

    setBacktestMode(enabled) {
        this.isBacktesting = enabled;
        if (enabled) {
            this.ticks = [];
            this.candles1m = [];
            this.candles5m = [];
        }
    }

    setStake(amount) {
        this.initialStake = amount;
        if (!this.isRunning) {
            this.currentStake = amount;
        }
    }

    setDuration(amount, unit = 't') {
        this.duration = amount;
        this.durationUnit = unit;
    }

    setDynamicDuration(enabled) {
        this.useDynamicDuration = enabled;
        this.log(`Dynamic Duration: ${enabled ? 'ON' : 'OFF'}`);
    }

    setMoneyManagement(useMartingale, multiplier, takeProfit, stopLoss, useSmartRisk = false) {
        this.useMartingale = useMartingale;
        this.martingaleMultiplier = multiplier;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;
        this.useSmartRisk = useSmartRisk;
        this.log(`Money Management: Martingale=${useMartingale}, Smart Risk=${useSmartRisk}`);
    }

    setFilter(enabled, adxThreshold = 25, avoidSqueeze = false) {
        this.useFilter = enabled;
        this.adxThreshold = adxThreshold;
        this.avoidSqueeze = avoidSqueeze;
        this.log(`Filters: ADX>${adxThreshold}, Squeeze=${avoidSqueeze}`);
    }

    setAIFilter(enabled) {
        this.useAIFilter = enabled;
        this.log(`AI Filter: ${enabled ? 'ON' : 'OFF'}`);
    }

    setAccountType(type) {
        this.accountType = type;
        if (type === 'live') {
            this.maxDailyLoss = 0.08; // Stricter for Live (8%)
            this.log('Switched to LIVE Mode. Max Daily Loss set to 8%.');
        } else {
            this.maxDailyLoss = 0.15;
            this.log('Switched to DEMO Mode.');
        }
    }

    setSmallAccountMode(enabled) {
        this.isSmallAccount = enabled;
        if (enabled) {
            this.log('Small Account Mode: ENABLED (Compounding Growth, High Precision)');
        } else {
            this.log('Small Account Mode: DISABLED');
        }
    }

    updateConfig(strategy, risk) {
        this.strategy = strategy;
        this.risk = risk;
        this.log(`Configuration updated: ${strategy} / ${risk}`);
    }

    setParamLock(enabled) {
        this.isParamLocked = enabled;
        this.log(`Parameter Lock: ${enabled ? 'ON' : 'OFF'}`);
    }

    setStrategyParams(params) {
        if (params.rsiPeriod) this.rsiPeriod = parseInt(params.rsiPeriod);
        if (params.rsiOverbought) this.rsiOverbought = parseInt(params.rsiOverbought);
        if (params.rsiOversold) this.rsiOversold = parseInt(params.rsiOversold);
        if (params.smaPeriod) this.smaPeriod = parseInt(params.smaPeriod);
        if (params.bbPeriod) this.bbPeriod = parseInt(params.bbPeriod);
        if (params.bbStdDev) this.bbStdDev = parseFloat(params.bbStdDev);
        this.log('Strategy parameters updated');
    }

    getLearningState() {
        return this.learning;
    }

    setLearningState(state) {
        if (state) {
            this.learning = { ...this.learning, ...state };
            this.log(`AI Loaded: Win Rate ${((this.learning.wins/this.learning.totalTrades || 0)*100).toFixed(1)}%, Threshold ${this.learning.threshold}`);
        }
    }

    // ============================================================
    // Data Ingestion
    // ============================================================

    setSymbol(symbol) {
        this.currentSymbol = symbol;
        this.ticks = [];
        this.candles1m = [];
        this.candles5m = [];
        this.lastSignal = null;
        this.marketCondition = 'Analyzing...';
        this.log(`Switched to symbol: ${symbol}. State reset.`);
    }

    processTick(tick) {
        if (!this.isRunning) return;

        // Symbol Safety Check
        if (tick.symbol && tick.symbol !== this.currentSymbol) return;

        this.ticks.push(tick.quote);
        if (this.ticks.length > this.maxTicks) this.ticks.shift();

        if (this.isVirtualRecovery) {
            this.processVirtualTrade();
        }

        this.evaluate();
    }

    processCandle(candle, granularity) {
        let list = (granularity === 60) ? this.candles1m : this.candles5m;

        const c = {
            time: candle.epoch,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close)
        };

        if (list.length === 0) {
            list.push(c);
        } else {
            const last = list[list.length - 1];
            if (c.time === last.time) {
                list[list.length - 1] = c;
            } else if (c.time > last.time) {
                list.push(c);
            }
        }

        if (list.length > this.maxCandles) list.shift();

        if (this.isBacktesting && granularity === 60) {
             this.ticks.push(c.close);
             if (this.ticks.length > this.maxTicks) this.ticks.shift();
             this.evaluate();
        }
    }

    // ============================================================
    // Analysis Core
    // ============================================================

    async evaluate() {
        try {
            await this._evaluateSafe();
        } catch (e) {
            console.error('Bot Evaluation Error:', e);
            this.stop();
        }
    }

    async _evaluateSafe() {
        if (this.isPaused && !this.isBacktesting) return;

        const tickThreshold = this.isBacktesting ? 20 : 50;
        if (this.ticks.length < tickThreshold) return;

        if (this.hasOpenTrade && !this.isBacktesting) return;

        if (Date.now() < this.cooldownEndTime && !this.isBacktesting) return;

        this.detectMarketCondition();
        this.determineRiskState(); // Update Risk State Machine
        this.adjustParameters();

        // Enforce WAIT MODE
        if (this.riskState === 'WAIT' && !this.isBacktesting) {
            this.lastSignal = null;
            return;
        }

        if (!this.isBacktesting) {
            this.checkSessionLimits();
        }

        // 1. ANALYZE FIRST (Set Confidence)
        const startSymbol = this.currentSymbol; // Freeze symbol before async analysis
        let signal = await this.analyze();

        // Safety Check: Did symbol change during analysis?
        if (this.currentSymbol !== startSymbol) {
            this.log('State changed during analysis. Aborting trade execution.');
            return;
        }

        // 2. CALCULATE STAKE & VALIDATE GRADE (After Confidence is set)
        if (signal) {
            const canTrade = this.updateStakeWithRisk(); // Returns false if D/F Grade
            if (!canTrade) signal = null;
        }

        // Final Confidence Check
        let minConfidence = this.isSmallAccount ? 80 : 60;
        if (signal && this.confidence < minConfidence) {
            signal = null;
        }

        // 3. EXECUTE
        if (signal) {
            if (this.isBacktesting) {
                this.lastSignal = signal;
            } else {
                this.watchdogAttemptExecution(signal, startSymbol);
            }
        } else {
            this.lastSignal = null;
        }
    }

    checkSessionLimits() {
        this.sessionPeakProfit = Math.max(this.sessionPeakProfit, this.totalProfit);

        if (this.sessionPeakProfit > 10 && this.totalProfit < this.sessionPeakProfit * 0.5) {
            this.log(`Session Trailing Stop Hit. Peak: $${this.sessionPeakProfit.toFixed(2)}, Current: $${this.totalProfit.toFixed(2)}. Stopping.`);
            this.stop();
            return;
        }

        if (this.takeProfit > 0 && this.totalProfit >= this.takeProfit) {
            this.log(`Take Profit Reached ($${this.totalProfit.toFixed(2)}). Stopping.`);
            this.stop();
            return;
        }
        if (this.stopLoss > 0 && this.totalProfit <= -this.stopLoss) {
            this.log(`Stop Loss Reached ($${this.totalProfit.toFixed(2)}). Stopping.`);
            this.stop();
            return;
        }
    }

    async analyze() {
        const prices = this.ticks;
        const lastPrice = prices[prices.length - 1];

        if (this.strategy === 'dynamic') {
             if (this.candles1m.length > 20) {
                const closes = this.candles1m.map(c => c.close);
                const adx = this.calculateADX(closes, 14).pop() || 0;
                if (adx > 25) return this.analyzeMultiTF();
             }
             return null;
        }

        if (this.strategy === 'random') {
             const array = new Uint8Array(1);
             window.crypto.getRandomValues(array);
             return array[0] > 127 ? 'rise' : 'fall';
        }

        // Legacy Strategies
        if (this.strategy === 'rsi') return this.analyzeRSI(prices, lastPrice);
        if (this.strategy === 'sma') return this.analyzeSMA(prices);
        if (this.strategy === 'bb') return this.analyzeBB(prices, lastPrice);
        if (this.strategy === 'neural') return this.analyzeNeuralTrend(prices);

        // Advanced Strategies
        if (this.strategy === 'ultra_instinct') return this.analyzeMultiTF();
        if (this.strategy === 'quantum') return await this.analyzeQuantumEnlargement();

        return null;
    }

    // Legacy Analysis Methods
    analyzeRSI(prices, lastPrice) {
         const rsi = this.calculateRSI(prices, this.rsiPeriod);
         const lastRsi = rsi[rsi.length - 1];
         const sma50 = this.calculateSMA(prices, 50);
         const lastSma = sma50[sma50.length - 1];
         const isUptrend = lastPrice > lastSma;

         if (lastRsi < this.rsiOversold && isUptrend) return 'rise';
         if (lastRsi > this.rsiOverbought && !isUptrend) return 'fall';
         return null;
    }

    analyzeSMA(prices) {
         const fastEma = this.calculateEMA(prices, 10);
         const slowEma = this.calculateEMA(prices, 20);
         const lastFast = fastEma[fastEma.length - 1];
         const prevFast = fastEma[fastEma.length - 2];
         const lastSlow = slowEma[slowEma.length - 1];
         const prevSlow = slowEma[slowEma.length - 2];

         let adxValid = true;
         if (this.candles1m.length > 20) {
             const closes = this.candles1m.map(c => c.close);
             const adx = this.calculateADX(closes, 14).pop() || 0;
             if (adx < 20) adxValid = false;
         }

         if (adxValid) {
             if (lastFast > lastSlow && prevFast <= prevSlow) return 'rise';
             if (lastFast < lastSlow && prevFast >= prevSlow) return 'fall';
         }
         return null;
    }

    analyzeBB(prices, lastPrice) {
         const bb = this.calculateBollingerBands(prices, this.bbPeriod, this.bbStdDev);
         const lastBB = bb[bb.length - 1];
         if (!lastBB) return null;

         const rsi = this.calculateRSI(prices, 14);
         const lastRsi = rsi[rsi.length - 1] || 50;

         if (lastPrice < lastBB.lower && lastRsi < 35) return 'rise';
         if (lastPrice > lastBB.upper && lastRsi > 65) return 'fall';
         return null;
    }

    // ============================================================
    // Advanced Quantum & AI Engines
    // ============================================================

    async analyzeQuantumEnlargement() {
        if (this.candles1m.length < 50) return null;

        // Layer 2: Parallel Probability Engines
        const pTrend = this.qtTrendEngine();
        const pMom = this.qtMomentumEngine();
        const pVol = this.qtVolatilityEngine();
        const pNoise = this.qtNoiseEngine();
        const pAI = await this.qtAIEngine();

        // Signal Quality Enforcement: Confluence Check
        let buyVotes = 0;
        let sellVotes = 0;
        if (pTrend.buy > 0.5) buyVotes++; else sellVotes++;
        if (pMom.buy > 0.5) buyVotes++; else sellVotes++;

        // AI Vote (Only if Active)
        if (pAI) {
            if (pAI.buy > 0.5) buyVotes++; else sellVotes++;
        }

        if (pVol > 0.7) { buyVotes++; sellVotes++; }
        if (pNoise > 0.7) { buyVotes++; sellVotes++; }

        // Layer 3: Probability Aggregation Core
        const { wTrend, wMom, wVol, wNoise, wAI } = this.params;

        let activeWTrend = wTrend;
        let activeWMom = wMom;
        let activeWVol = wVol;
        let activeWNoise = wNoise;
        let activeWAI = wAI;

        if (!pAI) {
            const distribute = wAI / 4;
            activeWTrend += distribute;
            activeWMom += distribute;
            activeWVol += distribute;
            activeWNoise += distribute;
            activeWAI = 0;
        }

        const aiBuy = pAI ? pAI.buy : 0;
        const aiSell = pAI ? pAI.sell : 0;

        const rawBuy = (pTrend.buy * activeWTrend + pMom.buy * activeWMom + aiBuy * activeWAI) / (activeWTrend + activeWMom + activeWAI);
        const rawSell = (pTrend.sell * activeWTrend + pMom.sell * activeWMom + aiSell * activeWAI) / (activeWTrend + activeWMom + activeWAI);

        const direction = rawBuy > rawSell ? 'rise' : 'fall';
        const votes = direction === 'rise' ? buyVotes : sellVotes;

        // Enforce Confluence (at least 3 "supportive" factors)
        if (votes < 3) return null;

        // Confidence
        const dirProb = direction === 'rise' ? rawBuy : rawSell;
        const envScore = (pVol * wVol + pNoise * wNoise) / (wVol + wNoise);

        const finalScore = (dirProb * 0.6) + (envScore * 0.4);

        this.confidence = finalScore * 100;

        // Signal Explainability Layer
        this.currentTradeReasoning = {
            trend: pTrend,
            momentum: pMom,
            volatility: pVol,
            noise: pNoise,
            ai: pAI,
            finalScore: finalScore,
            marketCondition: this.marketCondition
        };

        // Trade Eligibility Checklist
        if (pVol < this.params.volatilityThreshold) return null;
        if (pNoise < this.params.noiseThreshold) return null;
        if (finalScore < this.params.confidenceThreshold) return null;

        // Layer 4: Superposition Delay Engine
        return this.qtSuperpositionEngine(direction, finalScore);
    }

    // ... (Helper engines: qtTrendEngine, qtMomentumEngine, etc. preserved)

    qtTrendEngine() {
        const c1m = this.candles1m;
        const c5m = this.candles5m;
        if (c1m.length < 50) return { buy: 0.5, sell: 0.5 };

        const closes1m = c1m.map(c => c.close);
        const ema20 = this.calculateEMA(closes1m, 20);
        const lastEma = ema20[ema20.length-1];
        const prevEma = ema20[ema20.length-2];
        const lastPrice = closes1m[closes1m.length-1];

        const closes5m = c5m.length > 0 ? c5m.map(c => c.close) : closes1m;
        const ema50 = this.calculateEMA(closes5m, 50);
        const lastEma50 = ema50[ema50.length-1];
        const lastPrice5m = closes5m[closes5m.length-1];

        let score = 0.5;
        const volatility = (c1m[c1m.length-1].high - c1m[c1m.length-1].low);
        const isEmaAnglingUp = lastEma > prevEma;
        const isEmaAnglingDown = lastEma < prevEma;

        if (lastPrice > lastEma + volatility * 0.2 && isEmaAnglingUp) score += 0.25;
        else if (lastPrice < lastEma - volatility * 0.2 && isEmaAnglingDown) score -= 0.25;

        if (lastPrice5m > lastEma50) score += 0.25;
        else score -= 0.25;

        return { buy: Math.max(0, score), sell: Math.max(0, 1 - score) };
    }

    qtMomentumEngine() {
        const ticks = this.ticks;
        const rsi = this.calculateRSI(ticks, 14);
        const lastRsi = rsi[rsi.length-1] || 50;

        let score = 0.5;
        if (lastRsi > this.params.rsiHigh) score += 0.2;
        else if (lastRsi < this.params.rsiLow) score -= 0.2;

        if (this.candles1m.length >= 2) {
            const last = this.candles1m[this.candles1m.length-1];
            const prev = this.candles1m[this.candles1m.length-2];
            const isBullish = last.close > last.open && prev.close > prev.open;
            const isBearish = last.close < last.open && prev.close < prev.open;

            if (isBullish) score += 0.1;
            else if (isBearish) score -= 0.1;
        }

        const acceleration = this.calculateTickAcceleration();
        if (acceleration > 0.00001) score += 0.15;
        else if (acceleration < -0.00001) score -= 0.15;

        if (ticks.length >= 5) {
            const start = ticks[ticks.length-5];
            const end = ticks[ticks.length-1];
            if (end > start * 1.00005) score += 0.1;
            else if (end < start * 0.99995) score -= 0.1;
        }

        return { buy: Math.max(0, score), sell: Math.max(0, 1 - score) };
    }

    qtVolatilityEngine() {
        const bb = this.calculateBollingerBands(this.ticks, 20, 2);
        const lastBB = bb[bb.length-1];
        if (!lastBB) return 0;

        const width = (lastBB.upper - lastBB.lower) / lastBB.middle;
        if (width < 0.0001) return 0.2;
        if (width > 0.05) return 0.2;
        if (width > 0.001 && width < 0.01) return 0.95;
        return 0.7;
    }

    qtNoiseEngine() {
        if (this.candles1m.length < 30) return 0.5;
        const entropy = this.calculateShannonEntropy(this.candles1m, 30);
        this.currentEntropy = entropy;

        const cleanLevel = this.params.entropyClean;
        const noisyLevel = cleanLevel + 0.8;

        const score = 1 - Math.max(0, Math.min(1, (entropy - cleanLevel) / (noisyLevel - cleanLevel)));
        return score;
    }

    async qtAIEngine() {
        if (!this.useAIFilter || !this.aiFilter.isReliable) return null;

        const sequence = this.extractSequence(this.candles1m.length - 1, 10);
        if (!sequence) return null;

        const prediction = await this.aiFilter.predict(sequence);
        if (!prediction) return null;

        // Integrate AI Meta-Data
        this.confidence = (this.confidence || 0) * 0.5 + prediction.confidence * 50;
        this.marketCondition = prediction.regime;

        const threshold = prediction.threshold || 0.6;
        const probBuy = prediction.probability;

        let finalBuy = 0.5;
        if (probBuy > threshold) finalBuy = probBuy;
        else if (probBuy < (1 - threshold)) finalBuy = probBuy;
        else return null;

        return { buy: finalBuy, sell: 1 - finalBuy };
    }

    qtSuperpositionEngine(direction, score) {
        const state = this.quantumState;

        // Fast Execution Override (> 92%)
        if (score >= 0.92) return direction;

        if (!state.pendingSignal || state.pendingSignal !== direction) {
            state.pendingSignal = direction;
            state.startTickIndex = this.ticks.length;
            state.confirmationTicks = 0;
            return null;
        }

        const lastPrice = this.ticks[this.ticks.length-1];
        const prevPrice = this.ticks[this.ticks.length-2];

        // Validation
        if (direction === 'rise' && lastPrice <= prevPrice) {
            state.pendingSignal = null; return null;
        }
        if (direction === 'fall' && lastPrice >= prevPrice) {
            state.pendingSignal = null; return null;
        }

        state.confirmationTicks++;
        const requiredTicks = score > 0.88 ? 1 : 2;

        if (state.confirmationTicks >= requiredTicks) {
            state.pendingSignal = null;
            return direction;
        }

        return null;
    }

    // ============================================================
    // Risk & Execution (Watchdog)
    // ============================================================

    watchdogAttemptExecution(direction, symbol) {
        if (this.watchdog.state !== 'IDLE' && this.watchdog.state !== 'ANALYZING') return;
        if (this.isPaused) return;
        if (this.hasOpenTrade || this.api.pendingTrade) return;

        if (this.api.latency > 250) {
            this.log(`Watchdog blocked: High Latency (${this.api.latency}ms).`);
            return;
        }

        // Losing Streak Protection
        if (this.consecutiveLosses >= 2) {
            if (this.confidence < 90 && this.marketCondition !== 'Trending') {
                this.log(`Watchdog blocked: Losing Streak Protection. Need >90% Confidence or Trending Market.`);
                return;
            }
        }

        if (this.isVirtualRecovery) {
            this.executeVirtualTrade(direction);
            return;
        }

        this.setWatchdogState('LOCKED');

        const now = Date.now();
        if (this.lastTradeTime && (now - this.lastTradeTime < 2000)) {
             this.setWatchdogState('IDLE'); // Too fast
             return;
        }
        this.lastTradeTime = now;
        this.hasOpenTrade = true;
        this.currentTradeExpectedPrice = this.ticks[this.ticks.length-1];

        this.setWatchdogState('EXECUTING');

        let tradeDuration = this.useDynamicDuration ? 2 : this.duration;
        this.log(`[WATCHDOG] Executing ${direction.toUpperCase()} ($${this.currentStake}) on ${symbol}...`);

        this.pendingSymbol = symbol;
        this.api.placeTrade(direction, this.currentStake, tradeDuration, symbol);

        this.watchdog.timeoutId = setTimeout(() => {
            if (this.watchdog.state === 'EXECUTING') {
                this.log('CRITICAL: Trade execution timed out. Resetting Watchdog.');
                this.hasOpenTrade = false;
                this.api.pendingTrade = false;
                this.setWatchdogState('IDLE');
            }
        }, 5000);
    }

    setWatchdogState(newState) {
        this.watchdog.state = newState;
        this.watchdog.lastTransition = Date.now();
        if(window.updateWatchdogStatus) window.updateWatchdogStatus(newState);
    }

    onTradePlaced(contractId) {
        if(this.watchdog.timeoutId) clearTimeout(this.watchdog.timeoutId);

        if (this.pendingSymbol) {
            this.activeContracts.set(contractId, this.pendingSymbol);
            this.pendingSymbol = null;
        }

        this.setWatchdogState('MANAGING');
    }

    handleTradeResult(contract) {
        this.hasOpenTrade = false;

        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        const storedSymbol = this.activeContracts.get(contract.contract_id);
        const symbol = contract.underlying_symbol || storedSymbol || this.api.activeSymbol || 'Unknown';

        if (contract.contract_id) this.activeContracts.delete(contract.contract_id);

        // Cooldown
        let cooldownTime = 1000;
        if (!isWin) {
            if (this.consecutiveLosses >= 2) cooldownTime = 10000;
            if (this.consecutiveLosses >= 4) cooldownTime = 60000;
        }

        this.setWatchdogState('COOLDOWN');
        setTimeout(() => this.setWatchdogState('IDLE'), cooldownTime);

        if (!this.isRunning) return;

        this.totalProfit += profit;

        if (isWin) {
            this.wins++;
            this.consecutiveLosses = 0;
        } else {
            this.losses++;
            this.consecutiveLosses++;
        }

        // Slippage Check
        if (contract.entry_tick && this.currentTradeExpectedPrice) {
            const slippage = Math.abs(contract.entry_tick - this.currentTradeExpectedPrice);
            const slipPct = slippage / this.currentTradeExpectedPrice;
            if (slipPct > 0.0005) {
                this.log(`WARNING: High Slippage Detected (${(slipPct*100).toFixed(4)}%).`);
            }
        }

        // Grading & Learning
        const grade = this.gradeTrade(isWin, this.currentTradeReasoning);
        const cleanGrade = grade.replace('+', '').replace('-', '');
        if (this.gradeStats[cleanGrade] !== undefined) this.gradeStats[cleanGrade]++;
        this.gradeStats.Total++;

        this.updateGradeDrift(grade);

        if (symbol === this.currentSymbol) {
            let label = -1;
            const type = contract.contract_type ? contract.contract_type.toLowerCase() : '';
            const isCall = type.includes('call') || type.includes('rise') || type.includes('buy');

            if (isCall) label = isWin ? 1 : 0;
            else label = isWin ? 0 : 1;

            if (grade.startsWith('A') || grade === 'B') {
                const startTime = contract.date_start;
                const candleIdx = this.candles1m.findIndex(c => Math.abs(c.time - startTime) < 60);
                if (candleIdx !== -1) {
                    // Use candleIdx - 1 to prevent data leakage
                    const seq = this.extractSequence(candleIdx - 1, 10);
                    if (seq && this.aiFilter.addSample) {
                        this.aiFilter.addSample(seq, label);
                        this.log(`AI Memory Updated with Grade ${grade} Trade (Label: ${label}).`);
                    }
                }
            }
        }

        if (this.consecutiveLosses >= 2) {
            if (this.consecutiveLosses >= 3) {
                 this.log("CRITICAL: 3 Consecutive Real Losses. KILL SWITCH ACTIVATED.");
                 this.stop();
                 return;
            }
            this.isVirtualRecovery = true;
            this.virtualWins = 0;
            this.virtualLosses = 0;
            this.log(`Hit 2 consecutive losses. Entering Virtual Recovery Mode.`);
            if(window.updateRecoveryStatus) window.updateRecoveryStatus(true);
        }

        this.updateLearning(isWin);
        if (this.optimizer) this.optimizer.onTrade(isWin, this.marketCondition);

        this.log(`Trade Finished. Profit: $${profit.toFixed(2)} (Grade: ${grade})`);

        this.tradeHistory.push({
            time: new Date().toLocaleTimeString(),
            symbol: symbol,
            type: contract.contract_type,
            stake: contract.buy_price,
            profit: profit,
            status: isWin ? 'WIN' : 'LOSS',
            grade: grade,
            reasoning: this.currentTradeReasoning
        });

        if (window.updateTradeHistory) window.updateTradeHistory(this.tradeHistory, this.totalProfit, this.wins, this.losses);

        // Stake Management
        if (this.useMartingale) {
            if (isWin) this.currentStake = this.initialStake;
            else this.currentStake = parseFloat((this.currentStake * this.martingaleMultiplier).toFixed(2));
        } else if (!this.useSmartRisk) {
            this.currentStake = this.initialStake;
        }
    }

    updateGradeDrift(grade) {
        let numericGrade = 0;
        if (grade.startsWith('A')) numericGrade = 4;
        else if (grade === 'B') numericGrade = 3;
        else if (grade === 'C') numericGrade = 2;
        else if (grade === 'D') numericGrade = 1;

        this.gradeHistory.push(numericGrade);
        if (this.gradeHistory.length > 10) this.gradeHistory.shift();

        if (this.gradeHistory.length >= 5) {
            const avgGrade = this.gradeHistory.reduce((a, b) => a + b, 0) / this.gradeHistory.length;
            if (avgGrade < 2.5 && this.riskState !== 'WAIT' && this.riskState !== 'PROTECT') {
                this.log(`Grade Drift Detected (Avg: ${avgGrade.toFixed(1)}). Downgrading Risk State.`);
                this.setRiskState('PROTECT', 'Low Grade Drift');
            }
        }
    }

    // ============================================================
    // Helpers (Feature Extraction & Indicators)
    // ============================================================

    extractFeatures(index) {
        const closes = this.candles1m.map(c => c.close);
        if (index < 30 || index >= closes.length) return null;

        // Note: For performance, this recalculates entire array.
        // In a highly optimized version, we would maintain rolling buffers.
        const indicators = {
            rsi: this.calculateRSI(closes, 14),
            adx: this.calculateADX(closes, 14),
            sma: this.calculateSMA(closes, 20),
            bb: this.calculateBollingerBands(closes, 20, 2),
            macd: this.calculateMACD(closes, 12, 26, 9).histogram,
            atr: this.calculateATR(this.candles1m, 14)
        };

        const c = this.candles1m[index];
        const rsiVal = indicators.rsi[index] / 100;
        const adxVal = indicators.adx[index] / 100;
        const smaVal = indicators.sma[index];
        const smaDiff = (c.close - smaVal) / smaVal * 100;
        const bbVal = indicators.bb[index];
        const bbWidth = (bbVal.upper - bbVal.lower) / bbVal.middle;
        const logRet = Math.log(c.close / this.candles1m[index-1].close) * 100;
        const macdVal = indicators.macd[index] * 10;
        const rsiSlope = (indicators.rsi[index] - indicators.rsi[index-3]) / 3 / 10;
        const atrVal = (indicators.atr[index] / c.close) * 100;

        return [rsiVal, adxVal, smaDiff, bbWidth, logRet, macdVal, rsiSlope, atrVal];
    }

    extractSequence(index, steps) {
        if (index < steps + 30) return null;
        const seq = [];
        for (let i = 0; i < steps; i++) {
            const feat = this.extractFeatures(index - steps + 1 + i);
            if (!feat) return null;
            seq.push(feat);
        }
        return seq;
    }

    // ... (Indicator methods: calculateSMA, calculateEMA, calculateRSI, etc. preserved)

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
    gradeTrade(isWin, reasoning) {
        if (!reasoning) return isWin ? 'B' : 'D';
        const score = reasoning.finalScore || 0;
        if (isWin) {
            if (score > 0.85) return 'A+';
            if (score > 0.75) return 'A';
            return 'B';
        } else {
            if (score > 0.85) return 'C';
            if (score > 0.75) return 'D';
            return 'F';
        }
    }
    updateLearning(isWin) {
        this.learning.totalTrades++;
        if (isWin) this.learning.wins++;
        if(window.saveSettings) window.saveSettings();
    }
    log(message) {
        const logContainer = document.getElementById('bot-logs');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = 'mb-1';
            entry.innerHTML = `<span class="text-gray-500">[${new Date().toLocaleTimeString()}]</span> ${message}`;
            logContainer.prepend(entry);
        }
        console.log(`[BOT] ${message}`);
    }

    // (Preserved legacy analysis methods for completeness)
    analyzeNeuralTrend(prices) { /*...*/ return null; } // Placeholder for brevity, logic was already simplified in analyze()

    // (Helper detection methods)
    detectCandlePattern(candles) {
        if(candles.length < 5) return 'neutral';
        const c = candles[candles.length-1];
        const prev = candles[candles.length-2];
        if(c.close > c.open) return 'bullish';
        if(c.close < c.open) return 'bearish';
        return 'neutral';
    }
    detectOrderBlock(candles) { return 'neutral'; }
    detectLiquiditySweep(candles) { return 'neutral'; }
    calculateChoppinessIndex(candles, period) { return []; } // Simplified stub for cleanup if unused in main flow or fully implemented
    calculateShannonEntropy(candles, period) {
        if (candles.length < period + 1) return 0;
        const returns = [];
        for (let i = candles.length - period; i < candles.length; i++) {
            returns.push(Math.log(candles[i].close / candles[i-1].close));
        }
        const min = Math.min(...returns);
        const max = Math.max(...returns);
        const binCount = Math.floor(Math.sqrt(period));
        const binSize = (max - min) / binCount;
        if (binSize === 0) return 0;
        const bins = {};
        returns.forEach(r => {
            const key = Math.floor((r - min) / binSize);
            bins[key] = (bins[key] || 0) + 1;
        });
        let entropy = 0;
        for (const key in bins) {
            const p = bins[key] / period;
            entropy -= p * Math.log(p);
        }
        return entropy;
    }
    calculateMACD(data, f, s, sig) {
        return { macdLine: [], signalLine: [], histogram: [] }; // Stub
    }

    // ... Re-add full implementations for critical helpers ...
}

// Restore full implementations for helpers that were stubbed above to ensure functionality
TradingBot.prototype.analyzeNeuralTrend = function(prices) {
    if (prices.length < 200) return null;
    const ema50 = this.calculateEMA(prices, 50);
    const ema200 = this.calculateEMA(prices, 200);
    const rsi = this.calculateRSI(prices, 14);
    const lastPrice = prices[prices.length - 1];
    const l50 = ema50[ema50.length-1];
    const l200 = ema200[ema200.length-1];
    const lRsi = rsi[rsi.length-1];
    const distFromEma = Math.abs(lastPrice - l50) / l50;
    const isExtended = distFromEma > 0.001;
    if (l50 > l200 && lastPrice > l50 && lRsi > 50 && lRsi < 75 && !isExtended) return 'rise';
    if (l50 < l200 && lastPrice < l50 && lRsi < 50 && lRsi > 25 && !isExtended) return 'fall';
    return null;
};

TradingBot.prototype.calculateChoppinessIndex = function(candles, period) {
    let chop = [];
    if (candles.length < period + 1) return [];
    const atr = this.calculateATR(candles, 1);
    for (let i = period; i < candles.length; i++) {
        let sumTr = 0;
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (let j = 0; j < period; j++) {
            sumTr += atr[i-j] || 0;
            maxHigh = Math.max(maxHigh, candles[i-j].high);
            minLow = Math.min(minLow, candles[i-j].low);
        }
        const range = maxHigh - minLow;
        if (range === 0) chop.push(50);
        else chop.push(100 * Math.log10(sumTr / range) / Math.log10(period));
    }
    return chop;
};

TradingBot.prototype.calculateMACD = function(data, fastPeriod, slowPeriod, signalPeriod) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine = [];
    for(let i=0; i<data.length; i++) {
        if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
            macdLine.push(fastEMA[i] - slowEMA[i]);
        } else {
            macdLine.push(0);
        }
    }
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];
    for(let i=0; i<data.length; i++) {
        histogram.push(macdLine[i] - (signalLine[i] || 0));
    }
    return { macdLine, signalLine, histogram };
};

// ... Restore virtual trading logic
TradingBot.prototype.executeVirtualTrade = function(direction) {
    if (this.ticks.length === 0) return;
    let tradeDuration = this.useDynamicDuration ? 2 : this.duration;
    this.virtualTrade = {
        entryPrice: this.ticks[this.ticks.length-1],
        direction: direction,
        startTime: Date.now(),
        duration: tradeDuration,
        startTickIndex: this.ticks.length
    };
    this.log(`[VIRTUAL] Simulating ${direction} trade...`);
    this.hasOpenTrade = true;
};

TradingBot.prototype.processVirtualTrade = function() {
    if (!this.virtualTrade) return;
    const currentTickIndex = this.ticks.length;
    const currentPrice = this.ticks[currentTickIndex - 1];
    const { entryPrice, direction, startTickIndex, duration } = this.virtualTrade;
    let pnlPct = (currentPrice - entryPrice) / entryPrice;
    if (direction === 'fall') pnlPct = -pnlPct;

    if (pnlPct < -0.0005) { // Stop Loss
         this.hasOpenTrade = false;
         this.virtualTrade = null;
         this.handleVirtualResult(false, 'stop_loss');
         return;
    }
    if (pnlPct > 0.001 && (currentTickIndex - startTickIndex) <= 2) { // Scalp
         this.hasOpenTrade = false;
         this.virtualTrade = null;
         this.handleVirtualResult(true, 'momentum_scalp');
         return;
    }
    if (currentTickIndex - startTickIndex >= duration) { // Expiry
        const isWin = pnlPct > 0;
        this.hasOpenTrade = false;
        this.virtualTrade = null;
        this.handleVirtualResult(isWin, 'expiry');
    }
};

TradingBot.prototype.handleVirtualResult = function(isWin) {
    if (isWin) {
        this.virtualWins++;
        this.virtualLosses = 0;
        this.log(`[VIRTUAL] WON. Streak: ${this.virtualWins}`);
    } else {
        this.virtualWins = 0;
        this.virtualLosses++;
        this.log(`[VIRTUAL] LOST.`);
    }
    if (this.virtualWins >= 2) {
        this.isVirtualRecovery = false;
        this.consecutiveLosses = 0;
        this.log(`[RECOVERY] Consistent wins detected. Resuming Real Trading.`);
        if(window.updateRecoveryStatus) window.updateRecoveryStatus(false);
    }
};
