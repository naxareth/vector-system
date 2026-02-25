# 1. Project Overview

* **Name:** VECTOR (Decentralized Micro-Credentialing System)
* **Purpose:** A decentralized platform using blockchain and AI to issue, verify, and analyze academic and professional micro-credentials, providing students with a "Verified Resume" (CVR), course recommendations and real-time market relevance insights.

# 2. Tech Stack

* **Frontend:** Next.js 15+ (App Router), TailwindCSS, Lucide React, Framer Motion.
* **Backend:** Next.js API Routes (Edge/Node.js), Supabase Auth/Middleware.
* **Database:** PostgreSQL (Supabase) with Prisma ORM for schema management.
* **Blockchain:** Ethereum/EVM compatible (Polygon Amoy Testnet), Hardhat, Ethers.js, Wagmi.
* **AI/NLP:** Google Gemini API (NLP for skill extraction + dynamic course generation), Custom Decay/Health Forecasting algorithms.

# 3. Directory Structure

* **`packages/blockchain-core`**: Smart contracts (Solidity) and deployment scripts.
* **`packages/ai-engine`**: Standalone service for market data ingestion, skill extraction, and health score calculations.
* **`packages/web-portal/vector-web`**: The main Next.js application containing the Student, Registrar, and Admin portals.

.github
  workflows
    daily-market-tracker.yml                          ← MODIFIED (Node 18→20, --with-gemini dropdown, smart run step)
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
│       │   ├── gemini-client.ts                       ← MODIFIED (GEMINI_MODEL constant, generateCoursesForTag export)
│       │   └── skill-extractor.ts                     ← MODIFIED (uses GEMINI_MODEL constant)
│       ├── predictions
│       │   └── decay-forecaster.ts                    ← MODIFIED (% slope thresholds + confidence) ← Phase 13 target
│       ├── recommendations
│       │   └── course-recommender.ts                  ← MODIFIED (Tier 1/Tier 2 domain filter, normalize, explore fallback)
│       ├── scripts
│       │   ├── daily-update.ts                        ← MODIFIED (--with-gemini flag gates all Gemini calls) ← Phase 13 batching audit
│       │   └── ingest-job-data.ts
│       └── index.ts                                   ← MODIFIED (studentDomainTags extraction, passes to recommendCourses)
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
        │   └── schema.prisma                          ← MODIFIED (skill_tags String[] on verified_credentials, skill_health_cache fields synced)
        ├── scripts
        │   ├── backfill-skill-tags.ts                 ← NEW (one-time migration, already run)
        │   └── evaluate-extractor.ts                  ← PLANNED Phase 13 (F1 score golden dataset eval)
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
            │   │   ├── analyze/route.ts               ← MODIFIED (skill_tags fan-out, empty early return, cache persist)
            │   │   ├── auth
            │   │   │   ├── callback/route.ts
            │   │   │   ├── cancel-reset/route.ts
            │   │   │   ├── confirm-reset/route.ts
            │   │   │   ├── login-check/route.ts
            │   │   │   ├── request-reset/route.ts
            │   │   │   ├── send-verification/route.ts
            │   │   │   ├── verify-captcha/route.ts
            │   │   │   └── verify-email/route.ts
            │   │   ├── chat/route.ts                  ← MODIFIED (salary + location Gemini context) ← Phase 13 key segregation
            │   │   ├── cvr
            │   │   │   ├── export/route.ts            ← NEW Phase 11 (INSERT into cvr_exports, return UUID)
            │   │   │   └── analyze/route.ts           ← NEW Phase 12 (Gemini CVR analysis, skill_health_cache enrichment)
            │   │   ├── mint/route.ts
            │   │   ├── registrar
            │   │   │   ├── credentials/route.ts       ← MODIFIED (inline Gemini course gen, dynamic course pipeline, skill_tags validation)
            │   │   │   └── log-mint/route.ts          ← MODIFIED (notification insert after mint)
            │   │   ├── schemas/route.ts
            │   │   ├── schemas/[id]/route.ts
            │   │   ├── student
            │   │   │   ├── credentials/route.ts
            │   │   │   ├── skill-health/route.ts      ← NEW (fast cache-read, no LLM)
            │   │   │   └── market-insights/route.ts
            │   │   ├── verify
            │   │   │   ├── [id]/route.ts              ← NEW (public single credential verification API)
            │   │   │   └── cvr/[id]/route.ts          ← NEW Phase 11 (CVR-level verification API)
            │   │   └── verify-registrar/route.ts
            │   ├── registrar
            │   │   ├── dashboard/page.tsx             ← MODIFIED (extracts + validates skill_tags before minting)
            │   │   └── students/page.tsx
            │   ├── student
            │   │   ├── coach/page.tsx                 ← MODIFIED (react-markdown for AI chat, per-skill chart normalization)
            │   │   ├── cvr/page.tsx                   ← MODIFIED Phase 12 (CVRAnalysisPanel wired, latestSnapshot derived pre-render)
            │   │   ├── dashboard/page.tsx
            │   │   ├── profile/page.tsx
            │   │   ├── profile/security/page.tsx
            │   │   └── skills/page.tsx                ← MODIFIED (fan-out by skill_tags, two-phase load, slope velocity UI)
            │   └── verify
            │       ├── [id]/page.tsx                  ← NEW (public single credential verify portal, no auth)
            │       └── cvr/[id]/page.tsx              ← NEW Phase 11 (full CVR verification portal)
            ├── components
            │   ├── auth
            │   │   ├── ChallengeMFA.tsx
            │   │   ├── EnrollMFA.tsx
            │   │   ├── RegistrarRegisterForm.tsx
            │   │   └── StudentRegisterForm.tsx
            │   ├── cvr
            │   │   ├── CVRFormSections.tsx            ← MODIFIED (barrel export)
            │   │   ├── CVRAnalysisPanel.tsx           ← NEW Phase 12 (Gemini CVR feedback: score, skill strength, market alignment, gaps, recommendations)
            │   │   ├── PersonalDetailsSection.tsx
            │   │   ├── EducationSection.tsx
            │   │   ├── ExperienceSection.tsx
            │   │   ├── ProjectsSection.tsx
            │   │   ├── CertificationsSection.tsx
            │   │   ├── VerifiedCertificationsBlock.tsx
            │   │   ├── SkillsSection.tsx
            │   │   └── TemplateSelector.tsx
            │   ├── dashboard
            │   │   ├── AdminLayout.tsx
            │   │   ├── CredentialCard.tsx
            │   │   ├── CVRSuccessModal.tsx
            │   │   ├── DashboardLayout.tsx
            │   │   ├── ExportCVRModal.tsx             ← MODIFIED Phase 10 (QR in all 3 ghost templates + modal preview) ← Phase 11 update QR URL
            │   │   ├── MetricCards.tsx
            │   │   ├── RecentActivity.tsx
            │   │   ├── RegistrarLayout.tsx
            │   │   ├── SchemaBuilder.tsx              ← MODIFIED (skill_tags field locked, undeletable, on all templates)
            │   │   ├── Sidebar.tsx                    ← MODIFIED (active link hydration fix — mounted guard)
            │   │   ├── NotificationBell.tsx
            │   │   └── ThemeToggle.tsx
            │   └── student
            │       ├── MarketInsightsPanel.tsx        ← MODIFIED (rich market data display)
            │       └── RecommendationsPanel.tsx       ← MODIFIED (Tier 1/Tier 2 domain-aware display)
            └── lib
                ├── blockchain.ts
                ├── db.ts
                ├── encryption.ts
                ├── gemini.ts                          ← NEW (centralized GEMINI_MODEL constant + geminiModel singleton for all web portal routes)
                └── supabaseClient.ts

