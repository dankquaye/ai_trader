// src/modules/SignalEngine.js

class SignalEngine {
    constructor(regimeDetector) {
        this.regime = regimeDetector;
        this.strategies = {
            'TRENDING_UP': this._stratTrendFollow.bind(this),
            'TRENDING_DOWN': this._stratTrendFollow.bind(this),
            'CHOPPY': this._stratMeanReversion.bind(this),
            'VOLATILE': this._stratVolBreakout.bind(this),
            'LOW_VOLATILITY': () => null,
            'NEUTRAL': () => null
        };
    }

    evaluate(ticks, candles) {
        const regime = this.regime.currentRegime;
        const strategy = this.strategies[regime];

        if (!strategy) return null;

        const rawSignal = strategy(ticks, candles);
        if (!rawSignal) return null;

        // Microstructure Filter (R_100/75 optimization)
        if (!this._confirmMicrostructure(ticks, rawSignal)) {
            return null;
        }

        return rawSignal;
    }

    // --- Strategies ---

    _stratTrendFollow(ticks, candles) {
        const close = candles[candles.length-1].close;
        const ema20 = this._ema(candles.map(c=>c.close), 20);
        const lastEma = ema20[ema20.length-1];

        if (this.regime.currentRegime === 'TRENDING_UP' && close > lastEma) return 'rise';
        if (this.regime.currentRegime === 'TRENDING_DOWN' && close < lastEma) return 'fall';
        return null;
    }

    _stratMeanReversion(ticks, candles) {
        // BB Reversion
        // ...
        return null;
    }

    _stratVolBreakout(ticks, candles) {
        // ...
        return null;
    }

    // --- Filters ---

    _confirmMicrostructure(ticks, direction) {
        // 2-tick confirmation
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

    _ema(data, period) {
        // Quick EMA
        let result = [data[0]];
        const k = 2 / (period + 1);
        for(let i=1; i<data.length; i++) {
            result.push(data[i] * k + result[i-1] * (1-k));
        }
        return result;
    }
}

if(typeof window !== 'undefined') window.SignalEngineClass = SignalEngine;
if(typeof module !== 'undefined') module.exports = SignalEngine;
