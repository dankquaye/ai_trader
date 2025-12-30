// app.js - Main Application Logic

// Global Error Handler
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global Error:', msg, error);
    return false;
};

// Check Dependencies
if (typeof DerivAPI === 'undefined') console.error('DerivAPI not loaded. Check deriv-api.js');
if (typeof TradingBot === 'undefined') console.error('TradingBot not loaded. Check bot.js');

window.api = new DerivAPI();
window.bot = new TradingBot(window.api);
if (typeof Backtester !== 'undefined') window.backtester = new Backtester(window.api, window.bot);

// --- UI Elements ---
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

// --- Backtest Chart ---
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
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
    });

    btSeries = btChart.addLineSeries({ color: '#4ade80', lineWidth: 2 });

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
    if (!window.backtester) return showToast('Backtester not loaded', 'error');
    if (bot.isRunning) return showToast('Please stop the bot before running a backtest', 'error');

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

        ui.backtest.stats.trades.innerText = result.results.totalTrades;
        ui.backtest.stats.winRate.innerText = result.results.winRate.toFixed(1) + '%';
        ui.backtest.stats.profit.innerText = '$' + result.results.totalProfit.toFixed(2);
        ui.backtest.stats.drawdown.innerText = result.results.maxDrawdown.toFixed(1) + '%';

        ui.backtest.stats.profit.className = result.results.totalProfit >= 0 ?
            'text-xl font-bold text-green-400' : 'text-xl font-bold text-red-400';

        if(!btChart) initBacktestChart();
        btSeries.setData(result.equity);
        btChart.timeScale().fitContent();

        ui.backtest.logBody.innerHTML = '';
        const logs = [...result.trades].reverse().slice(0, 100);

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

// --- Dashboard & Updates ---

setInterval(() => {
    if (bot && bot.isRunning) {
        // UI Updates
        if (ui.marketCondition) {
            let conditionText = bot.marketCondition || 'Analyzing...';
            if (bot.riskState === 'WAIT') conditionText += ' (WAIT)';
            else if (bot.riskState === 'AGGRESSIVE') conditionText += ' (AGGRO)';
            else if (bot.riskState === 'PROTECT') conditionText += ' (PROTECT)';
            ui.marketCondition.innerText = conditionText;

            // Color Logic
            if (bot.riskState === 'WAIT') ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-red-500 animate-pulse';
            else if (bot.riskState === 'AGGRESSIVE') ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-green-400';
            else if (bot.riskState === 'PROTECT') ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-orange-400';
            else ui.marketCondition.className = 'font-bold text-xs sm:text-sm text-yellow-400';
        }

        if (ui.signalConfidence) ui.signalConfidence.innerText = (bot.confidence || 0).toFixed(1) + '%';

        if (ui.marketEntropy) {
             const entropy = bot.currentEntropy || 0;
             ui.marketEntropy.innerText = entropy.toFixed(2);
             ui.marketEntropy.className = entropy > 2.0 ? 'font-bold text-xs sm:text-sm text-red-400' : 'font-bold text-xs sm:text-sm text-purple-400';
        }

        if (ui.aiStatus && bot.aiFilter) {
            ui.aiStatus.innerText = bot.aiFilter.status;
            if (bot.aiFilter.isTraining) ui.aiStatus.className = 'font-bold text-xs text-yellow-400 animate-pulse';
            else if (bot.aiFilter.isTrained) ui.aiStatus.className = 'font-bold text-xs text-green-400';
            else ui.aiStatus.className = 'font-bold text-xs text-gray-400';
        }

        if (bot.gradeStats && ui.gradeStats.a) {
            ui.gradeStats.a.innerText = bot.gradeStats.A;
            ui.gradeStats.b.innerText = bot.gradeStats.B;
            ui.gradeStats.c.innerText = bot.gradeStats.C;
            ui.gradeStats.d.innerText = bot.gradeStats.D;
            ui.gradeStats.f.innerText = bot.gradeStats.F;
        }

        updateLiveDashboard();
    }
}, 500);

