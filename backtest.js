// backtest.js - Simulation Engine for Bot
class Backtester {
    constructor(api, bot) {
        this.api = api;
        this.bot = bot;
        this.isBacktesting = false;

        // Config
        this.symbol = 'R_100';
        this.granularity = 60; // 1m candles
        this.candleCount = 1000;
        this.tradeDuration = 5; // In candles, for backtesting

        // State
        this.data = [];
        this.trades = [];
        this.equityCurve = [];
        this.results = {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalProfit: 0,
            maxDrawdown: 0,
            startingBalance: 10000
        };

        this.currentBalance = 10000;
    }

    async run(symbol, count = 1000, strategy = 'ultra_instinct', tradeDuration = 5) {
        this.symbol = symbol;
        this.candleCount = count;
        this.tradeDuration = tradeDuration;
        this.isBacktesting = true;

        this.resetStats();

        // Configure Bot for Backtesting
        this.bot.stop(); // Ensure it's not live trading
        this.bot.setBacktestMode(true);

        // Update Bot Config directly
        this.bot.strategy = strategy;
        this.bot.risk = 'medium';
        // this.bot.duration is not stored in state, passed in execution. We simulate it here.

        this.bot.start(); // Logic start

        // Fetch Data
        if (window.logBacktest) window.logBacktest(`Fetching ${count} candles for ${symbol}...`);

        try {
            // Use fetchCandles from deriv-api.js
            // Note: fetchCandles might fetch fewer than requested if API limits apply.
            // We use a loop or just accept what we get.
            // For now, we assume fetchCandles works as expected or returns a chunk.
            const candles = await this.api.fetchCandles(symbol, 60);

            // If we need more history, we might need a different API call, but fetchCandles is what we have.
            // Mocking larger history if needed or just working with what we have.
            if (!candles || candles.length < 50) {
                throw new Error("Insufficient data for backtest (Need > 50 candles)");
            }

            this.data = this.parseCandles(candles);

            if (window.logBacktest) window.logBacktest(`Data loaded (${this.data.length} candles). Running simulation...`);

            // Simulation Loop
            await this.simulate();

            // Finalize
            this.calculateFinalStats();
            this.bot.setBacktestMode(false);
            this.bot.stop();
            this.isBacktesting = false;

            return {
                results: this.results,
                trades: this.trades,
                equity: this.equityCurve
            };

        } catch (e) {
            console.error("Backtest Error:", e);
            this.isBacktesting = false;
            this.bot.setBacktestMode(false);
            throw e;
        }
    }

    resetStats() {
        this.trades = [];
        this.equityCurve = [];
        this.currentBalance = 10000;
        this.results = {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalProfit: 0,
            maxDrawdown: 0,
            startingBalance: 10000
        };
        this.equityCurve.push({ time: 0, value: 10000 });
    }

    parseCandles(candles) {
        // Convert API format to uniform format
        return candles.map(c => ({
            epoch: c.epoch,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));
    }

    async simulate() {
        const total = this.data.length;

        // Need to preload enough history for indicators before trading
        const warmup = 50;

        for (let i = 0; i < total; i++) {
            const candle = this.data[i];

            // Feed 1m data to bot
            this.bot.processCandle(candle, 60);

            // Allow trading only after warmup
            if (i >= warmup && i < total - this.tradeDuration) {

                // Check for signal (Bot state is updated via processCandle)
                // We force an evaluate call if processCandle didn't trigger it (e.g. granularity checks)
                // But bot.processCandle handles logic.
                // We just check the *result* of the logic.

                // We need to inject the tick data corresponding to the candle close for the bot to generate signals that rely on ticks
                // Mock a tick
                await this.bot.processTick({
                    symbol: this.symbol,
                    quote: candle.close,
                    epoch: candle.epoch
                });

                // In the new bot architecture, _evaluate calls _executeTrade.
                // But in backtest mode, we trap the signal?
                // Actually, the bot tries to place a trade via API.
                // We should probably mock the API.placeTrade if we want to capture it,
                // OR just inspect the internal signal state if exposed.

                // Let's use the 'currentSignal' property if available, or 'lastSignal'.
                const signal = this.bot.currentSignal; // Updated from lastSignal

                // Or better, check if the bot *attempted* to trade.
                // But since we didn't mock the API inside the bot instance passed to Backtester,
                // the bot will call api.placeTrade.
                // We should intercept this.

                // BUT, modifying the bot instance method is cleaner for backtesting.
                // Let's rely on 'currentSignal' being set during _evaluate.

                // Note: processTick calls _evaluate. _evaluate sets currentSignal.

                if (signal) {
                    this.executeSimulatedTrade(signal, i, this.data[i].close);
                    // Reset signal to prevent double entry
                    this.bot.currentSignal = null;
                }
            }

            // Yield to UI thread occasionally to prevent freezing
            if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }
    }

    executeSimulatedTrade(direction, currentIndex, entryPrice) {
        const exitIndex = currentIndex + this.tradeDuration;
        if (exitIndex >= this.data.length) return; // Cannot verify

        const exitPrice = this.data[exitIndex].close;
        const stake = this.bot.currentStake || 1;

        let isWin = false;
        let profit = -stake;

        if (direction === 'rise') {
            if (exitPrice > entryPrice) {
                isWin = true;
                profit = stake * 0.95; // 95% payout approx
            }
        } else {
            if (exitPrice < entryPrice) {
                isWin = true;
                profit = stake * 0.95;
            }
        }

        this.currentBalance += profit;

        // Record Trade
        this.trades.push({
            time: new Date(this.data[currentIndex].epoch * 1000).toLocaleString(),
            entryTime: this.data[currentIndex].epoch,
            exitTime: this.data[exitIndex].epoch,
            type: direction,
            entry: entryPrice,
            exit: exitPrice,
            profit: profit,
            result: isWin ? 'WIN' : 'LOSS',
            balance: this.currentBalance
        });

        this.equityCurve.push({
            time: this.data[exitIndex].epoch,
            value: this.currentBalance
        });

        // Update Bot stats if needed
        if(this.bot.learning) {
             this.bot.learning.totalTrades++;
             if(isWin) this.bot.learning.wins++;
        }
    }

    calculateFinalStats() {
        const wins = this.trades.filter(t => t.result === 'WIN').length;
        const total = this.trades.length;

        this.results.totalTrades = total;
        this.results.wins = wins;
        this.results.losses = total - wins;
        this.results.winRate = total > 0 ? (wins / total * 100) : 0;
        this.results.totalProfit = this.currentBalance - this.results.startingBalance;

        // Calculate Drawdown
        let maxPeak = this.results.startingBalance;
        let maxDrawdown = 0;

        for (const t of this.trades) {
            if (t.balance > maxPeak) maxPeak = t.balance;
            const dd = (maxPeak - t.balance) / maxPeak * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }

        this.results.maxDrawdown = maxDrawdown;
    }
}
window.Backtester = Backtester;
