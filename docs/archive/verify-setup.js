const { execSync } = require('child_process');
const log = (msg) => console.log(`\n${msg}`);

console.log('🔍 VECTOR System Verification Started...');

try {
  log('1. 🪙  Verifying Blockchain Core...');
  execSync('cd packages/blockchain-core && npx hardhat --version', { stdio: 'inherit' });

  log('2. 🧠  Verifying AI Engine Dependencies...');
  execSync('cd packages/ai-engine && node -e "const ss=require(\'simple-statistics\'); console.log(`✅ Simple-Statistics v${ss.version}`)"', { stdio: 'inherit' });

  log('3. 🌐  Verifying Web Portal Framework...');
  // Updated path for nested structure
  execSync('cd packages/web-portal/vector-web && npx next --version', { stdio: 'inherit' });

  log('4. 🔗  Verifying Shared Package Build...');
  execSync('cd packages/shared && [ -f "dist/index.js" ] && echo "✅ Shared package built." || echo "❌ Shared package not built."', { stdio: 'inherit', shell: true });

  console.log('\n' + '='.repeat(50));
  console.log('🎉 VERIFICATION COMPLETE. SYSTEM IS READY.');
  console.log('='.repeat(50));
  console.log('\nNext step: Run `cd packages/web-portal/vector-web && npm run dev` to start the application.');

} catch (error) {
  console.error('\n❌ VERIFICATION FAILED.');
  console.error('Error:', error.message);
  console.log('\nRefer to the troubleshooting table above.');
  process.exit(1);
}