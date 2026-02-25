// src/core/State.js - Global State Container

class State {
    constructor() {
        // Market Data
        this.ticks = [];
        this.candles = [];
        this.maxTicks = 3000;
        this.maxCandles = 1000;

        // Account
        this.balance = 0;
        this.startBalance = 0;
        this.equityHigh = 0;

        // Performance
        this.tradeHistory = [];
        this.recentTrades = []; // Windowed
        this.totalProfit = 0;
        this.wins = 0;
        this.losses = 0;
        this.consecutiveWins = 0;
        this.consecutiveLosses = 0;
        this.maxDrawdown = 0;

        // System
        this.isRunning = false;
        this.executionLock = false;
        this.lastTradeTime = 0;
        this.cooldownUntil = 0;
    }

    updateTick(tick) {
        this.ticks.push(tick.quote);
        if(this.ticks.length > this.maxTicks) this.ticks.shift();
    }

    updateCandle(candle) {
        if(this.candles.length > 0 && this.candles[this.candles.length-1].time === candle.epoch) {
            this.candles[this.candles.length-1] = this.normalizeCandle(candle);
        } else {
            this.candles.push(this.normalizeCandle(candle));
            if(this.candles.length > this.maxCandles) this.candles.shift();
        }
    }

    normalizeCandle(c) {
        return {
            time: c.epoch,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        };
    }
}

// Singleton for easy access across modules (or instantiate in Bot)
// window.BotState = new State();
// We will instantiate in Bot to avoid global pollution if possible, but keep class export.
if(typeof window !== 'undefined') window.BotStateClass = State;
if(typeof module !== 'undefined') module.exports = State;