function updateLiveDashboard() {
    if (!bot || !bot.currentTradeReasoning || !ui.dashboard.regime) return;
    const r = bot.currentTradeReasoning;

    ui.dashboard.regime.innerText = r.marketCondition || 'Analyzing';

    ui.dashboard.confidence.innerText = (r.finalScore * 100).toFixed(1) + '%';
    ui.dashboard.confidence.className = r.finalScore > 0.8 ? "font-bold text-green-400" :
        (r.finalScore < 0.6 ? "font-bold text-red-400" : "font-bold text-yellow-400");

    if (r.ai) {
        const prob = r.ai.buy > 0.5 ? r.ai.buy : r.ai.sell;
        ui.dashboard.aiProb.innerText = (prob * 100).toFixed(1) + '%';
    } else {
        ui.dashboard.aiProb.innerText = 'OFF';
    }

    ui.dashboard.trend.innerText = r.trend ? (r.trend.buy > r.trend.sell ? 'UP' : 'DN') : '-';
    ui.dashboard.mom.innerText = r.momentum ? (r.momentum.buy > r.momentum.sell ? 'UP' : 'DN') : '-';
    ui.dashboard.vol.innerText = r.volatility ? r.volatility.toFixed(2) : '-';
    ui.dashboard.ai.innerText = r.ai ? (r.ai.buy > 0.5 ? 'UP' : 'DN') : '-';

    if (bot.quantumState && bot.quantumState.pendingSignal) {
        ui.dashboard.signal.innerText = `PENDING (${bot.quantumState.confirmationTicks})`;
        ui.dashboard.signal.className = "font-bold text-yellow-500 animate-pulse";
    } else {
        ui.dashboard.signal.innerText = "WAIT";
        ui.dashboard.signal.className = "font-bold text-gray-500";
    }
}

// --- Sound Effects ---
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

// --- Chart Setup ---
let chart, candleSeries, currentCandle = null;

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
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { timeVisible: true, secondsVisible: true },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#4ade80', downColor: '#ef4444',
        borderDownColor: '#ef4444', borderUpColor: '#4ade80',
        wickDownColor: '#ef4444', wickUpColor: '#4ade80',
    });

    window.addEventListener('resize', () => {
        if (chart) chart.resize(ui.chartContainer.clientWidth, ui.chartContainer.clientHeight);
    });
}

// --- UI Logic ---

