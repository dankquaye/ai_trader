
const { performance } = require('perf_hooks');

// Mock data
const period = 30;
const dataSize = 1000;
const candles = [];
let price = 100;
for (let i = 0; i < dataSize; i++) {
    price = price * (1 + (Math.random() - 0.5) * 0.02);
    candles.push({ close: price });
}

// Original function
function calculateShannonEntropyOriginal(candles, period) {
    if (candles.length < period + 1) return 0;
    const returns = [];
    for (let i = candles.length - period; i < candles.length; i++) {
        returns.push(Math.log(candles[i].close / candles[i-1].close));
    }
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binCount = Math.floor(Math.sqrt(period));
    const binSize = (max - min) / binCount;
    if (binSize === 0) return 0;
    const bins = {};
    returns.forEach(r => {
        const key = Math.floor((r - min) / binSize);
        bins[key] = (bins[key] || 0) + 1;
    });
    let entropy = 0;
    for (const key in bins) {
        const p = bins[key] / period;
        entropy -= p * Math.log(p);
    }
    return entropy;
}

// Optimized function (Proposed)
function calculateShannonEntropyOptimized(candles, period) {
    if (candles.length < period + 1) return 0;

    // Pass 1: Min/Max
    let min = Infinity;
    let max = -Infinity;
    const startIdx = candles.length - period;

    // We can pre-calculate the log returns if we want to avoid 2x log calls,
    // but the goal is to avoid array allocation.
    // Let's test if calculating log twice is cheaper than array alloc + spread.

    // Actually, let's try strict "no array allocation" first (Double Pass)
    for (let i = startIdx; i < candles.length; i++) {
        const r = Math.log(candles[i].close / candles[i-1].close);
        if (r < min) min = r;
        if (r > max) max = r;
    }

    const binCount = Math.floor(Math.sqrt(period));
    const binSize = (max - min) / binCount;

    if (binSize === 0) return 0;

    // Using Map or Object? Array is fastest for small integer keys.
    // binCount is small (~5 for period 30).
    // Max index can be binCount if val == max. So size binCount + 1.
    const bins = new Uint16Array(binCount + 1);

    for (let i = startIdx; i < candles.length; i++) {
        const r = Math.log(candles[i].close / candles[i-1].close);
        const key = Math.floor((r - min) / binSize);
        // Safety check not strictly needed if logic holds, but good for robustness
        if (key >= 0 && key <= binCount) {
             bins[key]++;
        }
    }

    let entropy = 0;
    for (let i = 0; i < bins.length; i++) {
        if (bins[i] > 0) {
            const p = bins[i] / period;
            entropy -= p * Math.log(p);
        }
    }
    return entropy;
}

// Optimized function (Single Pass with Array but NO Spread)
// Maybe the spread is the killer?
function calculateShannonEntropyHybrid(candles, period) {
    if (candles.length < period + 1) return 0;
    const returns = new Float64Array(period); // Typed array? or just []
    let min = Infinity;
    let max = -Infinity;

    const startIdx = candles.length - period;
    for (let i = 0; i < period; i++) {
        const r = Math.log(candles[startIdx + i].close / candles[startIdx + i - 1].close);
        returns[i] = r;
        if (r < min) min = r;
        if (r > max) max = r;
    }

    const binCount = Math.floor(Math.sqrt(period));
    const binSize = (max - min) / binCount;
    if (binSize === 0) return 0;

    const bins = new Uint16Array(binCount + 1);
    for (let i = 0; i < period; i++) {
        const r = returns[i];
         const key = Math.floor((r - min) / binSize);
         bins[key]++;
    }

    let entropy = 0;
    for (let i = 0; i < bins.length; i++) {
        if (bins[i] > 0) {
            const p = bins[i] / period;
            entropy -= p * Math.log(p);
        }
    }
    return entropy;
}


// Correctness Check
const res1 = calculateShannonEntropyOriginal(candles, period);
const res2 = calculateShannonEntropyOptimized(candles, period);
const res3 = calculateShannonEntropyHybrid(candles, period);

console.log(`Original: ${res1}`);
console.log(`Optimized (Double Pass): ${res2}`);
console.log(`Hybrid (Typed Array): ${res3}`);

if (Math.abs(res1 - res2) > 0.000001) console.error("MISMATCH Optimized!");
if (Math.abs(res1 - res3) > 0.000001) console.error("MISMATCH Hybrid!");

// Benchmark
const iterations = 100000;

const t1 = performance.now();
for (let i = 0; i < iterations; i++) {
    calculateShannonEntropyOriginal(candles, period);
}
const t2 = performance.now();
console.log(`Original: ${(t2 - t1).toFixed(2)}ms`);

const t3 = performance.now();
for (let i = 0; i < iterations; i++) {
    calculateShannonEntropyOptimized(candles, period);
}
const t4 = performance.now();
console.log(`Optimized (Double Pass): ${(t4 - t3).toFixed(2)}ms`);

const t5 = performance.now();
for (let i = 0; i < iterations; i++) {
    calculateShannonEntropyHybrid(candles, period);
}
const t6 = performance.now();
console.log(`Hybrid (Typed Array): ${(t6 - t5).toFixed(2)}ms`);
