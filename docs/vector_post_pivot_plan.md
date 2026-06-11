# VECTOR Post-Pivot Execution Plan

> **Context:** This plan supersedes all previous phase numbering. The old Phases 1–3 (blockchain removal) are complete and merged. This document is the new Phase 1–4 covering all panel feedback items and the system pivot to a credential-verified job platform.
>
> **Source documents:**
> - `docs/VECTOR_Team_Briefing.md` — Panel feedback and pivot direction
> - `docs/RnD of System Related to Vector.md` — Competitive analysis (LinkedIn, Indeed, JobStreet)
>
> **Time budget:** ~2 months (aggressive), 4 months (comfortable)

---

## What Already Exists (Don't Rebuild These)

| Capability | Where |
|---|---|
| Database-anchored credential verification | `verified_credentials` table, `api/registrar/credentials`, `api/verify/[id]` |
| Registrar credential issuance + dashboard | `registrar/dashboard`, `registrar/users`, CSV upload |
| AI provider abstraction (Gemini/Groq/Ollama) | `lib/ai-provider.ts` |
| Skill health + market data + decay detection | `skill_health_cache`, `market_snapshots`, `api/analyze` |
| Course recommendations | `courses` table, `api/search-courses`, `student/explore-courses` |
| Student CVR (resume export) | `cvr_exports`, `student/cvr`, `api/cvr/export` |
| RBAC (student/registrar/super_admin) | `users.role`, middleware enforcement |
| Auth (Supabase email + password) | `api/auth/*`, middleware |
| Rate limiting + CSRF | `lib/rate-limiter.ts`, `lib/csrf.ts` |
| Terms / Privacy / Security pages | `(legal)/terms`, `(legal)/privacy`, `(legal)/security` |
| Admin dashboard + audit logs | `admin/dashboard`, `audit_logs` table |
| Notification system | `notifications` table |
| Public verification pages | `verify/[id]`, `verify/cvr/[id]` |

---

## Panel Feedback → Phase Mapping

| # | Panel Feedback | Addressed In |
|---|---|---|
| 1 | Remove issuer partnership model → AI fraud detection | **Phase 1** |
| 2 | Remove digital wallet | ✅ Already done (old Phase 1–3) |
| 3 | Credential submission (manual + PDF upload) | **Phase 1** |
| 4 | User agreement for data access | ✅ Terms page exists, update in **Phase 2** |
| 5 | UI/UX fixes (OTP, bar graphs, duplicate detection, etc.) | **Phase 2** |
| 6 | Make system generic, not IT-specific | **Phase 2** |
| 7 | Pre-verification workflow | **Phase 1** |

---

## Phase 1: Credential Submission & AI Verification Pipeline

> **Branch:** `feat/credential-pipeline`
> **Why first:** This is the system's core differentiator. The panel will probe this hardest.
> **Panel items addressed:** #1, #3, #7

### The Flow Being Built

```
Student uploads PDF credential
        ↓
AI extracts structured data (institution, credential type, date, skills)
        ↓
AI runs fraud detection (flags suspicious patterns)
        ↓
Student reviews extracted data, confirms or edits
        ↓
Submission enters registrar review queue (with AI flags visible)
        ↓
Registrar approves or rejects → Verified badge
```

### Batch 1.1 — Database Schema for Credential Submissions

**Task 1:** Add `credential_submissions` model to `prisma/schema.prisma`

```prisma
model credential_submissions {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id           String    @db.Uuid
  file_url          String                          // Supabase Storage path
  file_name         String
  file_type         String                          // "application/pdf", etc.
  extracted_data    Json?                           // AI-extracted structured fields
  fraud_flags       Json?                           // AI fraud detection results
  fraud_score       Float?    @default(0)           // 0.0 (clean) to 1.0 (suspicious)
  status            String    @default("pending")   // "pending", "ai_reviewed", "approved", "rejected"
  reviewer_id       String?   @db.Uuid              // Registrar who reviewed
  reviewer_notes    String?
  reviewed_at       DateTime? @db.Timestamptz(6)
  created_at        DateTime? @default(now()) @db.Timestamptz(6)
  student           users     @relation("SubmittedCredentials", fields: [user_id], references: [id], onDelete: Cascade)
  reviewer          users?    @relation("ReviewedCredentials", fields: [reviewer_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([status])
}
```

