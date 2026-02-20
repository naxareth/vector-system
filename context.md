
---

# 1. Project Overview

* **Name:** VECTOR (Decentralized Micro-Credentialing System)
* **Purpose:** A decentralized platform using blockchain and AI to issue, verify, and analyze academic and professional micro-credentials, providing students with a "Verified Resume" (CVR), course recommendations and real-time market relevance insights.

# 2. Tech Stack

* **Frontend:** Next.js 15+ (App Router), TailwindCSS, Lucide React, Framer Motion.
* **Backend:** Next.js API Routes (Edge/Node.js), Supabase Auth/Middleware.
* **Database:** PostgreSQL (Supabase) with Prisma ORM for schema management.
* **Blockchain:** Ethereum/EVM compatible (Polygon Amoy Testnet), Hardhat, Ethers.js, Wagmi.
* **AI/NLP:** Google Gemini API (NLP for skill extraction), Custom Decay/Health Forecasting algorithms.

# 3. Directory Structure

*(Refer to the provided file list in the prompt for the comprehensive structure)*

* **`packages/blockchain-core`**: Smart contracts (Solidity) and deployment scripts.
* **`packages/ai-engine`**: Standalone service for market data ingestion, skill extraction, and health score calculations.
* **`packages/web-portal/vector-web`**: The main Next.js application containing the Student, Registrar, and Admin portals.