# 4. Database Schema (PostgreSQL / Supabase)

```sql
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  provider text,
  url text,
  skill_tag text,
  level text DEFAULT 'beginner'::text,
  duration_hours integer,
  is_free boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cvr_exports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  template text,
  credential_ids uuid[],
  snapshot jsonb,
  CONSTRAINT cvr_exports_pkey PRIMARY KEY (id),
  CONSTRAINT cvr_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.market_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  job_count integer,
  avg_salary numeric,
  location_data jsonb,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT market_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.minting_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registrar_id uuid NOT NULL,
  batch_name text NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::batch_status,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  processed_at timestamp with time zone,
  CONSTRAINT minting_batches_pkey PRIMARY KEY (id),
  CONSTRAINT minting_batches_registrar_id_fkey FOREIGN KEY (registrar_id) REFERENCES public.users(id)
);
CREATE TABLE public.monitored_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  category text DEFAULT 'tech'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monitored_keywords_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  phone text,
  major text,
  bio text,
  linkedin_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.schemas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT schemas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.skill_health_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  health_score integer DEFAULT 50,
  trend_label text DEFAULT 'stable'::text,
  trend_slope numeric DEFAULT 0,
  job_count integer DEFAULT 0,
  avg_salary numeric DEFAULT 0,
  top_locations jsonb DEFAULT '[]'::jsonb,
  confidence text DEFAULT 'low'::text,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT skill_health_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.student_course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
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
  skill_tags text[] DEFAULT '{}',
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
* **Next.js 15 cookies:** `cookies()` returns a Promise — always `await cookies()` before calling `.get()`.
* **skill_tags exclusion:** `skill_tags` is a top-level DB column on verified_credentials, NOT a credential_data field. Always exclude it from W3C schema required-field validation in registrar/credentials/route.ts using `key !== 'skill_tags'`.
* **NEXT_PUBLIC_APP_URL:** Must be set in .env or schema_url will be stored as "undefined/api/schemas/...". Set to http://localhost:3000 in dev. Use `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` as fallback pattern everywhere.
* **Gemini model:** Use `gemini-2.5-flash-lite` as GEMINI_MODEL in both `src/lib/gemini.ts` (web portal) and `packages/ai-engine/src/nlp/gemini-client.ts`. Never hardcode model strings anywhere else — always import the constant. Free tier is 20 RPD / 10 RPM on this model.
* **Centralized Gemini client:** Web portal routes must import `geminiModel` from `@/lib/gemini` instead of instantiating their own `GoogleGenerativeAI` + `getGenerativeModel`. The singleton is defined once in `src/lib/gemini.ts`. ai-engine uses its own `gemini-client.ts` independently (cross-package imports are forbidden).
* **Cross-package imports:** Never import from `ai-engine/src` inside web portal API routes — Turbopack cannot resolve cross-package relative paths. Inline any shared logic using the web portal's own dependencies instead.
* **Course generation:** generateCoursesForTag is inlined in credentials/route.ts (not imported from ai-engine). If the same logic is needed elsewhere in the web portal, inline it again rather than importing across packages.
* **Hydration safety:** Never use `new Date()`, `Date.now()`, `Math.random()`, or `usePathname()`-dependent class names in initial render. Gate them behind `useState(null)` + `useEffect` or a `mounted` boolean to avoid SSR/client mismatch.
* **p-limit version:** ai-engine uses p-limit@4 (last CJS-compatible version). Do NOT upgrade to v5+ — those are ESM-only and will break ts-node with ERR_REQUIRE_ESM.
* **GitHub Actions Node version:** Always Node 20. Never 18 — Supabase and Hardhat deps require >=20.
* **Gemini quota:** Free tier is 20 RPD on gemini-2.5-flash-lite. Daily cron runs with zero Gemini calls by default (no --with-gemini flag). Only pass --with-gemini for weekly/manual runs needing W3C skill sync.
* **react-markdown:** Installed in web portal. Use for rendering AI chat responses in coach/page.tsx. Wrap in a `<div className="prose prose-sm prose-purple ...">` — do NOT pass className directly to ReactMarkdown (removed in latest version).
* **ngrok (dev only):** For mobile QR testing, run `ngrok http 3000` in a separate terminal and update NEXT_PUBLIC_APP_URL temporarily. Revert after testing. Never commit ngrok URLs.
* **QR code generation:** Uses `qrcode` npm package (already installed). Always generate from `NEXT_PUBLIC_APP_URL` env var with localhost fallback. QR data URL generated via `QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 })`.
* **Decay forecaster:** Current implementation uses simple slope thresholds (if/else on % change). Do NOT replace with ARIMA — insufficient data density in market_snapshots. Phase 13 target: recency-weighted velocity scoring (slope + absolute volume + recency weight). ARIMA is the documented long-term upgrade path after 6-12 months of snapshot accumulation.
* **Gemini key segregation (planned Phase 13):** Split into GEMINI_API_KEY_BACKEND (cron/ingestion) and GEMINI_API_KEY_CHAT (chat route) to double effective daily quota from 20 to 40 RPD.
* **skill_health_cache Prisma fields:** The Prisma model for skill_health_cache uses `skill_name` as the primary key (not `id` or `keyword`). Select/where fields are: `skill_name`, `health_score`, `trend_label`, `trend_slope`, `job_count`, `avg_salary`, `top_locations`, `confidence`, `status`, `last_updated`. The DB has a `keyword` column (unique) but Prisma maps it as `skill_name` in the generated client — always use `skill_name` in Prisma queries.

# 6. Current State / Next Steps

* **Last Completed:**
  - Phase 11 — Dedicated CVR Verification (complete):
    - cvr_exports table live in Supabase.
    - /api/cvr/export/route.ts — authenticated POST, inserts row, returns UUID.
    - /api/verify/cvr/[id]/route.ts — public GET, returns full CVR snapshot.
    - /verify/cvr/[id]/page.tsx — public portal with isLatest employer warning.
    - CVR history panel on student CVR page.
    - ExportCVRModal QR points to /verify/cvr/[id].
    - CVR immutability enforced by design.
  - Phase 12 — AI CVR Analysis (partially complete, needs full test):
    - /api/cvr/analyze/route.ts — authenticated POST, enriches snapshot with skill_health_cache market data, calls Gemini, returns structured JSON (overallScore, summary, skillStrength, marketAlignment, missingKeywords, recommendations).
    - CVRAnalysisPanel.tsx — 4-state component (idle, loading, error, results). Displays score ring, market alignment bar, skill chips (strong/moderate/weak), missing keywords, recommendations.
    - cvr/page.tsx — panel wired below form, only renders when cvrHistory.length > 0. latestSnapshot derived pre-render.
    - src/lib/gemini.ts — NEW centralized Gemini singleton (GEMINI_MODEL + geminiModel exports) for all web portal routes.
    - prisma/schema.prisma — skill_health_cache model synced with full DB column set (health_score, trend_label, job_count, avg_salary, top_locations, confidence).
    - npx prisma db push + npx prisma generate completed.

* **Known Pending Issues / Phase 12 not yet fully verified:**
  - CVRAnalysisPanel market enrichment path not confirmed working end-to-end (skill_health_cache Prisma fix applied but not tested with real populated cache data).
  - Existing web portal routes (chat/route.ts, credentials/route.ts, analyze/route.ts) still instantiate their own GoogleGenerativeAI — not yet migrated to import geminiModel from @/lib/gemini. Migration is low-priority but should be done for consistency.
  - trend_slope is synthetic — Phase 13 replaces with weighted velocity scoring.
  - Gemini free tier (20 RPD) scalability ceiling — Phase 13 adds key segregation.
  - allowedDevOrigins warning for ngrok — add to next.config.ts.
  - Generated course URLs are unverified Gemini slugs — future link-validation pass.

* **Next Steps (in order):**
  1. Finish validating Phase 12 end-to-end:
       a. Mint a credential with skill_tags so skill_health_cache has data.
       b. Run daily-update.ts (no --with-gemini needed) to populate cache.
       c. Go to /student/cvr — confirm CVRAnalysisPanel appears below form.
       d. Click "Analyze My CVR" — confirm market enrichment data appears in
          skillStrength chips and marketAlignment insight (not just generic advice).
       e. Confirm Re-analyze button works and returns fresh results.
       f. Confirm error state shows cleanly if Gemini quota exceeded.

  2. Phase 13 — Academic Defense Prep Bundle:
       a. Weighted Velocity Scoring in decay-forecaster.ts (3-signal: slope + volume + recency).
       b. F1 Evaluation Script — evaluate-extractor.ts, golden dataset, Precision/Recall/F1 output.
       c. Dual Gemini key segregation — GEMINI_API_KEY_BACKEND + GEMINI_API_KEY_CHAT.
       d. Batching audit — verify daily-update.ts batches all skills into one Gemini call.
       e. Cost-at-scale projection for defense slide (5,000 students).

     Key defense talking points:
     - Chose zero-shot extraction over static model to solve concept drift by design.
     - New skill (e.g. Quantum Computing) extracted, market-analyzed, course-matched on
       first mint with zero human intervention or retraining.
     - ARIMA evaluated but deferred — recency-weighted scoring is statistically appropriate
       for current data density. ARIMA is the documented upgrade path.
     - Instructor confirmed: "just experiment" — deliberate architectural experimentation
       with a production LLM API is the approved approach.

  3. Passive — Trend Confidence improves automatically with cron time. No code needed.

  4. Future — Production: Polygon Amoy → mainnet, NEXT_PUBLIC_APP_URL for prod deploy.

* **Git:**
  - Completed branches: feature/phase10-cvr-qr, feature/phase11-cvr-dedicated-verify
  - Current branch: feature/phase12-ai-cvr-analysis
  - Next branch: feature/phase13-defense-prep
  - Merge phase12 to main after full Phase 12 validation.
---