function renderStrategyParams(strategy) {
    const container = ui.botSettings.strategyParams;
    container.innerHTML = '';
    container.classList.remove('hidden');

    let html = '';
    if (strategy === 'rsi') {
        html = `<div class="grid grid-cols-3 gap-2">
            <div><label class="text-xs text-gray-400">Period</label><input type="number" data-param="rsiPeriod" value="${bot.rsiPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>
            <div><label class="text-xs text-gray-400">Overbought</label><input type="number" data-param="rsiOverbought" value="${bot.rsiOverbought}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>
            <div><label class="text-xs text-gray-400">Oversold</label><input type="number" data-param="rsiOversold" value="${bot.rsiOversold}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>
        </div>`;
    } else if (strategy === 'bb') {
        html = `<div class="grid grid-cols-2 gap-2">
            <div><label class="text-xs text-gray-400">Period</label><input type="number" data-param="bbPeriod" value="${bot.bbPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>
            <div><label class="text-xs text-gray-400">Std Dev</label><input type="number" data-param="bbStdDev" value="${bot.bbStdDev}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>
        </div>`;
    } else if (strategy === 'sma') {
        html = `<div><label class="text-xs text-gray-400">SMA Period</label><input type="number" data-param="smaPeriod" value="${bot.smaPeriod}" class="w-full bg-gray-700 rounded px-2 py-1 text-sm"></div>`;
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

// --- Exposed Helpers ---

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
    const statusEl = document.getElementById('bot-status');
    if(!statusEl) return;

    if (state === 'IDLE') {
        if(bot.isRunning) {
            statusEl.innerText = 'RUNNING';
            statusEl.className = 'font-bold text-green-500';
        }
    } else {
        statusEl.innerText = state;
        if (state === 'EXECUTING' || state === 'LOCKED') statusEl.className = 'font-bold text-yellow-400 animate-pulse';
        else if (state === 'MANAGING') statusEl.className = 'font-bold text-blue-400';
        else if (state === 'COOLDOWN') statusEl.className = 'font-bold text-purple-400';
    }
};

// --- Settings Persistence ---

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

// --- Features ---

function exportHistory() {
    if (!bot.tradeHistory || bot.tradeHistory.length === 0) {
        showToast('No trade history to export', 'error');
        return;
    }
    const headers = ['Time', 'Symbol', 'Type', 'Stake', 'Profit', 'Status', 'Grade'];
    const rows = bot.tradeHistory.map(t => [
        t.time, t.symbol, t.type, t.stake, t.profit, t.status, t.grade || '-'
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trade_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Trade history exported!');
}

let scanInterval = null;
function startAutoScanner() {
    if (scanInterval) clearInterval(scanInterval);
    scanInterval = setInterval(async () => {
        if (!ui.botSettings.autoSelect.checked || !bot.isRunning || bot.hasOpenTrade) return;
        console.log('Scanning assets...');
        const assets = Array.from(ui.assetSelector.options).map(o => o.value).filter(v => v.startsWith('R_'));
        let bestScore = -1;
        let bestAsset = null;
        const currentAsset = ui.assetSelector.value;
        let currentScore = 0;

        for (const asset of assets) {
            try {
                await new Promise(r => setTimeout(r, 500));
                const candles = await api.fetchCandles(asset, 60);
                const score = bot.evaluateScore(candles);
                if (asset === currentAsset) currentScore = score;
                if (score > bestScore) {
                    bestScore = score;
                    bestAsset = asset;
                }
            } catch (e) { continue; }
        }

        if (bestAsset && bestAsset !== currentAsset && bestScore > currentScore + 10) {
            showToast(`Auto Select: Switching to ${bestAsset} (Score ${bestScore.toFixed(0)})`, 'success');
            ui.assetSelector.value = bestAsset;
            ui.assetSelector.dispatchEvent(new Event('change'));
        }
    }, 60000);
}

function stopAutoScanner() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

function applyPreset(type) {
    if (bot.isRunning) return showToast('Stop the bot first!', 'error');

    ui.botSettings.autoSelect.checked = true;
    ui.inputs.duration.value = "5";
    ui.botSettings.useMartingale.checked = false;
    ui.botSettings.useSmartRisk.checked = true;
    ui.botSettings.martingaleMultiplier.value = "1.0";
    ui.botSettings.takeProfit.value = "0";
    ui.botSettings.stopLoss.value = "0";
    ui.botSettings.useAIFilter.checked = true;

    if (type === 'conservative') {
        ui.botSettings.strategy.value = "ultra_instinct";
        ui.botSettings.risk.value = "low";
        ui.inputs.stake.value = "1.00";
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "30";
        ui.botSettings.avoidSqueeze.checked = true;
        showToast('Conservative AI Preset Loaded', 'success');
    } else if (type === 'balanced') {
        ui.botSettings.strategy.value = "quantum";
        ui.botSettings.risk.value = "medium";
        ui.inputs.stake.value = "2.00";
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "25";
        ui.botSettings.avoidSqueeze.checked = true;
        showToast('Balanced AI Preset Loaded', 'success');
    } else if (type === 'growth') {
        ui.botSettings.strategy.value = "dynamic";
        ui.botSettings.risk.value = "high";
        ui.inputs.stake.value = "5.00";
        ui.botSettings.useFilter.checked = true;
        ui.botSettings.adxThreshold.value = "20";
        ui.botSettings.avoidSqueeze.checked = false;
        showToast('Growth AI Preset Loaded', 'success');
    }

    ui.botSettings.strategy.dispatchEvent(new Event('change'));
    ui.botSettings.autoSelect.dispatchEvent(new Event('change'));
    saveSettings();
}

// --- Modal Logic ---

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
                    <div class="flex justify-between border-b border-gray-700 pb-1"><span>Trend Engine</span><span class="font-mono ${r.trend?.buy > 0.5 ? 'text-green-400' : 'text-red-400'}">B:${(r.trend?.buy*100).toFixed(0)}% S:${(r.trend?.sell*100).toFixed(0)}%</span></div>
                    <div class="flex justify-between border-b border-gray-700 pb-1"><span>Momentum Engine</span><span class="font-mono ${r.momentum?.buy > 0.5 ? 'text-green-400' : 'text-red-400'}">B:${(r.momentum?.buy*100).toFixed(0)}% S:${(r.momentum?.sell*100).toFixed(0)}%</span></div>
                    <div class="flex justify-between border-b border-gray-700 pb-1"><span>Volatility Engine</span><span class="font-mono text-blue-400">${(r.volatility || 0).toFixed(2)}</span></div>
                    <div class="flex justify-between border-b border-gray-700 pb-1"><span>Noise Engine</span><span class="font-mono text-purple-400">${(r.noise || 0).toFixed(2)}</span></div>
                </div>
            </div>
        `;
        if (r.ai) {
             html += `<div class="mb-4"><h5 class="font-bold text-gray-400 uppercase text-xs mb-1">AI Insight</h5><div class="bg-gray-900 p-2 rounded text-xs space-y-1"><div class="flex justify-between"><span>Prediction:</span><span class="${r.ai.buy > 0.5 ? 'text-green-400' : 'text-red-400'} font-bold">${r.ai.buy > 0.5 ? 'RISE' : 'FALL'} (${(Math.max(r.ai.buy, r.ai.sell)*100).toFixed(1)}%)</span></div></div></div>`;
        }
    } else {
        html += `<p class="text-gray-500 italic">Detailed reasoning not available for this trade.</p>`;
    }

    ui.modal.body.innerHTML = html;
    document.body.classList.add('modal-active');
    ui.modal.el.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
    // Trap focus
    const closeBtn = ui.modal.el.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
}

function closeModal() {
    document.body.classList.remove('modal-active');
    ui.modal.el.classList.add('opacity-0', 'pointer-events-none', 'hidden');
}

window.updateTradeHistory = (history, totalProfit, wins, losses) => {
    ui.botTotalProfit.innerText = `$${totalProfit.toFixed(2)}`;
    ui.botTotalProfit.className = totalProfit >= 0 ? 'font-bold text-green-400' : 'font-bold text-red-400';
    ui.historyTable.innerHTML = '';
    const displayHistory = [...history].reverse().slice(0, 50);

    displayHistory.forEach((trade, index) => {
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
            <td class="px-6 py-4"><button class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800" onclick="event.stopPropagation(); openModal(${originalIndex})"><i class="fa-solid fa-magnifying-glass"></i> Details</button></td>
        `;
        tr.onclick = () => openModal(originalIndex);
        ui.historyTable.appendChild(tr);
    });
};

