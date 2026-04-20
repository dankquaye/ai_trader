const fs = require('fs');
const vm = require('vm');

console.log('Reading app.js...');
const code = fs.readFileSync('app.js', 'utf8');

// Extract showToast function
// It starts with 'function showToast(' and ends before 'document.addEventListener'
const startIdx = code.indexOf('function showToast');
const endIdx = code.indexOf('document.addEventListener');

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find showToast function in app.js');
    process.exit(1);
}

const showToastCode = code.substring(startIdx, endIdx);

// Also need activeToasts definition which is just above
const activeToastsCode = 'const activeToasts = [];';

console.log('Extracted code length:', showToastCode.length);

// Mock DOM
const mockDocument = {
    getElementById: (id) => {
        if (id === 'toast-container') {
            return {
                appendChild: (child) => {
                    console.log('Appended to container:', child.outerHTML);
                    // Verification Logic
                    // We expect escaped HTML like &lt;img... inside the span
                    // The payload is <img src=x onerror=alert(1)>
                    // safe serialization should produce &lt;img src=x onerror=alert(1)&gt;

                    if (child.outerHTML.includes('<img src=x')) {
                         console.error('FAIL: Raw HTML injected!');
                         process.exit(1);
                    }
                    if (child.outerHTML.includes('&lt;img src=x')) {
                         console.log('SUCCESS: HTML escaped.');
                    } else {
                         // Maybe it's not even there?
                         if (!child.outerHTML.includes('img')) {
                             console.error('FAIL: Payload missing?');
                             // This might happen if my mock serialization is wrong
                         }
                    }
                }
            };
        }
        return null;
    },
    createElement: (tag) => {
        return {
            tagName: tag,
            className: '',
            _innerHTML: '',
            _textContent: '',
            children: [],
            style: {},
            set innerHTML(val) { this._innerHTML = val; this.children = []; },
            get innerHTML() { return this._innerHTML; },
            set textContent(val) { this._textContent = val; this._innerHTML = ''; this.children = []; },
            get textContent() { return this._textContent; },
            appendChild: function(child) {
                this.children.push(child);
            },
            remove: () => {},
            get outerHTML() {
                let inner = '';
                if (this._textContent) {
                    inner = this._textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                } else if (this.children.length > 0) {
                    inner = this.children.map(c => c.outerHTML).join('');
                } else {
                    inner = this._innerHTML;
                }
                return `<${this.tagName} class="${this.className}">${inner}</${this.tagName}>`;
            }
        };
    }
};

const context = {
    document: mockDocument,
    window: {},
    console: console,
    setTimeout: (fn) => fn(), // execute immediately
    // activeToasts is defined in the script
};
context.window = context;

const testScript = `
${activeToastsCode}
${showToastCode}

console.log('Testing XSS payload...');
showToast('<img src=x onerror=alert(1)>', 'error');
`;

try {
    vm.runInNewContext(testScript, context);
} catch (e) {
    console.error('Error running script:', e);
    process.exit(1);
}
