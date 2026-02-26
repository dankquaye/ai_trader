// src/modules/RegimeDetector.js

class RegimeDetector {
    constructor() {
        this.currentRegime = {
            type: 'NEUTRAL',
            strength: 0,
            details: {}
        };
    }

    update(ticks, candles) {
        if(candles.length < 20) return;

        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);

        // 1. ATR (Volatility)
        const atr = this._calculateATR(highs, lows, closes, 14);
        const currentATR = atr[atr.length-1];

        // 2. RSI (Momentum)
        const rsi = this._calculateRSI(closes, 14);
        const currentRSI = rsi[rsi.length-1];

        // 3. MA Slope (Trend)
        const sma20 = this._calculateSMA(closes, 20);
        const slope = (sma20[sma20.length-1] - sma20[sma20.length-5]) / 5;

        // 4. Body Ratio (Momentum Strength)
        const lastCandle = candles[candles.length-1];
        const bodySize = Math.abs(lastCandle.close - lastCandle.open);
        const totalSize = lastCandle.high - lastCandle.low;
        const bodyRatio = totalSize > 0 ? bodySize / totalSize : 0;

        // Classification
        const price = closes[closes.length-1];
        const volatilityPct = (currentATR / price) * 100;

        let type = 'NEUTRAL';
        let strength = 50;

        if (volatilityPct < 0.02) {
            type = 'LOW_VOLATILITY';
            strength = 20;
        } else if (volatilityPct > 0.5) {
            type = 'VOLATILE';
            strength = 90;
        } else {
            if (slope > 0.05 && currentRSI > 55) {
                type = 'TRENDING_UP';
                strength = Math.min(100, 50 + (slope*100) + (bodyRatio*20));
            } else if (slope < -0.05 && currentRSI < 45) {
                type = 'TRENDING_DOWN';
                strength = Math.min(100, 50 + (Math.abs(slope)*100) + (bodyRatio*20));
            } else {
                type = 'CHOPPY';
                strength = 40;
            }
        }

        this.currentRegime = {
            type: type,
            strength: Math.floor(strength),
            details: { atr: currentATR, rsi: currentRSI, slope: slope, bodyRatio: bodyRatio }
        };
    }

    _calculateATR(high, low, close, period) {
        let tr = [];
        for(let i=1; i<close.length; i++) {
            tr.push(Math.max(high[i]-low[i], Math.abs(high[i]-close[i-1]), Math.abs(low[i]-close[i-1])));
        }
        return this._calculateSMA(tr, period);
    }

    _calculateRSI(data, period) {
        let rsi = [];
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const change = data[i] - data[i-1];
            if (change > 0) gains += change; else losses += Math.abs(change);
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i] - data[i-1];
            let gain = change > 0 ? change : 0;
            let loss = change < 0 ? Math.abs(change) : 0;
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
            let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
        while(rsi.length < data.length) rsi.unshift(50);
        return rsi;
    }

    _calculateSMA(data, period) {
        let sma = [];
        let sum = 0;
        for(let i=0; i<data.length; i++) {
            sum += data[i];
            if(i >= period) sum -= data[i-period];
            if(i >= period-1) sma.push(sum/period); else sma.push(0);
        }
        return sma;
    }
}

if(typeof window !== 'undefined') window.RegimeDetectorClass = RegimeDetector;
if(typeof module !== 'undefined') module.exports = RegimeDetector;
