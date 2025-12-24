// optimizer.js - Self-Correcting Adaptive Model
class AdaptiveOptimizer {
    constructor(bot) {
        this.bot = bot;
        this.history = [];
        this.winStreak = 0;
        this.lossStreak = 0;
        this.isActive = false;

        // Base Parameters (Snapshots)
        this.baseParams = { ...bot.params };
    }

    reset() {
        this.isActive = true;
        this.history = [];
        this.winStreak = 0;
        this.lossStreak = 0;
    }

    onTrade(isWin, marketCondition, exitReason = null) {
        if (!this.isActive) return;

        this.history.push({ isWin, marketCondition, exitReason, time: Date.now() });
        if (this.history.length > 50) this.history.shift();

        if (isWin) {
            this.winStreak++;
            this.lossStreak = 0;
        } else {
            this.lossStreak++;
            this.winStreak = 0;
        }

        this.monitorHealth();
        this.autocorrect(exitReason);
    }

    monitorHealth() {
        if (this.history.length < 20) return;

        const recent = this.history.slice(-20);
        const wins = recent.filter(t => t.isWin).length;
        const winRate = (wins / recent.length) * 100;

        // Critical Failure Check
        if (winRate < 40) {
            console.error("CRITICAL: Strategy Health Dropped Below 40%. Stopping Bot.");
            this.bot.stop();
            if(window.showToast) window.showToast('CRITICAL FAILURE: Strategy Health < 40%. Bot Stopped.', 'error');
        }

        if(window.updateHealthStatus) window.updateHealthStatus(winRate);
    }

    autocorrect(exitReason) {
        const { bot } = this;
        if (bot.isParamLocked) return;

        let action = "";

        // Scenario 0: Recovery from Virtual Loss (Regime Awareness)
        if (bot.isVirtualRecovery && this.lossStreak > 0) {
             // If losing virtually in 'choppy' market, drastically increase noise filter
             if (bot.marketCondition === 'Choppy') {
                 bot.params.wNoise = Math.min(0.50, bot.params.wNoise + 0.10);
                 bot.params.entropyClean = Math.max(0.8, bot.params.entropyClean - 0.1); // Require lower entropy
                 action = "Virtual Loss in Chop. Maximizing Noise Filter.";
             } else if (exitReason === 'stop_loss') {
                 // Price moved against us fast -> volatility risk
                 bot.params.wVol += 0.10;
                 bot.params.volatilityThreshold = Math.min(0.90, bot.params.volatilityThreshold + 0.05);
                 action = "Virtual Stop Loss Hit. Avoiding Volatility Spikes.";
             }
        }

        // Scenario 1: Loss Streak (Risk Off)
        else if (this.lossStreak >= 2) {
            // Tighten Confidence (Aggressive Step)
            bot.params.confidenceThreshold = Math.min(0.98, bot.params.confidenceThreshold + 0.05);
            // Tighten Filters
            bot.params.volatilityThreshold = Math.min(0.95, bot.params.volatilityThreshold + 0.05);
            bot.params.noiseThreshold = Math.min(0.95, bot.params.noiseThreshold + 0.05);

            // Shift weights to Safety (Trend & Noise) - Aggressive shift
            bot.params.wTrend += 0.05;
            bot.params.wNoise += 0.05;
            bot.params.wMom -= 0.05;
            bot.params.wAI -= 0.05;

            action = `Loss Streak ${this.lossStreak}. Tightening Confidence to ${bot.params.confidenceThreshold.toFixed(2)} & Filters.`;

            // Consistency Check: If persistent failure, suggest Strategy Rotation
            if (this.lossStreak >= 4 && bot.strategy === 'ultra_instinct') {
                 // Force upgrade to Quantum if failing on legacy
                 bot.strategy = 'quantum';
                 action += " | Auto-Switched to QUANTUM Strategy.";
                 if(window.updateUIStrategy) window.updateUIStrategy('quantum');
            }
        }

        // Scenario 2: Win Streak (Risk On / Optimization)
        else if (this.winStreak >= 3) {
            // Gradually relax to capture more trades, but stay above high base (0.80)
            bot.params.confidenceThreshold = Math.max(0.80, bot.params.confidenceThreshold - 0.01);

            // If winning in Trend, boost Trend weight slightly
            if (bot.marketCondition === 'Trending') {
                bot.params.wTrend = Math.min(0.5, bot.params.wTrend + 0.01);
                bot.params.wMom = Math.min(0.3, bot.params.wMom + 0.01);
            }

            action = `Win Streak ${this.winStreak}. Stabilizing Trend.`;
        }

        // Scenario 3: Choppy Market Adaptation
        if (bot.marketCondition === 'Choppy') {
            bot.params.wNoise = 0.40; // Heavy penalty for noise
            bot.params.wVol = 0.10;
            bot.params.entropyClean = 1.0; // Require super clean
            action = "Market Choppy. Max Security Mode.";
        }

        if (action) {
            console.log(`[Optimizer] ${action}`);
            if(window.showToast) window.showToast(`Auto-Correct: ${action}`, 'info');
        }

        this.normalizeWeights();
    }

    normalizeWeights() {
        const p = this.bot.params;
        const total = p.wTrend + p.wMom + p.wVol + p.wNoise + p.wAI;
        if (total === 0) return;

        p.wTrend /= total;
        p.wMom /= total;
        p.wVol /= total;
        p.wNoise /= total;
        p.wAI /= total;
    }
}
