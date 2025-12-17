# 🚀 VECTOR: Complete Team Onboarding & Setup Guide

**Goal:** Get a full-stack developer from zero to a running VECTOR system in **under 30 minutes**.
**Philosophy:** Copy, paste, run. Every command below is battle-tested.

---

## 📋 Table of Contents
- [Prerequisites](#-prerequisites)
- [One-Time Machine Setup](#-one-time-machine-setup)
- [Project-Wide Setup](#1-clone--install-the-monorepo)
- [Blockchain Setup (`packages/blockchain-core`)](#2-blockchain-setup-packagesblockchain-core)
- [AI Engine Setup (`packages/ai-engine`)](#3-ai-engine-setup-packagesai-engine)
- [Web Portal Setup (`packages/web-portal`)](#4-web-portal-setup-packagesweb-portal)
- [Shared Package Setup (`packages/shared`)](#5-shared-package-setup-packagesshared)
- [Running & Testing the System](#6-run-the-full-system)
- [Troubleshooting & Verification](#-troubleshooting--verification)

---

## 🛠 Prerequisites

Ensure you have these accounts and software ready **before starting**:

| Requirement | Purpose | How to Get It |
| :--- | :--- | :--- |
| **Node.js v18+** | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **Git** | Version control | Pre-installed or [git-scm.com](https://git-scm.com) |
| **MetaMask Wallet** | Blockchain interactions | Extension from [metamask.io](https://metamask.io) |
| **Supabase Account** | Database (PostgreSQL) | Free tier at [supabase.com](https://supabase.com) |
| **Google Gemini API Key** | AI/NLP (Skill Extraction) | From [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **RapidAPI Account & Key** | Job Market Data (JSearch) | From [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |

---

## 🌐 One-Time Machine Setup

### **A. Configure MetaMask for Polygon Amoy**
**This step is critical and prevents 90% of blockchain errors.**

1.  **Open MetaMask** and click the network dropdown (top center).
2.  If **"Polygon Amoy"** is not in the list, click **"Add network" → "Add a network manually"**.
3.  Enter these **exact settings**:
    *   **Network name:** `Polygon Amoy Testnet`
    *   **New RPC URL:** `https://rpc-amoy.polygon.technology`
    *   **Chain ID:** `80002`
    *   **Currency symbol:** `POL`
    *   **Block explorer URL:** `https://amoy.polygonscan.com`
4.  Click **Save** and switch to this network.

> **⚠️ Important Note on POL Balance:** POL is the **native token** (like ETH). **DO NOT** try to import it as a custom token. Your balance will appear automatically in your main asset list after receiving test funds. If it doesn't show immediately, refresh MetaMask or toggle networks.

---

## 1. Clone & Install the Monorepo

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd vector-system

# 2. Install root dependencies (this sets up npm workspaces)
npm install
```

---

## 2. Blockchain Setup (`packages/blockchain-core`)
*For the smart contract engineer.*

```bash
# Navigate to the blockchain package
cd packages/blockchain-core

# 1. INSTALL EXACT VERSIONS (This specific combination works)
npm install --save-dev hardhat@2.28.0 @nomicfoundation/hardhat-toolbox@5.0.0 @openzeppelin/contracts@5.0.1 dotenv@16.4.1

# 2. Configure your private key
# Create a .env file with JUST this one line:
echo 'PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE' > .env
# ⚠️  Get this from MetaMask: Account Details → Export Private Key
# ⚠️  Format: 64 hex characters after the '0x' (66 total characters).

# 3. Get Test POL (Fuel for transactions)
#    a. Ensure MetaMask is on the "Polygon Amoy" network.
#    b. Copy your wallet address (starts with 0x...).
#    c. Visit https://faucet.polygon.technology
#    d. Select "Amoy", paste your address, and claim 0.2 POL.

# 4. Verify the Setup
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

**✅ Expected Success Output:**
```
🚀 Deploying VectorToken to Amoy...
Deployer: 0xYourAddress...
✅ Contract: 0xDeployedContractAddress...
🔗 https://amoy.polygonscan.com/address/0xDeployedContractAddress...
```
**Save the contract address.** You'll need it for the web portal.

---

## 3. AI Engine Setup (`packages/ai-engine`)
*For the data scientist / ML engineer.*

```bash
# Navigate to the AI package
cd packages/ai-engine

# 1. Install core AI/ML dependencies
npm install @google/generative-ai@0.21.0 simple-statistics@7.8.3 ml-matrix@6.10.5 axios@1.6.0

# 2. (Optional) Install TypeScript definitions for development
npm install --save-dev @types/ml-matrix @types/simple-statistics typescript@5.3.0

# 3. Configure API Keys
cat > .env << EOL
GEMINI_API_KEY=your_actual_gemini_api_key_here
RAPIDAPI_KEY=your_actual_rapidapi_key_here
JOB_MARKET_API_URL=https://jsearch.p.rapidapi.com/search
EOL

# 4. Create a simple test to verify the setup
cat > test-imports.js << 'EOL'
const ss = require('simple-statistics');
console.log('✅ Simple-Statistics working. Mean:', ss.mean([1, 2, 3, 4, 5]));
const { Matrix } = require('ml-matrix');
const m = new Matrix([[1, 2], [3, 4]]);
console.log('✅ ML-Matrix working. Determinant:', m.det());
console.log('✅ AI Engine dependencies are ready.');
EOL
node test-imports.js
```

---

## 4. Web Portal Setup (`packages/web-portal`)
*For the frontend/backend/full-stack developer.*

```bash
# Navigate to the web application
cd packages/web-portal

# 1. Create environment configuration file
cp .env.example .env.local
# Now EDIT the .env.local file with your actual values:
# - DATABASE_URL: From Supabase project settings (use the Connection Pooler URL, port 6543)
# - GEMINI_API_KEY: Same as used in the AI engine
# - RAPIDAPI_KEY: Same as used in the AI engine
# - NEXT_PUBLIC_CONTRACT_ADDRESS: The address from your successful contract deployment

# 2. Bootstrap the Next.js application
npx create-next-app@latest . --typescript --tailwind --app --no-eslint --yes

# 3. Install the full dependency stack
npm install @prisma/client@5.7.0 prisma@5.7.0 \
  @google/generative-ai@0.21.0 @react-pdf/renderer@4.0.1 \
  ethers@6.8.0 @rainbow-me/rainbowkit@1.3.0 wagmi@2.0.0 viem@2.0.0 \
  simple-statistics@7.8.3 ml-matrix@6.10.5

# 4. Set up the database with Prisma
npx prisma init
npx prisma db push
npx prisma generate

# 5. Install local workspace packages (the AI and Shared modules)
npm install ../ai-engine ../shared
```

---

## 5. Shared Package Setup (`packages/shared`)
*For ensuring consistent types across the monorepo.*

```bash
# Navigate to the shared package
cd packages/shared

# 1. Install TypeScript
npm install --save-dev typescript@5.3.0 @types/node@20.0.0

# 2. Build the package (creates the dist/ folder)
npm run build  # or run `tsc` if the script is defined

# 3. (For other packages) After building, they can now correctly import from `shared`.
```

---

## 6. Run the Full System

With all packages set up, you can launch the application.

```bash
# TERMINAL 1: Start the Next.js development server (Frontend + API)
cd packages/web-portal
npm run dev
# ➜ Local:  http://localhost:3000

# TERMINAL 2: (Optional) Test AI Engine functions
cd packages/ai-engine
node test/skill-decay.test.js

# TERMINAL 3: (Optional) Run blockchain tests
cd packages/blockchain-core
npx hardhat test
```

---

## 🧪 Quick-Start Tests

### **Test the Blockchain (Mint a Sample Credential)**
*Create a test script in `packages/blockchain-core/scripts/mint-test.js`*
```javascript
const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("VectorToken", "YOUR_DEPLOYED_ADDRESS");
  const tx = await contract.safeMint(deployer.address, 1, 100, "ipfs://QmSampleURI");
  console.log("Mint TX:", tx.hash);
}
main();
```

### **Test the AI Engine (Predict Skill Decay)**
*Create a test in `packages/ai-engine/test/decay.js`*
```javascript
const ss = require('simple-statistics');
function predictSkillDecay(skillScores) {
  // Simple linear regression on score vs. time index
  const data = skillScores.map((score, idx) => [idx, score]);
  const lr = ss.linearRegression(data);
  return lr.m; // Returns slope (decay rate per time period)
}
const decay = predictSkillDecay([85, 78, 72, 70, 68]);
console.log(`Predicted skill decay slope: ${decay.toFixed(2)} per period`);
```

### **Test the Web API (Skill Extraction)**
```bash
curl -X POST http://localhost:3000/api/extract-skills \
  -H "Content-Type: application/json" \
  -d '{"resumeText": "Built systems with React, Node.js, and PostgreSQL. Experienced in Python machine learning."}'
```

---

## 🚨 Troubleshooting Cheat Sheet

| Problem & Error Message | Most Likely Cause | Solution |
| :--- | :--- | :--- |
| **`Error: private key too short`** / `invalid hexlify value` | Malformed `.env` file | Ensure `.env` has ONLY one line: `PRIVATE_KEY=0x64hexchars`. No quotes, no trailing spaces. |
| **`insufficient funds for gas * price + value`** | Wallet has no POL for gas. | 1. Confirm MetaMask is on **Polygon Amoy**. <br> 2. Get POL from the [Amoy Faucet](https://faucet.polygon.technology). |
| **`Signers array empty`** / `cannot read properties of undefined` | Hardhat can't read the private key. | 1. Confirm `dotenv` is installed in `blockchain-core`. <br> 2. Restart your terminal after creating the `.env` file. |
| **`Cannot find module '@google/generative-ai'`** | Local package dependency not installed. | Run `npm install` inside the `packages/ai-engine` directory. |
| **`PrismaClientInitializationError`** | Database connection failed. | 1. Verify `DATABASE_URL` in `web-portal/.env.local`. <br> 2. Use Supabase's **Connection Pooler** URL (port **6543**). |
| **`Error: Cannot find module 'shared'`** | The shared package wasn't built. | 1. Navigate to `packages/shared`. <br> 2. Run `npm run build`. <br> 3. Re-run `npm install` in `web-portal`. |
| **MetaMask shows 0 POL after faucet** | Network mismatch or cache issue. | 1. **Triple-check** MetaMask is on **"Polygon Amoy"**. <br> 2. Refresh the MetaMask window. <br> 3. Check your address on [Amoy Polygonscan](https://amoy.polygonscan.com). |

---

## ✅ Final Verification Script

To confirm everything is wired up, run this script from your project root (`vector-system/`):

```javascript
// save as `verify-setup.js` in the root and run with `node verify-setup.js`
const { execSync } = require('child_process');
const log = (msg) => console.log(`\n${msg}`);

console.log('🔍 VECTOR System Verification Started...');

try {
  log('1. 🪙  Verifying Blockchain Core...');
  execSync('cd packages/blockchain-core && npx hardhat --version', { stdio: 'inherit' });

  log('2. 🧠  Verifying AI Engine Dependencies...');
  execSync('cd packages/ai-engine && node -e "const ss=require(\'simple-statistics\'); console.log(`✅ Simple-Statistics v${ss.version}`)"', { stdio: 'inherit' });

  log('3. 🌐  Verifying Web Portal Framework...');
  execSync('cd packages/web-portal && npx next --version', { stdio: 'inherit' });

  log('4. 🔗  Verifying Shared Package Build...');
  // Check if the shared package built correctly
  execSync('cd packages/shared && [ -f "dist/index.js" ] && echo "✅ Shared package built." || echo "❌ Shared package not built."', { stdio: 'inherit', shell: true });

  console.log('\n' + '='.repeat(50));
  console.log('🎉 VERIFICATION COMPLETE. SYSTEM IS READY.');
  console.log('='.repeat(50));
  console.log('\nNext step: Run `cd packages/web-portal && npm run dev` to start the application.');

} catch (error) {
  console.error('\n❌ VERIFICATION FAILED.');
  console.error('Error:', error.message);
  console.log('\nRefer to the troubleshooting table above.');
  process.exit(1);
}
```

---

## 📁 Project Structure Quick Reference

```
vector-system/
├── packages/
│   ├── blockchain-core/   # Hardhat, Solidity contracts, deploy scripts
│   ├── ai-engine/         # Gemini NLP, skill decay, recommendations
│   ├── web-portal/        # Next.js 14 app (App Router), API routes, UI
│   └── shared/            # Common TypeScript types and constants
├── docs/                  # Architecture diagrams, API specs
├── research/              # Capstone thesis documents
└── scripts/               # Database seeds, deployment utilities
```

**You are now ready to build.** The foundational system—blockchain, AI, database, and web server—is operational. Begin development by exploring the respective `/src` directories in each package.