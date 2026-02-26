// bot.js - Central BotController Orchestrator

class BotController {
    constructor(api) {
        this.api = api;

        // State
        this.state = new (window.BotStateClass || require('./src/core/State.js'))();
        this.logger = new (window.BotLoggerClass || require('./src/core/Logger.js'))();

        // Modules
        this.regime = new (window.RegimeDetectorClass || require('./src/modules/RegimeDetector.js'))();
        this.reinforcement = new (window.ReinforcementEngineClass || require('./src/modules/ReinforcementEngine.js'))();
        this.risk = new (window.RiskManagerClass || require('./src/modules/RiskManager.js'))(this.state);
        this.signal = new (window.SignalEngineClass || require('./src/modules/SignalEngine.js'))(this.regime);
        this.execution = new (window.ExecutionEngineClass || require('./src/modules/ExecutionEngine.js'))(api, this.state, this.logger);

        // Config
        this.symbol = 'R_100';
        this.lastCandleTime = 0;
        this.lastAnalysisTime = 0;

        // Debug
        this.debug = false;

        // Aliases for UI
        this.riskManager = this.risk;
        this.regimeDetector = this.regime;
        this.confidenceModel = this.signal; // Signal Engine acts as confidence provider
        this.executionEngine = this.execution;
    }

    start() {
        this.state.isRunning = true;
        this.state.startBalance = this.state.balance || 0;
        this.logger.info('BotController Started. Orchestrating modules...');
        this.api.subscribeTicks(this.symbol);
        this.api.subscribeCandles(this.symbol, 60);
    }

    stop() {
        this.state.isRunning = false;
        this.logger.info('BotController Stopped.');
        this.execution.forceUnlock();
    }

    // --- Core Loop ---

    processTick(tick) {
        if (!this.state.isRunning) return;

        // 1. Ingest
        this.state.updateTick(tick);

        // 2. Throttle Analysis (Debounce)
        const now = Date.now();
        if (now - this.lastAnalysisTime < 200) return; // Max 5 updates/sec
        this.lastAnalysisTime = now;

        // 3. Evaluate
        this._evaluateTick();
    }

    processCandle(candle, granularity) {
        if (granularity !== 60) return;
        this.state.updateCandle(candle);

        // 4. Update Regime (Once per candle or update)
        if (candle.epoch > this.lastCandleTime) {
            this.lastCandleTime = candle.epoch;
            this.regime.update(this.state.ticks, this.state.candles);
            this.signal.invalidateCache(); // Clear indicator cache
            this.logger.debug(`New Candle: ${this.regime.currentRegime.type} (${this.regime.currentRegime.strength}%)`);
        }
    }

    async _evaluateTick() {
        // 1. Checks
        if (this.state.executionLock) return;
        if (!this.risk.canTrade()) {
            if (this.risk.stopReason) {
                this.stop();
                this.logger.warn(`Risk Stop: ${this.risk.stopReason}`);
            }
            return;
        }

        // 2. Signal Generation (Weighted Matrix)
        const evaluation = this.signal.evaluate(this.state.ticks, this.state.candles);
        if (!evaluation || !evaluation.signal) return;

        // 3. Reinforcement Adjustment
        const rlScore = this.reinforcement.getScore(evaluation.strategy);
        const adjustedConfidence = evaluation.confidence * rlScore;

        if (adjustedConfidence < 65) return; // Threshold

        // 4. Execution Sizing
        const stake = this.risk.calculateStake(adjustedConfidence);

        // 5. Execute
        this.execution.attemptExecution(evaluation.signal, stake, 5, this.lastCandleTime);
    }

    // --- Handlers ---

    handleTradeResult(contract) {
        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        // Update State
        this.state.balance += profit;
        this.state.equityHigh = Math.max(this.state.equityHigh, this.state.balance);
        this.state.totalProfit += profit;

        // Update History
        if (isWin) {
            this.state.wins++;
            this.state.consecutiveWins++;
            this.state.consecutiveLosses = 0;
            this.state.recentTrades.push(1);
        } else {
            this.state.losses++;
            this.state.consecutiveWins = 0;
            this.state.consecutiveLosses++;
            this.state.recentTrades.push(0);
        }
        if(this.state.recentTrades.length > 20) this.state.recentTrades.shift();

        // Update RL (Weighted)
        this.reinforcement.update('trend_follow', isWin, this.signal.lastConfidence);

        // Unlock
        this.execution.finalizeTrade();

        // Log
        this.logger.info(`Settled: ${isWin ? 'WIN' : 'LOSS'} ($${profit.toFixed(2)})`);
    }

    setParamLock(val) { this.isParamLocked = val; }
}

// Global Export
if(typeof window !== 'undefined') window.TradingBot = BotController;
if(typeof module !== 'undefined') module.exports = BotController;
