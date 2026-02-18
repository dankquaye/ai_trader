// backtest.js - Simulation Engine for AI Bot
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
        this.bot.updateConfig(strategy, 'medium'); // Default risk
        this.bot.setDuration(tradeDuration, 'm'); // Force minutes for backtest logic
        this.bot.start(); // Logic start

        // Fetch Data
        if (window.logBacktest) window.logBacktest(`Fetching ${count} candles for ${symbol}...`);

        try {
            const candles = await this.api.getHistoricalCandles(symbol, 60, count + 200); // Buffer for indicators

            if (!candles || candles.length < 200) {
                throw new Error("Insufficient data for backtest");
            }

            this.data = this.parseCandles(candles);

            if (window.logBacktest) window.logBacktest(`Data loaded. Running simulation...`);

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
        const warmup = 200;

        // Aggregate 5m candles
        let temp5m = { open: 0, high: -Infinity, low: Infinity, close: 0, time: 0, count: 0 };

        for (let i = 0; i < total; i++) {
            const candle = this.data[i];

            // Feed 1m data to bot
            this.bot.processCandle(candle, 60);

            // Aggregate 5m data
            if (temp5m.count === 0) {
                temp5m.open = candle.open;
                temp5m.time = Math.floor(candle.epoch / 300) * 300;
            }
            temp5m.high = Math.max(temp5m.high, candle.high);
            temp5m.low = Math.min(temp5m.low, candle.low);
            temp5m.close = candle.close;
            temp5m.count++;

            // Close 5m candle every 5 minutes or if time block changes
            const nextCandle = this.data[i+1];
            if (temp5m.count === 5 || (nextCandle && Math.floor(nextCandle.epoch / 300) * 300 !== temp5m.time)) {
                this.bot.processCandle({
                    epoch: temp5m.time,
                    open: temp5m.open,
                    high: temp5m.high,
                    low: temp5m.low,
                    close: temp5m.close
                }, 300); // 5m granularity

                // Reset
                temp5m = { open: 0, high: -Infinity, low: Infinity, close: 0, time: 0, count: 0 };
            }

            // Allow trading only after warmup
            if (i >= warmup && i < total - this.tradeDuration) {

                // Check for signal (Bot state is updated via processCandle)
                // In backtest mode, bot.analyze() is called inside processCandle -> evaluate
                // We access the result stored in bot.lastSignal

                const signal = this.bot.lastSignal;

                if (signal) {
                    this.executeSimulatedTrade(signal, i, this.data[i].close);
                }
            }

            // Yield to UI thread occasionally to prevent freezing
            if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }
    }

    executeSimulatedTrade(direction, currentIndex, entryPrice) {
        // Skip if trade overlaps? (Optional, let's allow concurrent for stress test or block)
        // Simple logic: One trade at a time
        // Since we are iterating candle by candle, we just record it.
        // We look ahead 'tradeDuration' candles

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

        // Update Bot internal state (Learning)
        this.bot.updateLearning(isWin);
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
