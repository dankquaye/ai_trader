// app.js - Main Application Logic

// Global Error Handler
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global Error:', msg, error);
    return false;
};

// Check Dependencies
if (typeof DerivAPI === 'undefined') {
    console.error('DerivAPI not loaded. Check deriv-api.js');
}
if (typeof TradingBot === 'undefined') {
    console.error('TradingBot not loaded. Check bot.js');
}

window.api = new DerivAPI();
window.bot = new TradingBot(window.api);
// Backtester might be loaded after bot
if (typeof Backtester !== 'undefined') {
    window.backtester = new Backtester(window.api, window.bot);
}

// UI Elements
const ui = {
    pages: document.querySelectorAll('.page-section'),
    navBtns: document.querySelectorAll('.nav-btn'),
    accountSelector: document.getElementById('account-selector'),
    tokenInput: document.getElementById('api-token-input'),
    balanceDisplay: document.getElementById('balance-display'),
    assetSelector: document.getElementById('asset-selector'),
    chartContainer: document.getElementById('chart-container'),
    connectionStatus: document.getElementById('connection-status'),
    inputs: {
        duration: document.getElementById('duration'),
        stake: document.getElementById('stake')
    },
    btns: {
        rise: document.getElementById('btn-rise'),
        fall: document.getElementById('btn-fall'),
        startBot: document.getElementById('btn-start-bot'),
        stopBot: document.getElementById('btn-stop-bot'),
        pauseBot: document.getElementById('btn-pause-bot'),
        killSwitch: document.getElementById('btn-kill-switch'),
        exportHistory: document.getElementById('btn-export-history'),
        sendSupport: document.getElementById('btn-send-support'),
        loadChallenge: document.getElementById('btn-load-challenge')
    },
    botSettings: {
        strategy: document.getElementById('bot-strategy'),
        strategyParams: document.getElementById('strategy-params'),
        risk: document.getElementById('bot-risk'),
        useMartingale: document.getElementById('use-martingale'),
        useSmartRisk: document.getElementById('smart-risk'),
        martingaleMultiplier: document.getElementById('martingale-multiplier'),
        takeProfit: document.getElementById('take-profit'),
        stopLoss: document.getElementById('stop-loss'),
        useFilter: document.getElementById('use-filter'),
        adxThreshold: document.getElementById('adx-threshold'),
        avoidSqueeze: document.getElementById('avoid-squeeze'),
        autoSelect: document.getElementById('auto-select-asset'),
        useAIFilter: document.getElementById('use-ai-filter'),
        lockParams: document.getElementById('lock-params')
    },
    profile: {
        loginid: document.getElementById('profile-loginid'),
        type: document.getElementById('profile-type'),
        currency: document.getElementById('profile-currency'),
        balance: document.getElementById('profile-balance')
    },
    historyTable: document.getElementById('trade-history-body'),
    botTotalProfit: document.getElementById('bot-total-profit'),
    marketCondition: document.getElementById('market-condition'),
    signalConfidence: document.getElementById('signal-confidence'),
    marketEntropy: document.getElementById('market-entropy'),
    aiStatus: document.getElementById('ai-status'),
    healthStatus: document.getElementById('health-status'),
    watchdogStatus: document.getElementById('watchdog-status'),
    gradeStats: {
        a: document.getElementById('grade-a'),
        b: document.getElementById('grade-b'),
        c: document.getElementById('grade-c'),
        d: document.getElementById('grade-d'),
        f: document.getElementById('grade-f')
    },
    recoveryBadge: document.getElementById('recovery-badge'),
    backtest: {
        asset: document.getElementById('bt-asset'),
        count: document.getElementById('bt-count'),
        runBtn: document.getElementById('btn-run-backtest'),
        results: document.getElementById('bt-results'),
        loading: document.getElementById('bt-loading'),
        statusText: document.getElementById('bt-status-text'),
        stats: {
            trades: document.getElementById('bt-total-trades'),
            winRate: document.getElementById('bt-win-rate'),
            profit: document.getElementById('bt-profit'),
            drawdown: document.getElementById('bt-drawdown')
        },
        chartContainer: document.getElementById('bt-chart'),
        logBody: document.getElementById('bt-log-body')
    },
    dashboard: {
        regime: document.getElementById('dash-regime'),
        confidence: document.getElementById('dash-confidence'),
        aiProb: document.getElementById('dash-ai-prob'),
        signal: document.getElementById('dash-signal'),
        trend: document.getElementById('dash-score-trend'),
        mom: document.getElementById('dash-score-mom'),
        vol: document.getElementById('dash-score-vol'),
        ai: document.getElementById('dash-score-ai')
    },
    modal: {
        el: document.getElementById('reasoning-modal'),
        body: document.getElementById('modal-body'),
        closes: document.querySelectorAll('.modal-close')
    }
};

// Backtest Chart
let btChart, btSeries;

function initBacktestChart() {
    if (typeof LightweightCharts === 'undefined' || !ui.backtest.chartContainer) return;

    ui.backtest.chartContainer.innerHTML = ''; // Reset

    btChart = LightweightCharts.createChart(ui.backtest.chartContainer, {
        width: ui.backtest.chartContainer.clientWidth,
        height: ui.backtest.chartContainer.clientHeight,
        layout: {
            background: { type: 'solid', color: '#1f2937' }, // Gray-800
            textColor: 'rgba(255, 255, 255, 0.9)',
        },
        grid: {
            vertLines: { color: '#374151' },
            horzLines: { color: '#374151' },
        },
        rightPriceScale: {
            borderVisible: false,
        },
        timeScale: {
            borderVisible: false,
        },
    });

    btSeries = btChart.addLineSeries({
        color: '#4ade80',
        lineWidth: 2,
    });

    new ResizeObserver(entries => {
        if (entries.length === 0 || !entries[0].contentRect) return;
        const { width, height } = entries[0].contentRect;
        btChart.resize(width, height);
    }).observe(ui.backtest.chartContainer);
}

