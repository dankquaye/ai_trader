// bot.js - Orchestrator

// Ensure dependencies are loaded (in a real build system, using imports)
// Here we rely on global classes attached to window in browser, or require in node.

class TradingBot {
    constructor(api) {
        this.api = api;

        // Modules
        this.state = new (window.BotStateClass || require('./src/core/State.js'))();
        this.logger = new (window.BotLoggerClass || require('./src/core/Logger.js'))();

        this.regimeDetector = new (window.RegimeDetectorClass || require('./src/modules/RegimeDetector.js'))();
        this.signalEngine = new (window.SignalEngineClass || require('./src/modules/SignalEngine.js'))(this.regimeDetector);
        this.riskManager = new (window.RiskManagerClass || require('./src/modules/RiskManager.js'))(this.state);
        this.executionEngine = new (window.ExecutionEngineClass || require('./src/modules/ExecutionEngine.js'))(api, this.state, this.logger);
        this.reinforcement = new (window.ReinforcementEngineClass || require('./src/modules/ReinforcementEngine.js'))();

        // Config
        this.symbol = 'R_100';
    }

    start() {
        this.state.isRunning = true;
        this.state.startBalance = this.state.balance || 0; // Sync if possible
        this.logger.info('Institutional Bot Started');
        this.api.subscribeTicks(this.symbol);
        this.api.subscribeCandles(this.symbol, 60);
    }

    stop() {
        this.state.isRunning = false;
        this.logger.info('Bot Stopped');
    }

    // --- Pipeline ---

    processTick(tick) {
        if (!this.state.isRunning) return;
        this.state.updateTick(tick);

        // Throttled Regime Update
        if (this.state.ticks.length % 10 === 0) {
            this.regimeDetector.update(this.state.ticks, this.state.candles);
        }

        this._evaluate();
    }

    processCandle(candle, granularity) {
        if(granularity === 60) this.state.updateCandle(candle);
    }

    async _evaluate() {
        // 1. Checks
        if (this.state.executionLock) return;
        if (Date.now() < this.state.cooldownUntil) return;
        if (!this.riskManager.canTrade()) {
            if (this.riskManager.stopReason) {
                this.logger.warn(`Risk Stop: ${this.riskManager.stopReason}`);
                this.stop();
            }
            return;
        }

        // 2. Signal
        const signal = this.signalEngine.evaluate(this.state.ticks, this.state.candles);
        if (!signal) return;

        // 3. Confidence & Reinforcement
        // For now, base confidence 80%, adjusted by RL
        const rlScore = this.reinforcement.getScore('trend_follow'); // Assuming trend strategy
        const confidence = 80 * rlScore;

        if (confidence < 60) return;

        // 4. Sizing
        const stake = this.riskManager.calculateStake(confidence);

        // 5. Execute
        this.executionEngine.execute(signal, stake, 5);
    }

    // --- Handlers ---

    onTradePlaced(id) {
        // Handled by ExecutionEngine implicitly via state lock, but we can log
    }

    handleTradeResult(contract) {
        // Update State
        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        this.state.balance += profit;
        this.state.equityHigh = Math.max(this.state.equityHigh, this.state.balance);
        this.state.totalProfit += profit;

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

        // Update RL
        this.reinforcement.update('trend_follow', isWin); // Simplification: assuming single strategy type for now

        // Release Lock
        this.executionEngine.releaseLock();

        // Cooldown
        this.state.cooldownUntil = Date.now() + (isWin ? 2000 : 5000);

        this.logger.info(`Settled: ${isWin ? 'WIN' : 'LOSS'} ($${profit})`);
    }

    // UI Helpers
    setParamLock(val) { this.isParamLocked = val; }
}

window.TradingBot = TradingBot;
