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
  seed-monitored-keywords.sql
  seed-courses.sql
packages
│
├── ai-engine
│   └── src
│       ├── data
│       │   ├── adzuna-client.ts                       ← MODIFIED (rich salary/location fetch)
│       │   ├── market-provider.ts                     ← MODIFIED (fetchRichMarketData wired)
│       │   └── jsearch-client.ts
│       ├── nlp
│       │   ├── gemini-client.ts
│       │   └── skill-extractor.ts
│       ├── predictions
│       │   └── decay-forecaster.ts                    ← MODIFIED (% slope thresholds + confidence)
│       ├── recommendations
│       │   └── course-recommender.ts                  ← MODIFIED (real DB + gap analysis)
│       ├── scripts
│       │   ├── daily-update.ts                        ← MODIFIED (p-limit concurrency, W3C sync)
│       │   └── ingest-job-data.ts
│       └── index.ts                                   ← MODIFIED (await recommendCourses, atRiskSkills)
│
├── blockchain-core
│   ├── contracts
│   │   └── VectorToken.sol
│   ├── scripts
│   │   ├── deploy.js
│   │   ├── manage-registrars.js
│   │   ├── mint-skill.js
│   │   └── query.js
│   └── test
│       └── VectorToken.test.js
│
├── shared
│
└── web-portal
    └── vector-web
        ├── prisma
        │   └── schema.prisma
        └── src
            ├── app
            │   ├── (auth)
            │   │   ├── forgot-password/page.tsx
            │   │   ├── login/page.tsx
            │   │   ├── register/page.tsx
            │   │   ├── registrar-register/page.tsx
            │   │   └── verify-email/page.tsx
            │   ├── admin
            │   │   ├── audit-logs/page.tsx
            │   │   ├── dashboard/page.tsx
            │   │   └── system-metrics/page.tsx
            │   ├── api
            │   │   ├── admin
            │   │   │   ├── system-logs/route.ts
            │   │   │   └── verify-user/route.ts
            │   │   ├── analyze/route.ts               ← MODIFIED (14-day history window)
            │   │   ├── auth
            │   │   │   ├── callback/route.ts
            │   │   │   ├── cancel-reset/route.ts
            │   │   │   ├── confirm-reset/route.ts
            │   │   │   ├── login-check/route.ts
            │   │   │   ├── request-reset/route.ts
            │   │   │   ├── send-verification/route.ts
            │   │   │   ├── verify-captcha/route.ts
            │   │   │   └── verify-email/route.ts
            │   │   ├── chat/route.ts                  ← MODIFIED (salary + location Gemini context)
            │   │   ├── mint/route.ts
            │   │   ├── registrar
            │   │   │   ├── credentials/route.ts
            │   │   │   └── log-mint/route.ts
            │   │   ├── schemas/route.ts
            │   │   ├── schemas/[id]/route.ts
            │   │   ├── student
            │   │   │   ├── credentials/route.ts
            │   │   │   └── market-insights/route.ts
            │   │   ├── verify/[id]/route.ts           ← NEW (public credential verification API)
            │   │   └── verify-registrar/route.ts
            │   ├── registrar
            │   │   ├── dashboard/page.tsx
            │   │   └── students/page.tsx
            │   ├── student
            │   │   ├── coach/page.tsx                 ← MODIFIED (per-skill chart normalization)
            │   │   ├── cvr/page.tsx                   ← MODIFIED (slim orchestrator, 8 components)
            │   │   ├── dashboard/page.tsx
            │   │   ├── profile/page.tsx
            │   │   ├── profile/security/page.tsx
            │   │   └── skills/page.tsx
            │   └── verify/[id]/page.tsx               ← NEW (public verification portal, no auth)
            ├── components
            │   ├── auth
            │   │   ├── ChallengeMFA.tsx
            │   │   ├── EnrollMFA.tsx
            │   │   ├── RegistrarRegisterForm.tsx
            │   │   └── StudentRegisterForm.tsx
            │   ├── cvr
            │   │   ├── CVRFormSections.tsx            ← MODIFIED (barrel export)
            │   │   ├── PersonalDetailsSection.tsx     ← NEW
            │   │   ├── EducationSection.tsx           ← NEW
            │   │   ├── ExperienceSection.tsx          ← NEW
            │   │   ├── ProjectsSection.tsx            ← NEW
            │   │   ├── CertificationsSection.tsx      ← NEW
            │   │   ├── VerifiedCertificationsBlock.tsx ← NEW
            │   │   ├── SkillsSection.tsx              ← NEW
            │   │   └── TemplateSelector.tsx           ← NEW
            │   ├── dashboard
            │   │   ├── AdminLayout.tsx
            │   │   ├── CredentialCard.tsx
            │   │   ├── CVRSuccessModal.tsx
            │   │   ├── DashboardLayout.tsx
            │   │   ├── ExportCVRModal.tsx
            │   │   ├── MetricCards.tsx
            │   │   ├── RecentActivity.tsx
            │   │   ├── RegistrarLayout.tsx
            │   │   ├── SchemaBuilder.tsx
            │   │   ├── Sidebar.tsx
            │   │   └── TopBar.tsx
            │   ├── features
            │   │   ├── CTASection.tsx
            │   │   ├── FeaturesSection.tsx
            │   │   ├── HeroSection.tsx
            │   │   └── WorkflowSection.tsx
            │   ├── pages
            │   │   ├── LandingPage.tsx
            │   │   └── LoginPage.tsx
            │   ├── shared
            │   │   ├── ConnectWalletModal.tsx
            │   │   ├── DashboardTour.tsx
            │   │   ├── Footer.tsx
            │   │   ├── Navbar.tsx
            │   │   ├── RegistrarLoginModal.tsx
            │   │   ├── RegistrarTour.tsx
            │   │   ├── SessionTimeout.tsx
            │   │   └── Tooltip.tsx
            │   └── student
            │       ├── MarketInsightsPanel.tsx        ← MODIFIED (rank-based location bars)
            │       └── RecommendationsPanel.tsx
            ├── contexts
            │   └── ThemeContext.tsx
            ├── hooks
            │   └── useCVR.ts
            └── lib
                ├── schemas
                │   ├── auth.ts
                │   └── cvr.ts
                ├── audit.ts
                ├── blockchain.ts
                ├── db.ts
                ├── email.ts
                ├── encryption.ts
                ├── logger.ts
                ├── supabaseClient.ts
                ├── turnstile.ts
                ├── utils.ts
                └── wagmi.ts