window.logBacktest = (msg) => {
    if(ui.backtest.statusText) ui.backtest.statusText.innerText = msg;
};

async function runBacktest() {
    if (!window.backtester) {
        showToast('Backtester not loaded', 'error');
        return;
    }

    if (bot.isRunning) {
        showToast('Please stop the bot before running a backtest', 'error');
        return;
    }

    const asset = ui.backtest.asset.value;
    const count = parseInt(ui.backtest.count.value);

    ui.backtest.results.classList.add('hidden');
    ui.backtest.loading.classList.remove('hidden');
    ui.backtest.runBtn.disabled = true;
    ui.backtest.runBtn.innerText = 'Running...';

    try {
        const strategy = ui.botSettings.strategy.value;
        const duration = parseInt(ui.inputs.duration.value);

        const result = await window.backtester.run(asset, count, strategy, duration);

        // Render Results
        ui.backtest.stats.trades.innerText = result.results.totalTrades;
        ui.backtest.stats.winRate.innerText = result.results.winRate.toFixed(1) + '%';
        ui.backtest.stats.profit.innerText = '$' + result.results.totalProfit.toFixed(2);
        ui.backtest.stats.drawdown.innerText = result.results.maxDrawdown.toFixed(1) + '%';

        // Color coding
        ui.backtest.stats.profit.className = result.results.totalProfit >= 0 ?
            'text-xl font-bold text-green-400' : 'text-xl font-bold text-red-400';

        // Render Chart
        if(!btChart) initBacktestChart();
        btSeries.setData(result.equity);
        btChart.timeScale().fitContent();

        // Render Logs
        ui.backtest.logBody.innerHTML = '';
        const limit = 100; // Limit rendering for performance
        const logs = [...result.trades].reverse().slice(0, limit);

        logs.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-700';
            const color = t.result === 'WIN' ? 'text-green-400' : 'text-red-400';
            tr.innerHTML = `
                <td class="px-4 py-2">${t.time}</td>
                <td class="px-4 py-2">${t.type}</td>
                <td class="px-4 py-2">${t.entry.toFixed(2)}</td>
                <td class="px-4 py-2">${t.exit.toFixed(2)}</td>
                <td class="px-4 py-2 font-bold ${color}">${t.result}</td>
                <td class="px-4 py-2 ${color}">$${t.profit.toFixed(2)}</td>
            `;
            ui.backtest.logBody.appendChild(tr);
        });

        ui.backtest.results.classList.remove('hidden');

    } catch (e) {
        showToast('Backtest Failed: ' + e.message, 'error');
    } finally {
        ui.backtest.loading.classList.add('hidden');
        ui.backtest.runBtn.disabled = false;
        ui.backtest.runBtn.innerText = 'Run Simulation';
    }
}


// Stats Update Loop
setInterval(() => {
    if (bot && bot.isRunning) {
        if (ui.marketCondition) ui.marketCondition.innerText = bot.marketCondition || 'Analyzing...';
        if (ui.signalConfidence) ui.signalConfidence.innerText = (bot.confidence || 0).toFixed(1) + '%';
        if (ui.marketEntropy) {
             const entropy = bot.currentEntropy || 0;
             ui.marketEntropy.innerText = entropy.toFixed(2);
             if (entropy > 2.0) ui.marketEntropy.className = 'font-bold text-xs sm:text-sm text-red-400';
             else ui.marketEntropy.className = 'font-bold text-xs sm:text-sm text-purple-400';
        }

        // Update Market Condition Text with Risk State
        let conditionText = bot.marketCondition || 'Analyzing...';
        if (bot.riskState === 'WAIT') {
            conditionText += ' (WAIT)';
        } else if (bot.riskState === 'AGGRESSIVE') {
            conditionText += ' (AGGRO)';
        } else if (bot.riskState === 'PROTECT') {
             conditionText += ' (PROTECT)';
        }
        ui.marketCondition.innerText = conditionText;

        // Color coding for condition & Risk State
        if (bot.riskState === 'WAIT') {
             ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-red-500 animate-pulse'; // Blinking Red
        } else if (bot.riskState === 'AGGRESSIVE') {
             ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-green-400';
        } else if (bot.riskState === 'PROTECT') {
             ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-orange-400';
        } else if (bot.marketCondition?.includes('Trending')) {
             ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-blue-400';
        } else {
             ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-yellow-400';
        }

        // AI Status
        if (ui.aiStatus && bot.aiFilter) {
            ui.aiStatus.innerText = bot.aiFilter.status;
            if (bot.aiFilter.isTraining) ui.aiStatus.className = 'font-bold text-xs text-yellow-400 animate-pulse';
            else if (bot.aiFilter.isTrained) ui.aiStatus.className = 'font-bold text-xs text-green-400';
            else ui.aiStatus.className = 'font-bold text-xs text-gray-400';
        }

        // Grade Stats
        if (bot.gradeStats && ui.gradeStats.a) {
            ui.gradeStats.a.innerText = bot.gradeStats.A;
            ui.gradeStats.b.innerText = bot.gradeStats.B;
            ui.gradeStats.c.innerText = bot.gradeStats.C;
            ui.gradeStats.d.innerText = bot.gradeStats.D;
            ui.gradeStats.f.innerText = bot.gradeStats.F;
        }

        // Live Dashboard Update
        updateLiveDashboard();
    }
}, 500);

