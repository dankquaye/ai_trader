// src/modules/SignalEngine.js

class SignalEngine {
    constructor(regimeDetector) {
        this.regime = regimeDetector;
        this.lastConfidence = 0;
        this.cache = { lastEpoch: 0, indicators: {} };
    }

    invalidateCache() {
        this.cache = { lastEpoch: 0, indicators: {} };
    }

    evaluate(ticks, candles) {
        if(candles.length === 0) return null;

        // 1. Caching
        const currentEpoch = candles[candles.length-1].epoch;
        if(this.cache.lastEpoch === currentEpoch && this.cache.result) {
            // Return cached result if tick is within same candle (debounce handled in Bot)
            // But we might want to re-evaluate on ticks for microstructure?
            // For now, let's allow re-eval but re-use indicator calcs if expensive.
        }

        const regime = this.regime.currentRegime;
        if (regime.type === 'LOW_VOLATILITY' || regime.type === 'CHOPPY') return null;

        // 2. Weighted Scoring Matrix
        let score = 0;
        let signal = null;
        let strategyName = 'neutral';

        // Factor A: Trend (Weight 40)
        const trendScore = this._scoreTrend(candles, regime);
        score += trendScore;

        // Factor B: Momentum (Weight 30)
        const momScore = this._scoreMomentum(candles);
        score += momScore;

        // Factor C: Microstructure (Weight 30) - Calculated on Ticks
        const microScore = this._scoreMicrostructure(ticks);
        score += microScore;

        this.lastConfidence = Math.abs(score);

        // Decision
        if (score > 60) { signal = 'rise'; strategyName = 'trend_follow'; }
        else if (score < -60) { signal = 'fall'; strategyName = 'trend_follow'; }

        if (signal) {
            // Final Microstructure Gate
            if (!this._confirmMicrostructure(ticks, signal)) return null;
        }

        return { signal, confidence: this.lastConfidence, strategy: strategyName };
    }

    // --- Scoring ---

    _scoreTrend(candles, regime) {
        // SMA Slope + Regime
        // Range: -40 to +40
        if (regime.type === 'TRENDING_UP') return 30;
        if (regime.type === 'TRENDING_DOWN') return -30;
        return 0;
    }

    _scoreMomentum(candles) {
        // RSI
        // Range: -30 to +30
        const rsi = this.regime.currentRegime.details.rsi || 50;
        if (rsi < 30) return 25; // Oversold -> Reversal Up or Strong Trend Down?
        // Wait, "Ultra Instinct" logic was: pullback in trend.
        // If Trend UP and RSI < 30 -> Buy Dip.
        // If Trend DOWN and RSI > 70 -> Sell Rip.

        // Let's align with that:
        // If we want to buy, we want positive score.
        if (rsi < 35) return 20;
        if (rsi > 65) return -20;
        return 0;
    }

    _scoreMicrostructure(ticks) {
        // Tick Impulse
        // Range: -30 to +30
        if(ticks.length < 5) return 0;
        const last = ticks[ticks.length-1];
        const prev = ticks[ticks.length-2];
        const diff = last - prev;

        if (diff > 0.05) return 20;
        if (diff < -0.05) return -20;
        return 0;
    }

    // --- Filters ---

    _confirmMicrostructure(ticks, direction) {
        // 2-tick confirmation (Hard Gate)
        if (ticks.length < 3) return false;
        const t1 = ticks[ticks.length-1];
        const t2 = ticks[ticks.length-2];
        const t3 = ticks[ticks.length-3];

        if (direction === 'rise') {
            return t1 > t2 && t2 > t3;
        } else {
            return t1 < t2 && t2 < t3;
        }
    }
}

if(typeof window !== 'undefined') window.SignalEngineClass = SignalEngine;
if(typeof module !== 'undefined') module.exports = SignalEngine;
