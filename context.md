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
│       │   └── decay-forecaster.ts                    ← MODIFIED (% slope thresholds + confidence)
│       ├── recommendations
│       │   └── course-recommender.ts                  ← MODIFIED (Tier 1/Tier 2 domain filter, normalize, explore fallback)
│       ├── scripts
│       │   ├── daily-update.ts                        ← MODIFIED (p-limit concurrency, W3C sync)
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
        │   └── schema.prisma                          ← MODIFIED (skill_tags String[] on verified_credentials)
        ├── scripts
        │   └── backfill-skill-tags.ts                 ← NEW (one-time migration, already run)
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
            │   │   ├── chat/route.ts                  ← MODIFIED (salary + location Gemini context)
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
            │   │   ├── verify/[id]/route.ts           ← NEW (public credential verification API)
            │   │   └── verify-registrar/route.ts
            │   ├── registrar
            │   │   ├── dashboard/page.tsx             ← MODIFIED (extracts + validates skill_tags before minting)
            │   │   └── students/page.tsx
            │   ├── student
            │   │   ├── coach/page.tsx                 ← MODIFIED (per-skill chart normalization)
            │   │   ├── cvr/page.tsx                   ← MODIFIED (slim orchestrator, 8 components)
            │   │   ├── dashboard/page.tsx
            │   │   ├── profile/page.tsx
            │   │   ├── profile/security/page.tsx
            │   │   └── skills/page.tsx                ← MODIFIED (fan-out by skill_tags, two-phase load, slope velocity UI)
            │   └── verify/[id]/page.tsx               ← NEW (public verification portal, no auth)
            ├── components
            │   ├── auth
            │   │   ├── ChallengeMFA.tsx
            │   │   ├── EnrollMFA.tsx
            │   │   ├── RegistrarRegisterForm.tsx
            │   │   └── StudentRegisterForm.tsx
            │   ├── cvr
            │   │   ├── CVRFormSections.tsx            ← MODIFIED (barrel export)
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
            │   │   ├── ExportCVRModal.tsx
            │   │   ├── MetricCards.tsx
            │   │   ├── RecentActivity.tsx
            │   │   ├── RegistrarLayout.tsx
            │   │   ├── SchemaBuilder.tsx              ← MODIFIED (skill_tags field locked, undeletable, on all templates)
            │   │   ├── Sidebar.tsx                    ← MODIFIED (active link hydration fix — mounted guard)
            │   │   └── TopBar.tsx                     ← MODIFIED (date hydration fix — client-only render)
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
            │       └── RecommendationsPanel.tsx       ← MODIFIED (explore reasonType, FALLBACK_CONFIG crash guard, contextual banners)
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

# 4. Database Schema (Current — post Phase 9)