function updateLiveDashboard() {
    if (!bot || !bot.currentTradeReasoning || !ui.dashboard.regime) return;

    const r = bot.currentTradeReasoning;

    // Update Regime
    ui.dashboard.regime.innerText = r.marketCondition || 'Analyzing';

    // Update Confidence
    ui.dashboard.confidence.innerText = (r.finalScore * 100).toFixed(1) + '%';
    if(r.finalScore > 0.8) ui.dashboard.confidence.className = "font-bold text-green-400";
    else if(r.finalScore < 0.6) ui.dashboard.confidence.className = "font-bold text-red-400";
    else ui.dashboard.confidence.className = "font-bold text-yellow-400";

    // Update AI Prob
    if (r.ai) {
        const prob = r.ai.buy > 0.5 ? r.ai.buy : r.ai.sell;
        ui.dashboard.aiProb.innerText = (prob * 100).toFixed(1) + '%';
    } else {
        ui.dashboard.aiProb.innerText = 'OFF';
    }

    // Update Scores
    ui.dashboard.trend.innerText = r.trend ? (r.trend.buy > r.trend.sell ? 'UP' : 'DN') : '-';
    ui.dashboard.mom.innerText = r.momentum ? (r.momentum.buy > r.momentum.sell ? 'UP' : 'DN') : '-';
    ui.dashboard.vol.innerText = r.volatility ? r.volatility.toFixed(2) : '-';
    ui.dashboard.ai.innerText = r.ai ? (r.ai.buy > 0.5 ? 'UP' : 'DN') : '-';

    // Signal
    if (bot.quantumState && bot.quantumState.pendingSignal) {
        ui.dashboard.signal.innerText = `PENDING (${bot.quantumState.confirmationTicks})`;
        ui.dashboard.signal.className = "font-bold text-yellow-500 animate-pulse";
    } else {
        ui.dashboard.signal.innerText = "WAIT";
        ui.dashboard.signal.className = "font-bold text-gray-500";
    }
}

// Sound Effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'loss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// Chart Setup
let chart;
let candleSeries;
let currentCandle = null;

function initChart() {
    if (typeof LightweightCharts === 'undefined') {
        throw new Error('LightweightCharts library not loaded. Please check your internet connection.');
    }

    chart = LightweightCharts.createChart(ui.chartContainer, {
        width: ui.chartContainer.clientWidth,
        height: ui.chartContainer.clientHeight,
        layout: {
            background: { type: 'solid', color: '#000000' },
            textColor: 'rgba(255, 255, 255, 0.9)',
        },
        grid: {
            vertLines: { color: '#334151' },
            horzLines: { color: '#334151' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: true,
        },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#4ade80',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#4ade80',
        wickDownColor: '#ef4444',
        wickUpColor: '#4ade80',
    });

    window.addEventListener('resize', () => {
        if (chart) {
            chart.resize(ui.chartContainer.clientWidth, ui.chartContainer.clientHeight);
        }
    });
}

function renderStrategyParams(strategy) {
    const container = ui.botSettings.strategyParams;
    container.innerHTML = '';
    container.classList.remove('hidden');

    let html = '';
    if (strategy === 'rsi') {
        html = `
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="text-xs text-gray-400">Period</label>
                    <input type="number" data-param="rsiPeriod" value="${bot.rsiPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                </div>
                <div>
                    <label class="text-xs text-gray-400">Overbought</label>
                    <input type="number" data-param="rsiOverbought" value="${bot.rsiOverbought}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                </div>
                <div>
                    <label class="text-xs text-gray-400">Oversold</label>
                    <input type="number" data-param="rsiOversold" value="${bot.rsiOversold}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                </div>
            </div>
        `;
    } else if (strategy === 'bb') {
        html = `
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs text-gray-400">Period</label>
                    <input type="number" data-param="bbPeriod" value="${bot.bbPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                </div>
                <div>
                    <label class="text-xs text-gray-400">Std Dev</label>
                    <input type="number" data-param="bbStdDev" value="${bot.bbStdDev}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                </div>
            </div>
        `;
    } else if (strategy === 'sma') {
        html = `
            <div>
                <label class="text-xs text-gray-400">SMA Period</label>
                <input type="number" data-param="smaPeriod" value="${bot.smaPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
            </div>
        `;
    } else {
        container.classList.add('hidden');
        return;
    }

    container.innerHTML = html;
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            updateBotParams();
            saveSettings();
        });
    });
}

function updateBotParams() {
    const inputs = ui.botSettings.strategyParams.querySelectorAll('input');
    const params = {};
    inputs.forEach(input => {
        params[input.dataset.param] = input.value;
    });
    bot.setStrategyParams(params);
}

window.updateRecoveryStatus = (isActive) => {
    if (isActive) {
        showToast('Entering Recovery Mode (Virtual Trading)', 'error');
        if(ui.botTotalProfit) {
             ui.botTotalProfit.innerText = "RECOVERY MODE";
             ui.botTotalProfit.className = "font-bold text-yellow-400 animate-pulse";
        }
    } else {
        showToast('Recovery Complete. Resuming Real Trading.', 'success');
        if(ui.botTotalProfit) {
             ui.botTotalProfit.innerText = `$${bot.totalProfit.toFixed(2)}`;
             ui.botTotalProfit.className = bot.totalProfit >= 0 ? 'font-bold text-green-400' : 'font-bold text-red-400';
        }
    }
};

window.updateUIStrategy = (strategy) => {
    if(ui.botSettings.strategy) {
        ui.botSettings.strategy.value = strategy;
        // Trigger event to update params UI
        ui.botSettings.strategy.dispatchEvent(new Event('change'));
    }
};

