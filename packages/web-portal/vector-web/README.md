# 🛡️ VECTOR: Decentralized Micro-Credentialing Platform

**VECTOR** is a state-of-the-art career analytics and verifiable credentialing system. It bridges the gap between traditional education and the decentralized economy by transforming static skill sets into dynamic, blockchain-verifiable assets.

---

## 🏗️ System Architecture

VECTOR is built as a modular monorepo, ensuring separation of concerns between core logic, the web interface, and the decentralized ledger.

- **Web Portal (`packages/web-portal/vector-web`):** Next.js 14 application providing the student dashboard, registrar interface, and administrative controls.
- **AI Engine (`packages/ai-engine`):** Extracts skills from resumes using Gemini 1.5 Flash and predicts skill decay using trend analytics.
- **Blockchain Core (`packages/blockchain-core`):** Solidity smart contracts (ERC-1155) deployed on Polygon Amoy for immutable credentialing.
- **Supabase Integration:** Provides secure authentication, PostgreSQL storage, and real-time audit logging.

---

## 💻 Tech Stack

- **Frontend:** Next.js 14 (App Router), TailwindCSS, Radix UI.
- **Backend:** Next.js API Routes, Prisma ORM, Supabase Auth/DB.
- **Blockchain:** Polygon Amoy, Hardhat, Ethers.js v6, OpenZeppelin.
- **AI:** Google Gemini 1.5 Flash (NLP), Simple-Statistics (ML).
- **Security:** AES-256 Encryption (CryptoJS), Zod Validation, CSRF protection.

---

## 🚀 Local Setup

### 1. Prerequisites
- Node.js v18+
- MetaMask (configured for Polygon Amoy)
- Supabase Project & Google Cloud Project (for Gemini)

### 2. Environment Variables
Create `.env` in `packages/web-portal/vector-web/`:
```env
NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."
SUPABASE_SERVICE_ROLE_KEY="your-service-role"
GEMINI_API_KEY="your-gemini-key"
ENCRYPTION_KEY="your-32-byte-hex"
DATABASE_URL="your-postgres-url"
```

### 3. Installation & Run
```bash
# From root
npm install
cd packages/web-portal/vector-web
npm run dev
```

---

## 🔒 Security Features

- **Audit Trails:** Tamper-evident logging using Supabase RLS policies (Log-only, no-update).
- **Encryption at Rest:** Sensitive institutional data is encrypted with AES-256 before storage.
- **CSRF Protection:** Custom middleware validates CSRF tokens for all state-changing operations.
- **RBAC:** Multi-tier access control (Student, Registrar, Super Admin) validated at both UI and API levels.

---

## 🧠 AI Agent & Evaluation

The AI engine uses **Gemini 1.5 Flash** for high-accuracy skill extraction.
- **Evaluator:** Run `npm run test:ai` in `packages/ai-engine` to trigger the F1 scoring suite.
- **Velocity Model:** Weighs skills based on Recency (30%), Volume (30%), and Slope (40%) to predict career health.

---

## ⛓️ Smart Contract & Testing

The `VectorToken` contract implements W3C-compatible DIDs and ERC-1155 credentials.
- **Tests:** Run `npx hardhat test` in `packages/blockchain-core`.
- **Gas Benchmark:** Detailed gas reports are located in `packages/blockchain-core/GAS_REPORT.md`.

---

© 2026 VECTOR Team | PHINMA University of Pangasinan
