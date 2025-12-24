// bot.js - Advanced AI Bot Logic with Quantum Enlargement Architecture
class TradingBot {
    constructor(api) {
        this.api = api;
        this.isRunning = false;
        this.isBacktesting = false;

        // AI Filter
        this.aiFilter = new AIFilter();
        this.useAIFilter = false;

        // Optimizer
        this.optimizer = null;

        // Strategy Config
        this.strategy = 'ultra_instinct'; // Default
        this.risk = 'medium';

        // Strategy Parameters (Default)
        this.rsiPeriod = 14;
        this.rsiOverbought = 70;
        this.rsiOversold = 30;

        this.smaPeriod = 20;

        this.bbPeriod = 20;
        this.bbStdDev = 2;

        // Neural Trend Config
        this.emaShortPeriod = 50;
        this.emaLongPeriod = 200;
        this.adxPeriod = 14;

        // Optimization Parameters (Dynamic)
        this.params = {
            // Quantum Weights (High Win Rate Defaults)
            wTrend: 0.30,
            wMom: 0.15,
            wVol: 0.20,
            wNoise: 0.20,
            wAI: 0.15,

            // Thresholds (Aggressive Filtering)
            confidenceThreshold: 0.85,
            volatilityThreshold: 0.75,
            noiseThreshold: 0.75,

            // Engine Specifics
            rsiHigh: 65,
            rsiLow: 35,
            entropyClean: 1.1
        };

        // Trading Config
        this.initialStake = 1;
        this.currentStake = 1;
        this.duration = 5;
        this.durationUnit = 't';

        // Money Management
        this.martingaleMultiplier = 1.5;
        this.useMartingale = false;
        this.useSmartRisk = true;
        this.takeProfit = 0;
        this.stopLoss = 0;

        // Filter
        this.useFilter = true;
        this.adxThreshold = 25;
        this.avoidSqueeze = true;

        // AI & Continuous Learning
        this.learning = {
            totalTrades: 0,
            wins: 0,
            threshold: 4.5
        };

        // Account Type
        this.accountType = 'demo';
        this.currentSymbol = 'R_100'; // Default

        // State
        this.ticks = []; // 1s ticks
        this.candles1m = []; // 1 minute candles
        this.candles5m = []; // 5 minute candles
        this.maxTicks = 1000;
        this.maxCandles = 500;
        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.lastTradeTime = 0;
        this.tradeHistory = [];
        this.hasOpenTrade = false;
        this.sessionPeakProfit = 0;

        // Advanced State
        this.riskState = 'NORMAL'; // NORMAL, AGGRESSIVE, PROTECT, WAIT
        this.marketCondition = 'Analyzing';
        this.confidence = 0;
        this.equityCurve = [];
        this.dailyStartBalance = 0;
        this.maxDailyLoss = 0.15;
        this.consecutiveLosses = 0;
        this.cooldownEndTime = 0;
        this.currentEntropy = 0;
        this.useDynamicDuration = false;

        // Backtest State
        this.backtestResults = null;
        this.lastSignal = null;

        // Virtual Recovery State
        this.isVirtualRecovery = false;
        this.virtualWins = 0;
        this.virtualLosses = 0;

        // Small Account Mode
        this.isSmallAccount = false;

        // Manual Controls
        this.isPaused = false;
        this.isParamLocked = false;

        // Quantum Enlargement State (Layer 4)
        this.quantumState = {
             pendingSignal: null,
             startTickIndex: 0,
             confirmationTicks: 0
        };

        // Explainability & Execution State
        this.currentTradeReasoning = null;
        this.currentTradeExpectedPrice = 0;

        // Watchdog State
        this.watchdog = {
            state: 'IDLE', // IDLE, LOCKED, EXECUTING, MANAGING, COOLDOWN
            lastTransition: 0,
            timeoutId: null
        };

        // Grade Drift Monitor
        this.gradeHistory = []; // Stores numeric grades (A=4, B=3, C=2, D=1, F=0)
        this.gradeStats = { A: 0, B: 0, C: 0, D: 0, F: 0, Total: 0 };

        // Symbol Safety (Contract Map)
        this.activeContracts = new Map();
        this.pendingSymbol = null;
    }

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
            // Removed direct trainAI() call as we use online learning
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

    togglePause() {
        this.isPaused = !this.isPaused;
        this.log(this.isPaused ? 'Bot PAUSED by user.' : 'Bot RESUMED by user.');
        return this.isPaused;
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

    // --- Data Ingestion ---

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
        if (tick.symbol && tick.symbol !== this.currentSymbol) {
            // Ignore ticks from other symbols (e.g. during switch latency)
            return;
        }

        this.ticks.push(tick.quote);
        if (this.ticks.length > this.maxTicks) {
            this.ticks.shift();
        }

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

        // AI Training Schedule: REMOVED periodic training in favor of Event-Driven Training on High Quality Grades

        if (this.isBacktesting && granularity === 60) {
             this.ticks.push(c.close);
             if (this.ticks.length > this.maxTicks) this.ticks.shift();
             this.evaluate();
        }
    }

