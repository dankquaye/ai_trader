const fs = require('fs');

// Read files
const appJs = fs.readFileSync('app.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Regex to find IDs accessed in app.js
const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const idsInJs = new Set();

while ((match = idRegex.exec(appJs)) !== null) {
    idsInJs.add(match[1]);
}

// Regex to find IDs defined in index.html
const htmlIdRegex = /id=["']([^"']+)["']/g;
const idsInHtml = new Set();

while ((match = htmlIdRegex.exec(indexHtml)) !== null) {
    idsInHtml.add(match[1]);
}

// Check for missing IDs
const missingIds = [];
idsInJs.forEach(id => {
    if (!idsInHtml.has(id)) {
        missingIds.push(id);
    }
});

if (missingIds.length > 0) {
    console.error('ERROR: The following IDs referenced in app.js are missing in index.html:');
    missingIds.forEach(id => console.error(` - ${id}`));
    process.exit(1);
} else {
    console.log('SUCCESS: All IDs referenced in app.js exist in index.html.');
}
