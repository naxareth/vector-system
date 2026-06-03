---

# VECTOR: Complete Team Onboarding & Setup Guide

**Goal:** Get a full-stack developer from zero to a running VECTOR system in **under 30 minutes**.
**Philosophy:** Copy, paste, run. Every command below is battle-tested.

---

## 📋 Table of Contents

* [Prerequisites](https://www.google.com/search?q=%23-prerequisites)
* [One-Time Machine Setup](https://www.google.com/search?q=%23-one-time-machine-setup)
* [Project-Wide Setup](https://www.google.com/search?q=%231-clone--install-the-monorepo)
* [Blockchain Setup](https://www.google.com/search?q=%232-blockchain-setup-packagesblockchain-core)
* [AI Engine Setup](https://www.google.com/search?q=%233-ai-engine-setup-packagesai-engine)
* [Web Portal Setup](https://www.google.com/search?q=%234-web-portal-setup-packagesweb-portalvector-web)
* [Shared Package Setup](https://www.google.com/search?q=%235-shared-package-setup-packagesshared)
* [Running & Testing the System](https://www.google.com/search?q=%236-run-the-full-system)
* [Troubleshooting & Verification](https://www.google.com/search?q=%23-troubleshooting--verification)

---

## 🛠 Prerequisites

Ensure you have these accounts and software ready **before starting**:

| Requirement | Purpose | How to Get It |
| --- | --- | --- |
| **Node.js v18+** | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **Git** | Version control | Pre-installed or [git-scm.com](https://git-scm.com) |
| **MetaMask Wallet** | Blockchain interactions | Extension from [metamask.io](https://metamask.io) |
| **Supabase Account** | Database (PostgreSQL) | Free tier at [supabase.com](https://supabase.com) |
| **AI Provider Key** | AI/NLP (Skill Extraction) | Gemini (Google AI Studio) or Groq (Groq Console) |
| **RapidAPI Key** | Job Market Data (JSearch) | From [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| **Adzuna API** | Job Market Data (Backup) | From [Adzuna Developer](https://www.google.com/search?q=https://developer.adzuna.com/) |

---

## 🌐 One-Time Machine Setup

### **A. Configure MetaMask for Polygon Amoy**

**This step is critical and prevents 90% of blockchain errors.**

1. **Open MetaMask** and click the network dropdown (top center).
2. If **"Polygon Amoy"** is not in the list, click **"Add network" → "Add a network manually"**.
3. Enter these **exact settings**:
* **Network name:** `Polygon Amoy Testnet`
* **New RPC URL:** `https://rpc-amoy.polygon.technology`
* **Chain ID:** `80002`
* **Currency symbol:** `POL`
* **Block explorer URL:** `https://amoy.polygonscan.com`


4. Click **Save** and switch to this network.

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
npm install

# 2. Configure AI Provider + API Keys
cat > .env << EOL
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
RAPIDAPI_KEY=your_rapidapi_key
JOB_MARKET_API_URL=https://jsearch.p.rapidapi.com/search
ADZUNA_APP_ID=your_adzuna_id
ADZUNA_APP_KEY=your_adzuna_key
# Required for Ingestion Scripts:
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
EOL

# 3. Verify Dependencies
npm test

```

---

## 4. Web Portal Setup (`packages/web-portal/vector-web`)

*For the frontend/backend/full-stack developer.*

```bash
# ⚠️ Navigate to the INNER directory where the Next.js app lives
cd packages/web-portal/vector-web

# 1. Install Dependencies
npm install

# 2. Configure Environment Variables
# ⚠️ Create .env with your secured keys. Replace placeholders with real values.
cat > .env << EOL
# ------------------------------------------------------------------
# 🔐 SECURITY & AUTHENTICATION
# ------------------------------------------------------------------
# Public Keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Service Role Key (Backend Only - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Data Encryption Key (Backend Only)
ENCRYPTION_KEY="your-generated-32-byte-hex-key"

# ------------------------------------------------------------------
# 🗄️ DATABASE CONNECTION
# ------------------------------------------------------------------
# ACTIVE CONNECTION (Using Session Mode - Port 5432)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:5432/postgres"

# DIRECT CONNECTION (For Migrations)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:5432/postgres"

# ------------------------------------------------------------------
# 🧠 AI & EXTERNAL SERVICES
# ------------------------------------------------------------------
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1:8b"
REGISTRAR_SECRET_KEY="VECTOR-ADMIN-2026"
# (Optional) Contract Address if hardcoded
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."
EOL

# 3. Generate Prisma Client
npx prisma generate

# 4. Push Database Schema (Only needed if starting fresh)
# npx prisma db push

```

---

## 5. Shared Package Setup (`packages/shared`)

*For ensuring consistent types across the monorepo.*

```bash
# Navigate to the shared package
cd packages/shared

# 1. Install TypeScript
npm install

# 2. Build the package (creates the dist/ folder)
npm run build 

# 3. (For other packages) After building, they can now correctly import from `shared`.

```

---

## 6. Run the Full System

With all packages set up, you can launch the application.

```bash
# TERMINAL 1: Start the Next.js development server (Frontend + API)
cd packages/web-portal/vector-web
npm run dev
# ➜ Local:  http://localhost:3000

# TERMINAL 2: (Optional) Run blockchain tests
cd packages/blockchain-core
npx hardhat test

```

---

## 🧪 Quick-Start Tests

### **Test the Blockchain (Mint a Sample Credential)**

*Create a test script in `packages/blockchain-core/scripts/mint-test.js*`

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

### **Test the Web API (Skill Extraction)**

```bash
curl -X POST http://localhost:3000/api/extract-skills \
  -H "Content-Type: application/json" \
  -d '{"resumeText": "Built systems with React, Node.js, and PostgreSQL. Experienced in Python machine learning."}'

```

---

## 🚨 Troubleshooting Cheat Sheet

| Problem & Error Message | Most Likely Cause | Solution |
| --- | --- | --- |
| **`Error: private key too short`** | Malformed `.env` file | Ensure `.env` has ONLY one line: `PRIVATE_KEY=0x64hexchars`. No quotes, no trailing spaces. |
| **`insufficient funds for gas`** | Wallet has no POL. | 1. Confirm MetaMask is on **Polygon Amoy**. <br>

<br> 2. Get POL from the [Amoy Faucet](https://faucet.polygon.technology). |
| **`Signers array empty`** | Hardhat can't read key. | 1. Confirm `dotenv` is installed. <br>

<br> 2. Restart terminal after creating `.env`. |
| **`PrismaClientInitializationError`** | Database connection failed. | 1. Verify `DATABASE_URL` in `web-portal/vector-web/.env`. <br>

<br> 2. Use Supabase's **Connection Pooler** URL (port **5432** or **6543**). |
| **`CRITICAL: ENCRYPTION_KEY is missing`** | Missing Security Key | Add `ENCRYPTION_KEY` to your `.env` file (Generate via `openssl rand -hex 32`). |
| **`Error: Cannot find module 'shared'`** | Shared package not built. | 1. Navigate to `packages/shared`. <br>

<br> 2. Run `npm run build`. <br>

<br> 3. Re-run `npm install` in `vector-web`. |

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

```