    // Helper to extract features for a single candle index
    extractFeatures(index) {
        const closes = this.candles1m.map(c => c.close);
        if (index < 30 || index >= closes.length) return null;

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

    // Helper to extract sequence for LSTM (last N steps ending at index)
    extractSequence(index, steps) {
        if (index < steps + 30) return null; // Need enough history
        const seq = [];
        for (let i = 0; i < steps; i++) {
            const feat = this.extractFeatures(index - steps + 1 + i);
            if (!feat) return null;
            seq.push(feat);
        }
        return seq;
    }

    // Event-Driven Training for A/B Trades
    trainAIOnTrade(candleIndex, duration) {
        if (!this.useAIFilter) return;

        // We need context before the trade entry for LSTM
        // Extract sequence of length `aiFilter.lookBack` (10)

        const sequence = this.extractSequence(candleIndex, 10);

        if (sequence && this.aiFilter.addSample) {
            // Label 1 for "Rise" (Win for Call), but wait...
            // This function is called when a trade was "Good".
            // If we took a CALL and it WON, then PRICE WENT UP -> Label 1.
            // If we took a PUT and it WON, then PRICE WENT DOWN -> Label 0.
            // However, `handleTradeResult` calls this only for High Grade trades.
            // We need to know the DIRECTION of the trade to assign the label correctly relative to "Rise".
            // The current call signature doesn't pass direction. I need to fix that or infer it.
            // Actually, `handleTradeResult` knows if it was a win.

            // Let's assume for now we are training on "What happened".
            // If the trade was a WIN on CALL, price rose. Label = 1.
            // If the trade was a WIN on PUT, price fell. Label = 0.

            // Wait, this method is called inside handleTradeResult.
            // I need to pass the trade direction to this method to label correctly.
            // But `trainAIOnTrade` assumes we are just reinforcing "Good setups".
            // The model predicts "Rise Probability".
            // So if CALL WIN -> Label 1.
            // If PUT WIN -> Label 0.
            // If CALL LOSS -> Label 0.
            // If PUT LOSS -> Label 1.

            // I will update the signature in `handleTradeResult` call.
        }
    }

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

            if (!canTrade) {
                signal = null;
                // Log handled inside updateStakeWithRisk or handleLowGrade
            }
        }

        // Final Confidence Check (Redundant but safe)
        let minConfidence = 60;
        if (this.isSmallAccount) {
            minConfidence = 80;
        }

        if (signal && this.confidence < minConfidence) {
            signal = null;
        }

