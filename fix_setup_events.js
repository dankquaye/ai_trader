function setupEventListeners() {
    // Navigation
    ui.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            ui.pages.forEach(p => p.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');
            ui.navBtns.forEach(b => b.classList.remove('active', 'text-blue-500'));
            btn.classList.add('active', 'text-blue-500');
            if (target === 'platform') setTimeout(() => { if (chart) chart.resize(ui.chartContainer.clientWidth, ui.chartContainer.clientHeight); }, 100);
            if (target === 'backtest' && btChart) setTimeout(() => { btChart.resize(ui.backtest.chartContainer.clientWidth, ui.backtest.chartContainer.clientHeight); }, 100);
        });
    });

    // Account & Token
    ui.accountSelector.addEventListener('change', () => {
        const type = ui.accountSelector.value;
        if (bot) {
            bot.setAccountType(type);
            ui.profile.type.innerText = type === 'demo' ? 'Demo' : 'Real';
        }
    });

    ui.tokenInput.addEventListener('change', () => {
        const token = ui.tokenInput.value.trim();
        if (token && api) api.connect(token);
    });

    // Settings
    ui.assetSelector.addEventListener('change', () => {
        const symbol = ui.assetSelector.value;
        bot.setSymbol(symbol);
        if (api.connection && api.connection.readyState === 1) {
            api.subscribeTicks(symbol);
            api.subscribeCandles(symbol, 60);
            api.getHistory(symbol);
        }
    });

    ui.inputs.duration.addEventListener('change', () => bot.setDuration(parseInt(ui.inputs.duration.value)));
    ui.inputs.stake.addEventListener('change', () => bot.setStake(parseFloat(ui.inputs.stake.value)));

    ui.botSettings.strategy.addEventListener('change', () => {
        bot.setStrategy(ui.botSettings.strategy.value);
        renderStrategyParams(ui.botSettings.strategy.value);
    });
    ui.botSettings.risk.addEventListener('change', () => bot.setRiskLevel(ui.botSettings.risk.value));

    // Filters & Toggles
    ui.botSettings.useFilter.addEventListener('change', () => bot.useFilter = ui.botSettings.useFilter.checked);
    ui.botSettings.adxThreshold.addEventListener('change', () => bot.adxThreshold = parseInt(ui.botSettings.adxThreshold.value));
    ui.botSettings.avoidSqueeze.addEventListener('change', () => bot.avoidSqueeze = ui.botSettings.avoidSqueeze.checked);

    ui.botSettings.useAIFilter.addEventListener('change', () => {
        if (bot) bot.useAIFilter = ui.botSettings.useAIFilter.checked;
    });

    ui.botSettings.autoSelect.addEventListener('change', () => {
        if (ui.botSettings.autoSelect.checked) startAutoScanner();
        else stopAutoScanner();
    });

    ui.botSettings.lockParams.addEventListener('change', () => {
        bot.setParamLock(ui.botSettings.lockParams.checked);
    });

    // Money Management
    ui.botSettings.useMartingale.addEventListener('change', () => bot.useMartingale = ui.botSettings.useMartingale.checked);
    ui.botSettings.useSmartRisk.addEventListener('change', () => bot.useSmartRisk = ui.botSettings.useSmartRisk.checked);
    ui.botSettings.martingaleMultiplier.addEventListener('change', () => bot.martingaleMultiplier = parseFloat(ui.botSettings.martingaleMultiplier.value));
    ui.botSettings.takeProfit.addEventListener('change', () => bot.takeProfit = parseFloat(ui.botSettings.takeProfit.value));
    ui.botSettings.stopLoss.addEventListener('change', () => bot.stopLoss = parseFloat(ui.botSettings.stopLoss.value));

    // Bot Controls
    ui.btns.startBot.addEventListener('click', () => {
        bot.start();
        ui.btns.startBot.classList.add('hidden');
        ui.btns.stopBot.classList.remove('hidden');
        ui.btns.pauseBot.classList.remove('hidden');
        ui.btns.killSwitch.classList.remove('hidden');
        if (ui.botSettings.autoSelect.checked) startAutoScanner();
        saveSettings();
    });

    ui.btns.stopBot.addEventListener('click', () => {
        bot.stop();
        ui.btns.startBot.classList.remove('hidden');
        ui.btns.stopBot.classList.add('hidden');
        ui.btns.pauseBot.classList.add('hidden');
        ui.btns.killSwitch.classList.add('hidden');
        stopAutoScanner();
        window.updateWatchdogStatus('STOPPED');
    });

    ui.btns.pauseBot.addEventListener('click', () => {
        if (!bot.isRunning) return;
        bot.isPaused = !bot.isPaused;
        const icon = ui.btns.pauseBot.querySelector('i');

        if (bot.isPaused) {
            ui.btns.pauseBot.classList.replace('bg-yellow-600', 'bg-blue-600');
            ui.btns.pauseBot.classList.replace('hover:bg-yellow-500', 'hover:bg-blue-500');
            icon.classList.replace('fa-pause', 'fa-play');
            ui.btns.pauseBot.setAttribute('aria-label', 'Resume Bot');
            window.updateWatchdogStatus('PAUSED');
        } else {
            ui.btns.pauseBot.classList.replace('bg-blue-600', 'bg-yellow-600');
            ui.btns.pauseBot.classList.replace('hover:bg-blue-500', 'hover:bg-yellow-500');
            icon.classList.replace('fa-play', 'fa-pause');
            ui.btns.pauseBot.setAttribute('aria-label', 'Pause Bot');
            window.updateWatchdogStatus('RUNNING');
        }
    });

    ui.btns.killSwitch.addEventListener('click', () => {
        if(confirm("EMERGENCY STOP! This will force stop the bot and attempt to sell any open positions. Continue?")) {
            bot.emergencyStop();
            ui.btns.stopBot.click();
        }
    });

    ui.btns.rise.addEventListener('click', () => {
        bot.setStake(parseFloat(ui.inputs.stake.value));
        bot.setDuration(parseInt(ui.inputs.duration.value));
        bot.executeTrade('CALL');
    });

    ui.btns.fall.addEventListener('click', () => {
        bot.setStake(parseFloat(ui.inputs.stake.value));
        bot.setDuration(parseInt(ui.inputs.duration.value));
        bot.executeTrade('PUT');
    });

    // Modals
    ui.modal.closes.forEach(el => el.addEventListener('click', closeModal));

    // Preset Buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    ui.btns.loadChallenge.addEventListener('click', () => {
        if(bot.isRunning) return showToast('Stop bot first', 'error');
        ui.botSettings.useSmartRisk.checked = true;
        ui.inputs.stake.value = "0.35";
        ui.botSettings.strategy.value = "ultra_instinct";
        ui.botSettings.takeProfit.value = "5";
        ui.botSettings.stopLoss.value = "10";
        ui.botSettings.useMartingale.checked = true;
        ui.botSettings.martingaleMultiplier.value = "2.1";

        // Dispatch events to update state
        ui.botSettings.strategy.dispatchEvent(new Event('change'));
        ui.botSettings.useSmartRisk.dispatchEvent(new Event('change'));
        ui.botSettings.useMartingale.dispatchEvent(new Event('change'));

        showToast('Small Account Challenge Preset Loaded!', 'success');
        saveSettings();
    });

    // Tools
    ui.btns.exportHistory.addEventListener('click', exportHistory);
    ui.btns.sendSupport.addEventListener('click', () => {
        showToast('Message sent to support. We will get back to you soon!', 'success');
        document.querySelector('#support form').reset();
    });

    // Backtest
    if(ui.backtest.runBtn) {
        ui.backtest.runBtn.addEventListener('click', runBacktest);
    }
}
