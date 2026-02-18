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
    ui.modal.el.classList.remove('opacity-0', 'pointer-events-none');
}

function closeModal() {
    document.body.classList.remove('modal-active');
    ui.modal.el.classList.add('opacity-0', 'pointer-events-none');
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
