// src/modules/ReinforcementEngine.js

class ReinforcementEngine {
    constructor() {
        this.weights = {
            'trend_follow': 1.0,
            'mean_reversion': 1.0,
            'breakout': 1.0
        };

        this.stats = {
            'trend_follow': { score: 0, count: 0 },
            'mean_reversion': { score: 0, count: 0 },
            'breakout': { score: 0, count: 0 }
        };
    }

    update(signalType, isWin, confidence) {
        if (!this.stats[signalType]) return;

        // Weighted Scoring
        // Win: +1 * (Confidence/100)
        // Loss: -1.5 * (Confidence/100) (Penalty for high confidence loss)

        const weight = confidence / 100;
        const outcome = isWin ? 1.0 : -1.5;
        const scoreChange = outcome * weight;

        this.stats[signalType].count++;
        this.stats[signalType].score += scoreChange;

        // Adjust Weight Dynamic
        // Sigmoid-like clamping [0.5, 1.5]
        const currentScore = this.stats[signalType].score;
        let newWeight = 1.0 + (currentScore / 10);
        newWeight = Math.max(0.5, Math.min(1.5, newWeight));

        this.weights[signalType] = newWeight;
    }

    getScore(signalType) {
        return this.weights[signalType] || 1.0;
    }
}

if(typeof window !== 'undefined') window.ReinforcementEngineClass = ReinforcementEngine;
if(typeof module !== 'undefined') module.exports = ReinforcementEngine;