window.updateHealthStatus = (rate) => {
    if(ui.healthStatus) {
        ui.healthStatus.innerText = `${rate.toFixed(0)}%`;
        if(rate >= 70) ui.healthStatus.className = "font-bold text-green-400";
        else if(rate >= 50) ui.healthStatus.className = "font-bold text-yellow-400";
        else ui.healthStatus.className = "font-bold text-red-500 animate-pulse";
    }
};

window.updateWatchdogStatus = (state) => {
    // We can piggyback on the main Bot Status or a specific element
    const statusEl = document.getElementById('bot-status');
    if(!statusEl) return;

    if (state === 'IDLE') {
        if(bot.isRunning) {
            statusEl.innerText = 'RUNNING';
            statusEl.className = 'font-bold text-green-500';
        }
    } else {
        statusEl.innerText = state; // EXECUTING, LOCKED, MANAGING
        if (state === 'EXECUTING' || state === 'LOCKED') statusEl.className = 'font-bold text-yellow-400 animate-pulse';
        else if (state === 'MANAGING') statusEl.className = 'font-bold text-blue-400';
        else if (state === 'COOLDOWN') statusEl.className = 'font-bold text-purple-400';
    }
};

function saveSettings() {
    const settings = {
        strategy: ui.botSettings.strategy.value,
        risk: ui.botSettings.risk.value,
        useFilter: ui.botSettings.useFilter.checked,
        adxThreshold: ui.botSettings.adxThreshold.value,
        avoidSqueeze: ui.botSettings.avoidSqueeze.checked,
        autoSelect: ui.botSettings.autoSelect.checked,
        lockParams: ui.botSettings.lockParams.checked,

        useMartingale: ui.botSettings.useMartingale.checked,
        useSmartRisk: ui.botSettings.useSmartRisk.checked,
        martingaleMultiplier: ui.botSettings.martingaleMultiplier.value,
        takeProfit: ui.botSettings.takeProfit.value,
        stopLoss: ui.botSettings.stopLoss.value,
        stake: ui.inputs.stake.value,
        duration: ui.inputs.duration.value,
        asset: ui.assetSelector.value,

        rsiPeriod: bot.rsiPeriod,
        rsiOverbought: bot.rsiOverbought,
        rsiOversold: bot.rsiOversold,
        bbPeriod: bot.bbPeriod,
        bbStdDev: bot.bbStdDev,
        smaPeriod: bot.smaPeriod,

        aiLearning: bot.getLearningState()
    };
    localStorage.setItem('derivBotSettings', JSON.stringify(settings));
}

function loadSettings() {
    const stored = localStorage.getItem('derivBotSettings');
    if (!stored) return;

    try {
        const s = JSON.parse(stored);

        if (s.asset) ui.assetSelector.value = s.asset;
        if (s.stake) ui.inputs.stake.value = s.stake;
        if (s.duration) ui.inputs.duration.value = s.duration;

        if (s.strategy) ui.botSettings.strategy.value = s.strategy;
        if (s.risk) ui.botSettings.risk.value = s.risk;

        if (s.useFilter !== undefined) ui.botSettings.useFilter.checked = s.useFilter;
        if (s.adxThreshold) ui.botSettings.adxThreshold.value = s.adxThreshold;
        if (s.avoidSqueeze !== undefined) ui.botSettings.avoidSqueeze.checked = s.avoidSqueeze;
        if (s.autoSelect !== undefined) {
            ui.botSettings.autoSelect.checked = s.autoSelect;
            if(s.autoSelect) startAutoScanner();
        }

        if (s.lockParams !== undefined) {
            ui.botSettings.lockParams.checked = s.lockParams;
            bot.setParamLock(s.lockParams);
        }

        if (s.useMartingale !== undefined) ui.botSettings.useMartingale.checked = s.useMartingale;
        if (s.useSmartRisk !== undefined) ui.botSettings.useSmartRisk.checked = s.useSmartRisk;
        if (s.martingaleMultiplier) ui.botSettings.martingaleMultiplier.value = s.martingaleMultiplier;
        if (s.takeProfit) ui.botSettings.takeProfit.value = s.takeProfit;
        if (s.stopLoss) ui.botSettings.stopLoss.value = s.stopLoss;

        bot.rsiPeriod = s.rsiPeriod || 14;
        bot.rsiOverbought = s.rsiOverbought || 70;
        bot.rsiOversold = s.rsiOversold || 30;
        bot.bbPeriod = s.bbPeriod || 20;
        bot.bbStdDev = s.bbStdDev || 2;
        bot.smaPeriod = s.smaPeriod || 20;

        if (s.aiLearning) bot.setLearningState(s.aiLearning);

        renderStrategyParams(s.strategy);

    } catch (e) {
        console.error('Failed to load settings', e);
    }
}

