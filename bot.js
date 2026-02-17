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
        this.lastStrategyChange = 0; // For Rotation Lock

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
        this.hasOpenTrade = false; // Deprecated, use tradeState
        this.tradeState = 'IDLE'; // IDLE, SIGNAL_CONFIRMED, ORDER_SENT, IN_TRADE, TRADE_CLOSED, COOLDOWN
        this.MAX_STAKE = 50; // Safety Cap
        this.STOP_TRADING_LOSSES = 4; // Stop after X consecutive losses
        this.drawdownVelocity = []; // timestamps of losses
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
        this.lastTradeConfidence = 0;
        this.watchdog = { state: 'IDLE', lastTransition: 0, timeoutId: null };
        this.gradeHistory = [];
        this.gradeStats = { A: 0, B: 0, C: 0, D: 0, F: 0, Total: 0 };
        this.activeContracts = new Map();
        this.pendingSymbol = null;

        // --- Learning ---
        this.learning = { totalTrades: 0, wins: 0, threshold: 4.5 };
        this.learningLog = []; // Detailed trade log for adaptation

        // --- Virtual Trading (Recovery) ---
        this.isVirtualRecovery = false;
        this.virtualWins = 0;
        this.virtualLosses = 0;

        this.currentTradeReasoning = null;
        this.currentTradeExpectedPrice = 0;
        this.decisionTrace = [];
    }

    addTrace(stage, status, data = {}) {
        const trace = { time: Date.now(), stage, status, data };
        this.decisionTrace.push(trace);
        if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('bot-trace', { detail: trace }));
        }
    }

    // ============================================================
    // Lifecycle Methods
    // ============================================================

    async start() {
        this.isRunning = true;
        this.lastStrategyChange = Date.now();
        // Start Integrity Watchdog
        this.integrityInterval = setInterval(() => this.checkIntegrity(), 60000);
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
        if(this.integrityInterval) clearInterval(this.integrityInterval);
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

    restoreState(history, profit, wins, losses) {
        this.tradeHistory = history || [];
        this.totalProfit = profit || 0;
        this.wins = wins || 0;
        this.losses = losses || 0;

        // Restore Learning Log
        const learning = localStorage.getItem('derivBotLearning');
        if (learning) {
            try { this.learningLog = JSON.parse(learning); }
            catch(e) { console.error('Failed to load learning log', e); }
        }

        this.log(`Restored ${this.tradeHistory.length} trades and ${this.learningLog.length} learning events.`);
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
        this.resetState(); // Ensure clean slate
        this.log(`Switched to symbol: ${symbol}. State reset.`);
    }

    resetState() {
        this.tradeState = 'IDLE';
        this.hasOpenTrade = false;
        this.watchdog.state = 'IDLE';
        this.api.pendingTrade = false;
        this.lastTradeConfidence = 0; // Reset tracking
        if(this.watchdog.timeoutId) clearTimeout(this.watchdog.timeoutId);
        this.activeContracts.clear();
        this.pendingSymbol = null;
        this.log('Bot state reset.');
        if(window.updateWatchdogStatus) window.updateWatchdogStatus('IDLE');
    }

    updateTradeState(newState, reason) {
        if(this.tradeState !== newState) {
            this.log(`State Transition: ${this.tradeState} -> ${newState} (${reason})`);
            this.tradeState = newState;
            if(window.updateWatchdogStatus) window.updateWatchdogStatus(newState);
        }
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
        this.decisionTrace = [];
        try {
            await this._evaluateSafe();
        } catch (e) {
            console.error('Bot Evaluation Error:', e);
            this.addTrace('Error', 'Critical', { message: e.message });
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
        let result = await this.analyze();

        // Safety Check: Did symbol change during analysis?
        if (this.currentSymbol !== startSymbol) {
            this.log('State changed during analysis. Aborting trade execution.');
            return;
        }

        // 2. EVALUATE SIGNAL SCORE
        if (result && result.direction) {
            this.confidence = result.confidence; // Sync confidence

            // Dynamic Thresholding
            let threshold = 60;
            if (this.marketCondition === 'Volatile') threshold = 80;
            if (this.riskState === 'PROTECT') threshold = 85;
            if (this.isSmallAccount) threshold = 80;

            if (result.confidence < threshold) {
                // this.log(`Signal Ignored: Confidence ${result.confidence.toFixed(1)}% < Threshold ${threshold}%`); // Noisy
                result = null;
            } else {
                const canTrade = this.updateStakeWithRisk(); // Returns false if D/F Grade
                if (!canTrade) result = null;
            }
        }

        // 3. EXECUTE
        if (result) {
            if (this.isBacktesting) {
                this.lastSignal = result.direction;
            } else {
                if (this.tradeState === 'IDLE') {
                    this.updateTradeState('SIGNAL_CONFIRMED', `Signal Validated (${result.confidence.toFixed(1)}%)`);
                    this.watchdogAttemptExecution(result.direction, startSymbol);
                }
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
        // Enforce Regime Rules
        if (!this.checkMarketRegime(this.strategy)) {
            // this.log(`Analysis skipped: Regime mismatch (${this.marketCondition} vs ${this.strategy})`); // Too noisy
            return null;
        }

        const prices = this.ticks;
        const lastPrice = prices[prices.length - 1];

        let signal = null;

        if (this.strategy === 'dynamic') {
             if (this.candles1m.length > 20) {
                const closes = this.candles1m.map(c => c.close);
                const adx = this.calculateADX(closes, 14).pop() || 0;
                if (adx > 25) signal = this.analyzeMultiTF();
             }
        }
        else if (this.strategy === 'random') signal = Math.random() > 0.5 ? 'rise' : 'fall';
        else if (this.strategy === 'rsi') signal = this.analyzeRSI(prices, lastPrice);
        else if (this.strategy === 'sma') signal = this.analyzeSMA(prices);
        else if (this.strategy === 'bb') signal = this.analyzeBB(prices, lastPrice);
        else if (this.strategy === 'neural') signal = this.analyzeNeuralTrend(prices);
        else if (this.strategy === 'ultra_instinct') signal = this.analyzeMultiTF();
        else if (this.strategy === 'quantum') signal = await this.analyzeQuantumEnlargement();

        // Standardize Signal Object if legacy string returned
        if (typeof signal === 'string') {
            return { direction: signal, confidence: this.confidence || 50, strategy: this.strategy };
        }

        return signal; // Assumes objects returned by advanced strategies
    }

    checkMarketRegime(strategy) {
        if (this.marketCondition === 'Analyzing...') return true; // Allow initial
        if (strategy === 'random') return true;

        if (this.marketCondition === 'Trending') {
            return ['ultra_instinct', 'neural', 'sma', 'dynamic', 'quantum'].includes(strategy);
        }
        if (this.marketCondition === 'Ranging') {
            return ['rsi', 'bb', 'quantum'].includes(strategy);
        }
        if (this.marketCondition === 'Volatile') {
            // Only specialized strategies or high risk
            return ['ultra_instinct', 'quantum'].includes(strategy);
        }
        if (this.marketCondition === 'Squeeze') {
            return false; // No trade in squeeze
        }
        return true;
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

        this.addTrace('Quantum', 'Start', { candles: this.candles1m.length });

        // Layer 2: Parallel Probability Engines
        const pTrend = this.qtTrendEngine();
        this.addTrace('Engine', 'Trend', pTrend);

        const pMom = this.qtMomentumEngine();
        this.addTrace('Engine', 'Momentum', pMom);

        const pVol = this.qtVolatilityEngine();
        this.addTrace('Engine', 'Volatility', { val: pVol });

        const pNoise = this.qtNoiseEngine();
        this.addTrace('Engine', 'Noise', { val: pNoise });

        const pAI = await this.qtAIEngine();
        if(pAI) this.addTrace('Engine', 'AI', pAI);

        // --- AI Abstention Logic (Divergence Check) ---
        let activeAI = pAI;
        if (pAI) {
            const techScore = (pTrend.buy + pMom.buy) / 2;
            const aiScore = pAI.buy;
            const divergence = Math.abs(techScore - aiScore);

            // If Technicals are strong (>0.7 or <0.3) and AI disagrees significantly (>0.5 diff)
            // Or if Noise is high, forcing AI to hallucinate
            const isTechStrong = techScore > 0.7 || techScore < 0.3;

            if (isTechStrong && divergence > 0.5) {
                 this.addTrace('AI', 'Abstained', { reason: 'Divergence', tech: techScore, ai: aiScore });
                 this.log(`AI Divergence (Tech: ${techScore.toFixed(2)} vs AI: ${aiScore.toFixed(2)}). Abstaining.`);
                 activeAI = null;
            }
        }
        // ---------------------------------------------

        // Signal Quality Enforcement: Confluence Check
        let buyVotes = 0;
        let sellVotes = 0;
        if (pTrend.buy > 0.5) buyVotes++; else sellVotes++;
        if (pMom.buy > 0.5) buyVotes++; else sellVotes++;

        // AI Vote (Only if Active)
        if (activeAI) {
            if (activeAI.buy > 0.5) buyVotes++; else sellVotes++;
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

        if (!activeAI) {
            const distribute = wAI / 4;
            activeWTrend += distribute;
            activeWMom += distribute;
            activeWVol += distribute;
            activeWNoise += distribute;
            activeWAI = 0;
        }

        const aiBuy = activeAI ? activeAI.buy : 0;
        const aiSell = activeAI ? activeAI.sell : 0;

        const totalWeight = activeWTrend + activeWMom + activeWAI;
        const safeWeight = totalWeight === 0 ? 1 : totalWeight;

        const rawBuy = (pTrend.buy * activeWTrend + pMom.buy * activeWMom + aiBuy * activeWAI) / safeWeight;
        const rawSell = (pTrend.sell * activeWTrend + pMom.sell * activeWMom + aiSell * activeWAI) / safeWeight;

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
        // Strict State Check
        if (this.tradeState !== 'SIGNAL_CONFIRMED') return;
        if (this.isPaused) return;

        // Block Repeated Confidence Levels (Stop over-trading 85%)
        if (this.confidence <= this.lastTradeConfidence && this.confidence < 95) {
            this.addTrace('Execution', 'Blocked', { reason: 'Confidence Stagnation', conf: this.confidence, last: this.lastTradeConfidence });
            this.log(`Execution blocked: Confidence ${this.confidence}% <= Last ${this.lastTradeConfidence}% (Need improvement or >95%).`);
            this.updateTradeState('IDLE', 'Confidence Stagnation');
            return;
        }
        this.lastTradeConfidence = this.confidence;

        // Redundant check for old flags, just in case
        if (this.api.pendingTrade) return;

        // Enhanced Latency Logic
        // < 450ms: Acceptable
        // 450ms - 700ms: Warn, require high confidence (>= 90%)
        // > 700ms: Block
        if (this.api.latency > 700) {
            this.addTrace('Execution', 'Blocked', { reason: 'Critical Latency', latency: this.api.latency });
            this.log(`Execution blocked: Critical Latency (${this.api.latency}ms).`);
            // Short cooldown before retry to let latency settle
            this.updateTradeState('COOLDOWN', 'Latency Block');
            setTimeout(() => {
                if (this.tradeState === 'COOLDOWN') this.updateTradeState('IDLE', 'Latency Cooldown');
            }, 1000);
            return;
        } else if (this.api.latency > 400) {
            // Apply Penalty
            const penalty = (this.api.latency - 400) / 50;
            this.confidence -= penalty;
            this.addTrace('Execution', 'Penalty', { reason: 'Moderate Latency', latency: this.api.latency, penalty });
            this.log(`Latency Penalty (${this.api.latency}ms): -${penalty.toFixed(1)}% Confidence.`);

            if (this.confidence < 90) {
                this.addTrace('Execution', 'Blocked', { reason: 'Latency/Confidence Mismatch', conf: this.confidence });
                this.log(`Execution blocked: Moderate Latency (${this.api.latency}ms) requires 90% confidence.`);
                this.updateTradeState('IDLE', 'Latency/Confidence Mismatch');
                return;
            }
            this.log(`Execution Proceeding with Moderate Latency (${this.api.latency}ms) due to High Confidence.`);
        }

        // Losing Streak Protection
        if (this.consecutiveLosses >= 2) {
            if (this.confidence < 90 && this.marketCondition !== 'Trending') {
                this.addTrace('Execution', 'Blocked', { reason: 'Streak Protection', conf: this.confidence });
                this.log(`Execution blocked: Losing Streak Protection.`);
                this.updateTradeState('IDLE', 'Streak Protection');
                return;
            }
        }

        if (this.isVirtualRecovery) {
            this.executeVirtualTrade(direction);
            this.updateTradeState('IDLE', 'Virtual Trade Executed');
            return;
        }

        // Transition to ORDER_SENT
        this.updateTradeState('ORDER_SENT', 'Placing Order');

        const now = Date.now();
        // Allow rapid re-entry if high confidence (>95%) to catch trends, otherwise rate limit
        if (this.confidence <= 95 && this.lastTradeTime && (now - this.lastTradeTime < 2000)) {
             this.updateTradeState('IDLE', 'Rate Limit');
             return;
        }
        this.lastTradeTime = now;
        this.hasOpenTrade = true; // Keep for legacy compatibility if needed
        this.currentTradeExpectedPrice = this.ticks[this.ticks.length-1];

        let tradeDuration = this.useDynamicDuration ? 2 : this.duration;
        this.log(`[EXEC] Sending ${direction.toUpperCase()} ($${this.currentStake}) on ${symbol}...`);

        this.pendingSymbol = symbol;
        this.api.placeTrade(direction, this.currentStake, tradeDuration, symbol);

        // Strict 2s Timeout for Server Confirmation
        this.watchdog.timeoutId = setTimeout(() => {
            if (this.tradeState === 'ORDER_SENT') {
                this.log('CRITICAL: Order timed out (No Confirmation). Resetting.');
                this.api.pendingTrade = false;
                this.resetState();
            }
        }, 2000);
    }

    // Deprecated but kept for UI compatibility
    setWatchdogState(newState) {
        this.watchdog.state = newState;
        if(window.updateWatchdogStatus) window.updateWatchdogStatus(newState);
    }

    onTradePlaced(contractId) {
        if(this.watchdog.timeoutId) clearTimeout(this.watchdog.timeoutId);

        if (this.pendingSymbol) {
            this.activeContracts.set(contractId, this.pendingSymbol);
            this.pendingSymbol = null;
        }

        this.updateTradeState('IN_TRADE', `Contract ${contractId} Confirmed`);
    }

    handleTradeResult(contract) {
        this.updateTradeState('TRADE_CLOSED', `Profit: ${contract.profit}`);
        this.hasOpenTrade = false;

        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        // Penalize Low Grade Wins
        if (isWin) {
            const grade = this.gradeTrade(true, this.currentTradeReasoning);
            if (grade === 'D' || grade === 'F') {
                this.requiredConfidence = Math.min(95, this.requiredConfidence + 2);
                this.log(`Win with Low Grade (${grade}). Tightening Confidence +2%.`);
            }
        }

        const storedSymbol = this.activeContracts.get(contract.contract_id);
        const symbol = contract.underlying_symbol || storedSymbol || this.api.activeSymbol || 'Unknown';

        if (contract.contract_id) this.activeContracts.delete(contract.contract_id);

        // Adaptive Cooldown Engine using EQS
        let cooldownTime = 2000; // Base
        const eqs = this.calculateEQS(contract);

        if (eqs >= 90) cooldownTime = 1000; // Grade A
        else if (eqs >= 70) cooldownTime = 2000; // Grade B
        else if (eqs >= 50) cooldownTime = 4000; // Grade C
        else cooldownTime = 6000; // Grade D

        if (!isWin) {
            // Loss Penalty
            cooldownTime *= 2;

            // Drawdown Velocity Tracking
            this.drawdownVelocity.push(Date.now());
            this.checkDrawdownVelocity();

            // Enhanced Loss Protection
            if (this.consecutiveLosses >= 2) {
                cooldownTime = Math.max(cooldownTime, 10000); // Min 10s
                this.log(`Consecutive Losses: Extended Cooldown (10s) & Boosting Confidence.`);
                this.requiredConfidence = Math.min(95, this.requiredConfidence + 5);
            }

            if (this.consecutiveLosses >= this.STOP_TRADING_LOSSES) {
                this.log(`Stopped trading due to ${this.STOP_TRADING_LOSSES} consecutive losses.`);
                this.updateTradeState('STOPPED', 'Max Consecutive Losses');
                return;
            }
        }

        this.log(`EQS: ${eqs.toFixed(0)} | Cooldown: ${cooldownTime}ms`);
        if(window.updateEQS) window.updateEQS(eqs);
        this.updateTradeState('COOLDOWN', `Wait ${cooldownTime}ms`);
        setTimeout(() => {
            if (this.tradeState === 'COOLDOWN') {
                this.updateTradeState('IDLE', 'Cooldown Complete');
            }
        }, cooldownTime);

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

    // --- Fail-Safes ---

    checkIntegrity() {
        // State Integrity Watchdog
        // Checks if bot is stuck in a transient state for too long
        if (this.tradeState === 'ORDER_SENT' || this.tradeState === 'IN_TRADE') {
            const stuckTime = Date.now() - this.lastTradeTime;
            if (stuckTime > 120000) { // 2 minutes stuck
                this.log('CRITICAL: Bot Stuck in Active State > 2m. Force Reset.');
                this.resetState();
            }
        }
    }

    triggerCircuitBreaker(reason) {
        this.log(`CIRCUIT BREAKER TRIGGERED: ${reason}`);
        this.stop();
        this.updateTradeState('STOPPED', 'Circuit Breaker');
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

    calculateEQS(trade) {
        // Execution Quality Score (0-100)
        // Factors: Latency, Slippage

        let score = 100;
        const details = { latency: 0, slippage: 0 };

        // 1. Latency Impact
        if (this.api.latency > 700) { score -= 40; details.latency = 40; }
        else if (this.api.latency > 450) { score -= 20; details.latency = 20; }
        else if (this.api.latency > 250) { score -= 10; details.latency = 10; }

        // 2. Slippage Impact
        if (trade && trade.entry_tick && this.currentTradeExpectedPrice) {
            const slip = Math.abs(trade.entry_tick - this.currentTradeExpectedPrice);
            const slipPct = slip / this.currentTradeExpectedPrice;

            if (slipPct > 0.0005) { score -= 30; details.slippage = 30; } // >0.05%
            else if (slipPct > 0.0001) { score -= 10; details.slippage = 10; } // >0.01%
        }

        this.log(`EQS Calc: -${details.latency} Latency, -${details.slippage} Slippage. Final: ${Math.max(0, score)}`);
        return Math.max(0, score);
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

        // Outcome-Weighted Learning
        // High confidence loss = heavy penalty
        // Low latency win = high reward
        let weight = 1;
        if (!isWin && this.confidence > 90) weight = 2; // Penalize failed sure-bets
        if (isWin && this.api.latency < 250) weight = 1.5; // Reward fast execution

        // Log Details
        if (this.currentTradeReasoning) {
            this.learningLog.push({
                isWin,
                weight,
                eqs: this.calculateEQS(),
                reasoning: this.currentTradeReasoning,
                timestamp: Date.now()
            });
            if (this.learningLog.length > 50) this.learningLog.shift();
        }

        this.adaptConfidence(isWin, weight);
        this.checkStrategyHealth();

        // Persist Learning Log
        localStorage.setItem('derivBotLearning', JSON.stringify(this.learningLog));
        if(window.saveSettings) window.saveSettings();
    }

    checkStrategyHealth() {
        // Strategy Rotation Lock & Health Score
        if (!this.lastStrategyChange) this.lastStrategyChange = Date.now();
        const duration = (Date.now() - this.lastStrategyChange) / 60000; // Minutes

        // Health Score (0-100) with Forgetting Factor
        let health = 100;
        // Prioritize last 5 trades more than 5-10
        const recent = this.learningLog.slice(-10);
        if (recent.length === 0) return;

        let weightedScore = 0;
        let totalWeight = 0;

        recent.forEach((log, i) => {
            const w = i + 1; // Later trades have higher weight
            weightedScore += (log.isWin ? 100 : 0) * w;
            totalWeight += w;
        });

        const weightedWinRate = weightedScore / totalWeight;
        health = weightedWinRate; // Base health on weighted win rate

        const avgEQS = recent.reduce((a, b) => a + (b.eqs || 0), 0) / (recent.length || 1);
        health -= (100 - avgEQS) * 0.2; // Minor Execution impact

        if (this.drawdownVelocity.length > 1) health -= 20;

        if (window.updateHealth) window.updateHealth(health);

        if (health < 40 && duration > 10) { // Min 10 min runtime before switching
             this.log(`Strategy Health Critical (${health.toFixed(0)}). Suggesting Rotation.`);
             // Could auto-switch here if multiple strategies enabled
        }
    }

    adaptConfidence(isWin, weight = 1) {
        // Escalation Logic with Weighting
        if (!isWin) {
            // Escalation on loss
            const increase = 3 * weight;
            this.requiredConfidence = Math.min(95, this.requiredConfidence + increase);
            this.log(`Loss detected (W:${weight}). Confidence req +${increase}% -> ${this.requiredConfidence.toFixed(1)}%`);
        } else {
            // Decay
            let base = 60;
            if (this.marketCondition === 'Volatile') base = 80;
            if (this.riskState === 'PROTECT') base = 85;

            this.requiredConfidence = Math.max(base, this.requiredConfidence - 1);
        }
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
    // ============================================================
    // Strategy Logic (Missing Implementations)
    // ============================================================

    analyzeMultiTF() {
        if (this.candles1m.length < 50) return null;

        // Trend (EMA)
        const c1m = this.candles1m;
        const closes1m = c1m.map(c => c.close);
        const ema20 = this.calculateEMA(closes1m, 20);
        const ema50 = this.calculateEMA(closes1m, 50);
        const lastEma20 = ema20[ema20.length - 1];
        const lastEma50 = ema50[ema50.length - 1];
        const lastPrice = closes1m[closes1m.length - 1];

        const isUptrend = lastEma20 > lastEma50 && lastPrice > lastEma20;
        const isDowntrend = lastEma20 < lastEma50 && lastPrice < lastEma20;

        // Momentum (RSI)
        const rsi = this.calculateRSI(closes1m, 14);
        const lastRsi = rsi[rsi.length - 1];

        // Volatility (BB)
        const bb = this.calculateBollingerBands(closes1m, 20, 2);
        const lastBB = bb[bb.length - 1];

        let signal = null;
        this.confidence = 60; // Base confidence

        if (isUptrend) {
            if (lastRsi < 70 && lastPrice > lastBB.middle) {
                signal = 'rise';
                if (lastRsi > 50) this.confidence += 10;
            }
        } else if (isDowntrend) {
            if (lastRsi > 30 && lastPrice < lastBB.middle) {
                signal = 'fall';
                if (lastRsi < 50) this.confidence += 10;
            }
        }

        // Higher Timeframe Confirmation (5m)
        if (signal && this.candles5m.length > 20) {
            const closes5m = this.candles5m.map(c => c.close);
            const ema50_5m = this.calculateEMA(closes5m, 50);
            const lastEma50_5m = ema50_5m[ema50_5m.length - 1];
            const lastPrice5m = closes5m[closes5m.length - 1];

            if (signal === 'rise' && lastPrice5m > lastEma50_5m) this.confidence += 15;
            else if (signal === 'fall' && lastPrice5m < lastEma50_5m) this.confidence += 15;
            else this.confidence -= 10; // Divergence
        }

        this.currentTradeReasoning = {
            strategy: 'Ultra Instinct (Multi-TF)',
            trend: isUptrend ? 'UP' : (isDowntrend ? 'DOWN' : 'FLAT'),
            rsi: lastRsi.toFixed(1),
            finalScore: this.confidence / 100
        };

        return signal;
    }

    detectMarketCondition() {
        if (this.candles1m.length < 50) return;

        const closes = this.candles1m.map(c => c.close);
        const adx = this.calculateADX(closes, 14);
        const lastAdx = adx[adx.length - 1] || 0;

        // Enhanced Anti-Chop Protection
        const rsi = this.calculateRSI(closes, 14);
        const lastRsi = rsi[rsi.length-1];
        const bb = this.calculateBollingerBands(closes, 20, 2);
        const lastBB = bb[bb.length - 1];
        const width = (lastBB.upper - lastBB.lower) / lastBB.middle;

        // Combined Metric: RSI + ADX + BB Width
        // Fixed condition to be less restrictive for mock testing but strict in reality
        // RSI Flat AND (Low ADX OR Low Volatility)
        const isRsiFlat = lastRsi > 45 && lastRsi < 55;
        const isLowAdx = lastAdx < 20;
        const isSqueeze = width < 0.002;

        if (isRsiFlat && (isLowAdx || isSqueeze)) {
            this.marketCondition = 'Choppy';
            // Force WAIT unless confidence is extremely high
            // Persist WAIT for at least 1 candle cycle (60s) to prevent flickering
            if (this.riskState !== 'WAIT') {
                this.setRiskState('WAIT', 'Anti-Chop: Low Volatility/Momentum');
                this.cooldownEndTime = Date.now() + 60000;
            }
            return;
        }

        // Simple Regime Detection
        if (lastAdx > 25) {
            this.marketCondition = 'Trending';
        } else {
            const bb = this.calculateBollingerBands(closes, 20, 2);
            const lastBB = bb[bb.length - 1];
            const width = (lastBB.upper - lastBB.lower) / lastBB.middle;

            if (width < 0.002) this.marketCondition = 'Squeeze';
            else if (width > 0.005) this.marketCondition = 'Volatile';
            else this.marketCondition = 'Ranging'; // Choppy
        }
    }

    determineRiskState() {
        // State Machine based on recent performance
        if (this.consecutiveLosses >= 2) {
            this.setRiskState('PROTECT', 'Consecutive Losses');
        } else if (this.marketCondition === 'Trending' && this.wins > this.losses) {
            this.setRiskState('AGGRESSIVE', 'Winning in Trend');
        } else if (this.marketCondition === 'Ranging') {
            this.setRiskState('WAIT', 'Ranging Market');
        } else {
            this.setRiskState('NORMAL', 'Balanced');
        }
    }

    setRiskState(state, reason) {
        if (this.riskState !== state) {
            this.riskState = state;
            this.log(`Risk State changed to ${state} (${reason})`);
        }
    }

    adjustParameters() {
        // Dynamic adjustment based on Risk State
        if (this.riskState === 'AGGRESSIVE') {
            this.params.confidenceThreshold = 0.70;
            this.useDynamicDuration = true;
        } else if (this.riskState === 'PROTECT') {
            this.params.confidenceThreshold = 0.90;
            this.useDynamicDuration = false;
        } else {
            this.params.confidenceThreshold = 0.80; // Normal
        }
    }

    updateStakeWithRisk() {
        if (this.riskState === 'WAIT') return false; // Do not trade

        // Check Grade History
        if (this.gradeHistory.length >= 5) {
             const avgGrade = this.gradeHistory.reduce((a, b) => a + b, 0) / this.gradeHistory.length;
             if (avgGrade < 1.5) { // Mostly D's and F's
                 this.log("Low Grade Average. Skipping Trade.");
                 return false;
             }
        }

        // Dynamic Stake Calculation
        if (this.useSmartRisk) {
            this.currentStake = this.calculateDynamicStake();
        } else {
            this.currentStake = this.initialStake;
        }

        return true;
    }

    calculateDynamicStake() {
        let stake = this.currentStake;
        if (this.useMartingale) return stake; // Martingale handles its own logic

        // Stake Elasticity
        if (this.riskState === 'AGGRESSIVE') {
            stake = this.initialStake * 1.5;
        } else {
            stake = this.initialStake;
        }

        if (this.marketCondition === 'Trending' && this.confidence > 90) {
            stake *= 1.2; // Gradual growth in strong trend
        } else if (this.marketCondition === 'Choppy' || this.isVirtualRecovery) {
            stake = this.initialStake; // Minimal stake
        } else if (this.api.latency > 450) {
            stake *= 0.8; // Reduce stake in high latency
        }

        // Never increase stake after D grade
        const lastGrade = this.gradeHistory[this.gradeHistory.length - 1];
        if (lastGrade <= 1) stake = Math.min(stake, this.initialStake);

        return parseFloat(Math.min(stake, this.MAX_STAKE).toFixed(2));
    }

    checkDrawdownVelocity() {
        const now = Date.now();
        // Clean old events (> 5 minutes)
        this.drawdownVelocity = this.drawdownVelocity.filter(t => now - t < 300000);

        // Trigger PROTECT if > 3 losses in 5 minutes
        if (this.drawdownVelocity.length >= 3) {
            if (this.riskState !== 'PROTECT') {
                this.setRiskState('PROTECT', 'High Drawdown Velocity');
                this.log('High Loss Speed Detected! Entering PROTECT mode.');
            }
        }
    }

    detectOrderBlock(candles) { return 'neutral'; }
    detectLiquiditySweep(candles) { return 'neutral'; }
    calculateChoppinessIndex(candles, period) { return []; } // Simplified stub for cleanup if unused in main flow or fully implemented
    calculateShannonEntropy(candles, period) {
        if (candles.length < period + 1) return 0;
        const returns = [];
        for (let i = candles.length - period; i < candles.length; i++) {
            const ratio = candles[i].close / candles[i-1].close;
            if (ratio <= 0) returns.push(0); // Safety check
            else returns.push(Math.log(ratio));
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

TradingBot.prototype.handleVirtualResult = function(isWin, exitReason = null) {
    // Calculate grade of this virtual trade to ensure quality
    // Mock currentTradeReasoning if missing for robustness
    const reasoning = this.currentTradeReasoning || { finalScore: 0.5 };
    let grade = this.gradeTrade(isWin, reasoning);

    if (isWin) {
        // Quality Check: Only count win if grade is better than D
        if (!grade.includes('D') && !grade.includes('F')) {
            this.virtualWins++;
            this.virtualLosses = 0;
            this.log(`[VIRTUAL] WON (Grade ${grade}). Streak: ${this.virtualWins}`);
        } else {
            this.log(`[VIRTUAL] WON but Low Quality (Grade ${grade}). Streak not incremented.`);
        }
    } else {
        this.virtualWins = 0;
        this.virtualLosses++;
        this.log(`[VIRTUAL] LOST.`);
    }

    // Strengthened Exit Condition: 4 wins needed
    if (this.virtualWins >= 4) {
        this.log(`[RECOVERY] 4 Consistent High-Quality Wins. Resuming Real Trading in 5s...`);
        this.currentStake = this.initialStake; // Reset stake to minimum
        this.consecutiveLosses = 0;
        this.isVirtualRecovery = false;

        // Strict cooldown on exit
        this.updateTradeState('COOLDOWN', 'Recovery Exit');
        setTimeout(() => {
            if (this.tradeState === 'COOLDOWN') this.updateTradeState('IDLE', 'Recovery Complete');
            if(window.updateRecoveryStatus) window.updateRecoveryStatus(false);
        }, 5000);
    }
};
