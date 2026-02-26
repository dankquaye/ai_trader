// src/modules/RiskManager.js

class RiskManager {
    constructor(state) {
        this.state = state;

        // Limits
        this.maxDailyLoss = 0.10; // 10%
        this.maxDailyProfit = 0.20; // 20%
        this.maxDrawdown = 0.15; // Increased to 15% as per request

        // Sizing
        this.baseKelly = 0.1;
        this.maxStake = 50;

        this.stopReason = null;
    }

    canTrade() {
        if (!this.state) return false;
        const start = this.state.startBalance || this.state.balance;
        if (start === 0) return true;

        const pnl = (this.state.balance - start) / start;

        // 1. Daily Limits
        if (pnl <= -this.maxDailyLoss) { this.stopReason = 'Max Daily Loss'; return false; }
        if (pnl >= this.maxDailyProfit) { this.stopReason = 'Target Hit'; return false; }

        // 2. Drawdown Guard (15%)
        const dd = (this.state.equityHigh - this.state.balance) / this.state.equityHigh;
        if (dd >= this.maxDrawdown) { this.stopReason = 'Max Equity Drawdown'; return false; }

        // 3. Loss Cluster Detection
        if (this.state.consecutiveLosses >= 3) { this.stopReason = 'Loss Cluster (Cooldown)'; return false; }

        return true;
    }

    calculateStake(confidence) {
        // Capped Dynamic Scaling (Kelly-based)
        const history = this.state.recentTrades || [];
        const total = history.length;
        if (total < 10) return Math.max(0.35, this.state.balance * 0.005);

        const wins = history.filter(x => x === 1).length;
        const p = wins / total;
        const b = 0.95;
        const q = 1 - p;

        let kelly = (b * p - q) / b;

        // Strict Caps
        kelly = Math.max(0, Math.min(kelly, 0.25));

        // Adjust
        let stake = this.state.balance * kelly * this.baseKelly;

        // Confidence Scaling
        stake = stake * (confidence / 100);

        // Drawdown Damping: Reduce stake if in drawdown
        const dd = (this.state.equityHigh - this.state.balance) / this.state.equityHigh;
        if (dd > 0.05) stake *= 0.5; // Half size if >5% DD

        // Bounds
        stake = Math.max(0.35, Math.min(stake, this.maxStake));

        return parseFloat(stake.toFixed(2));
    }
}

if(typeof window !== 'undefined') window.RiskManagerClass = RiskManager;
if(typeof module !== 'undefined') module.exports = RiskManager;
