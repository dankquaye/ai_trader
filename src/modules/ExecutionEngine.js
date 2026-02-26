// src/modules/ExecutionEngine.js

class ExecutionEngine {
    constructor(api, state, logger) {
        this.api = api;
        this.state = state;
        this.logger = logger;
        this.watchdogTimer = null;
        this.lastTradeCandleTime = 0;
    }

    attemptExecution(direction, stake, duration, candleTime) {
        // 1. One Trade Per Candle Hard Lock
        if (candleTime <= this.lastTradeCandleTime) {
            return;
        }

        // 2. Micro-Tick Confirmation (Wait for 2 ticks in direction)
        // Note: This logic effectively happens in SignalEngine now, but we can double check here
        // or assume SignalEngine handled it. For clean execution, we proceed.

        // 3. Volatility/Slippage Protection
        if (this._detectVolatilitySpike()) {
            this.logger.warn('Execution Halted: Volatility Spike');
            return;
        }

        // Execute
        this.state.executionLock = true;
        this.lastTradeCandleTime = candleTime;
        this.logger.info(`Executing ${direction.toUpperCase()} | Stake: $${stake.toFixed(2)}`);

        this.api.placeTrade(direction, stake, duration, this.state.symbol || 'R_100');

        // Watchdog
        this._startWatchdog();
    }

    finalizeTrade() {
        this._stopWatchdog();
        this.state.executionLock = false;
        // Cooldown handled in BotController
    }

    forceUnlock() {
        this._stopWatchdog();
        this.state.executionLock = false;
        this.logger.warn('Execution Lock Forced Open');
    }

    _detectVolatilitySpike() {
        // Simple check: if last tick jumped > 3x average range
        // Placeholder for now
        return false;
    }

    _startWatchdog() {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
            if (this.state.executionLock) {
                this.logger.error('Watchdog: Trade Timeout. Recovering...');
                this.forceUnlock();
            }
        }, 15000);
    }

    _stopWatchdog() {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    }
}

if(typeof window !== 'undefined') window.ExecutionEngineClass = ExecutionEngine;
if(typeof module !== 'undefined') module.exports = ExecutionEngine;
