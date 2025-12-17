***
# VECTOR: A Decentralized Micro-Credentialing System with Predictive Career Analytics and Skill Decay Detection

**VECTOR** transforms static academic records into a dynamic, market-aware career engine. It tackles credential fraud and the skills gap by issuing blockchain-verified micro-credentials and providing AI-powered career insights.

### Core Innovations
1.  **Granular Skill Verification:** Issues **ERC-1155** tokens for specific skills (e.g., "Advanced SQL") on the **Polygon Amoy** blockchain.
2.  **Predictive Career Analytics:** A 3-pillar AI engine (NLP, Prediction, Recommendation) analyzes real-time job market data to detect "Skill Decay" using linear regression.
3.  **Collaborative Upskilling:** Suggests personalized courses based on peer success data (Collaborative Filtering).
4.  **Cryptographically Verified Resumes (CVR):** Generates QR-linked PDF resumes client-side that allow instant verification.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Monolith Framework** | **Next.js 14** (App Router) - Handles Frontend & Serverless API |
| **Blockchain** | **Polygon Amoy Testnet**, Hardhat, Alchemy, Ethers.js |
| **Database** | **Supabase** (PostgreSQL) + **Prisma ORM** |
| **AI - NLP** | **Google Gemini 1.5 Flash** (Skill Extraction) |
| **AI - Analytics** | **Simple-Statistics** (Linear Regression for Decay Prediction) |
| **AI - Recommendations** | **ML-Matrix** (Cosine Similarity for Course Matching) |
| **PDF Generation** | **@react-pdf/renderer** (Client-side CVR generation) |

---

## Project Structure
This project is a **Monorepo** managed with **npm workspaces**.

```text
vector-system/
├── packages/              
│   ├── ai-engine/         # The Brain: NLP, Predictions, and Recommendations
│   │   ├── src/nlp/       # Gemini Integration
│   │   ├── src/predictions/ # Decay Analysis logic
│   │   └── src/recommendations/ # Collaborative Filtering logic
│   │
│   ├── blockchain-core/   # The Ledger: Hardhat, Contracts, & Tests
│   │
│   ├── web-portal/        # The App: Next.js Frontend + Serverless Backend
│   │   ├── app/api/       # API Routes (replaces old backend server)
│   │   └── components/    # UI & CVR PDF Generator
│   │
│   └── shared/            # Common Types & Constants
│
├── docs/                  # Architecture, API Docs, & User Manuals
├── research/              # Capstone Manuscript (Chapters 1-5)
└── scripts/               # DevOps (Seeding DB, Deploying Contracts)
```

---

## Getting Started

### 1. Prerequisites
*   Node.js (v18+)
*   Git
*   MetaMask Wallet (Configured for Polygon Amoy)
*   Supabase Account (Free Tier)
*   Google Gemini API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/[YOUR_USERNAME]/vector-system.git
cd vector-system

# Install dependencies for ALL packages
npm install
```

### 3. Environment Setup
You need to configure secrets for the Blockchain and the Web App.

**A. Blockchain Config**
Create `packages/blockchain-core/.env`:
```env
POLYGON_AMOY_RPC_URL="https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY" # Never commit this!
```

**B. Web Portal Config**
Create `packages/web-portal/.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.supabase.co:5432/postgres"

# AI Services
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_KEY"
RAPIDAPI_KEY="YOUR_RAPIDAPI_JSEARCH_KEY"
```

### 4. Running the Project

**To Compile Smart Contracts:**
```bash
cd packages/blockchain-core
npx hardhat compile
npx hardhat test
```

**To Run the Web Portal (Frontend + Backend):**
```bash
cd packages/web-portal
npm run dev
# App opens at http://localhost:3000
```

---

## Contributing & Standards

### Commit Format
We use **Conventional Commits** to keep our history clean.
*   `feat(web): add student dashboard`
*   `fix(ai): correct linear regression formula`
*   `docs(research): update chapter 3 methodology`
*   `refactor(root): cleanup unused folders`

### Development Workflow
1.  Create a branch: `git checkout -b feat/your-feature-name`
2.  Code inside the specific package (`web-portal`, `ai-engine`, etc.).
3.  Test locally.
4.  Push and create a Pull Request.

---

## License
This project is developed for Academic Capstone purposes.
