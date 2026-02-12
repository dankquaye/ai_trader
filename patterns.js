// patterns.js - Candlestick Pattern Recognition

class PatternRecognizer {
    static isBullishEngulfing(curr, prev) {
        if (!curr || !prev) return false;
        // Basic: Prev Red, Curr Green, Body Engulfs Prev Body
        const prevBody = Math.abs(prev.close - prev.open);
        const currBody = Math.abs(curr.close - curr.open);

        return prev.close < prev.open && // Prev Red
               curr.close > curr.open && // Curr Green
               curr.open <= prev.close && // Gap Down or Equal (strict gap down is rare in FX/Crypto so <= is safer)
               curr.close >= prev.open && // Close higher than prev open
               currBody > prevBody; // Significant size
    }

    static isBearishEngulfing(curr, prev) {
        if (!curr || !prev) return false;
        const prevBody = Math.abs(prev.close - prev.open);
        const currBody = Math.abs(curr.close - curr.open);

        return prev.close > prev.open && // Prev Green
               curr.close < curr.open && // Curr Red
               curr.open >= prev.close && // Gap Up or Equal
               curr.close <= prev.open && // Close lower than prev open
               currBody > prevBody;
    }

    static isHammer(curr) {
        if (!curr) return false;
        const body = Math.abs(curr.close - curr.open);
        const range = curr.high - curr.low;
        const lowerWick = Math.min(curr.close, curr.open) - curr.low;
        const upperWick = curr.high - Math.max(curr.close, curr.open);

        // Small body, long lower wick, small upper wick
        return lowerWick >= body * 2 && upperWick <= body * 0.5 && range > body * 2.5;
    }

    static isShootingStar(curr) {
        if (!curr) return false;
        const body = Math.abs(curr.close - curr.open);
        const range = curr.high - curr.low;
        const lowerWick = Math.min(curr.close, curr.open) - curr.low;
        const upperWick = curr.high - Math.max(curr.close, curr.open);

        // Small body, long upper wick, small lower wick
        return upperWick >= body * 2 && lowerWick <= body * 0.5 && range > body * 2.5;
    }

    static isDoji(curr) {
        if (!curr) return false;
        const body = Math.abs(curr.close - curr.open);
        const range = curr.high - curr.low;
        return body <= range * 0.1 && range > 0;
    }

    /**
     * Analyze candles for a signal
     * @param {Array} candles - Array of candle objects {open, high, low, close}
     * @returns {string|null} 'rise', 'fall', or null
     */
    static analyze(candles) {
        if (candles.length < 2) return null;
        const curr = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        // Strong Reversal Patterns
        if (this.isBullishEngulfing(curr, prev)) return 'rise';
        if (this.isBearishEngulfing(curr, prev)) return 'fall';

        // Pin Bars (Need context usually, but for simple strategy can be signal)
        // Check prev trend for context if possible
        const isDowntrend = prev.close < prev.open; // Simple context check
        const isUptrend = prev.close > prev.open;

        if (this.isHammer(curr) && isDowntrend) return 'rise';
        if (this.isShootingStar(curr) && isUptrend) return 'fall';

        return null;
    }
}

// Expose globally
window.PatternRecognizer = PatternRecognizer;
