// src/modules/RiskManager.js

class RiskManager {
    constructor(state) {
        this.state = state;

        // Limits
        this.maxDailyLoss = 0.10; // 10%
        this.maxDailyProfit = 0.20; // 20%
        this.maxDrawdown = 0.10; // Hard stop

        // Sizing
        this.baseKelly = 0.1; // Fraction of Kelly to use (0.1 = 10% of Edge)
        this.maxStake = 50;

        this.stopReason = null;
    }

    canTrade() {
        if (!this.state) return false;
        const start = this.state.startBalance || this.state.balance;
        if (start === 0) return true; // Init

        const pnl = (this.state.balance - start) / start;

        // Daily Limits
        if (pnl <= -this.maxDailyLoss) { this.stopReason = 'Max Daily Loss'; return false; }
        if (pnl >= this.maxDailyProfit) { this.stopReason = 'Target Hit'; return false; }

        // Drawdown
        const dd = (this.state.equityHigh - this.state.balance) / this.state.equityHigh;
        if (dd >= this.maxDrawdown) { this.stopReason = 'Max Drawdown'; return false; }

        // Consecutive Losses
        if (this.state.consecutiveLosses >= 3) { this.stopReason = 'Consecutive Losses (Cooldown)'; return false; }

        return true;
    }

    calculateStake(confidence) {
        // Kelly: f = (bp - q) / b
        // b = 0.95 (approx payout)
        // p = Win Rate (Last 20)

        const history = this.state.recentTrades || [];
        const total = history.length;
        if (total < 10) return Math.max(0.35, this.state.balance * 0.005); // Warmup: 0.5% risk

        const wins = history.filter(x => x === 1).length;
        const p = wins / total;
        const b = 0.95;
        const q = 1 - p;

        let kelly = (b * p - q) / b;

        // Caps
        kelly = Math.max(0, Math.min(kelly, 0.25)); // Cap at 25% Kelly

        // Adjust
        let stake = this.state.balance * kelly * this.baseKelly;

        // Confidence Scaling
        stake = stake * (confidence / 100);

        // Bounds
        stake = Math.max(0.35, Math.min(stake, this.maxStake));

        return parseFloat(stake.toFixed(2));
    }
}

if(typeof window !== 'undefined') window.RiskManagerClass = RiskManager;
if(typeof module !== 'undefined') module.exports = RiskManager;
