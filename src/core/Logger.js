// src/core/Logger.js - Structured Logging

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.debugMode = false;
    }

    info(msg, context = '') {
        this._add('INFO', msg, context);
    }

    warn(msg, context = '') {
        this._add('WARN', msg, context);
    }

    error(msg, context = '') {
        this._add('ERROR', msg, context);
    }

    debug(msg, context = '') {
        if(this.debugMode) this._add('DEBUG', msg, context);
    }

    _add(level, msg, context) {
        const entry = {
            time: new Date().toLocaleTimeString(),
            level: level,
            msg: msg,
            context: context
        };

        this.logs.unshift(entry);
        if(this.logs.length > this.maxLogs) this.logs.pop();

        // Console output
        const text = `[${level}] ${msg} ${context ? JSON.stringify(context) : ''}`;
        if(level === 'ERROR') console.error(text);
        else if(level === 'WARN') console.warn(text);
        else if(this.debugMode) console.log(text); // Filter INFO if needed

        // UI Update (if available)
        this._updateUI(entry);
    }

    _updateUI(entry) {
        if(typeof document === 'undefined') return;
        const container = document.getElementById('bot-logs');
        if(!container) return;

        const div = document.createElement('div');
        div.className = `text-[10px] font-mono border-b border-gray-800 pb-1 mb-1 ${this._getColor(entry.level)}`;
        div.innerText = `[${entry.time}] ${entry.msg}`;
        container.prepend(div);

        if(container.children.length > 50) container.lastChild.remove();
    }

    _getColor(level) {
        if(level === 'INFO') return 'text-gray-400';
        if(level === 'WARN') return 'text-yellow-400';
        if(level === 'ERROR') return 'text-red-500';
        return 'text-blue-400';
    }
}

if(typeof window !== 'undefined') window.BotLoggerClass = Logger;
if(typeof module !== 'undefined') module.exports = Logger;