        // 3. EXECUTE
        if (signal) {
            if (this.isBacktesting) {
                this.lastSignal = signal;
            } else {
                // 2. Fix Symbol Bug: Pass frozen symbol captured BEFORE analysis
                this.watchdogAttemptExecution(signal, startSymbol);
            }
        } else {
            this.lastSignal = null;
        }
    }

    predictGrade(score) {
        if (score > 85) return 'A';
        if (score > 75) return 'B';
        if (score > 60) return 'C';
        if (score > 50) return 'D';
        return 'F';
    }

    handleLowGrade(grade) {
        this.consecutiveLowGrades = (this.consecutiveLowGrades || 0) + 1;

        // Grade Lock System
        if (this.consecutiveLowGrades >= 3) {
            this.log('Grade Lock Activated: 3 consecutive low quality signals. Pausing trading.');
            this.setRiskState('WAIT', 'Grade Lock (3x Low Quality)');
            this.consecutiveLowGrades = 0; // Reset or keep until manual/auto reset?
            // Resetting prevents infinite loop, logic will re-enable via state machine
        }
    }

    // --- Quantum Enlargement Architecture (Layer 2 Engines) ---

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

        // Slope Check (Enhancement for Live Trading)
        // Only bullish if price is above EMA AND EMA is angling up
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

        // Use Dynamic Parameters
        if (lastRsi > this.params.rsiHigh) score += 0.2;
        else if (lastRsi < this.params.rsiLow) score -= 0.2;

        // Candle Color Consistency Check (Enhancement)
        if (this.candles1m.length >= 2) {
            const last = this.candles1m[this.candles1m.length-1];
            const prev = this.candles1m[this.candles1m.length-2];
            const isBullish = last.close > last.open && prev.close > prev.open;
            const isBearish = last.close < last.open && prev.close < prev.open;

            if (isBullish) score += 0.1;
            else if (isBearish) score -= 0.1;
        }

        // Tick Acceleration (2nd Derivative)
        // Feature: Tick velocity & acceleration
        const acceleration = this.calculateTickAcceleration();
        if (acceleration > 0.00001) score += 0.15; // Accelerating Up
        else if (acceleration < -0.00001) score -= 0.15; // Accelerating Down

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

        // Use Dynamic Parameter
        const cleanLevel = this.params.entropyClean;
        const noisyLevel = cleanLevel + 0.8;

        const score = 1 - Math.max(0, Math.min(1, (entropy - cleanLevel) / (noisyLevel - cleanLevel)));
        return score;
    }

    async qtAIEngine() {
        // 4. Disable AI Until Accuracy > 55%
        // Hard gate implemented via isReliable check
        if (!this.useAIFilter || !this.aiFilter.isReliable) return null;

        // Prepare Sequence for LSTM (Last 10 candles)
        const sequence = this.extractSequence(this.candles1m.length - 1, 10);
        if (!sequence) return null;

        const prediction = await this.aiFilter.predict(sequence);

        if (!prediction) return null;

        // Integrate AI Meta-Data
        this.confidence = (this.confidence || 0) * 0.5 + prediction.confidence * 50; // Blend confidence
        this.marketCondition = prediction.regime; // AI Override for Regime

        // Use RL Action to adjust immediate behavior
        // Action 0: Tighten -> Return null if prob is not very high
        // Action 2: Loosen -> Allow lower prob
        const threshold = prediction.threshold || 0.6;

        const probBuy = prediction.probability;

        // Apply threshold
        let finalBuy = 0.5;
        if (probBuy > threshold) finalBuy = probBuy;
        else if (probBuy < (1 - threshold)) finalBuy = probBuy;
        else return null; // Uncertainty

        return { buy: finalBuy, sell: 1 - finalBuy };
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

        if (this.strategy === 'random') return Math.random() > 0.5 ? 'rise' : 'fall';

        if (this.strategy === 'rsi') {
             const rsi = this.calculateRSI(prices, this.rsiPeriod);
             const lastRsi = rsi[rsi.length - 1];

             // Improvement: Trend Filter (SMA 50)
             const sma50 = this.calculateSMA(prices, 50);
             const lastSma = sma50[sma50.length - 1];
             const isUptrend = lastPrice > lastSma;

             // Only buy in uptrend, sell in downtrend for higher accuracy
             if (lastRsi < this.rsiOversold && isUptrend) return 'rise';
             if (lastRsi > this.rsiOverbought && !isUptrend) return 'fall';
        }

        if (this.strategy === 'sma') {
             // Improvement: Fast/Slow Crossover + ADX Filter
             const fastEma = this.calculateEMA(prices, 10);
             const slowEma = this.calculateEMA(prices, 20);

             const lastFast = fastEma[fastEma.length - 1];
             const prevFast = fastEma[fastEma.length - 2];
             const lastSlow = slowEma[slowEma.length - 1];
             const prevSlow = slowEma[slowEma.length - 2];

             // ADX Check for trend strength
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
        }

        if (this.strategy === 'bb') {
             const bb = this.calculateBollingerBands(prices, this.bbPeriod, this.bbStdDev);
             const lastBB = bb[bb.length - 1];
             if (!lastBB) return null;

             // Improvement: RSI Confirmation for Reversal
             const rsi = this.calculateRSI(prices, 14);
             const lastRsi = rsi[rsi.length - 1] || 50;

             // Buy: Price touches Lower Band AND RSI is oversold (<30)
             if (lastPrice < lastBB.lower && lastRsi < 35) return 'rise';
             // Sell: Price touches Upper Band AND RSI is overbought (>70)
             if (lastPrice > lastBB.upper && lastRsi > 65) return 'fall';
        }

        if (this.strategy === 'neural') return this.analyzeNeuralTrend(prices);
        if (this.strategy === 'ultra_instinct') return this.analyzeMultiTF();

        if (this.strategy === 'quantum') {
            return await this.analyzeQuantumEnlargement();
        }

        return null;
    }

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

        // Dynamic Weights: If AI is disabled (pAI is null), distribute wAI to others
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

        // Feature: Signal Explainability Layer
        // Capture the reasoning state for logging
        this.currentTradeReasoning = {
            trend: pTrend,
            momentum: pMom,
            volatility: pVol,
            noise: pNoise,
            ai: pAI,
            finalScore: finalScore,
            marketCondition: this.marketCondition
        };

        // Trade Eligibility Checklist (Dynamic Thresholds)
        if (pVol < this.params.volatilityThreshold) return null;
        if (pNoise < this.params.noiseThreshold) return null;
        if (finalScore < this.params.confidenceThreshold) return null;

        // Layer 4: Superposition Delay Engine
        return this.qtSuperpositionEngine(direction, finalScore);
    }

    qtSuperpositionEngine(direction, score) {
        const state = this.quantumState;

        // Fast Execution Override: If confidence is very high (> 92%), execute immediately (0 tick delay)
        if (score >= 0.92) {
             return direction;
        }

        if (!state.pendingSignal || state.pendingSignal !== direction) {
            state.pendingSignal = direction;
            state.startTickIndex = this.ticks.length;
            state.confirmationTicks = 0;
            return null;
        }

        const lastPrice = this.ticks[this.ticks.length-1];
        const prevPrice = this.ticks[this.ticks.length-2];

        // Validation: Price must move in direction of signal
        if (direction === 'rise' && lastPrice <= prevPrice) {
            state.pendingSignal = null;
            return null;
        }
        if (direction === 'fall' && lastPrice >= prevPrice) {
            state.pendingSignal = null;
            return null;
        }

        state.confirmationTicks++;

        // Dynamic Delay: 1 tick if score > 0.88, else 2 ticks
        const requiredTicks = score > 0.88 ? 1 : 2;

        if (state.confirmationTicks >= requiredTicks) {
            state.pendingSignal = null;
            return direction;
        }

        return null;
    }

    analyzeMultiTF() {
        if (this.candles1m.length < 50 || this.candles5m.length < 50 || this.ticks.length < 20) return null;

        const currentPrice = this.ticks[this.ticks.length - 1];
        const ama = this.calculateKAMA(this.candles1m.map(c => c.close), 10, 2, 30);
        const lastAma = ama[ama.length-1];
        const trend1m = currentPrice > lastAma ? 'up' : 'down';

        const ema = this.calculateEMA(this.candles5m.map(c => c.close), 50);
        const lastEma = ema[ema.length-1];
        const bias5m = currentPrice > lastEma ? 'up' : 'down';

        const pattern = this.detectCandlePattern(this.candles1m);
        const ob = this.detectOrderBlock(this.candles1m);
        const sweep = this.detectLiquiditySweep(this.candles1m);

        // New: ADX Check
        const adx = this.calculateADX(this.candles1m.map(c => c.close), 14).pop() || 0;
        if(adx < 25) return null;

        // New: RSI Check
        const rsi = this.calculateRSI(this.ticks, 14).pop() || 50;
        if (trend1m === 'up' && (rsi < 45 || rsi > 75)) return null;
        if (trend1m === 'down' && (rsi > 55 || rsi < 25)) return null;

        if (trend1m !== bias5m) return null;

        let signal = trend1m === 'up' ? 'rise' : 'fall';
        this.confidence = this.calculateConfidence(signal, trend1m, bias5m, pattern, ob, sweep);

        if (this.checkConflicts(signal)) return null;
        if (this.confidence >= 75) return signal;

        return null;
    }

    analyzeNeuralTrend(prices) {
        if (prices.length < 200) return null;
        const ema50 = this.calculateEMA(prices, 50);
        const ema200 = this.calculateEMA(prices, 200);
        const rsi = this.calculateRSI(prices, 14);
        const lastPrice = prices[prices.length - 1];

        const l50 = ema50[ema50.length-1];
        const l200 = ema200[ema200.length-1];
        const lRsi = rsi[rsi.length-1];

        // ADX Check
        if(this.candles1m.length > 20) {
             const adx = this.calculateADX(this.candles1m.map(c=>c.close), 14).pop() || 0;
             if(adx < 20) return null;
        }

        // Spread Check (Fanning)
        const spread = Math.abs(l50 - l200) / l200;
        if(spread < 0.0005) return null;

        // Improvement: Sniper Entry (Pullback)
        // We want to enter when price is close to the 50 EMA, not extended
        const distFromEma = Math.abs(lastPrice - l50) / l50;
        const isExtended = distFromEma > 0.001; // If too far, don't chase

        if (l50 > l200 && lastPrice > l50 && lRsi > 50 && lRsi < 75) {
            // Trend is up. If extended, wait. If close to EMA (pullback), enter.
            if (!isExtended) return 'rise';
        }

        if (l50 < l200 && lastPrice < l50 && lRsi < 50 && lRsi > 25) {
            if (!isExtended) return 'fall';
        }

        return null;
    }

    detectMarketCondition() {
        if (this.candles1m.length < 30) return;
        const closes = this.candles1m.map(c => c.close);

        // 1. Choppiness Index (Trendless check)
        const chopArr = this.calculateChoppinessIndex(this.candles1m, 14);
        const chop = chopArr[chopArr.length-1];

        // 2. Bollinger Band Width (Squeeze check)
        const bbArr = this.calculateBollingerBands(closes, 20, 2);
        const bb = bbArr[bbArr.length-1];
        const width = (bb.upper - bb.lower) / bb.middle;

        // 3. ADX (Trend Strength)
        const adxArr = this.calculateADX(closes, 14);
        const adx = adxArr[adxArr.length-1] || 0;

        // Classification Logic
        if (width < 0.001) this.marketCondition = 'Squeeze';
        else if (chop > 60 && adx < 20) this.marketCondition = 'Choppy'; // Stricter chop
        else if (adx > 25) this.marketCondition = 'Trending';
        else this.marketCondition = 'Ranging';

        // Save metrics for state machine
        this.marketMetrics = { chop, width, adx };
    }

    determineRiskState() {
        // Risk State Machine
        // Transitions: WAIT <-> NORMAL <-> AGGRESSIVE
        //              \-> PROTECT

        const { chop, width, adx } = this.marketMetrics || { chop: 50, width: 0.01, adx: 20 };

        // 1. WAIT MODE Check (Safety First)
        if (this.riskState !== 'WAIT') {
             // Entry conditions for WAIT
             if (width < 0.0008) {
                 this.setRiskState('WAIT', 'Market Squeeze (Low Vol)');
             } else if (chop > 61.8 || (adx < 18)) {
                 this.setRiskState('WAIT', 'High Chop / No Trend');
             }
        } else {
             // Exit conditions for WAIT (Hysteresis)
             // Need strong confirmation to re-enable
             const breakout = width > 0.0015;
             const trendResume = adx > 25 && chop < 50;

             if (breakout || trendResume) {
                 this.setRiskState('NORMAL', 'Market condition improved');
             }
        }

        // 2. AGGRESSIVE MODE Check (Opportunity)
        if (this.riskState === 'NORMAL') {
            if (adx > 30 && chop < 45 && this.consecutiveLosses === 0) {
                this.setRiskState('AGGRESSIVE', 'Strong Trend detected');
            }
        } else if (this.riskState === 'AGGRESSIVE') {
            if (adx < 25 || this.consecutiveLosses > 0) {
                 this.setRiskState('NORMAL', 'Trend weakening');
            }
        }

        // 3. PROTECT MODE (Recovery)
        if (this.consecutiveLosses >= 2 && this.riskState !== 'WAIT') {
            this.setRiskState('PROTECT', 'Consecutive losses');
        } else if (this.riskState === 'PROTECT' && this.consecutiveLosses === 0) {
            this.setRiskState('NORMAL', 'Recovery complete');
        }
    }

    setRiskState(state, reason) {
        if (this.riskState !== state) {
            this.riskState = state;
            this.log(`Risk State changed to ${state} (${reason})`);
        }
    }

    adjustParameters() {
        if (this.isParamLocked) return;

        if (this.marketCondition === 'Trending') {
            this.rsiPeriod = 14;
            this.adxThreshold = 25;
        } else if (this.marketCondition === 'Choppy') {
            this.adxThreshold = 30;
        }
    }

    updateStakeWithRisk() {
        if (this.candles1m.length < 20) return false;

        // 3. Use Grade-Based Stake Scaling (Elite Behavior)
        // Uses this.confidence set by analyze()
        const grade = this.predictGrade(this.confidence);
        let qualityMultiplier = 0;

        switch (grade) {
            case 'A': qualityMultiplier = 1.2; break;
            case 'B': qualityMultiplier = 1.0; break;
            case 'C': qualityMultiplier = 0.7; break;
            default: qualityMultiplier = 0; // Skip D & F
        }

        // BLOCK D/F GRADES
        if (qualityMultiplier === 0) {
            this.log(`Skipped trade due to low grade (${grade}). Confidence: ${this.confidence.toFixed(1)}%`);
            this.handleLowGrade(grade);
            return false; // STOP EXECUTION
        } else {
            // Valid Grade: Reset low grade counter
            this.consecutiveLowGrades = 0;
        }

        // Base logic
        let newStake = this.initialStake * qualityMultiplier;

        // Hard Risk Cap: Never risk more than 5% of TOTAL daily starting balance on a single trade
        const hardCap = this.dailyStartBalance * 0.05;

        // Feature: Disable Martingale in High Volatility/Chop
        if (this.marketCondition === 'Choppy') {
            this.log('High Risk (Chop): Reducing Stake & Disabling Aggression');
            newStake = Math.min(newStake, this.initialStake * 0.5);
        } else if (this.isSmallAccount && this.dailyStartBalance > 0) {
            // Small Account Logic: Risk 5% of CURRENT balance
            const currentBalance = this.dailyStartBalance + this.totalProfit;
            const riskAmount = currentBalance * 0.05;
            newStake = Math.max(0.35, riskAmount);
        } else {
            // Standard Smart Risk (ATR based)
            const atrArr = this.calculateATR(this.candles1m, 14);
            const atr = atrArr[atrArr.length-1];
            const price = this.candles1m[this.candles1m.length-1].close;
            if (atr && price) {
                const volatility = atr / price;
                // Inverse volatility scaling
                const volatilityFactor = (0.001 / volatility);
                // Dampen volatility impact if multiplied by high quality
                newStake = newStake * volatilityFactor;
            }
        }

        if (this.consecutiveLosses > 0) newStake *= 0.5;

        // Apply Hard Cap
        newStake = Math.min(newStake, hardCap);

        // Clamp Min/Max
        newStake = Math.max(0.35, Math.min(newStake, this.initialStake * 5));
        this.currentStake = parseFloat(newStake.toFixed(2));

        return true; // OK to trade
    }

    calculateDynamicDuration() {
        return this.durationUnit === 't' ? Math.max(2, Math.min(5, 9)) : this.duration;
    }

    evaluateScore(candles) {
        if (!candles || candles.length < 30) return 0;
        const closes = candles.map(c => parseFloat(c.close));
        const adxArr = this.calculateADX(closes, 14);
        const adx = adxArr[adxArr.length-1] || 0;
        let score = Math.min(adx, 50);
        return score;
    }

    // Watchdog: Atomic Execution Layer
    watchdogAttemptExecution(direction, symbol) {
        // 1. Pre-Check
        if (this.watchdog.state !== 'IDLE' && this.watchdog.state !== 'ANALYZING') return;
        if (this.isPaused) {
            this.log('Signal ignored (Bot Paused).');
            return;
        }
        if (this.hasOpenTrade || this.api.pendingTrade) {
            this.log('Watchdog blocked: Trade already active.');
            return;
        }

        // 2. Latency Check
        if (this.api.latency > 250) {
            this.log(`Watchdog blocked: High Latency (${this.api.latency}ms).`);
            return;
        }

        // Losing Streak Fix: Regime Lock
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

        // 3. Atomic Lock
        this.setWatchdogState('LOCKED');

        // 4. Execution
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

        // Store symbol for binding when contract ID is received
        this.pendingSymbol = symbol;

        // Pass frozen symbol to API
        this.api.placeTrade(direction, this.currentStake, tradeDuration, symbol);

        // 5. Safety Timer (Self-Healing)
        this.watchdog.timeoutId = setTimeout(() => {
            if (this.watchdog.state === 'EXECUTING') {
                this.log('CRITICAL: Trade execution timed out. Resetting Watchdog.');
                this.hasOpenTrade = false;
                this.api.pendingTrade = false; // Force clear
                this.setWatchdogState('IDLE');
            }
        }, 5000);
    }

    setWatchdogState(newState) {
        this.watchdog.state = newState;
        this.watchdog.lastTransition = Date.now();
        if(window.updateWatchdogStatus) window.updateWatchdogStatus(newState);
    }

    // Call this when 'buy' is received
    onTradePlaced(contractId) {
        if(this.watchdog.timeoutId) clearTimeout(this.watchdog.timeoutId);

        // Bind Contract ID to Symbol
        if (this.pendingSymbol) {
            this.activeContracts.set(contractId, this.pendingSymbol);
            this.pendingSymbol = null;
        }

        this.setWatchdogState('MANAGING');
    }

    // Existing methods adapted...

    executeVirtualTrade(direction) {
        if (this.ticks.length === 0) return;

        let tradeDuration = this.useDynamicDuration ? 2 : this.duration;
        const entryPrice = this.ticks[this.ticks.length-1];

        this.log(`[VIRTUAL] Simulating ${direction} trade...`);
        this.hasOpenTrade = true;

        // Simulate asynchronous duration
        this.virtualTrade = {
            entryPrice: entryPrice,
            direction: direction,
            startTime: Date.now(),
            duration: tradeDuration,
            startTickIndex: this.ticks.length
        };
    }

    processVirtualTrade() {
        if (!this.virtualTrade) return;

        const currentTickIndex = this.ticks.length;
        const currentPrice = this.ticks[currentTickIndex - 1];
        const { entryPrice, direction, startTickIndex, duration } = this.virtualTrade;

        // Shadow Trading: Calculate real-time profit/loss %
        let pnlPct = (currentPrice - entryPrice) / entryPrice;
        if (direction === 'fall') pnlPct = -pnlPct;

        // 1. Dynamic Stop Loss (Regime Detection)
        // If price moves against quickly (>0.05%), it's a volatility spike against trend
        if (pnlPct < -0.0005) {
             this.hasOpenTrade = false;
             this.virtualTrade = null;
             // Mark as 'volatility_spike' for Optimizer to learn
             this.handleVirtualResult(false, 'stop_loss');
             return;
        }

        // 2. Momentum Lock (Early Profit)
        // If price moves in favor significantly (>0.1%) within first 2 ticks, simulated win
        if (pnlPct > 0.001 && (currentTickIndex - startTickIndex) <= 2) {
             this.hasOpenTrade = false;
             this.virtualTrade = null;
             this.handleVirtualResult(true, 'momentum_scalp');
             return;
        }

        // 3. Time Expiry
        if (currentTickIndex - startTickIndex >= duration) {
            const isWin = pnlPct > 0;
            this.hasOpenTrade = false;
            this.virtualTrade = null;
            // Check if it was a flat market (choppy) loss
            const reason = !isWin && Math.abs(pnlPct) < 0.0001 ? 'choppy_loss' : 'expiry';
            this.handleVirtualResult(isWin, reason);
        }
    }

    handleVirtualResult(isWin) {
        if (isWin) {
            this.virtualWins++;
            this.virtualLosses = 0;
            this.log(`[VIRTUAL] WON. Streak: ${this.virtualWins}`);
        } else {
            this.virtualWins = 0;
            this.virtualLosses++;
            this.log(`[VIRTUAL] LOST.`);
        }

        // Exit Recovery Mode if consistent
        if (this.virtualWins >= 2) {
            this.isVirtualRecovery = false;
            this.consecutiveLosses = 0; // Reset real loss streak
            this.log(`[RECOVERY] Consistent wins detected. Resuming Real Trading.`);
            if(window.updateRecoveryStatus) window.updateRecoveryStatus(false);
        }
    }

    handleTradeResult(contract) {
        this.hasOpenTrade = false;

        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        // Symbol Integrity Check: Retrieve frozen symbol from map
        const storedSymbol = this.activeContracts.get(contract.contract_id);
        const symbol = contract.underlying_symbol || storedSymbol || this.api.activeSymbol || 'Unknown';

        // Cleanup map
        if (contract.contract_id) this.activeContracts.delete(contract.contract_id);

        // Dynamic Cooldown based on result
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

        // RL Feedback
        // State for RL Update (Regime, ConfidenceBucket)
        // We need to store these when trade was taken to be accurate.
        // For now, let's just use current estimation or if available in trade reasoning.
        if (this.useAIFilter && this.currentTradeReasoning && this.currentTradeReasoning.ai) {
             const aiData = this.currentTradeReasoning.ai;
             // We need regimeId from AI filter predict result.
             // currentTradeReasoning.ai was set in qtAIEngine.
             // But qtAIEngine returns {buy, sell}. We didn't store the full AI object.
             // We need to modify qtAIEngine to store metadata.

             // Since I can't easily pass state through contracts without storage, I'll rely on global state or reconstruction
             // Assuming minimal drift in regime between open and close for short trades.
        }

        // Execution Integrity: Slippage Check
        if (contract.entry_tick && this.currentTradeExpectedPrice) {
            const slippage = Math.abs(contract.entry_tick - this.currentTradeExpectedPrice);
            const slipPct = slippage / this.currentTradeExpectedPrice;
            if (slipPct > 0.0005) {
                this.log(`WARNING: High Slippage Detected (${(slipPct*100).toFixed(4)}%). Expected: ${this.currentTradeExpectedPrice}, Got: ${contract.entry_tick}`);
            }
        }

        // Trade Quality Audit (Grading)
        const grade = this.gradeTrade(isWin, this.currentTradeReasoning);

        // Update Grade Stats
        const cleanGrade = grade.replace('+', '').replace('-', '');
        if (this.gradeStats[cleanGrade] !== undefined) this.gradeStats[cleanGrade]++;
        this.gradeStats.Total++;

        // Grade Drift Monitor
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

        // Feed ONLY A/B trades to AI training (Event-Driven)
        // CRITICAL: Only train if the trade matches the current symbol state
        if (symbol === this.currentSymbol) {
            // Updated to feed trade direction label
            // If contract type was CALL and Win (1) -> Rise (1)
            // If contract type was CALL and Loss (0) -> Fall (0)
            // If contract type was PUT and Win (1) -> Fall (0)
            // If contract type was PUT and Loss (0) -> Rise (1)

            let label = -1;
            const type = contract.contract_type ? contract.contract_type.toLowerCase() : '';
            const isCall = type.includes('call') || type.includes('rise') || type.includes('buy');

            if (isCall) {
                label = isWin ? 1 : 0;
            } else {
                label = isWin ? 0 : 1;
            }

            if (grade.startsWith('A') || grade === 'B') {
                const startTime = contract.date_start;
                const candleIdx = this.candles1m.findIndex(c => Math.abs(c.time - startTime) < 60);
                if (candleIdx !== -1) {
                    // Update: trainAIOnTrade needs to support label
                    // Fix Data Leakage: Use candleIdx - 1 to ensure we train on data available BEFORE the trade
                    const seq = this.extractSequence(candleIdx - 1, 10);
                    if (seq && this.aiFilter.addSample) {
                        this.aiFilter.addSample(seq, label);
                        this.log(`AI Memory Updated with Grade ${grade} Trade (Label: ${label}).`);
                    }
                }
            }

            // RL Update
            // Action taken: We don't track the specific RL action used (0,1,2).
            // We'll treat the bot's existence as "Action 1 (Normal)" or infer.
            // For now, skipping explicit RL feedback loop from here unless we store the Action ID.
        } else {
            this.log(`Skipped AI Training: Symbol mismatch (Trade: ${symbol}, Current: ${this.currentSymbol})`);
        }

        // Enter Virtual Recovery Mode instead of just Cooldown
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

        if (this.optimizer) {
            this.optimizer.onTrade(isWin, this.marketCondition);
        }

        this.log(`Trade Finished. Profit: $${profit.toFixed(2)} (Grade: ${grade})`);

        this.tradeHistory.push({
            time: new Date().toLocaleTimeString(),
            symbol: symbol, // FIXED: Use reliable symbol
            type: contract.contract_type,
            stake: contract.buy_price,
            profit: profit,
            status: isWin ? 'WIN' : 'LOSS',
            grade: grade,
            reasoning: this.currentTradeReasoning
        });

        if (window.updateTradeHistory) window.updateTradeHistory(this.tradeHistory, this.totalProfit, this.wins, this.losses);

        if (this.useMartingale) {
            if (isWin) this.currentStake = this.initialStake;
            else this.currentStake = parseFloat((this.currentStake * this.martingaleMultiplier).toFixed(2));
        } else if (!this.useSmartRisk) {
            this.currentStake = this.initialStake;
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

    // --- Indicators Helpers ---
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
        // Pad with nulls
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
        // True Range
        let tr = [], dmPlus = [], dmMinus = [];
        for(let i=1; i<data.length; i++) {
            // Simplified TR for scalars
            tr.push(Math.abs(data[i] - data[i-1]));
            dmPlus.push(data[i] > data[i-1] ? data[i]-data[i-1] : 0);
            dmMinus.push(data[i] < data[i-1] ? data[i-1]-data[i] : 0);
        }
        // Smooth
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
    // --- Helper Methods to Prevent Crashes ---

    detectCandlePattern(candles) {
        if(candles.length < 5) return 'neutral';
        const c = candles[candles.length-1];
        const prev = candles[candles.length-2];

        // Engulfing
        if (c.close > c.open && prev.close < prev.open && c.close > prev.open && c.open < prev.close) return 'bullish';
        if (c.close < c.open && prev.close > prev.open && c.close < prev.open && c.open > prev.close) return 'bearish';

        // Simple Color (Fallback)
        if(c.close > c.open) return 'bullish';
        if(c.close < c.open) return 'bearish';
        return 'neutral';
    }

    detectOrderBlock(candles) {
        if (candles.length < 5) return 'neutral';
        // Simplified Order Block: Look for the last opposing candle before a strong move
        // Bullish OB: Last Red candle before a strong Green move that breaks structure (or just strong move)
        // Bearish OB: Last Green candle before a strong Red move

        // We look at the last 10 candles
        const lookback = Math.min(candles.length, 10);
        const recent = candles.slice(-lookback);

        // Check for Bullish OB
        // Sequence: Red, Green, Green (Strong)
        for (let i = recent.length - 3; i >= 0; i--) {
            const c1 = recent[i]; // Potential OB
            const c2 = recent[i+1];
            const c3 = recent[i+2]; // Confirmation

            if (!c3) continue;

            const isRed = c1.close < c1.open;
            const isGreen = c1.close > c1.open;

            // Bullish OB Pattern
            if (isRed && c2.close > c2.open && c3.close > c3.open) {
                // Check if move was strong (body size > 2x OB body size)
                const obBody = Math.abs(c1.open - c1.close);
                const moveBody = (c2.close - c2.open) + (c3.close - c3.open);
                if (moveBody > obBody * 2) {
                    // Check if price is currently returning to OB
                    const current = candles[candles.length-1];
                    if (Math.abs(current.close - c1.close) < obBody * 2) {
                        return 'bullish';
                    }
                }
            }

            // Bearish OB Pattern
            if (isGreen && c2.close < c2.open && c3.close < c3.open) {
                const obBody = Math.abs(c1.open - c1.close);
                const moveBody = Math.abs(c2.open - c2.close) + Math.abs(c3.open - c3.close);
                if (moveBody > obBody * 2) {
                     const current = candles[candles.length-1];
                     if (Math.abs(current.close - c1.close) < obBody * 2) {
                        return 'bearish';
                    }
                }
            }
        }

        return 'neutral';
    }

    detectLiquiditySweep(candles) {
        if (candles.length < 10) return 'neutral';
        const lookback = 10;
        const recent = candles.slice(-lookback);
        const current = recent[recent.length-1];

        // Bullish Sweep: Low < Previous Lows, but Close > Previous Lows
        // Find local low in previous candles
        let minLow = Infinity;
        for (let i = 0; i < recent.length - 1; i++) {
            minLow = Math.min(minLow, recent[i].low);
        }

        if (current.low < minLow && current.close > minLow) {
            return 'bullish';
        }

        // Bearish Sweep: High > Previous Highs, but Close < Previous Highs
        let maxHigh = -Infinity;
        for (let i = 0; i < recent.length - 1; i++) {
            maxHigh = Math.max(maxHigh, recent[i].high);
        }

        if (current.high > maxHigh && current.close < maxHigh) {
            return 'bearish';
        }

        return 'neutral';
    }

    calculateKAMA(data, period, fast, slow) {
        let kama = [data[0]];
        const fastSC = 2/(fast+1);
        const slowSC = 2/(slow+1);
        for(let i=1; i<data.length; i++) {
            if(i < period) { kama.push(data[i]); continue; }
            const change = Math.abs(data[i]-data[i-period]);
            let vol = 0;
            for(let j=0; j<period; j++) vol += Math.abs(data[i-j]-data[i-j-1]);
            const er = vol===0 ? 0 : change/vol;
            const sc = Math.pow(er*(fastSC-slowSC)+slowSC, 2);
            kama.push(kama[i-1] + sc * (data[i]-kama[i-1]));
        }
        return kama;
    }

    // Legacy support methods for old strategies
    calculateConfidence(signal, trend1m, bias5m, pattern, ob, sweep) {
        let score = 50;
        if(signal === 'rise' && trend1m === 'up') score += 10;
        if(signal === 'fall' && trend1m === 'down') score += 10;
        if(signal === 'rise' && bias5m === 'up') score += 10;
        if(signal === 'fall' && bias5m === 'down') score += 10;

        // Pattern confluence
        if (signal === 'rise' && pattern === 'bullish') score += 10;
        if (signal === 'fall' && pattern === 'bearish') score += 10;

        // OB confluence
        if (signal === 'rise' && ob === 'bullish') score += 10;
        if (signal === 'fall' && ob === 'bearish') score += 10;

        // Sweep confluence (Strong signal)
        if (signal === 'rise' && sweep === 'bullish') score += 15;
        if (signal === 'fall' && sweep === 'bearish') score += 15;

        return Math.min(100, score);
    }

    checkConflicts(signal) {
        // Market Suitability Filter (Global)
        // If Volatility or Noise engines return poor scores (<0.6), veto EVERYTHING.
        const volScore = this.qtVolatilityEngine();
        const noiseScore = this.qtNoiseEngine();

        if (volScore < 0.6) return true; // Market too dead or too chaotic
        if (noiseScore < 0.6) return true; // Market too noisy

        // Quantum strategy has its own filter chain (Layer 2C/2D), but global veto applies above
        if (this.strategy === 'quantum') return false;

        const c1m = this.candles1m;
        if (c1m.length < 20) return false;

        // 1. Choppy Market Hard Stop
        if (this.marketCondition === 'Choppy') {
             return true;
        }

        // 2. Dead Market Hard Stop
        if (this.marketCondition === 'Low Volatility') return true;

        // 3. RSI Extremes Hard Stop (unless breakout strategy)
        const rsi = this.calculateRSI(this.ticks, 14);
        const lastRsi = rsi[rsi.length-1];

        if (signal === 'rise' && lastRsi > 80) return true; // Too high
        if (signal === 'fall' && lastRsi < 20) return true; // Too low

        // 4. Entropy Filter (Quantum Noise)
        const entropy = this.calculateShannonEntropy(c1m, 30);
        this.currentEntropy = entropy;
        if (entropy > 2.2) return true; // Too chaotic

        return false;
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

    // Feature: Tick Acceleration (2nd Derivative of Price)
    calculateTickAcceleration() {
        if (this.ticks.length < 5) return 0;
        // Velocity: P(t) - P(t-1)
        const t = this.ticks;
        const v1 = t[t.length-1] - t[t.length-2];
        const v2 = t[t.length-2] - t[t.length-3];
        const v3 = t[t.length-3] - t[t.length-4];

        // Acceleration: V(t) - V(t-1)
        const a1 = v1 - v2;
        const a2 = v2 - v3;

        // Smoothed Acceleration
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
            if (score > 0.85) return 'C'; // High confidence loss (Bad luck/Manipulation)
            if (score > 0.75) return 'D';
            return 'F'; // Why did we take this?
        }
    }

    calculateChoppinessIndex(candles, period) {
        let chop = [];
        if (candles.length < period + 1) return [];

        // ATR part
        const atr = this.calculateATR(candles, 1); // True Range of 1 period

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
            if (range === 0) {
                chop.push(50); // Fallback
            } else {
                const ci = 100 * Math.log10(sumTr / range) / Math.log10(period);
                chop.push(ci);
            }
        }
        return chop;
    }

    calculateShannonEntropy(candles, period) {
        if (candles.length < period + 1) return 0;

        // Calculate Log Returns
        const returns = [];
        for (let i = candles.length - period; i < candles.length; i++) {
            const r = Math.log(candles[i].close / candles[i-1].close);
            returns.push(r);
        }

        // Discretize into bins (histogram)
        const bins = {};
        const min = Math.min(...returns);
        const max = Math.max(...returns);
        const binCount = Math.floor(Math.sqrt(period)); // Square root rule
        const binSize = (max - min) / binCount;

        if (binSize === 0) return 0;

        returns.forEach(r => {
            const binIndex = Math.floor((r - min) / binSize);
            const key = binIndex >= binCount ? binCount - 1 : binIndex;
            bins[key] = (bins[key] || 0) + 1;
        });

        // Calculate Entropy
        let entropy = 0;
        for (const key in bins) {
            const p = bins[key] / period;
            entropy -= p * Math.log(p);
        }

        return entropy;
    }

    calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
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
    }
}