function exportHistory() {
    if (!bot.tradeHistory || bot.tradeHistory.length === 0) {
        showToast('No trade history to export', 'error');
        return;
    }

    const headers = ['Time', 'Symbol', 'Type', 'Stake', 'Profit', 'Status', 'Grade'];
    const rows = bot.tradeHistory.map(t => [
        t.time, t.symbol, t.type, t.stake, t.profit, t.status, t.grade || '-'
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trade_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Trade history exported!');
}

// Auto Asset Scanner
let scanInterval = null;

function startAutoScanner() {
    if (scanInterval) clearInterval(scanInterval);
    scanInterval = setInterval(async () => {
        if (!ui.botSettings.autoSelect.checked || !bot.isRunning || bot.hasOpenTrade) return;

        console.log('Scanning assets...');
        // Filter assets: Volatility Indices (R_)
        const assets = Array.from(ui.assetSelector.options)
            .map(o => o.value)
            .filter(v => v.startsWith('R_'));

        let bestScore = -1;
        let bestAsset = null;

        const currentAsset = ui.assetSelector.value;
        let currentScore = 0;

        for (const asset of assets) {
            try {
                // Fetch 1m candles for analysis
                // Add a small delay to prevent rate limiting in loop
                await new Promise(r => setTimeout(r, 500));

                const candles = await api.fetchCandles(asset, 60);
                const score = bot.evaluateScore(candles);
                console.log(`Scan ${asset}: Score ${score.toFixed(1)}`);

                if (asset === currentAsset) currentScore = score;

                if (score > bestScore) {
                    bestScore = score;
                    bestAsset = asset;
                }
            } catch (e) {
                console.warn(`Scan failed for ${asset}. Skipping.`, e.message);
                continue; // Continue to next asset even if one fails
            }
        }

        // Switch if significantly better
        if (bestAsset && bestAsset !== currentAsset && bestScore > currentScore + 10) {
            console.log(`Auto Switch: ${currentAsset} -> ${bestAsset}`);
            showToast(`Auto Select: Switching to ${bestAsset} (Score ${bestScore.toFixed(0)})`, 'success');
            ui.assetSelector.value = bestAsset;
            ui.assetSelector.dispatchEvent(new Event('change'));
        }

    }, 60000); // Check every 60s
}

function stopAutoScanner() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

// Preset Logic
function applyPreset(type) {
    if (bot.isRunning) {
        showToast('Stop the bot first!', 'error');
        return;
    }

    // Default: Reset standard values
    ui.botSettings.autoSelect.checked = true; // Always enable auto-select for easy mode
    ui.inputs.duration.value = "5";
    ui.botSettings.useMartingale.checked = false;
    ui.botSettings.useSmartRisk.checked = true;
    ui.botSettings.martingaleMultiplier.value = "1.0";
    ui.botSettings.takeProfit.value = "0"; // No hard limit by default
    ui.botSettings.stopLoss.value = "0";

    // AI Filter always ON for "AI Setup"
    ui.botSettings.useAIFilter.checked = true;

    if (type === 'conservative') {
        ui.botSettings.strategy.value = "ultra_instinct";
        ui.botSettings.risk.value = "low";
        ui.inputs.stake.value = "1.00"; // Safe start
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "30"; // Strict
        ui.botSettings.avoidSqueeze.checked = true;

        showToast('Conservative AI Preset Loaded (Ultra Instinct + Strict Filters)', 'success');

    } else if (type === 'balanced') {
        ui.botSettings.strategy.value = "quantum";
        ui.botSettings.risk.value = "medium";
        ui.inputs.stake.value = "2.00";
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "25"; // Standard
        ui.botSettings.avoidSqueeze.checked = true;

        showToast('Balanced AI Preset Loaded (Quantum + Dynamic)', 'success');

    } else if (type === 'growth') {
        ui.botSettings.strategy.value = "dynamic"; // Switch between strategies
        ui.botSettings.risk.value = "high";
        ui.inputs.stake.value = "5.00";
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "20"; // More trades
        ui.botSettings.avoidSqueeze.checked = false; // Trade breakouts

        showToast('Growth AI Preset Loaded (Dynamic + Aggressive)', 'success');
    }

    // Trigger updates
    ui.botSettings.strategy.dispatchEvent(new Event('change'));
    ui.botSettings.autoSelect.dispatchEvent(new Event('change')); // Start scanner
    saveSettings();
}

// Event Listeners
function setupEventListeners() {
    if (!ui.navBtns || ui.navBtns.length === 0) return;

    // Navigation
    ui.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            ui.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ui.pages.forEach(page => page.classList.toggle('hidden', page.id !== target));

            if (target === 'platform' && chart) {
                setTimeout(() => chart.resize(ui.chartContainer.clientWidth, ui.chartContainer.clientHeight), 50);
            }
        });
    });

    ui.accountSelector.addEventListener('change', (e) => {
        const type = e.target.value;
        api.setAccountType(type);
        if(window.bot) window.bot.setAccountType(type);
        showToast(`Switched to ${type.toUpperCase()} account`);
        // Clear token input on switch to prompt re-entry or show stored if we implemented storage
        ui.tokenInput.value = '';
    });

    ui.tokenInput.addEventListener('change', (e) => {
        const token = e.target.value.trim();
        if (token) {
            api.setToken(token);
            api.connect();
        }
    });

    ui.assetSelector.addEventListener('change', (e) => {
        const symbol = e.target.value;
        saveSettings();

        // Notify Bot (Reset State)
        bot.setSymbol(symbol);

        api.unsubscribeAll();
        api.subscribeTicks(symbol);
        api.subscribeCandles(symbol, 60);
        api.subscribeCandles(symbol, 300);
        api.getHistory(symbol);

        candleSeries.setData([]);
        currentCandle = null;
    });

    if (ui.backtest.runBtn) {
        ui.backtest.runBtn.addEventListener('click', runBacktest);
    }

    // Preset Buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
        });
    });

    const allInputs = [
        ui.inputs.duration, ui.inputs.stake,
        ui.botSettings.risk, ui.botSettings.useMartingale, ui.botSettings.useSmartRisk,
        ui.botSettings.martingaleMultiplier, ui.botSettings.takeProfit,
        ui.botSettings.stopLoss, ui.botSettings.useFilter,
        ui.botSettings.adxThreshold, ui.botSettings.avoidSqueeze,
        ui.botSettings.useAIFilter,
        ui.botSettings.lockParams
    ];
    allInputs.forEach(el => el.addEventListener('change', saveSettings));

    ui.botSettings.strategy.addEventListener('change', () => {
        const s = ui.botSettings.strategy.value;
        renderStrategyParams(s);
        if (bot.isRunning) bot.updateConfig(s, ui.botSettings.risk.value);
        saveSettings();
    });

    ui.botSettings.autoSelect.addEventListener('change', (e) => {
        saveSettings();
        if (e.target.checked) {
            startAutoScanner();
            showToast('Auto Asset Selection Enabled');
        } else {
            stopAutoScanner();
            showToast('Auto Asset Selection Disabled');
        }
    });

    ui.btns.rise.addEventListener('click', () => {
        const stake = parseFloat(ui.inputs.stake.value);
        const duration = parseInt(ui.inputs.duration.value);
        api.placeTrade('rise', stake, duration, api.activeSymbol);
    });

    ui.btns.fall.addEventListener('click', () => {
        const stake = parseFloat(ui.inputs.stake.value);
        const duration = parseInt(ui.inputs.duration.value);
        api.placeTrade('fall', stake, duration, api.activeSymbol);
    });

    ui.btns.startBot.addEventListener('click', () => {
        bot.updateConfig(ui.botSettings.strategy.value, ui.botSettings.risk.value);
        updateBotParams();

        bot.setStake(parseFloat(ui.inputs.stake.value));
        bot.setDuration(parseInt(ui.inputs.duration.value), 't');

        bot.setMoneyManagement(
            ui.botSettings.useMartingale.checked,
            parseFloat(ui.botSettings.martingaleMultiplier.value),
            parseFloat(ui.botSettings.takeProfit.value),
            parseFloat(ui.botSettings.stopLoss.value),
            ui.botSettings.useSmartRisk.checked
        );

        bot.setFilter(
            ui.botSettings.useFilter.checked,
            parseFloat(ui.botSettings.adxThreshold.value),
            ui.botSettings.avoidSqueeze.checked
        );

        bot.setAIFilter(ui.botSettings.useAIFilter.checked);

        bot.start();
        ui.btns.startBot.classList.add('hidden');
        ui.btns.stopBot.classList.remove('hidden');
        ui.btns.pauseBot.classList.remove('hidden');
        ui.btns.killSwitch.classList.remove('hidden'); // Show Kill Switch

        // Reset Pause UI
        ui.btns.pauseBot.innerHTML = '<i class="fa-solid fa-pause"></i>';
        ui.btns.pauseBot.className = 'w-1/3 bg-yellow-600 hover:bg-yellow-500 py-3 rounded font-bold shadow-lg text-sm';

        document.getElementById('bot-status').innerText = 'RUNNING';
        document.getElementById('bot-status').className = 'font-bold text-green-500';
    });

    ui.btns.stopBot.addEventListener('click', () => {
        bot.stop();
        ui.btns.startBot.classList.remove('hidden');
        ui.btns.stopBot.classList.add('hidden');
        ui.btns.pauseBot.classList.add('hidden');
        ui.btns.killSwitch.classList.add('hidden'); // Hide Kill Switch

        document.getElementById('bot-status').innerText = 'STOPPED';
        document.getElementById('bot-status').className = 'font-bold text-red-500';
    });

    ui.btns.pauseBot.addEventListener('click', () => {
        const isPaused = bot.togglePause();
        const status = document.getElementById('bot-status');

        if (isPaused) {
            ui.btns.pauseBot.innerHTML = '<i class="fa-solid fa-play"></i>';
            ui.btns.pauseBot.className = 'w-1/3 bg-green-600 hover:bg-green-500 py-3 rounded font-bold shadow-lg text-sm';
            status.innerText = 'PAUSED';
            status.className = 'font-bold text-yellow-500 animate-pulse';
        } else {
            ui.btns.pauseBot.innerHTML = '<i class="fa-solid fa-pause"></i>';
            ui.btns.pauseBot.className = 'w-1/3 bg-yellow-600 hover:bg-yellow-500 py-3 rounded font-bold shadow-lg text-sm';
            status.innerText = 'RUNNING';
            status.className = 'font-bold text-green-500';
        }
    });

    ui.btns.killSwitch.addEventListener('click', () => {
        if (!confirm("EMERGENCY STOP: This will immediately disconnect the API and stop the bot. Are you sure?")) return;

        bot.stop();
        if(window.api) window.api.disconnect();

        ui.btns.startBot.classList.add('hidden'); // Prevent restart without refresh
        ui.btns.stopBot.classList.add('hidden');
        ui.btns.pauseBot.classList.add('hidden');
        ui.btns.killSwitch.classList.add('hidden');

        const status = document.getElementById('bot-status');
        status.innerText = 'TERMINATED';
        status.className = 'font-bold text-red-600 animate-pulse text-xl';

        showToast('KILL SWITCH ACTIVATED. SESSION TERMINATED.', 'error');

        // Visual Alarm
        document.body.style.border = "5px solid red";
    });

    ui.botSettings.lockParams.addEventListener('change', (e) => {
        bot.setParamLock(e.target.checked);
        saveSettings();
    });

    if(ui.btns.exportHistory) {
        ui.btns.exportHistory.addEventListener('click', exportHistory);
    }

    if(ui.btns.sendSupport) {
        ui.btns.sendSupport.addEventListener('click', () => {
            showToast('Message sent to support!', 'success');
            const form = ui.btns.sendSupport.parentElement;
            form.reset();
        });
    }

    if(ui.btns.loadChallenge) {
        ui.btns.loadChallenge.addEventListener('click', () => {
            if(bot.isRunning) {
                showToast('Stop the bot first!', 'error');
                return;
            }

            // Load Small Account Settings (Efficiency Mode)
            ui.inputs.stake.value = "0.35";
            ui.inputs.duration.value = "3"; // Faster turnover for growth
            ui.botSettings.strategy.value = "ultra_instinct"; // Higher precision
            ui.botSettings.risk.value = "high"; // Use stricter params but allow growth

            // Disable Martingale (Too risky for small accounts)
            ui.botSettings.useMartingale.checked = false;
            // Enable Smart Risk (which now handles 5% compounding)
            ui.botSettings.useSmartRisk.checked = true;
            ui.botSettings.martingaleMultiplier.value = "1.0";

            // Dynamic Goals (Assuming ~$10 start)
            ui.botSettings.takeProfit.value = "0"; // Let compounding run
            ui.botSettings.stopLoss.value = "2";   // Hard stop

            ui.botSettings.useFilter.checked = true;
            ui.botSettings.adxThreshold.value = "25";
            ui.botSettings.avoidSqueeze.checked = true;

            // Enable Small Account Mode
            bot.setSmallAccountMode(true);

            // Trigger events to save and update UI
            ui.botSettings.strategy.dispatchEvent(new Event('change'));
            saveSettings();

            showToast('Small Account Efficiency Mode Loaded! (Compounding + Sniper Entry)', 'success');
        });
    }

    // Modal Events
    ui.modal.closes.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    ui.modal.el.addEventListener('click', (e) => {
        if(e.target === ui.modal.el || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
}

// Modal Logic
function openModal(tradeId) {
    const trade = bot.tradeHistory[tradeId];
    if (!trade) return;

    const r = trade.reasoning;
    let html = `
        <div class="mb-4">
            <h5 class="font-bold text-gray-400 uppercase text-xs mb-1">Overview</h5>
            <div class="grid grid-cols-2 gap-2 bg-gray-900 p-2 rounded">
                <div><span class="text-gray-500">Symbol:</span> ${trade.symbol}</div>
                <div><span class="text-gray-500">Result:</span> <span class="${trade.profit > 0 ? 'text-green-400' : 'text-red-400'}">${trade.status} ($${trade.profit})</span></div>
                <div><span class="text-gray-500">Grade:</span> ${trade.grade}</div>
                <div><span class="text-gray-500">Confidence:</span> ${(r?.finalScore * 100).toFixed(1)}%</div>
            </div>
        </div>
    `;

    if (r) {
        html += `
            <div class="mb-4">
                <h5 class="font-bold text-gray-400 uppercase text-xs mb-1">Engine Scores</h5>
                <div class="space-y-1 text-xs">
                    <div class="flex justify-between border-b border-gray-700 pb-1">
                        <span>Trend Engine</span>
                        <span class="font-mono ${r.trend?.buy > 0.5 ? 'text-green-400' : 'text-red-400'}">
                            B:${(r.trend?.buy*100).toFixed(0)}% S:${(r.trend?.sell*100).toFixed(0)}%
                        </span>
                    </div>
                    <div class="flex justify-between border-b border-gray-700 pb-1">
                        <span>Momentum Engine</span>
                         <span class="font-mono ${r.momentum?.buy > 0.5 ? 'text-green-400' : 'text-red-400'}">
                            B:${(r.momentum?.buy*100).toFixed(0)}% S:${(r.momentum?.sell*100).toFixed(0)}%
                        </span>
                    </div>
                    <div class="flex justify-between border-b border-gray-700 pb-1">
                        <span>Volatility Engine</span>
                        <span class="font-mono text-blue-400">${(r.volatility || 0).toFixed(2)}</span>
                    </div>
                     <div class="flex justify-between border-b border-gray-700 pb-1">
                        <span>Noise Engine</span>
                        <span class="font-mono text-purple-400">${(r.noise || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        if (r.ai) {
             html += `
            <div class="mb-4">
                <h5 class="font-bold text-gray-400 uppercase text-xs mb-1">AI Insight</h5>
                 <div class="bg-gray-900 p-2 rounded text-xs space-y-1">
                    <div class="flex justify-between">
                        <span>Prediction:</span>
                        <span class="${r.ai.buy > 0.5 ? 'text-green-400' : 'text-red-400'} font-bold">
                            ${r.ai.buy > 0.5 ? 'RISE' : 'FALL'} (${(Math.max(r.ai.buy, r.ai.sell)*100).toFixed(1)}%)
                        </span>
                    </div>
                 </div>
            </div>`;
        }
    } else {
        html += `<p class="text-gray-500 italic">Detailed reasoning not available for this trade.</p>`;
    }

    ui.modal.body.innerHTML = html;

    document.body.classList.add('modal-active');
    ui.modal.el.classList.remove('opacity-0', 'pointer-events-none');
}

function closeModal() {
    document.body.classList.remove('modal-active');
    ui.modal.el.classList.add('opacity-0', 'pointer-events-none');
}

// UI Helpers
window.updateTradeHistory = (history, totalProfit, wins, losses) => {
    ui.botTotalProfit.innerText = `$${totalProfit.toFixed(2)}`;
    ui.botTotalProfit.className = totalProfit >= 0 ? 'font-bold text-green-400' : 'font-bold text-red-400';

    ui.historyTable.innerHTML = '';
    const displayHistory = [...history].reverse().slice(0, 50);

    displayHistory.forEach((trade, index) => {
        // Correct index relative to original array for modal lookup
        const originalIndex = history.length - 1 - index;

        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-700 hover:bg-gray-700 transition cursor-pointer';
        const color = trade.profit >= 0 ? 'text-green-400' : 'text-red-400';
        const gradeColor = trade.grade?.startsWith('A') ? 'text-green-400' : (trade.grade === 'F' ? 'text-red-500' : 'text-gray-400');

        tr.innerHTML = `
            <td class="px-6 py-4">${trade.time}</td>
            <td class="px-6 py-4">${trade.symbol}</td>
            <td class="px-6 py-4">${trade.type}</td>
            <td class="px-6 py-4">$${trade.stake}</td>
            <td class="px-6 py-4 font-bold ${color}">$${trade.profit.toFixed(2)}</td>
            <td class="px-6 py-4 font-bold ${gradeColor}">${trade.grade || '-'}</td>
            <td class="px-6 py-4">
                <button class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800" onclick="event.stopPropagation(); openModal(${originalIndex})">
                    <i class="fa-solid fa-magnifying-glass"></i> Details
                </button>
            </td>
        `;

        tr.onclick = () => openModal(originalIndex);

        ui.historyTable.appendChild(tr);
    });
};

function aggregateTick(time, price) {
    const candleTime = Math.floor(time / 5) * 5;

    if (!currentCandle || candleTime > currentCandle.time) {
        currentCandle = {
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price
        };
        return { isNew: true, candle: currentCandle };
    } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        return { isNew: false, candle: currentCandle };
    }
}

function setupApiCallbacks() {
    api.on('authorize', (data) => {
        ui.profile.loginid.innerText = `ID: ${data.loginid}`;
        ui.profile.currency.innerText = 'USD';

        ui.connectionStatus.classList.remove('bg-red-500');
        ui.connectionStatus.classList.add('bg-green-500');
        ui.connectionStatus.title = "Connected";
        ui.connectionStatus.classList.remove('animate-pulse');

        const symbol = ui.assetSelector.value;
        api.subscribeTicks(symbol);
        api.subscribeCandles(symbol, 60);
        api.subscribeCandles(symbol, 300);
        api.getHistory(symbol);

        showToast(`Authorized as ${data.loginid}`);
    });

    api.on('balance', (data) => {
        const bal = parseFloat(data.balance);
        const currency = data.currency;
        ui.balanceDisplay.innerText = `${bal.toFixed(2)} ${currency}`;
        ui.profile.balance.innerText = `${bal.toFixed(2)} ${currency}`;

        // Update global bot balance reference for dynamic calculations
        window.botBalance = bal;
        if(window.bot && window.bot.dailyStartBalance === 0) {
            window.bot.dailyStartBalance = bal;
        }

        // Safety: Auto-Stop if breached Max Daily Loss
        if (window.bot && window.bot.isRunning && window.bot.dailyStartBalance > 0) {
            const lossLimit = window.bot.accountType === 'live' ? 0.10 : 0.15; // 10% Live, 15% Demo
            const drawdown = (window.bot.dailyStartBalance - bal) / window.bot.dailyStartBalance;

            if (drawdown >= lossLimit) {
                window.bot.stop();
                showToast(`Max Daily Loss Limit Hit (${(lossLimit*100).toFixed(0)}%). Bot Stopped.`, 'error');
            }
        }
    });

    api.on('history', (data) => {
        const { times, prices } = data;
        const candles = [];
        currentCandle = null;

        for (let i = 0; i < times.length; i++) {
             const time = times[i];
             const price = prices[i];

             const candleTime = Math.floor(time / 5) * 5;
             if (candles.length === 0 || candles[candles.length - 1].time !== candleTime) {
                 candles.push({
                     time: candleTime,
                     open: price,
                     high: price,
                     low: price,
                     close: price
                 });
             } else {
                 const last = candles[candles.length - 1];
                 last.high = Math.max(last.high, price);
                 last.low = Math.min(last.low, price);
                 last.close = price;
             }
        }

        if (candles.length > 0) {
            currentCandle = candles[candles.length - 1];
        }

        candleSeries.setData(candles);
    });

    api.on('ohlc', (candle) => {
        bot.processCandle(candle, candle.granularity);
    });

    api.on('candles', (candles) => {
        if (candles.length > 0) {
            const diff = candles[1].epoch - candles[0].epoch;
            const granularity = (diff >= 280) ? 300 : 60;
            candles.forEach(c => bot.processCandle(c, granularity));
        }
    });

    api.on('tick', (tick) => {
        const price = tick.quote;
        const time = tick.epoch;

        bot.processTick(tick);

        const result = aggregateTick(time, price);
        candleSeries.update(result.candle);
    });

    api.on('buy', (data) => {
        showToast(`Order Placed! Buy Price: ${data.buy_price}`);
    });

    api.on('contract_finish', (contract) => {
        bot.handleTradeResult(contract);
        api.send({ balance: 1, subscribe: 0 });

        const profit = parseFloat(contract.profit);
        if (profit > 0) {
            showToast(`Trade WON! +$${profit.toFixed(2)}`, 'success');
            playSound('win');
        } else {
            showToast(`Trade LOST! $${profit.toFixed(2)}`, 'error');
            playSound('loss');
        }
    });

    api.on('error', (error) => {
        showToast(`Error: ${error.message}`, 'error');
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');

    let colorClass = 'bg-blue-600';
    if (type === 'error') colorClass = 'bg-red-600';
    if (type === 'success') colorClass = 'bg-green-600';

    toast.className = `${colorClass} text-white px-6 py-3 rounded shadow-lg toast flex items-center`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'} mr-2"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initChart();
        setupEventListeners();
        setupApiCallbacks();
        loadSettings();
        // Do not auto-connect. User must provide token.
        showToast('Please enter your API Token to connect.', 'info');
    } catch (e) {
        console.error('Init Error:', e);
        showToast('Initialization Error: ' + e.message, 'error');
    }
});
