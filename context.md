
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
  seed-monitored-keywords.sql                          ← NEW
  seed-courses.sql                                     ← NEW
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
│       │   ├── daily-update.ts                        ← MODIFIED (W3C sync + Gemini expansion)
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
            │   │   ├── analyze/route.ts
            │   │   ├── auth
            │   │   │   ├── callback/route.ts
            │   │   │   ├── cancel-reset/route.ts
            │   │   │   ├── confirm-reset/route.ts
            │   │   │   ├── login-check/route.ts
            │   │   │   ├── request-reset/route.ts
            │   │   │   ├── send-verification/route.ts
            │   │   │   ├── verify-captcha/route.ts
            │   │   │   └── verify-email/route.ts
            │   │   ├── chat/route.ts
            │   │   ├── mint/route.ts
            │   │   ├── registrar
            │   │   │   ├── credentials/route.ts
            │   │   │   └── log-mint/route.ts
            │   │   ├── schemas/route.ts
            │   │   ├── schemas/[id]/route.ts
            │   │   ├── student
            │   │   │   ├── credentials/route.ts
            │   │   │   └── market-insights/route.ts   ← NEW
            │   │   └── verify-registrar/route.ts
            │   ├── registrar
            │   │   ├── dashboard/page.tsx
            │   │   └── students/page.tsx
            │   └── student
            │       ├── coach/page.tsx                 ← MODIFIED (RecommendationsPanel + chat context)
            │       ├── cvr/page.tsx
            │       ├── dashboard/page.tsx
            │       ├── profile/page.tsx
            │       ├── profile/security/page.tsx
            │       └── skills/page.tsx
            ├── components
            │   ├── auth
            │   │   ├── ChallengeMFA.tsx
            │   │   ├── EnrollMFA.tsx
            │   │   ├── RegistrarRegisterForm.tsx
            │   │   └── StudentRegisterForm.tsx
            │   ├── cvr
            │   │   └── CVRFormSections.tsx
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
            │       ├── MarketInsightsPanel.tsx        ← NEW
            │       └── RecommendationsPanel.tsx       ← NEW
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

# 5. Global Rules & Conventions

* **Component Architecture:** Always use functional components with TypeScript interfaces for props.
* **State Management:** Use React `useState` and `useEffect` for local state; leverage `ThemeContext` for global UI states.
* **Security First:** Never expose Private Keys in the frontend. All sensitive data (like registrar notes) must be encrypted via `lib/encryption.ts` before storage.
* **Code Integrity:** Do not remove existing comments or TODO markers. Use `async/await` for all database and blockchain calls.
* **Consistency:** Ensure "De-jargonization" for Registrar UIs (e.g., use "Secure Record" instead of "Mint NFT").
* **Error Handling:** Use Zod for all form and API request validation.
* **Zod Validation:** All z.record definitions must use the z.record(z.string(), z.any()) syntax to avoid runtime parser crashes.

# 6. Current State / Next Steps 

* **Data Changes:** -

    Database (Prisma): Created credential_schemas table to store dynamic JSON-LD templates.

    - market_snapshots: metadata JSONB fully populated. Shape:
  { job_count, salary: { min, max, avg, currency },
    top_locations: [{ location, count }], fetched_at }.
  Historical rows prior to Feb 22 2026 have metadata: {}.

    - monitored_keywords: Cleared legacy 7-entry list. Seeded with 100+
      curated keywords across 12 categories. Category values:
      'Frontend', 'Backend', 'Database', 'Cloud', 'DevOps', 'AI',
      'Blockchain', 'Security', 'Design', 'Product', 'Marketing',
      'Business', 'IT', 'Healthcare', 'w3c-extracted', 'auto-expanded'.

    - courses: Seeded with 57 real courses across all skill categories.
      Fields: title, provider, skill_tags (matches monitored_keywords),
      link. Used by course-recommender.ts for gap-based recommendations.

    - No new Prisma schema changes this session. All changes are data-level.


* **Last Completed:**
  - Full Rich Market Intelligence Pipeline: adzuna-client.ts fetches
    salary (min/max/avg) + top 5 hiring locations per skill. Fixed 400
    errors caused by invalid content_type query param.
  - market-provider.ts: Wired fetchRichMarketData → MarketIntelligence
    interface. Raw RichMarketData writes directly to metadata JSONB.
  - W3C Skill Sync: syncExtractedSkillsToMonitored() in daily-update.ts
    queries verified_credentials with schema_url, runs Gemini + JSON-LD
    extraction, Gemini-expands each skill into related market keywords,
    upserts all into monitored_keywords tagged 'w3c-extracted' or
    'auto-expanded'. Runs before fetch loop so new skills are tracked
    same day they are discovered.
  - Sanitization layer in daily-update.ts: academic credential titles
    filtered before hitting Adzuna. monitored_keywords always bypass.
  - decay-forecaster.ts rewritten: percentage-based slope thresholds
    (0.5%/day) replace broken absolute thresholds. Added confidence
    field (low/medium/high based on data point count).
  - course-recommender.ts rebuilt: queries real courses table, runs
    gap analysis against market_snapshots, scores courses across 4
    tiers (decay > gap > growth > complement). Fixed module-level
    Supabase init crash via lazy getSupabaseClient() factory.
  - index.ts updated: recommendCourses now awaited, new signature
    { studentSkills, skillHealthMap }, atRiskSkills replaces gaps: [].
  - MarketInsightsPanel.tsx: per-skill salary bar, top locations chart,
    sparkline, ▲/▼ trend badge, expandable rows.
  - RecommendationsPanel.tsx: ranked course cards with reason type
    badges (Skill Gap / Urgent Upgrade / Rising Demand / Builds On
    Skills), relevance score bar, direct course links.
  - coach/page.tsx: both panels wired in. Recommendations + atRiskSkills
    passed into chat context so Gemini references specific courses in
    replies. Initial greeting surfaces top recommendation inline.
  - 93 skills tracked with real job counts + salary metadata confirmed
    in market_snapshots. Courses table seeded with 57 entries.

* **Current Focus:**
  - GitHub Actions validation: Trigger daily-tracker.yml manually from
    the Actions tab. Verify secrets resolve, W3C sync runs, and all
    93 skills are recorded in market_snapshots from the CI environment.

* **Next Steps:**
  - GitHub Actions: After successful manual trigger, confirm cron
    schedule (00:00 UTC) runs automatically and verify no silent
    failures via log output.
  - Rate-Limit Resilience: Replace setTimeout in daily-update.ts with
    p-limit for concurrent but controlled API calls. Required before
    keyword list exceeds ~100 skills to avoid GitHub Actions timeouts.
  - Public Verification Portal: Build /verify/[id] route to resolve
    DIDs and verify cryptographic signatures against Polygon Amoy.
    Standalone — no dependencies on Phase 5 AI work.
  - Gemini Context Enrichment: Pass salary and location metadata from
    market_snapshots into the Gemini prompt in /api/chat so the AI
    gives salary-aware, location-specific career advice.
  - Trend Confidence Improvement: Skills currently have confidence:
    'low' (only 2 snapshots). Forecaster accuracy improves to 'medium'
    after 4 days, 'high' after 7 days of cron runs.
---

