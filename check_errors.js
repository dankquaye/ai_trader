
const fs = require('fs');

try {
    const appJs = fs.readFileSync('app.js', 'utf8');
    if (appJs.includes('function setupEventListeners')) {
        console.log('Found setupEventListeners definition.');
    } else if (appJs.includes('const setupEventListeners =')) {
        console.log('Found setupEventListeners definition.');
    } else {
        console.log('setupEventListeners definition NOT found in app.js');
    }
} catch (e) {
    console.error(e);
}
