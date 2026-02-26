// app.js - Institutional Dashboard Controller

// Globals
window.api = null;
window.bot = null;
let chart = null;
let candleSeries = null;

// Error Handler
window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', msg, error);
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Initialize Core Systems
        window.api = new DerivAPI();
        window.bot = new TradingBot(window.api);

        // 2. Setup UI
        initChart();
        bindUI();

        // 3. Connect API
        const type = document.getElementById('account-selector').value;
        window.api.setAccountType(type);

        // 4. Start Update Loop
        startUpdateLoop();

        // 5. Hide Loader
        setTimeout(() => {
            const loader = document.getElementById('loading-overlay');
            if(loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 500);
            }
        }, 800);

    } catch (e) {
        console.error('Init Failed:', e);
        alert('System Initialization Failed: ' + e.message);
    }
});

function initChart() {
    const container = document.getElementById('chart-container');
    if(!container) return;

    chart = LightweightCharts.createChart(container, {
        layout: { background: { type: 'solid', color: '#000000' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { timeVisible: true, secondsVisible: true, borderColor: '#374151' },
        rightPriceScale: { borderColor: '#374151' }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    });

    // Resize Observer
    new ResizeObserver(entries => {
        if(entries.length === 0 || !entries[0].contentRect) return;
        const { width, height } = entries[0].contentRect;
        chart.resize(width, height);
    }).observe(container);
}

function bindUI() {
    // Account Selector
    document.getElementById('account-selector').addEventListener('change', (e) => {
        window.api.setAccountType(e.target.value);
    });

    // Asset Selector
    document.getElementById('asset-selector').addEventListener('change', (e) => {
        const symbol = e.target.value;
        if(window.bot.state.isRunning) {
            showToast('Switching Asset...', 'info');
            window.bot.stop();
            window.bot.symbol = symbol;
            window.bot.start(); // Restart with new symbol
        } else {
            window.bot.symbol = symbol;
        }
    });

    // Bot Controls
    const btnStart = document.getElementById('btn-start-bot');
    const btnStop = document.getElementById('btn-stop-bot');

    btnStart.addEventListener('click', () => {
        window.bot.start();
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
        document.getElementById('market-status').innerText = 'LIVE';
        document.getElementById('market-status').className = 'text-[10px] uppercase tracking-wider text-green-500 font-bold border border-green-700 px-2 py-0.5 rounded';
        showToast('Engine Started', 'success');
    });

    btnStop.addEventListener('click', () => {
        window.bot.stop();
        btnStop.classList.add('hidden');
        btnStart.classList.remove('hidden');
        document.getElementById('market-status').innerText = 'STOPPED';
        document.getElementById('market-status').className = 'text-[10px] uppercase tracking-wider text-red-500 font-bold border border-red-700 px-2 py-0.5 rounded';
        showToast('Engine Stopped', 'info');
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(btn.dataset.target).classList.remove('hidden');
            btn.classList.add('active');
        });
    });

    // Params
    const lockCheck = document.getElementById('lock-params');
    if(lockCheck) lockCheck.addEventListener('change', (e) => window.bot.setParamLock(e.target.checked));

    // API Events
    window.api.on('tick', (tick) => {
        try {
            window.bot.processTick(tick);
            updateChart(tick);
        } catch(e) { console.error(e); }
    });

    window.api.on('candles', (candles) => {
        if(candles.length > 0) {
            const data = candles.map(c => ({
                time: c.epoch,
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close)
            }));
            candleSeries.setData(data);
        }
    });

    window.api.on('ohlc', (c) => {
        window.bot.processCandle(c, c.granularity);
    });

    window.api.on('balance', (bal) => {
        const b = parseFloat(bal.balance);
        document.getElementById('header-balance').innerText = `$${b.toFixed(2)}`;
        window.bot.state.balance = b; // Updated path
    });

    window.api.on('contract_finish', (c) => window.bot.handleTradeResult(c));
}

let currentBar = null;
function updateChart(tick) {
    if(!candleSeries) return;
    const price = tick.quote;
    const time = Math.floor(tick.epoch / 60) * 60; // 1m aggregation for chart

    if (!currentBar || time > currentBar.time) {
        currentBar = { time: time, open: price, high: price, low: price, close: price };
        candleSeries.update(currentBar);
    } else {
        currentBar.high = Math.max(currentBar.high, price);
        currentBar.low = Math.min(currentBar.low, price);
        currentBar.close = price;
        candleSeries.update(currentBar);
    }
}

// --- Debugger Loop ---

function startUpdateLoop() {
    setInterval(() => {
        if(!window.bot) return;
        const bot = window.bot;
        const state = bot.state; // Bot State object

        // Connection
        const conn = document.getElementById('connection-status');
        if(window.api.isConnected) conn.className = 'w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
        else conn.className = 'w-3 h-3 rounded-full bg-red-500 animate-pulse';

        // Bot Stats
        safeSetText('debug-state', state.executionLock ? 'LOCKED' : (state.isRunning ? 'RUNNING' : 'IDLE'));
        safeSetText('debug-lock', state.executionLock ? 'LOCKED' : 'UNLOCKED');
        safeSetColor('debug-lock', state.executionLock ? 'text-red-500' : 'text-green-500');

        const cooldown = Math.max(0, Math.ceil((state.cooldownUntil - Date.now())/1000));
        safeSetText('debug-cooldown', cooldown > 0 ? `${cooldown}s` : 'READY');

        // Risk Stats
        safeSetText('debug-winrate', state.recentTrades.length > 0
            ? ((state.recentTrades.filter(x=>x===1).length / state.recentTrades.length)*100).toFixed(0) + '%'
            : '0%');

        const dd = state.equityHigh > 0 ? ((state.equityHigh - state.balance)/state.equityHigh * 100) : 0;
        safeSetText('debug-dd', dd.toFixed(2) + '%');
        safeSetText('debug-last-profit', `$${(state.tradeHistory.length > 0 ? state.tradeHistory[state.tradeHistory.length-1].profit.toFixed(2) : '0.00')}`);

        // Overlay
        safeSetText('overlay-regime', bot.regimeDetector.currentRegime);
        safeSetText('overlay-confidence', bot.confidenceModel ? (bot.confidenceModel.lastScore || 0) + '%' : (bot.reinforcement.getScore('trend_follow')*80).toFixed(0)+'%');
        safeSetText('header-profit', `$${state.totalProfit.toFixed(2)}`);

    }, 200);
}

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}

function safeSetColor(id, cls) {
    const el = document.getElementById(id);
    if(el) el.className = cls;
}

function showToast(msg, type='info') {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const div = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-800');
    div.className = `${color} text-white px-4 py-2 rounded shadow-lg text-xs font-bold transition-all transform hover:scale-105`;
    div.innerText = msg;

    container.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
