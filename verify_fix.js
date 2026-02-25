// verify_fix.js

// Mock DOM
const document = {
    createElement: (tag) => {
        return {
            tagName: tag.toUpperCase(),
            className: '',
            children: [],
            appendChild: function(child) {
                this.children.push(child);
            },
            textContent: '',
            setAttribute: () => {},
            onclick: null,
            // Mock innerHTML for read verification (though we shouldn't use it for writing)
            get innerHTML() {
                if (this.children.length > 0) {
                    return this.children.map(c => c.innerHTML || c.textContent).join('');
                }
                return this._innerHTML || '';
            },
            set innerHTML(val) {
                this._innerHTML = val;
            }
        };
    },
    createTextNode: (text) => ({ textContent: text }),
    getElementById: () => ({ innerHTML: '', innerText: '', className: '', appendChild: () => {} }),
    querySelectorAll: () => [],
    body: { classList: { add: () => {}, remove: () => {} } }
};

const window = {
    updateTradeHistory: null
};

const ui = {
    botTotalProfit: { innerText: '', className: '' },
    historyTable: {
        innerHTML: '',
        children: [],
        appendChild: function(child) {
            this.children.push(child);
        }
    }
};

// Copy the relevant parts of app.js (since we can't require it easily in this mock env without more setup)
// ... I will paste the function body here ...

// ... (Pasting updateTradeHistory from app.js)
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

        const createCell = (text, className) => {
            const td = document.createElement('td');
            td.className = className || 'px-6 py-4';
            td.textContent = text;
            return td;
        };

        tr.appendChild(createCell(trade.time, 'px-6 py-4'));
        tr.appendChild(createCell(trade.symbol, 'px-6 py-4'));
        tr.appendChild(createCell(trade.type, 'px-6 py-4'));
        tr.appendChild(createCell('$' + trade.stake, 'px-6 py-4'));
        tr.appendChild(createCell('$' + trade.profit.toFixed(2), `px-6 py-4 font-bold ${color}`));
        tr.appendChild(createCell(trade.grade || '-', `px-6 py-4 font-bold ${gradeColor}`));

        const tdDetails = document.createElement('td');
        tdDetails.className = 'px-6 py-4';
        const btnDetails = document.createElement('button');
        btnDetails.className = 'text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800';
        btnDetails.onclick = (event) => {
            event.stopPropagation();
            // openModal(originalIndex); // mocked
        };
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-magnifying-glass';
        btnDetails.appendChild(icon);
        btnDetails.appendChild(document.createTextNode(' Details'));
        tdDetails.appendChild(btnDetails);
        tr.appendChild(tdDetails);

        tr.onclick = () => {}; // openModal(originalIndex);
        ui.historyTable.appendChild(tr);
    });
};

// Malicious Payload
const maliciousTrade = {
    time: '2023-10-27 10:00:00',
    symbol: '<img src=x onerror=alert("XSS")>', // XSS Payload
    type: 'CALL',
    stake: 10,
    profit: 5,
    grade: 'A'
};

const history = [maliciousTrade];

// Run
console.log('Running updateTradeHistory with malicious payload...');
try {
    window.updateTradeHistory(history, 5, 1, 0);

    // Verify
    const row = ui.historyTable.children[0];
    const symbolCell = row.children[1]; // Symbol is the 2nd cell

    console.log('Symbol Cell Text Content:', symbolCell.textContent);

    if (symbolCell.textContent === '<img src=x onerror=alert("XSS")>') {
        console.log('[+] PASS: Payload treated as text.');
    } else {
        console.log('[-] FAIL: Payload not found in textContent or modified.');
    }

    if (symbolCell.children.length === 0) {
         console.log('[+] PASS: No child elements created (no script execution).');
    } else {
         console.log('[-] FAIL: Child elements created!');
    }

} catch (e) {
    console.error('Error running verification:', e);
}
