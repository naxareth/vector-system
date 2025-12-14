# VECTOR: A Decentralized Micro-Credentialing System

**VECTOR** transforms static academic records into a dynamic, market-aware career engine. It tackles credential fraud and the skills gap by issuing blockchain-verified micro-credentials and providing AI-powered career insights.

**Core Innovations:**
- **Granular Skill Verification:** Issues ERC-1155 tokens for specific skills (e.g., "Advanced SQL") on the Polygon blockchain.
- **Predictive Career Analytics:** An AI engine analyzes real-time job market data to detect skill decay and recommend upskilling.
- **Cryptographically Verified Resumes (CVR):** Generates QR-linked resumes where employers can verify credentials in seconds.

---

## 🚀 Getting Started (For Developers & Contributors)

This project is a monorepo managed with npm workspaces. Follow these steps to set up your local development environment.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Git](https://git-scm.com/)
- A code editor (e.g., [VS Code](https://code.visualstudio.com/))
- A crypto wallet (e.g., [MetaMask](https://metamask.io/)) for blockchain interaction

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/[YOUR_GITHUB_USERNAME]/vector-system.git
cd vector-system

# Install root and all package dependencies
npm install
```

### 2. Environment Setup (Blockchain Core)

The blockchain-core package requires API keys and a private key for the Polygon Amoy testnet.

Navigate to the package:

```bash
cd packages/blockchain-core
```

Copy the example environment file and edit it:

```bash
cp .env.example .env  # If you have an example file, or create .env manually
```

Open the `.env` file and fill in your credentials:

```bash
# Get from your Alchemy dashboard for the 'Polygon Amoy' network
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-api-key-here

# Export from your development wallet (e.g., MetaMask). NEVER SHARE THIS.
PRIVATE_KEY=0xYourPrivateKeyHexStringHere
```

⚠️ **CRITICAL SECURITY:** The `.env` file is listed in `.gitignore`. Never commit it to the repository.

### 3. Fund Your Test Wallet

To deploy contracts, your wallet needs testnet POL tokens. Visit a Polygon Amoy Faucet and send tokens to your wallet's public address.

### 4. Verify the Setup

Run a test to confirm the blockchain environment is connected:

```bash
# From the packages/blockchain-core directory
npx hardhat test
```

---

## 📁 Project Structure

This monorepo uses a modular, package-based architecture.

```
vector-system/
├── packages/              # Core modular code packages
│   ├── blockchain-core/   # ERC-1155 smart contracts, tests & deployment (Hardhat)
│   ├── ai-engine/         # LLM integration, job market API clients, skill analysis
│   ├── web-portal/        # Frontend dashboard for students & registrars
│   ├── shared/            # Shared utilities, types, and configs for frontend apps
│   └── backend-api/       # (Optional) Central API server
├── apps/                  # Standalone deployable applications
│   ├── cvr-generator/     # Cryptographically Verified Resume generator tool
│   └── mobile-app/        # Future mobile application
├── research/              # Capstone thesis, literature review, and data
├── docs/                  # Technical documentation, architecture decisions, manuals
├── configs/               # Shared configuration files (ESLint, Jest, etc.)
└── scripts/               # Utility scripts for development and deployment
```

---

## 🧪 Available Scripts

From the project root, you can run:

- `npm install`: Installs dependencies for all packages and apps.
- `npm run build`: Builds all packages (when build scripts are defined in each).
- `npm test`: Runs tests across all packages (when test scripts are defined).

To work on a specific package, cd into its directory (e.g., `packages/blockchain-core`) and use its specific commands:

- `npx hardhat compile`: Compiles Solidity contracts.
- `npx hardhat test`: Runs smart contract tests.
- `npx hardhat run scripts/deploy.js --network amoy`: Deploys contracts to Amoy testnet.

---

## 🔗 Key Technologies

- **Blockchain Layer:** Solidity, Hardhat, Polygon PoS (Amoy Testnet), ERC-1155
- **AI/Backend Layer:** Node.js, Google Gemini API, Job Market Data APIs
- **Application Layer:** React/Vue (for web-portal), Framework TBD for mobile
- **DevOps & QA:** Git, GitHub Actions, Jest

---

## 🤝 Contributing & Team Workflow

1. **Branch:** Always create a feature branch from `main` (e.g., `git checkout -b feat/issue-description`).
2. **Develop:** Make your changes in the relevant package.
3. **Test:** Run tests locally for the package you modified.
4. **Commit & Push:** Use clear commit messages. Push your branch.
5. **Pull Request:** Create a PR on GitHub for team review before merging into `main`.

---

## 📄 License & Attribution

This project is part of a capstone thesis. All rights reserved by the VECTOR team.