// debug-env.js
const fs = require('fs');
const path = require('path');

console.log("🔍 Debugging .env file");
console.log("======================");

// Read raw file
const envPath = path.join(__dirname, '.env');
const rawContent = fs.readFileSync(envPath, 'utf8');
console.log("Raw content:");
console.log(JSON.stringify(rawContent)); // Shows special characters

// Check line by line
console.log("\nLine-by-line analysis:");
rawContent.split('\n').forEach((line, i) => {
  if (line.trim()) {
    console.log(`Line ${i}: "${line}" (length: ${line.length})`);
    
    // Check if it looks like a private key
    if (line.includes('PRIVATE_KEY')) {
      const parts = line.split('=');
      const keyValue = parts[1] || '';
      console.log(`  Value: "${keyValue}"`);
      console.log(`  Has 0x prefix: ${keyValue.startsWith('0x')}`);
      console.log(`  Hex length (without 0x): ${keyValue.startsWith('0x') ? keyValue.length - 2 : keyValue.length}`);
      console.log(`  Valid hex: ${/^0x[0-9a-fA-F]+$/.test(keyValue) ? '✅' : '❌'}`);
    }
  }
});

// Try to load with dotenv
console.log("\nAttempting to load with dotenv...");
require('dotenv').config();
console.log("PRIVATE_KEY from process.env:", process.env.PRIVATE_KEY ? `"${process.env.PRIVATE_KEY}"` : "UNDEFINED");
if (process.env.PRIVATE_KEY) {
  console.log("Length:", process.env.PRIVATE_KEY.length);
  console.log("Expected: 66 (0x + 64 hex chars)");
}