---

# 🚀 VECTOR: Decentralized Micro-Credentialing

> [!IMPORTANT]
> **FINAL DEFENSE RESOURCE:** For all technical deliverables, security logic, and rubric justifications, please refer to the **[CAPSTONE_FINAL_HANDBOOK.md](./CAPSTONE_FINAL_HANDBOOK.md)**.
 & Career Analytics System

**VECTOR** is a blockchain-based platform that bridges the gap between academic achievements and industry requirements. It transforms static resumes into dynamic, verifiable career assets using **ERC-1155** tokens and **AI-driven** skill analytics.

---

## 🌟 Key Features

### 1. 🛡️ Trustless Verification (Blockchain)

* **Smart Contracts:** Deployed on **Polygon Amoy Testnet**.
* **Soulbound-style Tokens:** Credentials cannot be transferred, preventing identity fraud.
* **Institutional Minting:** Only verified Registrars (Universities) can issue skill tokens.

### 2. 🧠 AI Career Engine (The "Brain")

* **Skill Extraction:** Uses **Google Gemini 1.5 Flash** to parse raw resume text into structured skill tags.
* **Decay Detection:** Uses **Linear Regression** (via `simple-statistics`) to analyze job market trends and predict if a user's skills are becoming obsolete.
* **Recommendation System:** Uses **Collaborative Filtering** (Cosine Similarity) to suggest courses based on successful peer paths.

### 3. 🔒 Enterprise-Grade Security

* **Role-Based Access Control (RBAC):** Strict separation of `Student`, `Registrar`, and `Super Admin` roles.
* **Data Encryption:** Sensitive fields (like private instructor notes) are encrypted at rest using **AES-256**.
* **Audit Logging:** Immutable logs track every administrative action and verification event.

---

## 🏗️ Technical Architecture

This project is a **Monorepo** managed with `npm workspaces`.

```text
vector-system/
├── packages/              
│   ├── ai-engine/                  # NLP & Predictive Logic
│   │   ├── src/nlp/                # Gemini Client
│   │   └── src/predictions/        # Skill Decay Algorithms
│   │
│   ├── blockchain-core/            # Hardhat, Solidity, & Scripts
│   │   └── contracts/              # VectorToken.sol (ERC-1155)
│   │
│   ├── web-portal/                 # Full-Stack Application
│   │   └── vector-web/             # Next.js 14 App Router
│   │       ├── src/app/api/        # Secure Serverless Endpoints
│   │       ├── src/lib/            # Encryption & DB Utilities
│   │       └── prisma/             # Database Schema
│   │
│   └── shared/                     # Shared TypeScript Types
│
├── docs/                           # Setup Guides & API Specs
└── scripts/                        # DevOps & Seeding Utilities

```

| Layer | Stack |
| --- | --- |
| **Frontend** | Next.js 14 (App Router), TailwindCSS, RainbowKit |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL), Prisma ORM |
| **Blockchain** | Polygon Amoy, Hardhat, Ethers.js v6 |
| **AI Models** | Google Gemini 1.5 Flash, Simple-Statistics, ML-Matrix |
| **Security** | Zod (Validation), CryptoJS (Encryption), Middleware (RBAC) |

---

## 🚀 Getting Started

*For a detailed step-by-step walkthrough, read the **[Setup Guide](https://www.google.com/search?q=./docs/SETUP_GUIDE.md)**.*

### 1. Prerequisites

* Node.js v18+
* MetaMask Wallet (Polygon Amoy Network)
* Supabase Account
* Google Gemini API Key

### 2. Installation

```bash
# Clone and install dependencies
git clone https://github.com/[YOUR_USERNAME]/vector-system.git
cd vector-system
npm install

```

### 3. Configuration (Security Critical)

You must set up environment variables for the Web Portal.

**Create `packages/web-portal/vector-web/.env`:**

```env
# --- Public Config ---
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."

# --- Private Secrets (NEVER COMMIT) ---
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ENCRYPTION_KEY="your-generated-32-byte-hex-key"  # Critical for security
GEMINI_API_KEY="your-google-gemini-key"
DATABASE_URL="postgres://..."

```

### 4. Running the Application

```bash
# Start the Web Portal (Frontend + Backend)
cd packages/web-portal/vector-web
npm run dev
# Access at: http://localhost:3000

```

---

## 🔌 API Documentation

The system exposes several internal API endpoints protected by Middleware.

| Endpoint | Method | Role Required | Description |
| --- | --- | --- | --- |
| `/api/extract-skills` | `POST` | Student | Parses resume text and returns skill objects. |
| `/api/registrar/log-mint` | `POST` | Registrar | Logs a blockchain transaction and encrypts private notes. |
| `/api/admin/verify-user` | `POST` | Super Admin | Promotes a user role (creates Audit Log). |
| `/api/analyze` | `POST` | System | Triggers the Skill Decay analysis engine. |

*Note: All API routes strictly validate input using **Zod** schemas.*

---

## 🛠️ Troubleshooting

**1. `CRITICAL: ENCRYPTION_KEY is missing**`

* **Cause:** You haven't set the server-side encryption key in `.env`.
* **Fix:** Run `openssl rand -hex 32` and paste the result into `ENCRYPTION_KEY`.

**2. `PrismaClientInitializationError**`

* **Cause:** Database connection failed.
* **Fix:** Ensure `DATABASE_URL` uses port **5432** (Transaction Mode) or **6543** (Session Mode) based on your Supabase settings.

**3. `Nonce too low` (Blockchain)**

* **Cause:** Your MetaMask account is out of sync with the testnet.
* **Fix:** In MetaMask, go to Settings > Advanced > Clear Activity Tab Data.

---

## 🔄 Maintenance & Deployment

* **Database Migrations:** When changing `schema.prisma`, run `npx prisma db push`.
* **Smart Contracts:** Contracts are immutable. If you change `VectorToken.sol`, you must redeploy and update `NEXT_PUBLIC_CONTRACT_ADDRESS` in the frontend.
* **AI Models:** The skill decay logic is stateless. Updates to `ai-engine` take effect immediately upon server restart.

---

## 📜 License & Academic Integrity

This project is an **Academic Capstone** for PHINMA University of Pangasinan (BSIT).

* **Authors:** Ace [Your Last Name] & Team.
* **Status:** Proof of Concept / MVP.

---

> **Security Note:** Do not commit `.env` files to GitHub. This repository uses `.gitignore` to prevent credential leakage.