.github
.vscode
configs
docs
node_modules
packages
packages\ai-engine
packages\ai-engine\src
packages\ai-engine\src\data
packages\ai-engine\src\data\adzuna-client.ts
packages\ai-engine\src\data\jsearch-client.ts
packages\ai-engine\src\nlp
packages\ai-engine\src\nlp\gemini-client.ts
packages\ai-engine\src\nlp\skill-extractor.ts
packages\ai-engine\src\predictions
packages\ai-engine\src\predictions\decay-forecaster.ts
packages\ai-engine\src\recommendations
packages\ai-engine\src\recommendations\course-recommender.ts
packages\ai-engine\src\scripts
packages\ai-engine\src\scripts\daily-update.ts
packages\ai-engine\src\scripts\ingest-job-data.ts
packages\ai-engine\src\index.ts
packages\ai-engine\test
packages\ai-engine\test\ai-test.ts
packages\ai-engine\.env
packages\ai-engine\package.json
packages\ai-engine\tsconfig.json
packages\blockchain-core
packages\blockchain-core\artifacts
packages\blockchain-core\cache
packages\blockchain-core\contracts
packages\blockchain-core\contracts\VectorToken.sol
packages\blockchain-core\deployments
packages\blockchain-core\deployments\deployment-31337.json
packages\blockchain-core\node_modules
packages\blockchain-core\scripts
packages\blockchain-core\scripts\deploy.js
packages\blockchain-core\scripts\manage-registrars.js
packages\blockchain-core\scripts\mint-skill.js
packages\blockchain-core\scripts\query.js
packages\blockchain-core\test
packages\blockchain-core\test\VectorToken.test.js
packages\blockchain-core\.env
packages\blockchain-core\.gitignore
packages\blockchain-core\hardhat.config.js
packages\blockchain-core\package.json
packages\blockchain-core\README.md
packages\blockchain-core\simple-test.js
packages\blockchain-core\tsconfig.json
packages\shared
packages\shared\.gitkeep
packages\web-portal
packages\web-portal\vector-web
packages\web-portal\vector-web\.next
packages\web-portal\vector-web\node_modules
packages\web-portal\vector-web\prisma
packages\web-portal\vector-web\prisma\schema.prisma
packages\web-portal\vector-web\public
packages\web-portal\vector-web\src
packages\web-portal\vector-web\src\app
packages\web-portal\vector-web\src\app\(auth)
packages\web-portal\vector-web\src\app\(auth)\forgot-password
packages\web-portal\vector-web\src\app\(auth)\forgot-password\page.tsx
packages\web-portal\vector-web\src\app\(auth)\registrar-register
packages\web-portal\vector-web\src\app\(auth)\registrar-register\page.tsx
packages\web-portal\vector-web\src\app\(auth)\login
packages\web-portal\vector-web\src\app\(auth)\login\page.tsx
packages\web-portal\vector-web\src\app\(auth)\register
packages\web-portal\vector-web\src\app\(auth)\register\page.tsx
packages\web-portal\vector-web\src\app\admin
packages\web-portal\vector-web\src\app\admin\audit-logs
packages\web-portal\vector-web\src\app\admin\audit-logs\page.tsx
packages\web-portal\vector-web\src\app\admin\dashboard
packages\web-portal\vector-web\src\app\admin\dashboard\page.tsx
packages\web-portal\vector-web\src\app\api
packages\web-portal\vector-web\src\app\api\admin\verify-user
packages\web-portal\vector-web\src\app\api\admin\verify-user\route.ts
packages\web-portal\vector-web\src\app\api\analyze
packages\web-portal\vector-web\src\app\api\analyze\route.ts
packages\web-portal\vector-web\src\app\api\auth
packages\web-portal\vector-web\src\app\api\auth\callback
packages\web-portal\vector-web\src\app\api\auth\callback\route.ts
packages\web-portal\vector-web\src\app\api\auth\confirm-reset
packages\web-portal\vector-web\src\app\api\auth\confirm-reset\route.ts
packages\web-portal\vector-web\src\app\api\auth\login-check
packages\web-portal\vector-web\src\app\api\auth\login-check\route.ts
packages\web-portal\vector-web\src\app\api\auth\request-reset
packages\web-portal\vector-web\src\app\api\auth\request-reset\route.ts
packages\web-portal\vector-web\src\app\api\chat
packages\web-portal\vector-web\src\app\api\chat\route.ts
packages\web-portal\vector-web\src\app\api\mint
packages\web-portal\vector-web\src\app\api\mint\route.ts
packages\web-portal\vector-web\src\app\api\registrar
packages\web-portal\vector-web\src\app\api\registrar\credentials
packages\web-portal\vector-web\src\app\api\registrar\credentials\route.ts
packages\web-portal\vector-web\src\app\api\registrar\log-mint
packages\web-portal\vector-web\src\app\api\registrar\log-mint\route.ts
packages\web-portal\vector-web\src\app\api\student
packages\web-portal\vector-web\src\app\api\student\credentials
packages\web-portal\vector-web\src\app\api\student\credentials\route.ts
packages\web-portal\vector-web\src\app\api\student\temp.txt
packages\web-portal\vector-web\src\app\api\verify-registrar
packages\web-portal\vector-web\src\app\api\verify-registrar\route.ts
packages\web-portal\vector-web\src\app\registrar
packages\web-portal\vector-web\src\app\registrar\dashboard
packages\web-portal\vector-web\src\app\registrar\dashboard\page.tsx
packages\web-portal\vector-web\src\app\registrar\students
packages\web-portal\vector-web\src\app\registrar\students\page.tsx
packages\web-portal\vector-web\src\app\student
packages\web-portal\vector-web\src\app\student\coach
packages\web-portal\vector-web\src\app\student\coach\page.tsx
packages\web-portal\vector-web\src\app\student\cvr
packages\web-portal\vector-web\src\app\student\cvr\page.tsx
packages\web-portal\vector-web\src\app\student\dashboard
packages\web-portal\vector-web\src\app\student\dashboard\page.tsx
packages\web-portal\vector-web\src\app\student\profile
packages\web-portal\vector-web\src\app\student\profile\security
packages\web-portal\vector-web\src\app\student\profile\security\page.tsx
packages\web-portal\vector-web\src\app\student\profile\page.tsx
packages\web-portal\vector-web\src\app\student\skills
packages\web-portal\vector-web\src\app\student\skills\page.tsx
packages\web-portal\vector-web\src\app\globals.css
packages\web-portal\vector-web\src\app\layout.tsx
packages\web-portal\vector-web\src\app\page.tsx
packages\web-portal\vector-web\src\components
packages\web-portal\vector-web\src\components\auth
packages\web-portal\vector-web\src\components\auth\StudentRegisterForm.tsx
packages\web-portal\vector-web\src\components\auth\RegistrarRegisterForm.tsx
packages\web-portal\vector-web\src\components\auth\ChallengeMFA.tsx
packages\web-portal\vector-web\src\components\auth\EnrollMFA.tsx
packages\web-portal\vector-web\src\components\cvr
packages\web-portal\vector-web\src\components\cvr\CVRFormSections.tsx
packages\web-portal\vector-web\src\components\dashboard
packages\web-portal\vector-web\src\components\dashboard\AdminLayout.tsx
packages\web-portal\vector-web\src\components\dashboard\CredentialCard.tsx
packages\web-portal\vector-web\src\components\dashboard\CVRSuccessModal.tsx
packages\web-portal\vector-web\src\components\dashboard\DashboardLayout.tsx
packages\web-portal\vector-web\src\components\dashboard\ExportCVRModal.tsx
packages\web-portal\vector-web\src\components\dashboard\MetricCards.tsx
packages\web-portal\vector-web\src\components\dashboard\RecentActivity.tsx
packages\web-portal\vector-web\src\components\dashboard\RegistrarLayout.tsx
packages\web-portal\vector-web\src\components\dashboard\Sidebar.tsx
packages\web-portal\vector-web\src\components\dashboard\TopBar.tsx
packages\web-portal\vector-web\src\components\features
packages\web-portal\vector-web\src\components\features\CTASection.tsx
packages\web-portal\vector-web\src\components\features\FeaturesSection.tsx
packages\web-portal\vector-web\src\components\features\HeroSection.tsx
packages\web-portal\vector-web\src\components\features\WorkflowSection.tsx
packages\web-portal\vector-web\src\components\pages
packages\web-portal\vector-web\src\components\pages\LandingPage.tsx
packages\web-portal\vector-web\src\components\pages\LoginPage.tsx
packages\web-portal\vector-web\src\components\shared
packages\web-portal\vector-web\src\components\shared\ConnectWalletModal.tsx
packages\web-portal\vector-web\src\components\shared\DashboardTour.tsx
packages\web-portal\vector-web\src\components\shared\Footer.tsx
packages\web-portal\vector-web\src\components\shared\Navbar.tsx
packages\web-portal\vector-web\src\components\shared\RegistrarLoginModal.tsx
packages\web-portal\vector-web\src\components\shared\RegistrarTour.tsx
packages\web-portal\vector-web\src\components\shared\SessionTimeout.tsx
packages\web-portal\vector-web\src\components\shared\Tooltip.tsx
packages\web-portal\vector-web\src\contexts
packages\web-portal\vector-web\src\contexts\ThemeContext.tsx
packages\web-portal\vector-web\src\hooks
packages\web-portal\vector-web\src\hooks\useCVR.ts
packages\web-portal\vector-web\src\lib
packages\web-portal\vector-web\src\lib\schemas
packages\web-portal\vector-web\src\lib\schemas\auth.ts
packages\web-portal\vector-web\src\lib\schemas\cvr.ts
packages\web-portal\vector-web\src\lib\audit.ts
packages\web-portal\vector-web\src\lib\blockchain.ts
packages\web-portal\vector-web\src\lib\db.ts
packages\web-portal\vector-web\src\lib\email.ts
packages\web-portal\vector-web\src\lib\encryption.ts
packages\web-portal\vector-web\src\lib\supabaseClient.ts
packages\web-portal\vector-web\src\lib\utils.ts
packages\web-portal\vector-web\src\lib\wagmi.ts
packages\web-portal\vector-web\src\middleware.ts
packages\web-portal\vector-web\src\app\(auth)\verify-email\page.tsx
packages\web-portal\vector-web\src\app\admin\system-metrics\page.tsx
packages\web-portal\vector-web\src\app\api\admin\system-logs\route.ts
packages\web-portal\vector-web\src\app\api\auth\send-verification\route.ts
packages\web-portal\vector-web\src\app\api\auth\verify-email\route.ts
packages\web-portal\vector-web\src\lib\email.ts
packages\web-portal\vector-web\src\lib\logger.ts
packages\web-portal\vector-web\.env
packages\web-portal\vector-web\.gitignore
packages\web-portal\vector-web\eslint.config.mjs
packages\web-portal\vector-web\MIGRATION_NOTE.md
packages\web-portal\vector-web\next-env.d.ts
packages\web-portal\vector-web\next.config.ts
packages\web-portal\vector-web\package-lock.json
packages\web-portal\vector-web\package.json
packages\web-portal\vector-web\postcss.config.mjs
packages\web-portal\vector-web\README.md
packages\web-portal\vector-web\tsconfig.json

