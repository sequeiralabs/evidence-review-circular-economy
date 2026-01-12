// Simple obfuscation script using javascript-obfuscator
// Run with: node obfuscate.js

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const options = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
    renameGlobals: false,
    selfDefending: true,
    debugProtection: false,
    debugProtectionInterval: 0
};

console.log('Obfuscating app.js...');

try {
    const code = fs.readFileSync('app.js', 'utf8');
    const obfuscated = JavaScriptObfuscator.obfuscate(code, options);
    fs.writeFileSync('app.obfuscated.js', obfuscated.getObfuscatedCode());
    console.log('✓ Created app.obfuscated.js');

    // Also create a version for publications-data.js (lighter obfuscation since it's mostly data)
    console.log('Obfuscating publications-data.js (light obfuscation)...');
    const dataCode = fs.readFileSync('publications-data.js', 'utf8');
    const dataOptions = {
        compact: true,
        stringArray: true,
        stringArrayThreshold: 0.5,
        unicodeEscapeSequence: false
    };
    const obfuscatedData = JavaScriptObfuscator.obfuscate(dataCode, dataOptions);
    fs.writeFileSync('publications-data.obfuscated.js', obfuscatedData.getObfuscatedCode());
    console.log('✓ Created publications-data.obfuscated.js');

    console.log('\n✓ Obfuscation complete!');
    console.log('\nNext steps:');
    console.log('1. Update index.html to use app.obfuscated.js instead of app.js');
    console.log('2. Update index.html to use publications-data.obfuscated.js instead of publications-data.js');
    console.log('3. Upload the obfuscated files to GitHub Pages');
} catch (error) {
    console.error('Error:', error.message);
    console.log('\nTo use this script, first install javascript-obfuscator:');
    console.log('  npm install javascript-obfuscator');
}
