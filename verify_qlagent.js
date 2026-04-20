const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('ai-filter.js', 'utf8');
const context = {
    window: { tf: {} },
    console: console,
    tf: {}
};
vm.createContext(context);

// Append code to expose QLAgent
const script = new vm.Script(code + '; QLAgent;');
const QLAgentClass = script.runInContext(context);

const agent = new QLAgentClass();

console.log('Checking QLAgent properties...');
if (agent.hasOwnProperty('gamma')) {
    console.log('gamma property found (value: ' + agent.gamma + ')');
} else {
    console.log('gamma property NOT found');
}

console.log('Testing learn method...');
try {
    agent.learn([0, 0], 0, 1);
    console.log('learn method executed successfully');
} catch (e) {
    console.error('learn method failed:', e);
}
