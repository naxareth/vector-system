# VECTOR: A Decentralized Micro-Credentialing System

> **Transforming academic records from static documents into dynamic, market-aware career engines.**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-FF9966.svg)](https://hardhat.org)
[![Polygon](https://img.shields.io/badge/Network-Polygon%20Amoy-8247E5.svg)](https://polygon.technology/)

## 🎯 Project Overview

VECTOR addresses the **Credibility and Relevance Crisis** in the Philippine education sector by providing:
- **Granular Skill Verification**: Converts diplomas into blockchain-backed micro-credentials.
- **Predictive Career Analytics**: Uses AI to analyze job market trends and detect skill decay.
- **Cryptographically Verified Resumes (CVR)**: Enables instant employer verification via QR codes.

**Vision**: To shift from archive-based academic records to a living, intelligent ledger of skills.

## 🏗️ System Architecture

VECTOR is built as a modular monorepo with three core layers:

```mermaid
graph TB
    subgraph "VECTOR Architecture"
        BC[Blockchain Layer<br>ERC-1155 on Polygon]
        AI[AI Layer<br>LLM & Job Market APIs]
        APP[Application Layer<br>Web Portal & CVR Generator]
        
        BC -- "Provides Verifiable Credentials" --> APP
        AI -- "Provides Skill Analytics" --> APP
    end
Core Packages:

/packages/blockchain-core: Smart contracts (ERC-1155) and deployment scripts.

/packages/ai-engine: LLM integration and job market analysis engine.

/packages/web-portal: Frontend dashboard for students and registrars.

/packages/shared: Shared utilities, constants, and API clients.

📁 Project Structure
text
vector-system/
├── packages/                    # Core modular packages
│   ├── blockchain-core/         # Smart contracts & blockchain integration
│   ├── ai-engine/              # AI career coach & analytics
│   ├── web-portal/             # Student/Registrar dashboard (React/Vue)
│   ├── shared/                 # Shared utilities & types
│   └── backend-api/            # (Optional) Central API server
├── apps/                       # Standalone applications
│   ├── cvr-generator/          # Cryptographically Verified Resume tool
│   └── mobile-app/             # Future mobile application
├── research/                   # Capstone thesis & literature review
├── docs/                       # Technical & user documentation
├── configs/                    # Shared ESLint, Jest, Tailwind configs
├── scripts/                    # Development & deployment utilities
└── .github/workflows/          # CI/CD pipelines
🚀 Getting Started
Prerequisites
Node.js (v18 or later) and npm

Git

A MetaMask wallet (for blockchain interactions)

An Alchemy account (for Polygon Amoy RPC)

1. Clone the Repository
bash
git clone https://github.com/your-username/vector-system.git
cd vector-system
2. Install Workspace Dependencies
bash
npm install
3. Set Up the Blockchain Core Package
This is the most critical setup step. Navigate to the package and configure your environment:

bash
cd packages/blockchain-core
a. Configure Environment Variables
Create a .env file with your Polygon Amoy testnet credentials:

env
# Get your RPC URL from Alchemy (create an app for Polygon Amoy)
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-api-key

# Your wallet's private key (for deployment)
# NEVER commit this to version control!
PRIVATE_KEY=0xYourPrivateKeyHere
b. Install Package-Specific Dependencies
bash
npm install --save-dev dotenv
c. Verify Hardhat Configuration
Your hardhat.config.ts should be configured for the Polygon Amoy network. Test the setup:

bash
# Compile smart contracts
npx hardhat compile

# Run tests
npx hardhat test
d. Get Testnet Funds
Visit the Polygon Amoy Faucet to get free testnet POL tokens for your wallet address.

4. Initialize Other Core Packages
Each package in /packages needs its own initialization:

bash
# Example: Set up the AI Engine package
cd ../ai-engine
npm init -y
npm install google-generativeai # For Gemini API
🧪 Development Workflow
Running the Project
Since this is a monorepo, you can run commands from the root or within each package:

From the root (for workspace-wide operations):

bash
# Install a dev dependency for all packages
npm install -D eslint --workspaces
From within a package (for package-specific operations):

bash
cd packages/blockchain-core
npx hardhat test
Git Branch Strategy
We use feature branches and pull requests:

bash
# Create a new feature branch
git checkout -b feat/erc1155-contract

# Work on your feature, then push
git add .
git commit -m "feat: add ERC-1155 micro-credential contract"
git push origin feat/erc1155-contract
Create a Pull Request on GitHub for team review before merging to main.

👥 Team & Roles
Project Manager: Oversees coordination, documentation, and capstone integration.

System Integrators (2-3): Develop core modules (blockchain, AI, web portal).

Researcher: Conducts literature review and market analysis.

Documentarian: Compiles technical documentation and capstone paper.

📚 Documentation
/research: Contains all capstone paper chapters and references.

/docs: Houses technical documentation, architecture decisions, and user manuals.

API References: See /docs/api for endpoint documentation.

🔗 Related Resources
Project Proposal

System Architecture

Polygon Documentation

Hardhat Documentation

📄 License
This project is licensed under the ISC License - see the LICENSE file for details.