function aggregateTick(time, price) {
    const candleTime = Math.floor(time / 5) * 5;
    if (!currentCandle || candleTime > currentCandle.time) {
        currentCandle = { time: candleTime, open: price, high: price, low: price, close: price };
        return { isNew: true, candle: currentCandle };
    } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        return { isNew: false, candle: currentCandle };
    }
}

// --- API Events ---

function setupApiCallbacks() {
    api.on('authorize', (data) => {
        ui.profile.loginid.innerText = `ID: ${data.loginid}`;
        ui.profile.currency.innerText = 'USD';
        ui.connectionStatus.classList.remove('bg-red-500', 'animate-pulse');
        ui.connectionStatus.classList.add('bg-green-500');
        ui.connectionStatus.title = "Connected";

        const symbol = ui.assetSelector.value;
        api.subscribeTicks(symbol);
        api.subscribeCandles(symbol, 60);
        api.subscribeCandles(symbol, 300);
        api.getHistory(symbol);
        showToast(`Authorized as ${data.loginid}`);
    });

    api.on('balance', (data) => {
        const bal = parseFloat(data.balance);
        ui.balanceDisplay.innerText = `${bal.toFixed(2)} ${data.currency}`;
        ui.profile.balance.innerText = `${bal.toFixed(2)} ${data.currency}`;
        window.botBalance = bal;
        if(window.bot && window.bot.dailyStartBalance === 0) window.bot.dailyStartBalance = bal;

        if (window.bot && window.bot.isRunning && window.bot.dailyStartBalance > 0) {
            const lossLimit = window.bot.accountType === 'live' ? 0.10 : 0.15;
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
                 candles.push({ time: candleTime, open: price, high: price, low: price, close: price });
             } else {
                 const last = candles[candles.length - 1];
                 last.high = Math.max(last.high, price);
                 last.low = Math.min(last.low, price);
                 last.close = price;
             }
        }
        if (candles.length > 0) currentCandle = candles[candles.length - 1];
        candleSeries.setData(candles);
    });

    api.on('ohlc', (candle) => bot.processCandle(candle, candle.granularity));
    api.on('candles', (candles) => {
        if (candles.length > 0) {
            const diff = candles[1].epoch - candles[0].epoch;
            const granularity = (diff >= 280) ? 300 : 60;
            candles.forEach(c => bot.processCandle(c, granularity));
        }
    });

    api.on('tick', (tick) => {
        bot.processTick(tick);
        const result = aggregateTick(tick.epoch, tick.quote);
        candleSeries.update(result.candle);
    });

    api.on('buy', (data) => showToast(`Order Placed! Buy Price: ${data.buy_price}`));

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

    api.on('error', (error) => showToast(`Error: ${error.message}`, 'error'));
}