scripts
  seed_market_data.py
research
testing

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
CREATE TABLE public.credential_schemas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  title text NOT NULL,
  json_schema jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT credential_schemas_pkey PRIMARY KEY (id),
  CONSTRAINT credential_schemas_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.users(id)
);
CREATE TABLE public.market_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  skill_name text NOT NULL,
  job_count integer NOT NULL,
  data_source text DEFAULT 'adzuna'::text,
  recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}',
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
CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  ip_address text,
  duration integer,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
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
CREATE TABLE public.verification_codes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  type USER-DEFINED NOT NULL DEFAULT 'EMAIL_VERIFICATION'::verification_type,
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
  credential_data jsonb,
  schema_url text,
  CONSTRAINT verified_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT verified_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT verified_credentials_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.minting_batches(id)
);
```

# 5. Global Rules & Conventions

* **Component Architecture:** Always use functional components with TypeScript interfaces for props.
* **State Management:** Use React `useState` and `useEffect` for local state; leverage `ThemeContext` for global UI states.
* **Security First:** Never expose Private Keys in the frontend. All sensitive data (like registrar notes) must be encrypted via `lib/encryption.ts` before storage.
* **Code Integrity:** Do not remove existing comments or TODO markers. Use `async/await` for all database and blockchain calls.
* **Consistency:** Ensure "De-jargonization" for Registrar UIs (e.g., use "Secure Record" instead of "Mint NFT").
* **Error Handling:** Use Zod for all form and API request validation.
* **Zod Validation:** All z.record definitions must use the z.record(z.string(), z.any()) syntax to avoid runtime parser crashes.
* **Next.js 15 params:** Route params are a Promise in Next.js 15. Always `await params` before accessing properties: `const { id } = await params`.

# 6. Current State / Next Steps

* **Data Changes:**

    - monitored_keywords: Removed 'Nursing' (Healthcare category) — was a
      degree title, not a job-market skill. Slipped in via seed file.
      Also deleted all associated market_snapshots rows for 'Nursing'.

    - market_snapshots: No schema changes. history query in analyze/route.ts
      now scoped to last 14 days (was unbounded) to prevent old sparse
      rows from distorting the trend chart.

    - No new Prisma schema changes this session. All changes are data-level.


* **Last Completed:**
  - Phase 6 branch: feature/phase6-rate-limit-resilience

  - Rate-Limit Resilience (Phase 1): Replaced serial for-loop + setTimeout(2000)
    in daily-update.ts with p-limit (concurrency: 3, inter-task delay: 500ms).
    Extracted processSkill() as named function. W3C sync section intentionally
    kept serial (Gemini quota safety). Estimated 3x throughput improvement:
    100 skills ~67s vs ~200s serial. Install: npm install p-limit@4 in ai-engine.

  - Public Verification Portal (Phase 2):
    - /api/verify/[id] route: DB lookup via Prisma (credential UUID as ID —
      not enumerable unlike token_id). On-chain verification via Polygon Amoy
      public RPC using ethers.JsonRpcProvider. Returns credential details,
      student identity, issuer info, and onChain { verified, balance, tokenId,
      error } object. params now awaited (Next.js 15 requirement).
    - /verify/[id] public page: Standalone, no auth, no DashboardLayout.
      Shows green/amber verification status banner, credential details card,
      blockchain record (token ID, transaction hash → Polygonscan link, issuer
      DID, network), student identity (name, student ID, wallet), QR code
      (generated via qrcode library), copy link button.
      Install: npm install qrcode @types/qrcode in web-portal/vector-web.

  - CVR Separation of Concerns (Phase 2 bonus):
    - Split 500-line cvr/page.tsx into 8 focused components in components/cvr/:
      PersonalDetailsSection, EducationSection, ExperienceSection,
      ProjectsSection, CertificationsSection, VerifiedCertificationsBlock,
      SkillsSection, TemplateSelector.
    - CVRFormSections.tsx updated as barrel export for clean imports.
    - cvr/page.tsx reduced to slim orchestrator (~200 lines).

  - Gemini Context Enrichment (Phase 3): /api/chat/route.ts updated to
    deduplicate market_snapshots to most recent per skill, then extract
    salary (avg/min/max/currency) and top 3 hiring locations from metadata
    JSONB. Gemini prompt now includes salary-aware, location-specific context.
    Graceful fallback to job count only for skills with empty metadata (pre-Feb 22).
    Verified working: Gemini correctly cited Python avg $118k, React avg $103k,
    and gave HealthTech crossover advice based on student's skill combo.

  - MarketInsightsPanel location bars fix: Adzuna returns locations as plain
    string array (no counts). Switched from count-based to rank-based bar
    widths: 100/80/60/45/30%. Extracted LocationBars component with auto-detect
    logic — falls back to count-based automatically if real counts arrive.

  - Trend chart normalization fix (coach/page.tsx): Per-skill y-axis
    normalization prevents high-count skills (Python 134k) from flattening
    low-count skills (React 4k) to zero. Added amber low-data warning when
    < 4 snapshots exist. Added legend with actual job counts. analyze/route.ts
    history query scoped to last 14 days.


* **Current Focus:**
  - Merge feature/phase6-rate-limit-resilience PR into main.
  - Confirm cron schedule (00:00 UTC) runs automatically tomorrow and verify
    no silent failures via GitHub Actions log output.


* **Next Steps:**
  - Trend Confidence Improvement: Skills currently have confidence: 'low'
    (only 2-3 snapshots). Forecaster accuracy improves to 'medium' after
    4 days, 'high' after 7 days of cron runs. No code needed — passive.
  - Trend Chart Polish: Chart still looks sparse with only 2-3 data points.
    Will improve naturally as cron accumulates data. Revisit chart UX
    (e.g. Recharts migration) once 7+ days of data are available.
  - Student Notifications: Use the existing notifications table to alert
    students when a skill they hold starts decaying (trend: 'declining').
    Trigger from daily-update.ts after market snapshot insert.
  - Registrar Portal Polish: SchemaBuilder.tsx and batch minting UX
    improvements based on any registrar feedback.
  - Production Readiness: Swap Polygon Amoy testnet → Polygon mainnet,
    set NEXT_PUBLIC_APP_URL correctly so schema_url stops writing
    'undefined/api/schemas/...' for new credentials.
---