```sql
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
  skill_tags text[],
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
  metadata jsonb DEFAULT '{}'::jsonb,
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
* **Next.js 15 cookies:** `cookies()` returns a Promise — always `await cookies()` before accessing properties.
* **skill_tags exclusion:** `skill_tags` is a top-level DB column on verified_credentials, NOT a credential_data field. Always exclude it from W3C schema required-field validation in registrar/credentials/route.ts using `key !== 'skill_tags'`.
* **NEXT_PUBLIC_APP_URL:** Must be set in .env or schema_url will be stored as "undefined/api/schemas/...". Set to http://localhost:3000 in dev.
* **Gemini model:** Use `gemini-flash-latest` in web portal routes (chat/route.ts, credentials/route.ts). In ai-engine, use the `GEMINI_MODEL` constant exported from `gemini-client.ts`. Never hardcode model strings outside these two locations.
* **Cross-package imports:** Never import from `ai-engine/src` inside web portal API routes — Turbopack cannot resolve cross-package relative paths. Inline any shared logic using the web portal's own dependencies instead.
* **Course generation:** generateCoursesForTag is inlined in credentials/route.ts (not imported from ai-engine). If the same logic is needed elsewhere in the web portal, inline it again rather than importing across packages.
* **Hydration safety:** Never use `new Date()`, `Date.now()`, `Math.random()`, or `usePathname()`-dependent class names in initial render. Gate them behind `useState(null)` + `useEffect` or a `mounted` boolean to avoid SSR/client mismatch.

# 6. Current State / Next Steps

* **Data Changes (Phase 8 & 9):**
  - verified_credentials: added `skill_tags text[] DEFAULT '{}'` column (migrated + generated).
  - monitored_keywords: auto-populated with skill tags on every credential issue and analyze call.
  - skill_health_cache: populated as fire-and-forget side effect of /api/analyze calls.
  - courses: dynamically populated by Gemini on every mint when a new skill_tag has zero course coverage.
  - All old test credentials deleted (DELETE FROM verified_credentials) — clean slate.
  - SQL seed applied to baseline all monitored_keywords into skill_health_cache as Stable/0.0.

* **Last Completed:**
  - Phase 9 — Domain-Aware Recommendation Engine + Dynamic Course Generation (complete):

    course-recommender.ts (full rewrite):
      1. Added studentDomainTags: string[] to RecommendationContext.
      2. normalize() helper — lowercase + whitespace collapse, used consistently for tag comparison.
      3. hasOverlap() helper — clean intersection check between two tag arrays.
      4. scoreCourse() extracted as pure function, reused by both tiers.
      5. Tier 1: filters courses to domain overlap with student's credential tags.
         Gap analysis scoped to domain courses only — no cross-field gaps surfaced.
      6. Tier 2 (explore fallback): fills remaining slots from non-domain courses.
         reasonType = 'explore', neutral reason text — never implies field relevance.
      7. Early return if Tier 1 fills topN — Tier 2 query never runs.

    index.ts:
      1. Extracts studentDomainTags from studentData.credentials (deduplicated flatMap).
      2. Passes studentDomainTags to recommendCourses context.
      3. Logs resolved domain tags for debugging.

    credentials/route.ts (Step 9 added — fire-and-forget after mint):
      1. Checks which incoming skill_tags have zero course coverage (single hasSome query).
      2. Calls inline generateCoursesForTag (Gemini) for each uncovered tag in parallel.
      3. Bulk inserts generated courses into courses table.
      4. Inlined Gemini function uses web portal's own GoogleGenerativeAI instance
         (avoids Turbopack cross-package import error).

    gemini-client.ts (ai-engine):
      1. Added GEMINI_MODEL constant as single source of truth for model name.
      2. generateCoursesForTag exported (used by ai-engine scripts if needed).

    skill-extractor.ts:
      1. Uses GEMINI_MODEL constant instead of hardcoded model string.

    RecommendationsPanel.tsx:
      1. Added 'explore' to reasonType union and REASON_CONFIG.
      2. Added FALLBACK_CONFIG — prevents crash on unknown reasonType from API.
      3. Contextual banners: all-explore banner, mixed Tier1+Tier2 banner.

    TopBar.tsx:
      1. Fixed hydration mismatch — date rendered client-only via useState(null) + useEffect.

    Sidebar.tsx:
      1. Fixed active link hydration mismatch — isActive gated behind mounted boolean.

  - Verified end-to-end:
    - Accounting student sees Financial Accounting, Taxation, Cost Accounting courses (Tier 1).
    - No Docker/Kubernetes/Agile appearing for domain-specific students.
    - Gemini generated 3 courses each for Financial Accounting, Cost Accounting, Taxation on first mint.
    - Explore banner shown correctly when no domain courses exist yet.

* **Known Pending Issues:**
  - trend_slope is still synthetic. Replace deriveTrendSlope() with real linear
    regression from market_snapshots once data density is sufficient per tag.
  - NEXT_PUBLIC_APP_URL missing from .env — set to http://localhost:3000 in dev.
  - Verify api/student/credentials/route.ts selects skill_tags column.
  - Generated course links are unverified (Gemini-generated slugs). Add a
    link-validation pass in a future phase. Marked with TODO in credentials/route.ts.
  - Cron job issue — pending diagnosis (next item).

* **Next Steps (in order):**
  1. Diagnose and fix daily cron job issue (daily-update.ts).

  2. Phase 10 — CVR QR Code → Verified Ledger:
     Add QR code to generated/exported CVR encoding /verify/[credential-uuid].
     Employer scans → lands on public verification portal.
     Tie into ExportCVRModal or CVR preview step.

  3. Phase 11 — AI CVR Analysis:
     Pass student CVR data through Gemini. Return structured feedback:
     skill strength, market alignment, missing keywords, improvements.
     Display as panel on CVR or coach page.

  4. Passive — Trend Confidence: auto-improves to 'medium' after 4 days,
     'high' after 7 days of cron runs. No code needed.

  5. Future — Production Readiness:
     Polygon Amoy → mainnet. Fix NEXT_PUBLIC_APP_URL for schema_url.

* **Git:**
  - Branch: feature/phase9-domain-recommendations
  - Commit: "fix: domain-aware course recommendations + dynamic course generation"
---