const activeToasts = [];
function showToast(message, type = 'info') {
    if (activeToasts.length > 3) {
        const old = activeToasts.shift();
        if(old) old.remove();
    }

    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');

    let colorClass = 'bg-blue-600';
    if (type === 'error') colorClass = 'bg-red-600';
    if (type === 'success') colorClass = 'bg-green-600';

    toast.className = `${colorClass} text-white px-6 py-3 rounded shadow-lg toast flex items-center mb-2 transition-all duration-300`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'} mr-2"></i><span>${message}</span>`;

    container.appendChild(toast);
    activeToasts.push(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
            const idx = activeToasts.indexOf(toast);
            if (idx > -1) activeToasts.splice(idx, 1);
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initChart();
        setupEventListeners();
        setupApiCallbacks();
        loadSettings();
        showToast('Please enter your API Token to connect.', 'info');
    } catch (e) {
        console.error('Init Error:', e);
        showToast('Initialization Error: ' + e.message, 'error');
    }
});
// --- Event Listeners ---

function setupEventListeners() {
    // Navigation
    ui.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            ui.pages.forEach(p => p.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');
            ui.navBtns.forEach(b => b.classList.remove('active', 'text-blue-500'));
            btn.classList.add('active', 'text-blue-500');
        });
    });

    // Asset Selection
    if (ui.assetSelector) {
        ui.assetSelector.addEventListener('change', () => {
            const symbol = ui.assetSelector.value;
            if (chart) {
                // Reset chart logic if needed
            }
            api.send({ ticks_history: symbol, end: 'latest', count: 1000, style: 'candles', granularity: 60 });
            api.subscribeTicks(symbol);
            saveSettings();
        });
    }

    // Inputs
    if (ui.tokenInput) {
        ui.tokenInput.addEventListener('change', () => {
            const token = ui.tokenInput.value;
            if (token) {
                api.authorize(token);
                ui.tokenInput.value = ''; // clear for security
            }
        });
    }

    if (ui.accountSelector) {
        ui.accountSelector.addEventListener('change', () => {
            window.location.reload();
        });
    }

    // Bot Controls
    if (ui.btns.startBot) {
        ui.btns.startBot.addEventListener('click', () => {
            if (!bot.isRunning) {
                bot.start();
                ui.btns.startBot.classList.add('hidden');
                ui.btns.stopBot.classList.remove('hidden');
                ui.btns.pauseBot.classList.remove('hidden');
                ui.btns.killSwitch.classList.remove('hidden');
            }
        });
    }

    if (ui.btns.stopBot) {
        ui.btns.stopBot.addEventListener('click', () => {
            if (bot.isRunning) {
                bot.stop();
                ui.btns.stopBot.classList.add('hidden');
                ui.btns.pauseBot.classList.add('hidden');
                ui.btns.killSwitch.classList.add('hidden');
                ui.btns.startBot.classList.remove('hidden');
            }
        });
    }

    if (ui.btns.pauseBot) {
        ui.btns.pauseBot.addEventListener('click', () => {
            // Toggle pause logic
        });
    }

    if (ui.btns.killSwitch) {
        ui.btns.killSwitch.addEventListener('click', () => {
            bot.stop();
            window.location.reload();
        });
    }

    // Manual Trade
    if (ui.btns.rise) {
        ui.btns.rise.addEventListener('click', () => {
            const stake = parseFloat(ui.inputs.stake.value);
            const duration = parseInt(ui.inputs.duration.value);
            api.buyContract(ui.assetSelector.value, 'CALL', stake, duration);
        });
    }

    if (ui.btns.fall) {
        ui.btns.fall.addEventListener('click', () => {
            const stake = parseFloat(ui.inputs.stake.value);
            const duration = parseInt(ui.inputs.duration.value);
            api.buyContract(ui.assetSelector.value, 'PUT', stake, duration);
        });
    }

    // Settings
    Object.values(ui.botSettings).forEach(el => {
        if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
            el.addEventListener('change', saveSettings);
        }
    });

    // Presets
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
        });
    });

    if (ui.btns.loadChallenge) {
        ui.btns.loadChallenge.addEventListener('click', () => {
            applyPreset('conservative');
            ui.inputs.stake.value = "0.35";
            showToast('Small Account Challenge Preset Loaded');
        });
    }

    // Backtest
    if (ui.backtest.runBtn) {
        ui.backtest.runBtn.addEventListener('click', runBacktest);
    }

    // Export
    if (ui.btns.exportHistory) {
        ui.btns.exportHistory.addEventListener('click', exportHistory);
    }

    // Modal
    ui.modal.closes.forEach(el => {
        el.addEventListener('click', closeModal);
    });

    // Close modal on outside click
    ui.modal.el.addEventListener('click', (e) => {
        if (e.target === ui.modal.el || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    // Keyboard accessibility for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !ui.modal.el.classList.contains('opacity-0')) {
            closeModal();
        }
    });
}
