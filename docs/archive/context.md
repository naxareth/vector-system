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
  SECURITY_MITIGATIONS.md                            ← NEW Checkpoint #2 (threat models, code changes, test results for all 4 mitigations)
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
│       │   ├── gemini-client.ts                       ← MODIFIED (open-domain skill extraction prompt, removed hardcoded 5-skill taxonomy, generateCoursesForTag export) ← Checkpoint #2 (runtime guard for missing GEMINI_API_KEY)
│       │   └── skill-extractor.ts                     ← MODIFIED (uses GEMINI_MODEL constant)
│       ├── predictions
│       │   └── decay-forecaster.ts                    ← MODIFIED Phase 13a (3-signal weighted velocity: slope 40% + volume 30% + recency 30%, velocityScore field added to SkillHealth interface)
│       ├── recommendations
│       │   └── course-recommender.ts                  ← MODIFIED (Tier 1/Tier 2 domain filter, normalize, explore fallback)
│       ├── scripts
│       │   ├── daily-update.ts                        ← MODIFIED (--with-gemini flag gates all Gemini calls) ← Phase 13d batching audit pending
│       │   ├── evaluate-extractor.ts                  ← NEW Phase 13b (F1 eval script, --verbose/--json flags, SOFT match mode, 13s delay for 5 RPM)
│       │   ├── golden-dataset.json                    ← NEW Phase 13b (20 cases: 5 academic, 5 bootcamp, 4 event, 6 govt/TESDA/DICT)
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
            │   │   ├── chat/route.ts                  ← MODIFIED (salary + location Gemini context) ← Checkpoint #2 (centralized Gemini import from @/lib/gemini)
            │   │   ├── cvr
            │   │   │   ├── export/route.ts            ← NEW Phase 11 (INSERT into cvr_exports, return UUID)
            │   │   │   └── analyze/route.ts           ← NEW Phase 12 (Gemini CVR analysis, skill_health_cache enrichment) ← Checkpoint #2 (centralized Gemini import)
            │   │   ├── mint/route.ts
            │   │   ├── registrar
            │   │   │   ├── credentials/route.ts       ← MODIFIED (step 8b notification insert, supabaseAdmin for RLS bypass, full_name added to dbUser select) ← Checkpoint #2 (centralized Gemini import)
            │   │   │   ├── csv-upload/route.ts        ← NEW Checkpoint #2 (secure CSV upload endpoint — auth + RBAC + file validation + row sanitization)
            │   │   │   └── log-mint/route.ts          ← legacy route, no longer called by registrar dashboard
            │   │   ├── schemas/route.ts
            │   │   ├── schemas/[id]/route.ts
            │   │   ├── student
            │   │   │   ├── credentials/route.ts
            │   │   │   ├── skill-health/route.ts      ← NEW (fast cache-read, no LLM)
            │   │   │   └── market-insights/route.ts
            │   │   ├── verify
            │   │   │   ├── [id]/route.ts              ← NEW (public single credential verification API) ← Checkpoint #2 (rate limiting 10/min per IP, PII redaction: studentId removed, walletAddress truncated)
            │   │   │   └── cvr/[id]/route.ts          ← NEW Phase 11 (CVR-level verification API) ← Checkpoint #2 (rate limiting, PII redaction: email+studentId removed, walletAddress truncated)
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
            │       ├── [id]/page.tsx                  ← NEW (public single credential verify portal, no auth) ← Checkpoint #2 (studentId field removed from UI)
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
            │   │   ├── TopBar.tsx                     ← MODIFIED (Supabase Realtime subscription, 30s polling fallback, mark-all-read on bell open, click redirects to /verify/[id])
            │   │   └── ThemeToggle.tsx
            │   └── student
            │       ├── MarketInsightsPanel.tsx        ← MODIFIED (rich market data display)
            │       └── RecommendationsPanel.tsx       ← MODIFIED (Tier 1/Tier 2 domain-aware display)
            ├── __tests__
            │   └── security
            │       ├── csv-validation.test.ts         ← NEW Checkpoint #2 (3 test cases, 18 assertions)
            │       ├── api-key-protection.test.ts     ← NEW Checkpoint #2 (3 test cases, 10 assertions)
            │       ├── ipfs-privacy.test.ts           ← NEW Checkpoint #2 (3 test cases, 29 assertions)
            │       └── rate-limiter.test.ts           ← NEW Checkpoint #2 (3 test cases, 11 assertions)
            └── lib
                ├── blockchain.ts
                ├── csv-validator.ts                    ← NEW Checkpoint #2 (MIME check, size limit, header validation, formula injection prevention, Zod row schemas)
                ├── db.ts
                ├── encryption.ts
                ├── env-guard.ts                        ← NEW Checkpoint #2 (validateSecretEnvVars: missing key detection + NEXT_PUBLIC_ leak detection)
                ├── gemini.ts                          ← NEW (centralized GEMINI_MODEL constant + geminiModel singleton) ← Checkpoint #2 (requireEnv guard, fails fast if key missing)
                ├── ipfs.ts                            ← MODIFIED Checkpoint #2 (was empty → buildIpfsMetadata, stripSensitiveFields, validateIpfsPayload, SENSITIVE_FIELDS blocklist)
                ├── rate-limiter.ts                    ← NEW Checkpoint #2 (sliding window rate limiter, 10 req/min per IP, auto-cleanup)
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
  link_url text,
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
* **API Key Protection (Checkpoint #2):** All critical secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`) must pass `requireEnv()` runtime guards. Never add these to `NEXT_PUBLIC_*` variables — `validateSecretEnvVars()` in `env-guard.ts` detects and blocks client-side leaks. All web portal routes must import `genAI`/`geminiModel` from `@/lib/gemini` — never instantiate standalone `GoogleGenerativeAI` clients.
* **CSV Upload Security (Checkpoint #2):** CSV uploads go through `csv-validator.ts` which checks MIME type, enforces 1 MB max, validates required headers (`student_id`, `skill_name`, `wallet_address`), and sanitizes cells against formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`). The endpoint at `/api/registrar/csv-upload` requires registrar/super_admin RBAC.
* **IPFS Privacy (Checkpoint #2):** Never send raw credential data to IPFS. Always use `buildIpfsMetadata()` from `@/lib/ipfs` as the single gateway — it strips 20+ sensitive fields (email, phone, wallet_address, private_notes, student_id, etc.). Call `validateIpfsPayload()` as a final check before pinning.
* **Rate Limiting (Checkpoint #2):** Public verification endpoints (`/api/verify/[id]`, `/api/verify/cvr/[id]`) are rate-limited to 10 requests/minute per IP using the `verifyRateLimiter` singleton from `@/lib/rate-limiter`. Responses include `Retry-After` and `X-RateLimit-Remaining` headers. PII is redacted: `studentId` removed, `email` removed, `walletAddress` truncated to first 6 + last 4 chars.
* **Code Integrity:** Do not remove existing comments or TODO markers. Use `async/await` for all database and blockchain calls.
* **Consistency:** Ensure "De-jargonization" for Registrar UIs (e.g., use "Secure Record" instead of "Mint NFT").
* **Error Handling:** Use Zod for all form and API request validation.
* **Zod Validation:** All z.record definitions must use the z.record(z.string(), z.any()) syntax to avoid runtime parser crashes.
* **Next.js 15 params:** Route params are a Promise in Next.js 15. Always `await params` before accessing properties: `const { id } = await params`.
* **Next.js 15 cookies:** `cookies()` returns a Promise — always `await cookies()` before calling `.get()`.
* **skill_tags exclusion:** `skill_tags` is a top-level DB column on verified_credentials, NOT a credential_data field. Always exclude it from W3C schema required-field validation in registrar/credentials/route.ts using `key !== 'skill_tags'`.
* **NEXT_PUBLIC_APP_URL:** Must be set in .env or schema_url will be stored as "undefined/api/schemas/...". Set to http://localhost:3000 in dev. Use `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` as fallback pattern everywhere.
* **Gemini model:** Use `gemini-2.5-flash-lite` as GEMINI_MODEL in both `src/lib/gemini.ts` (web portal) and `packages/ai-engine/src/nlp/gemini-client.ts`. Never hardcode model strings anywhere else — always import the constant. Free tier is 5 RPM / 20 RPD on this model.
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
* **Decay forecaster:** Phase 13a complete. Uses 3-signal weighted velocity scoring: slopeSignal (40%) + volumeSignal (30%) + recencySignal (30%). velocityScore added as first-class output field on SkillHealth. healthScore === velocityScore currently — kept separate for future divergence. Do NOT replace with ARIMA — insufficient data density. ARIMA is the documented long-term upgrade path after 6-12 months of snapshot accumulation.
* **Gemini key segregation (planned Phase 13c):** Split into GEMINI_API_KEY_BACKEND (cron/ingestion) and GEMINI_API_KEY_CHAT (chat route) to double effective daily quota from 20 to 40 RPD.
* **skill_health_cache Prisma fields:** The Prisma model for skill_health_cache uses `skill_name` as the primary key (not `id` or `keyword`). Select/where fields are: `skill_name`, `health_score`, `trend_label`, `trend_slope`, `job_count`, `avg_salary`, `top_locations`, `confidence`, `status`, `last_updated`. The DB has a `keyword` column (unique) but Prisma maps it as `skill_name` in the generated client — always use `skill_name` in Prisma queries.
* **F1 Evaluation:** Phase 13b complete. evaluate-extractor.ts + golden-dataset.json live in packages/ai-engine/src/scripts/. 20 cases across 4 credential types (academic degree, bootcamp cert, event badge, government cert including TESDA/DICT). Achieved F1: 0.61, Precision: 0.62, Recall: 0.60 with SOFT matching. Run with: npx ts-node packages/ai-engine/src/scripts/evaluate-extractor.ts --verbose. Use 13s delay (DELAY_MS=13_000) for gemini-2.5-flash-lite 5 RPM limit.
* **gemini-client.ts skill extraction:** Removed hardcoded 5-skill taxonomy (React, Python, Solidity, Node.js, AI/ML). Now uses open-domain zero-shot extraction across all credential types. This is the core zero-shot architectural decision — new credential types (TESDA, DICT, academic degrees) extract correctly on first mint with no retraining.
* **Notification system:** Insert lives in credentials/route.ts step 8b — NOT in log-mint/route.ts (legacy, no longer called by dashboard). Uses supabaseAdmin (service role) to bypass RLS so registrar can write to student's notifications row. user_id = validatedData.user_id (student UUID). link_url = /verify/${newCredential.id}. TopBar.tsx uses Supabase Realtime (postgres_changes INSERT filter by user_id) for instant delivery + 30s polling fallback. Bell open marks all unread read in one .in() call. Click marks individual read + router.push(link_url). Supabase Replication must be enabled on notifications table: Dashboard → Database → Replication → toggle notifications on.
* **Supabase Realtime requirement:** Any table used with supabase.channel postgres_changes must have Replication enabled in Supabase Dashboard → Database → Replication. Currently required for: notifications table.

# 6. Current State / Next Steps

* **Last Completed:**
  - Phase 11 — Dedicated CVR Verification (complete).
  - Phase 12 — AI CVR Analysis (complete, tested end-to-end).
  - Phase 13a — Weighted Velocity Scoring (complete).
  - Phase 13b — F1 Evaluation Script (complete). F1: 0.61, Precision: 0.62, Recall: 0.60, 20/20 cases, 0 errors.
  - Notification Fix (complete).
  - **Checkpoint #2 — Security Mitigations (complete):**
    - CSV Input Validation: `csv-validator.ts` + `/api/registrar/csv-upload` endpoint. Formula injection prevention, Zod row validation.
    - API Key Protection: `env-guard.ts` runtime guards, all 3 web portal routes refactored to centralized `@/lib/gemini`, ai-engine `gemini-client.ts` guarded.
    - IPFS Metadata Privacy: `ipfs.ts` built with `buildIpfsMetadata()`, `stripSensitiveFields()`, `validateIpfsPayload()`. 20+ sensitive fields blocklisted.
    - Verification Rate Limiting: `rate-limiter.ts` sliding window (10/min per IP), PII redacted from verify routes (studentId removed, email removed, walletAddress truncated).
    - 12 test cases (3 per mitigation), 68 assertions, 0 failures. See `docs/SECURITY_MITIGATIONS.md`.

* **Known Pending Issues:**
  - Generated course URLs are unverified Gemini slugs — future link-validation pass.
  - allowedDevOrigins warning for ngrok — add to next.config.ts.

* **Next Steps (in order):**
  1. Phase 13c — Dual Gemini key segregation:
       - Add GEMINI_API_KEY_BACKEND and GEMINI_API_KEY_CHAT to .env and GitHub Actions secrets.
       - Update chat/route.ts to use GEMINI_API_KEY_CHAT.
       - Update gemini-client.ts (ai-engine) and daily-update.ts to use GEMINI_API_KEY_BACKEND.
       - Doubles effective daily quota from 20 to 40 RPD.

  2. Phase 13d — Batching audit:
       - Verify daily-update.ts batches all skills into one Gemini call when --with-gemini is passed.
       - Ensure no per-skill individual Gemini calls remain outside the batch.

  3. Phase 13e — Cost-at-scale projection:
       - Defense slide: project API cost for 5,000 students.
       - Use current RPD/RPM usage as baseline.

  4. Passive — Trend confidence improves automatically with cron time accumulation. No code needed.

  5. Future — Production: Polygon Amoy → mainnet, NEXT_PUBLIC_APP_URL for prod deploy.

* **Key Defense Talking Points:**
  - Zero-shot extraction solves concept drift by design — new credential types work on first mint with no retraining.
  - TESDA NC II in Bread and Pastry correctly extracts ["Baking", "Food Safety", "Pastry Making"] with no retraining.
  - F1: 0.61 baseline on 20-case golden dataset spanning 4 credential types including government certs.
  - ARIMA evaluated but deferred — recency-weighted velocity scoring is statistically appropriate for current data density.
  - Instructor confirmed: "just experiment" — deliberate architectural experimentation with production LLM API is the approved approach.
  - Notification system uses Supabase Realtime (websocket) for sub-second delivery — demonstrates production-grade event-driven architecture.

* **Git:**
  - Completed branches: feature/phase10-cvr-qr, feature/phase11-cvr-dedicated-verify, feature/phase12-ai-cvr-analysis
  - Current branch: feature/phase13-defense-prep
  - Commits on this branch so far: Phase 13a (velocity scoring), Phase 13b (F1 eval + gemini-client fix), notification fix (credentials/route.ts + TopBar.tsx)
  - Merge phase12 to main before starting phase13 branch if not done yet.
---