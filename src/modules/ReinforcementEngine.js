// src/modules/ReinforcementEngine.js

class ReinforcementEngine {
    constructor() {
        // Weights for signals
        this.weights = {
            'trend_follow': 1.0,
            'mean_reversion': 1.0,
            'breakout': 1.0
        };

        // Stats
        this.stats = {
            'trend_follow': { wins: 0, total: 0 },
            'mean_reversion': { wins: 0, total: 0 },
            'breakout': { wins: 0, total: 0 }
        };
    }

    update(signalType, isWin) {
        if (!this.stats[signalType]) return;

        this.stats[signalType].total++;
        if (isWin) this.stats[signalType].wins++;

        // Adjust Weight
        const wr = this.stats[signalType].wins / this.stats[signalType].total;

        // Simple RL: Boost if WR > 55%, decay if < 45%
        if (wr > 0.55) this.weights[signalType] = Math.min(1.5, this.weights[signalType] + 0.05);
        else if (wr < 0.45) this.weights[signalType] = Math.max(0.5, this.weights[signalType] - 0.05);
    }

    getScore(signalType) {
        return this.weights[signalType] || 1.0;
    }
}

if(typeof window !== 'undefined') window.ReinforcementEngineClass = ReinforcementEngine;
if(typeof module !== 'undefined') module.exports = ReinforcementEngine;