- Add relations to `users` model: `submitted_credentials credential_submissions[] @relation("SubmittedCredentials")` and `reviewed_credentials credential_submissions[] @relation("ReviewedCredentials")`

**Task 2:** Add a Supabase Storage bucket for credential uploads
- Bucket name: `credential-uploads`
- Policy: authenticated users can upload to their own folder (`user_id/filename`)
- Max file size: 10MB
- Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`

**Task 3:** Run migration
```bash
npx prisma db push && npx prisma generate
```

**BUILD CHECK.** Commit: `"feat: add credential_submissions schema and storage bucket"`

---

### Batch 1.2 — PDF Upload & AI Extraction API

**Task 1:** Create `api/credentials/upload/route.ts`
- `POST` — Student uploads a file
- Accept multipart form data (PDF or image)
- Upload to Supabase Storage bucket `credential-uploads/{user_id}/{uuid}.pdf`
- Create a `credential_submissions` row with status `"pending"`
- Return the submission ID
- **Auth:** Student role only
- **Validation:** File type (PDF/PNG/JPG), file size (max 10MB)

**Task 2:** Create `api/credentials/extract/route.ts`
- `POST` — Triggers AI extraction on a submission
- Payload: `{ submission_id: string }`
- **Logic:**
  1. Fetch the PDF from Supabase Storage
  2. Extract text from PDF (use `pdf-parse` npm package)
  3. Send extracted text to `generateText()` from `lib/ai-provider.ts` with a structured prompt:
     ```
     Extract the following fields from this credential document:
     - Institution name
     - Credential type (diploma, certificate, license, transcript)
     - Field of study / subject
     - Date issued
     - Student name on document
     - Any credential/certificate number
     - Skills or competencies mentioned
     
     Also flag any inconsistencies or suspicious patterns:
     - Formatting irregularities
     - Mismatched dates
     - Suspicious institution names
     - Signs of digital manipulation
     
     Return as JSON with "extracted" and "flags" objects.
     ```
  4. Update `credential_submissions` with `extracted_data`, `fraud_flags`, `fraud_score`, set status to `"ai_reviewed"`
- **Auth:** Student role only (must own the submission)

**Task 3:** Create `api/credentials/submit/route.ts`
- `POST` — Student confirms the extracted data (after reviewing/editing)
- Payload: `{ submission_id: string, confirmed_data: { ... } }`
- Updates `extracted_data` with student's edits
- Checks for duplicates (same `skill_name` + `user_id` in `verified_credentials`)
- If duplicate found, return 409 with warning
- Sets status to `"pending"` (awaiting registrar review)
- Creates a notification for all registrars: "New credential submission from {name} requires review"

**Task 4:** Install `pdf-parse`
```bash
npm install pdf-parse && npm install -D @types/pdf-parse
```

**BUILD CHECK.** Commit: `"feat: add PDF upload, AI extraction, and credential submission API"`

---

### Batch 1.3 — Student Credential Upload UI

**Task 1:** Create `student/credentials/upload/page.tsx`
- **Step 1:** File upload area (drag-and-drop + click to browse)
  - Show file preview (PDF thumbnail or image)
  - File size/type validation with error messages
  - Upload progress indicator
- **Step 2:** AI extraction results review
  - Show extracted fields in editable form inputs
  - Show AI fraud flags as warnings/info badges (not blocking — just informational)
  - "Confirm & Submit for Review" button
- **Step 3:** Submission confirmation
  - Success message: "Your credential has been submitted for institutional review"
  - Link to track status

**Task 2:** Create `student/credentials/page.tsx` — My Credentials
- List all student's credential submissions with statuses:
  - 🟡 Pending AI Review
  - 🔵 AI Reviewed (awaiting registrar)
  - 🟢 Approved (verified)
  - 🔴 Rejected (with reviewer notes visible)
- Show verified credentials (from `verified_credentials` table) separately with ✓ badges
- "Upload New Credential" CTA button

**Task 3:** Add "My Credentials" nav item to student sidebar
- **File:** `src/components/dashboard/DashboardLayout.tsx`
- Add: 📄 **Credentials** → `/student/credentials`
- Place after "Skills" in sidebar order

**BUILD CHECK.** Commit: `"feat: add student credential upload and tracking UI"`

---

### Batch 1.4 — Registrar Review Queue

**Task 1:** Create `api/credentials/review/route.ts`
- `GET` — Fetch all submissions with status `"ai_reviewed"` or `"pending"` (registrar view)
  - Include student info, extracted data, fraud flags, fraud score
  - Sort by fraud score descending (most suspicious first)
- `PATCH` — Registrar approves or rejects
  - Payload: `{ submission_id, action: "approve" | "reject", notes?: string }`
  - On **approve:**
    1. Create a `verified_credentials` row from `extracted_data`
    2. Set submission status to `"approved"`
    3. Notify student: "Your {credential_type} has been verified!"
  - On **reject:**
    1. Set submission status to `"rejected"` with `reviewer_notes`
    2. Notify student: "Your submission requires attention" with notes
  - **Auth:** Registrar or super_admin role only

**Task 2:** Add review queue to registrar dashboard
- **File:** `src/app/registrar/dashboard/page.tsx`
- Add a new tab/section: "Pending Reviews"
- Each card shows:
  - Student name, submission date
  - Credential type + institution (from extracted data)
  - **Fraud score badge:** 🟢 Low (< 0.3) / 🟡 Medium (0.3–0.6) / 🔴 High (> 0.6)
  - AI flags as expandable details
  - Approve / Reject buttons with optional notes field
- Sort by fraud score (highest first — surface the suspicious ones)

**BUILD CHECK + FULL PHASE 1 VALIDATION.** Commit: `"feat: add registrar review queue for AI-flagged credential submissions"`

---

## Phase 2: Profile Generalization & UX Hardening

> **Branch:** `feat/profile-generalization`
> **Panel items addressed:** #4, #5, #6

### Batch 2.1 — Generic CV Fields

**Task 1:** Update `profiles` model in `prisma/schema.prisma`
- Add generic fields:
  ```prisma
  specialization    String?           // Dropdown: "Information Technology", "Engineering", "Business", "Education", "Healthcare", "Others"
  industry_sector   String?           // Dropdown: "Technology", "Finance", "Manufacturing", etc.
  work_experience   Json?   @default("[]")  // Array of { title, company, start_date, end_date, description }
  education         Json?   @default("[]")  // Array of { school, degree, field, start_year, end_year }
  ```

**Task 2:** Update `student/profile/page.tsx`
- Add work experience section (add/edit/remove entries)
- Add education section (add/edit/remove entries)
- Replace any hardcoded "IT" references with dropdown selectors
- Add specialization dropdown with "Others" + freetext input
- Add industry sector dropdown

**Task 3:** Update CVR export to include generic fields
- **Files:** `student/cvr/page.tsx`, `api/cvr/export/route.ts`
- Pull `work_experience` and `education` from profiles into the CVR snapshot
- Render them in the CVR template

**BUILD CHECK.** Commit: `"feat: add generic CV fields with work experience and education sections"`

---

### Batch 2.2 — OTP & Auth Hardening

**Task 1:** Add OTP with expiration timer
- Update `api/auth/send-verification/route.ts` — include expiry timestamp in response
- Update `verify-email/page.tsx` — show countdown timer (e.g., "Code expires in 4:32")
- Auto-invalidate codes after 5 minutes (already partially exists via `verification_codes.expires_at`)

**Task 2:** Disable paste on confirm password field
- **Files:** `register/page.tsx`, `student-register/page.tsx`, `registrar-register/page.tsx`
- Add `onPaste={(e) => e.preventDefault()}` to confirm password inputs

**Task 3:** Bar graph for top in-demand skills
- **File:** `student/dashboard/page.tsx` or `student/skills/page.tsx`
- Replace or supplement current skill visualization with a horizontal bar chart
- Use CSS-only bars (no charting library needed) or lightweight lib like `recharts` if already available

**Task 4:** Update Terms page for data access disclosure
- **File:** `(legal)/terms/page.tsx`
- Add section on what data is accessed (credential documents, profile info) and how it's used (AI extraction, fraud detection, job matching)

**BUILD CHECK.** Commit: `"feat: add OTP timer, auth hardening, bar graphs, terms update"`

---

## Phase 3: Employer Job Platform

> **Branch:** `feat/job-platform`
> **Panel item addressed:** Team briefing Section 5 — "target employers, build a job platform"

### Batch 3.1 — Database Schema

**Task 1:** Add `employer` to `user_role` enum
**Task 2:** Add `employer_profiles` model (linked to `users` via `user_id`)
**Task 3:** Add `job_postings` model
**Task 4:** Add `job_applications` model
**Task 5:** Update `users` model with new relations
**Task 6:** Run migration

*(Schema definitions are in the existing `phase4_job_platform_mvp.md` — reuse those exactly)*

**BUILD CHECK.** Commit: `"feat: add employer job platform database schema"`

---

### Batch 3.2 — Employer API Routes

**Task 1:** `api/employer/profile/route.ts` — CRUD for employer profile
**Task 2:** `api/jobs/route.ts` — List/create job postings
**Task 3:** `api/jobs/[id]/route.ts` — Single job detail, update, delete
**Task 4:** `api/jobs/[id]/apply/route.ts` — Student application submission
**Task 5:** Employer registration page + auth middleware updates

*(Detailed specs in `phase4_job_platform_mvp.md` Batch 2 and 5)*

**BUILD CHECK.** Commit: `"feat: add employer and job posting API routes"`

---

### Batch 3.3 — Student Job Discovery UI

**Task 1:** `student/jobs/page.tsx` — Job board with filters
**Task 2:** `student/jobs/[id]/page.tsx` — Job detail with skill matching indicators
**Task 3:** `student/applications/page.tsx` — Application tracker (viewed/shortlisted/rejected — per JobStreet R&D)
**Task 4:** Add "Jobs" + "Applications" to student sidebar nav

**BUILD CHECK.** Commit: `"feat: add student job discovery and application tracking UI"`

---

### Batch 3.4 — Employer Dashboard UI

**Task 1:** `EmployerLayout.tsx` — Sidebar layout following registrar pattern
**Task 2:** `employer/dashboard/page.tsx` — Summary stats + recent applications
**Task 3:** `employer/postings/page.tsx` — Manage postings (create/edit/close)
**Task 4:** `employer/postings/[id]/applications/page.tsx` — Review applicants with verified credential badges

**BUILD CHECK.** Commit: `"feat: add employer dashboard and posting management UI"`

---

## Phase 4: AI Job Matching & Final Polish

> **Branch:** `feat/ai-matching-polish`
> **Goal:** Make the system demo-ready and impressive

### Batch 4.1 — AI Job Matching

**Task 1:** `api/jobs/match/route.ts`
- Simple mode (default): Skill-tag overlap scoring
- AI mode (`?ai=true`): LLM-ranked matches with explanations
- Uses verified credentials as the signal (not self-reported skills) — **this is the differentiator**

**Task 2:** Match score badges on student job board
- Show % match on each job card
- "Why you're a good fit" expandable AI explanation

**Task 3:** Skills gap analysis on job detail page
- "You're missing: Docker, AWS" with links to course recommendations (existing `search-courses` API)

**BUILD CHECK.** Commit: `"feat: add AI-powered job matching with skill gap analysis"`

---

### Batch 4.2 — Integration & Demo Polish

**Task 1:** Notification integration
- Student applies → employer notified
- Application status changes → student notified
- Credential approved/rejected → student notified

**Task 2:** Admin dashboard stats
- Total employers, active postings, total applications, credentials reviewed

**Task 3:** Landing page update
- "For Employers" section/CTA
- Update hero copy to reflect the job platform pivot

**Task 4:** AI coach name
- Give the AI assistant (student/coach) a proper name per panel feedback #5
- Update any generic "AI" references in the coach UI

**FINAL BUILD CHECK + FULL SYSTEM VALIDATION.** Commit: `"feat: system integration, notifications, admin stats, landing page update"`

---

## Summary

| Phase | Batches | Core Deliverable | Panel Items |
|-------|---------|-----------------|-------------|
| **1. Credential Pipeline** | 4 | PDF upload → AI extraction → fraud detection → registrar review | #1, #3, #7 |
| **2. Profile & UX** | 2 | Generic CV fields, OTP timer, bar graphs, terms update | #4, #5, #6 |
| **3. Job Platform** | 4 | Employer registration, job posting, student discovery, application tracking | Section 5 |
| **4. AI Matching & Polish** | 2 | AI job matching, notifications, admin stats, landing page | Demo-ready |

## Rules for Execution

1. **One branch per phase.** Merge to `main` only after full phase validation.
2. **Build check after every batch.** `npm run build` must exit 0.
3. **Follow existing patterns.** Use registrar API routes and dashboard as the template for employer code.
4. **Dark theme, same palette.** `#06B4C9` primary, `#0B0F19` background, `#131825` cards.
5. **Commit after each green build** with the specified message.
6. **Do NOT skip fraud detection.** It's the differentiator. Even if basic, it must exist for the demo.