packages\web-portal\.gitkeep
research
scripts
scripts\.env
scripts\.gitkeep
scripts\seed_market_data.py
testing
.gitignore
context.md
package-lock.json
package.json
README.md
SETUP_GUIDE.md
verify-setup.js

# 4. Core Database Schema / State Shape

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  actor_id uuid,
  target_id uuid,
  action_type text NOT NULL,
  description text,
  metadata jsonb,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id),
  CONSTRAINT audit_logs_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.users(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  provider text,
  skill_tags ARRAY,
  link text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.credential_definitions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  category text,
  type text CHECK (type = ANY (ARRAY['Academic'::text, 'Seminar'::text, 'Certification'::text, 'Soft Skill'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  code text,
  CONSTRAINT credential_definitions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  skill_name text NOT NULL,
  job_count integer NOT NULL,
  data_source text DEFAULT 'jsearch'::text,
  recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT market_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.minting_batches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  registrar_id uuid,
  batch_name text,
  total_students integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT minting_batches_pkey PRIMARY KEY (id),
  CONSTRAINT minting_batches_registrar_id_fkey FOREIGN KEY (registrar_id) REFERENCES public.users(id)
);
CREATE TABLE public.monitored_keywords (
  keyword text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  CONSTRAINT monitored_keywords_pkey PRIMARY KEY (keyword)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'alert'::text])),
  is_read boolean DEFAULT false,
  link_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  bio text,
  phone text,
  university text DEFAULT 'PHINMA University'::text,
  major text,
  graduation_year text,
  linkedin_url text,
  github_url text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  portfolio_links jsonb DEFAULT '{"github": "", "linkedin": "", "portfolio": ""}'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.rate_limits (
  ip text NOT NULL,
  endpoint text NOT NULL,
  attempts integer DEFAULT 1,
  last_attempt timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (ip, endpoint)
);
CREATE TABLE public.self_reported_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  skill_name text NOT NULL,
  proficiency text CHECK (proficiency = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Expert'::text])),
  evidence_link text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT self_reported_skills_pkey PRIMARY KEY (id),
  CONSTRAINT self_reported_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.skill_health_cache (
  skill_name text NOT NULL,
  trend_slope double precision,
  status text CHECK (status = ANY (ARRAY['Rising'::text, 'Stable'::text, 'Decaying'::text])),
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT skill_health_cache_pkey PRIMARY KEY (skill_name),
  CONSTRAINT skill_health_cache_skill_name_fkey FOREIGN KEY (skill_name) REFERENCES public.monitored_keywords(keyword)
);
CREATE TABLE public.student_course_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status text CHECK (status = ANY (ARRAY['completed'::text, 'in_progress'::text])),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT student_course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT student_course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT student_course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  student_id text UNIQUE,
  full_name text,
  role USER-DEFINED DEFAULT 'student'::user_role,
  wallet_address text UNIQUE,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  email text NOT NULL UNIQUE,
  status USER-DEFINED DEFAULT 'pending_verification'::account_status,
  updated_at timestamp with time zone DEFAULT now(),
  location text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TYPE public.verification_type AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE public.verification_codes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL,
  code text NOT NULL,
  type public.verification_type DEFAULT 'EMAIL_VERIFICATION'::public.verification_type,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.verified_credentials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  batch_id uuid,
  skill_name text NOT NULL,
  token_id text NOT NULL,
  transaction_hash text,
  issuer_did text,
  metadata_uri text,
  issued_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  private_notes text,
  certificate_number text,
  CONSTRAINT verified_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT verified_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT verified_credentials_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.minting_batches(id)
);

CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  ip_address text,
  duration integer,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

```

# 5. Global Rules & Conventions

* **Component Architecture:** Always use functional components with TypeScript interfaces for props.
* **State Management:** Use React `useState` and `useEffect` for local state; leverage `ThemeContext` for global UI states.
* **Security First:** Never expose Private Keys in the frontend. All sensitive data (like registrar notes) must be encrypted via `lib/encryption.ts` before storage.
* **Code Integrity:** Do not remove existing comments or TODO markers. Use `async/await` for all database and blockchain calls.
* **Consistency:** Ensure "De-jargonization" for Registrar UIs (e.g., use "Secure Record" instead of "Mint NFT").
* **Error Handling:** Use Zod for all form and API request validation.

# 6. Current State / Next Steps

* **Last Completed:** - Separated student and registrar registration flows into dedicated routes (`/register` and `/registrar-register`).
  - Implemented real-time form validation using `react-hook-form` and `zod` (`mode: 'onChange'`) for instant user feedback.
  - Added password visibility toggles (eye icons) using `lucide-react` across all authentication forms (Login, Register, Forgot Password).
  - Updated `middleware.ts` to explicitly allow the new `/registrar-register` path in `AUTH_PATHS` to prevent prefix collisions and routing loops.
* **Current Focus:** - Verifying the newly separated UI layouts locally.
  - Local testing of the end-to-end OTP flow and middleware routing.
* **Architecture Changes:** - Added `lucide-react` to `package.json` for UI icons.
  - Split registration UI logic into `StudentRegisterForm.tsx` and `RegistrarRegisterForm.tsx` components.
* **Data Changes:** - Split a unified auth schema into `studentSchema` and `registrarSchema` in `lib/schemas/auth.ts`.
* **Next Steps:** -



---

