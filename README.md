---

# VECTOR: Institutional Micro-Credentialing & Career Analytics System

**VECTOR** is a comprehensive institutional platform that bridges the gap between academic achievements and industry requirements. It transforms static resumes into dynamic, verifiable career assets using **database-anchored verification** and **AI-driven** skill analytics.

---

## 🌟 Key Features

### 1. 🛡️ Trustless Institutional Verification

* **Database-Anchored:** Credentials are securely anchored and verified through the institutional database.
* **Non-Transferable Identities:** Credentials are tied directly to authenticated student profiles, preventing identity fraud.
* **Institutional Issuance:** Only verified Registrars (Universities) can issue and revoke skill credentials.

### 2. 🧠 AI Career Engine (The "Brain")

* **Universal AI Provider:** Built with an abstracted AI provider layer, supporting **Google Gemini**, **Groq**, and **Ollama** for flexible model routing.
* **Skill Extraction:** Uses LLMs to parse raw resume text into structured skill tags.
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
│   │   ├── src/nlp/                # Provider Abstraction
│   │   └── src/predictions/        # Skill Decay Algorithms
│   │
│   ├── web-portal/                 # Full-Stack Application
│   │   └── vector-web/             # Next.js App Router
│   │       ├── src/app/api/        # Secure Serverless Endpoints
│   │       ├── src/lib/            # Encryption & DB Utilities
│   │       └── prisma/             # PostgreSQL Database Schema
│   │
│   └── shared/                     # Shared TypeScript Types
│
├── docs/                           # Setup Guides & API Specs
└── scripts/                        # DevOps & Seeding Utilities
```

| Layer | Stack |
| --- | --- |
| **Frontend** | Next.js (App Router), TailwindCSS |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL), Prisma ORM |
| **AI Models** | Google Gemini / Groq / Ollama, Simple-Statistics, ML-Matrix |
| **Security** | Zod (Validation), CryptoJS (Encryption), Middleware (RBAC) |

---

## 🚀 Getting Started

*For a detailed step-by-step walkthrough, read the **docs/SETUP_GUIDE.md**.*

### 1. Prerequisites

* Node.js v18+
* Supabase Account
* Google Gemini / Groq API Key (or local Ollama setup)

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

# --- Private Secrets (NEVER COMMIT) ---
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ENCRYPTION_KEY="your-generated-32-byte-hex-key"  # Critical for security
DATABASE_URL="postgres://..."

# --- AI Providers ---
ACTIVE_AI_PROVIDER="gemini" # or groq, ollama
GEMINI_API_KEY="your-google-gemini-key"
# GROQ_API_KEY="your-groq-key"
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
| `/api/analyze` | `POST` | System | Triggers the Skill Decay analysis engine. |
| `/api/registrar/credentials` | `POST` | Registrar | Issues a new institutional credential. |
| `/api/admin/manage-users` | `PATCH` | Super Admin | Promotes a user role (creates Audit Log). |
| `/api/verify/[id]` | `GET` | Public | Publicly verifies a credential against the database. |

*Note: All API routes strictly validate input using **Zod** schemas.*

---

## 🛠️ Troubleshooting

**1. `CRITICAL: ENCRYPTION_KEY is missing`**

* **Cause:** You haven't set the server-side encryption key in `.env`.
* **Fix:** Run `openssl rand -hex 32` and paste the result into `ENCRYPTION_KEY`.

**2. `PrismaClientInitializationError`**

* **Cause:** Database connection failed.
* **Fix:** Ensure `DATABASE_URL` uses port **5432** (Transaction Mode) or **6543** (Session Mode) based on your Supabase settings.

---

## 🔄 Maintenance & Deployment

* **Database Migrations:** When changing `schema.prisma`, run `npx prisma db push`.
* **AI Models:** The skill decay logic and AI provider abstraction are stateless. Updates to `ai-engine` or `lib/ai-provider.ts` take effect immediately upon server restart.

---

## 📜 License & Academic Integrity

This project is an **Academic Capstone** for PHINMA University of Pangasinan (BSIT).

* **Authors:** Ace [Your Last Name] & Team.
* **Status:** Proof of Concept / MVP.

---

> **Security Note:** Do not commit `.env` files to GitHub. This repository uses `.gitignore` to prevent credential leakage.
