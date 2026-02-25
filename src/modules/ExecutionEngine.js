// src/modules/ExecutionEngine.js

class ExecutionEngine {
    constructor(api, state, logger) {
        this.api = api;
        this.state = state;
        this.logger = logger;
        this.watchdogTimer = null;
    }

    execute(direction, stake, duration) {
        if (this.state.executionLock) {
            this.logger.warn('Execution Blocked: Lock Active');
            return;
        }

        this.state.executionLock = true;
        this.logger.info(`Executing ${direction.toUpperCase()} | Stake: ${stake}`);

        this.api.placeTrade(direction, stake, duration, this.state.symbol || 'R_100');

        // Watchdog
        this._startWatchdog();
    }

    onTradeResult(contract) {
        this._stopWatchdog();
        // State update handled by Bot -> State
        // Here we just release lock
        // But strict mode: release lock only after settlement logic in Bot
        // We provide a release method
    }

    releaseLock() {
        this.state.executionLock = false;
        this.logger.info('Execution Lock Released');
    }

    _startWatchdog() {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
            if (this.state.executionLock) {
                this.logger.error('Watchdog: Trade Timeout. Forcing Unlock.');
                this.releaseLock();
            }
        }, 15000); // 15s max for 5t trade
    }

    _stopWatchdog() {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    }
}

if(typeof window !== 'undefined') window.ExecutionEngineClass = ExecutionEngine;
if(typeof module !== 'undefined') module.exports = ExecutionEngine;
