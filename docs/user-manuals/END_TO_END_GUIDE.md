# VECTOR — End-to-End Feature Guide

> **What this is:** a complete, journey-oriented guide to the VECTOR micro-credentialing
> platform, covering every persona — **Students (applicants)**, **Registrars (issuers)**,
> **Employers (recruiters/verifiers)**, and the **Super Admin** — plus the **public
> verification portal** that ties them all together.
>
> **Where it comes from:** this guide is written from the actual implemented system in
> `packages/web-portal/vector-web`. Screen names, buttons, and page paths match what is
> built (branch `fix/upload-pdf`). URLs below assume you run the app locally at
> `http://localhost:3000` (see `SETUP_GUIDE.md`).

---

## Table of Contents

1. [About VECTOR](#1-about-vector)
2. [The Big Picture — the full lifecycle](#2-the-big-picture)
3. [Accounts, Roles & Sign-In](#3-accounts-roles-sign-in)
4. [Part 1 — Registrar / Issuer](#part-1-registrar)
5. [Part 2 — Student / Applicant](#part-2-student)
6. [Part 3 — Employer / Verifier](#part-3-employer)
7. [Part 4 — Super Admin](#part-4-super-admin)
8. [The Public Verification Portal](#8-public-verification-portal)
9. [Status Lifecycles (quick reference)](#9-status-lifecycles)
10. [Troubleshooting & FAQ](#10-troubleshooting-faq)
11. [Appendix — page map & glossary](#11-appendix)

---

<a id="1-about-vector"></a>
## 1. About VECTOR

VECTOR turns static academic records into **verified, portable career assets**:

- **Database-anchored verification.** A credential is "verified" when it exists in the
  institutional database and has not been revoked. No blockchain or third-party
  middleman is needed to check it.
- **Institutional issuance.** Only registrar accounts can issue or revoke skill
  credentials on behalf of the institution.
- **AI career intelligence.** The platform extracts skills from documents, tracks how
  skills trend in the live job market (Rising / Stable / Decaying), recommends courses
  and roles, and powers an AI career coach.
- **Verified resumes (CVR).** Students assemble a resume whose skill and certification
  blocks are linked to their verified credentials, export it as a PDF, and can share a
  public verification link.
- **A hiring loop.** Employers post jobs; students apply with their CVR; employers get
  skill-match scores against *verified* credentials.

### Who is who

| Persona | Role in the platform | Portal home |
| --- | --- | --- |
| **Student** | The applicant / credential holder | `/student/dashboard` |
| **Registrar** | The issuer (university office) | `/registrar/dashboard` |
| **Employer** | The verifier / recruiter | `/employer/dashboard` |
| **Super Admin** | The platform operator | `/admin/dashboard` |
| **Anyone (public)** | Verifies a credential link or CVR | `/verify/[id]`, `/verify/cvr/[id]` |

Every user belongs to exactly one role (`student`, `registrar`, `employer`,
`super_admin`) enforced by middleware and by every API route.

---

<a id="2-the-big-picture"></a>
## 2. The Big Picture — the full lifecycle

```
 ┌──────────────────────────┐     ┌───────────────────────────┐
 │  REGISTRAR (Issuer)      │     │  STUDENT (Applicant)      │
 │                          │     │                           │
 │ Issue certificate        │     │ See verified skills       │
 │  • one-by-one            │────▶│ Build CVR (verified       │
 │  • CSV batch import      │     │  resume)                  │
 │ Review student-uploaded  │     │ Browse jobs & apply       │
 │  credentials (AI risk)   │     │ Track application status  │
 │ Revoke when needed       │     │                           │
 └──────────┬───────────────┘     └────────────┬──────────────┘
            │                                  │
            ▼                                  ▼
  ┌───────────────────┐   share link / CVR   ┌───────────────────┐
  │ PUBLIC VERIFY     │◀─────────────────────│  EMPLOYER         │
  │ portal (no login) │                      │  • posts jobs     │
  │ QR + copy link    │                      │  • sees match %   │
  └───────────────────┘                      │  • reviews CVR    │
                                             │  • pipeline stages│
                                             └───────────────────┘
        Super Admin (top): verifies accounts, assigns roles,
        monitors audit logs / analytics / system metrics.
```

**The trust loop in one sentence:** a Registrar issues a credential → the Student sees
it as a verified skill and attaches it to a CVR → the Student applies for an Employer's
job → the Employer sees a match score built on *verified* data and can open the public
verification link to confirm the credential is genuine and not revoked.

Students can also **bring their own credentials** (e.g., a third-party certificate or an
older document): they upload the PDF, the AI reads it and assigns a fraud risk score, and
a Registrar must approve it before it becomes a verified credential.

---

<a id="3-accounts-roles-sign-in"></a>
## 3. Accounts, Roles & Sign-In

### 3.1 Where each role registers

| Who | Register page | What they provide | Notes |
| --- | --- | --- | --- |
| Student | `/register` (or `/student-register`) | Email, password (name/profile completed later) | Account starts `pending_verification` until email is confirmed |
| Registrar | `/registrar-register` | **Institution email**, password, **registrar secret key** (server-side check) | Only someone with the institution's registrar code can self-register |
| Employer | `/employer-register` | **Work email**, **company name**, password | Completes a company profile before posting jobs |
| Super Admin | Seeded/assigned by the platform operator | — | Not a public sign-up path |

All registrations trigger an email verification code.

### 3.2 Email verification & account lockout

1. After registering, the user is redirected to `/verify-email` and asked to enter the
   6-digit code e-mailed to them.
2. While the account is `pending_verification`, the middleware redirects every page to
   `/verify-email` — nothing else is accessible until the code is confirmed.
3. Once verified, the account becomes `active` and the user is routed to their role
   dashboard:
   - `super_admin` → `/admin/dashboard`
   - `registrar` → `/registrar/dashboard`
   - `employer` → `/employer/dashboard`
   - otherwise → `/student/dashboard`

### 3.3 Sign-in

- **Page:** `/login` (role-neutral).
- **Methods:** email + password with a **Cloudflare Turnstile** captcha, or **Google
  OAuth**.
- **Two-factor (TOTP):** if the user enabled an authenticator app (Students enable it
  under *Profile → Security Settings*), a `ChallengeMFA` step asks for the one-time code
  after the password.
- **Password reset:** `Forgot password?` on the login page → `/forgot-password` sends a
  reset code by email; the code + new password completes the reset.
- If you are already signed in as one role and visit another role's area, the middleware
  bounces you to your own dashboard (or `/login`).

### 3.4 Session & sign-out

Each dashboard shell includes a session-timeout guard and a logout action. Sensitive
state-changing operations also require a CSRF token (handled automatically by the UI).

---

<a id="part-1-registrar"></a>
## Part 1 — Registrar / Issuer

**Home:** `/registrar/dashboard` — **"Certificate Workspace"**
**Sidebar:** Issue Certificate · Issued Records · All Users · Help & Support

A Registrar is the only actor who can turn a claim into a **verified credential**. The
workspace is organized into four tabs.

### 4.1 Issue a single certificate

1. Open the **Issue Certificate** tab.
2. **Find Student** — start typing a name or student ID; pick the student from the
   dropdown (records show a *Verified User ✓* badge).
3. **Certificate Template** — choose a credential schema (e.g., Academic Degree,
   Bootcamp Certificate). Templates are created in the **Template Builder** tab.
4. **Fields in this template** — the form adapts to the schema: text, number, date, and
   boolean fields, plus the special **skill tags** input. Suggested skill pills
   (`React`, `Node.js`, `PostgreSQL`, …) can be clicked to add them.
   > Skill tags are what the student later sees as *verified skills* on their profile.
5. **Certificate / Serial Number** — e.g., `CERT-2027-001`.
6. **Internal Notes** — optional; **visible only to registrars** (encrypted), never to
   the student.
7. Click **Issue Verified Certificate**. A progress modal confirms the database record.
8. The student can now see the credential under *Verified Credentials*, and it appears
   in **Issued Records**.

### 4.2 Batch import (CSV)

Use this for graduations or group certifications.

1. Open the **Batch Import** tab.
2. **1. Choose Template** — the template defines which columns your CSV needs.
3. Prepare/upload a CSV:
   - must include a `student_id` column plus the template's field columns;
   - limits enforced: **1 MB max, up to 500 rows**;
   - special characters are cleaned automatically; rows are validated and flagged.
4. Review the validated rows (invalid rows are reported so you can fix them).
5. Click **Issue N Certificates** to process the whole batch with a progress modal.

### 4.3 Template Builder

Available via the **Template Builder** tab (`SchemaBuilder` component). Create reusable
credential schemas:

- template name + description;
- add fields with a type — text, number, date, boolean (and special `skill_tags`);
- mark fields required;
- save — the schema then appears in both *Issue Certificate* and *Batch Import*.

### 4.4 Credential Reviews — approving student-uploaded credentials

Students can upload external certificates ("bring your own credential"). Those land in
the **Credential Reviews** tab (the tab shows a badge with the queue count). For each
submission you see:

- student name, ID, email and the **View Document** link (opens their uploaded file);
- an **AI risk badge** computed from the document scan:
  - 🔴 High Risk (> 60% fraud score), 🟡 Medium (30–60%), 🟢 Low (< 30%);
- an **email-domain check** badge: 🟢 Email Verified / 🔵 Institutional Email /
  ⚪ Personal Email — cross-references the student's e-mail domain with the issuing
  institution on the document;
- an expandable **AI Analysis** panel listing each fraud flag with type, description,
  and severity (formatting / date / institution / content).

Decide:

- **✓ Approve** — each extracted skill becomes a verified credential for the student;
  the student is notified ("Credential Verified! ✓").
- **✗ Reject** — add notes (required for rejection); the student is notified with your
  reason.

The review queue is shared between Registrars and the Super Admin.

### 4.5 Issued Records (audit ledger)

**Page:** `/registrar/students` — titled **Issued Records**.

A complete, searchable audit log of every certificate this institution has issued:

- summary stats (total records, distinct skills);
- search by student name, skill, or certificate number;
- filter chips by skill;
- open a record to view details and **private notes** (registrar-only).

> ⚠️ Issued certificates are **permanently recorded** — they can be *revoked* but never
> deleted from the ledger.

### 4.6 Revoking a credential

Registrars can mark a credential as revoked:

- open a student from **Users**, select a credential, and choose **Revoke**
  (a confirmation dialog explains the action);
- revocation is recorded in the database; the student keeps the record but any public
  verification of that credential now reports **revoked**;
- if you made an error on a certificate, the supported workflow is: revoke it, then
  issue a corrected certificate with a private note referencing the original.

### 4.7 Registrar help

`/registrar/help` bundles FAQs, **Step-by-Step Guides** (Issue Your First Certificate,
Create a Certificate Template, Bulk Upload Certificates), and contact/support
information.

---

<a id="part-2-student"></a>
## Part 2 — Student / Applicant

**Home:** `/student/dashboard`
**Sidebar:** Dashboard · Verified Skills · Career Intelligence · Credentials · Job Board
· Applications · Resume (CVR) · Explore Courses · Help & Support

### 5.1 Student dashboard

The dashboard is a launchpad plus an AI health check:

- **Welcome banner** with a **Trust Score** ring (share of credentials verified) and
  quick counts: *Verified*, *Pending*, *Best job match %*. Buttons: **Upload Credential
  (AI Extract)**.
- **Credential verification** — your credentials with status labels (Verified / In
  review / Needs attention) linking to the skill detail page.
- **Top Skills Performance** — top 3 skills with trend tag, health score, live demand
  (# of jobs), and decay rate.
- **Matched to your verified skills** — job-style cards with match % and an Apply action.
- **Recommended Courses** — personalized course suggestions with provider and match %.
- Right column: **Activity**, **Boost your trust score** (Upload & AI Analyze
  Credential, Verify LinkedIn, Add Git portfolio, Verify internship record), and
  **Job alerts**.

If a student record has no `student_id` yet, one is generated automatically on first
dashboard load.

### 5.2 Getting verified skills — two paths

#### Path A — Issued by your registrar (institution path)

A Registrar issues credentials against your account (see Part 1). Nothing to do on your
side — the credentials appear under **My Credentials → Verified Credentials** and each
skill tag shows up in **Verified Skills**.

#### Path B — Upload an external credential (bring-your-own path)

If you hold a certificate issued *outside* VECTOR (third-party course, older document,
license):

1. Open **Credentials** → **Upload New Credential** (`/student/credentials/upload`).
2. Drag & drop (or choose) the **PDF**.
3. VECTOR runs **AI extraction**: it parses the document text and pulls out the
   institution name, credential type, field of study, issue date, credential number, and
   skill list — and scores it for **fraud risk**.
4. Review the extracted data on screen; fix anything the AI got wrong.
5. Submit for institutional review.

What happens next (the lifecycle you can follow on the Credentials page):

| Status badge | Stage | Who acts |
| --- | --- | --- |
| `Pending AI Review` | Uploaded; the AI is reading the document | System (AI) |
| `Under Review` | AI finished — *you* review and confirm the extracted data, then submit | Student |
| `Pending AI Review` (again) | Submitted; waiting in the registrar's **Credential Reviews** queue | Registrar |
| `Approved` | Registrar verified it — it now appears under *Verified Credentials* | Registrar |
| `Rejected` | Registrar declined it — the rejection reason is shown on the card | Registrar |

> Note on labels: after you submit, the app re-uses the `Pending AI Review` badge even
> though the document is now in the registrar's queue. If it stays there for a while,
> that is normal — it means a registrar hasn't approved it yet.

> If you re-upload a credential whose skills already exist, VECTOR warns you about the
> **duplicate** and lets you decide whether to proceed anyway.

**Known current limitation:** PDFs are fully parsed. Image-only uploads are accepted but
vision extraction is not fully implemented in this build, so the AI may return a
low-confidence result for them — prefer PDF documents.

### 5.3 My Credentials

`/student/credentials` shows two sections:

- **Verified Credentials** — cards with skill name, issuing institution, issue date, and
  certificate/serial number.
- **Pending Submissions** — your uploads in the review lifecycle with status badges and,
  for rejected ones, the registrar's rejection reason.

### 5.4 Verified Skills & market health

`/student/skills` renders **one card per skill tag** across all your credentials, each
with:

- source badge (**University**);
- a trend badge: **Strong Growth / Growing / Stable / Cooling / Declining**, or
  *Pending* when market data is not ready yet;
- the trend slope value and an "Analyzed <date>" stamp;
- a trend bar.

Clicking a card opens `/student/skills/[credentialId]` — the skill detail page. The
legend at the bottom of the page ("Market Trend Guide") explains the badges.

### 5.5 Career Intelligence (the "Career Coach")

`/student/coach` — an AI assistant grounded in your skills and live market data. Use it
to ask career questions, understand why a skill is cooling, and get personalized course /
growth recommendations. The right-hand panels surface market insights and suggestions
(`MarketInsightsPanel`, `RecommendationsPanel`).

### 5.6 Build your Resume (CVR — Credentialed Verification Record)

`/student/cvr` is a full resume builder. You manage drafts and see which resumes are
strong enough to send.

1. Start with **Personal details** (name, contact, links), then add sections:
   **Education**, **Experience**, **Projects**, **Skills**, and
   **Certifications & Awards**.
2. When adding skills/certifications, pick from your **verified credentials** — they are
   tagged as verified and will render with the verified block in the resume.
3. Use the **Live Preview** and choose a **template** and accent color.
4. Optional: run **AI CVR Analysis** (powered by Gemini + live market data) to check
   skill strength and gaps.
5. **Confirm & Generate** — VECTOR saves the CVR snapshot (via `/api/cvr/export`) and
   creates an export record.
6. **Export** the PDF (client-side render + download), and share the **verify link**
   (`/verify/cvr/<id>`) or copy it straight from your CVR list.

Employers opening that link see the same rendered CVR with verification states — no
login required.

### 5.7 Job Board & applying

**Browse:** `/student/jobs`

- All active listings with a search-by-location box;
- a **Best Matches** toggle that switches to jobs matched against your *verified*
  skills (each card shows e.g. **87% Match**).

**Job detail:** `/student/jobs/[id]`

- full description, Required Skills / Preferred Skills chips, and an *About the
  Employer* panel (company name, industry, size, website, description);
- an AI **match insight** panel: overall match %, "Missing Required Skills" list or
  "You have all the required skills for this role!", and an optional AI insight;
- **Apply Now** opens the application modal:
  1. **Attach Vector Resume (CVR)** — choose one of your generated CVR exports
     (optional);
  2. **Cover Note** — optional message to the employer;
  3. **Submit Application**.

Rules enforced server-side: only students can apply, a job can only be applied to once
per student, and expired postings reject applications.

### 5.8 My Applications

`/student/applications` — table of every application with the job title, company,
**date applied**, and a status pill. Click **View Job** to return to the posting.

### 5.9 Explore Courses

`/student/explore-courses` — browse courses by category (with match % and provider, e.g.
Coursera, Google), driven by skill recommendations.

### 5.10 Profile, settings & security

- **Profile** (`/student/profile`) and **Edit Profile** (`/student/profile/edit`) —
  university, major, graduation year, bio, location, LinkedIn/GitHub/portfolio links,
  work experience and education history.
- **Security Settings** (`/student/profile/security`) — enable **two-factor
  authentication (TOTP)** with an authenticator app.
- **Settings** (`/student/settings`) — account preferences and notifications.

---

<a id="part-3-employer"></a>
## Part 3 — Employer / Verifier

**Home:** `/employer/dashboard` — **Dashboard Overview**
**Sidebar:** Dashboard Overview · Manage Postings · Candidates · Company Profile · Settings & Support

An employer recruits against **verified** student data: every match score and badge you
see is computed from credentials confirmed by a registrar — not from a self-reported CV.

### 6.1 Company profile

Registering as an employer creates the account; before posting your first job, complete
the **Company Profile** (`/employer/profile`):

- company name, logo, industry, company size, website, and description;
- additional branding/recruiting content (perks, reviews section etc. as rendered on the
  profile page).

The job-posting form refuses to publish until an employer profile exists (and links you
to complete it).

### 6.2 Dashboard

`/employer/dashboard` summarizes the recruiting funnel:

- stat cards: **Active jobs**, **Total applicants**, **Shortlisted candidates**;
- a **pipeline stage chart** (Under Review → Shortlisted → Interview);
- **Applicants by posting**;
- **Applicants by match range**;
- recent applicants table with match %, status, and applied date.

### 6.3 Manage Postings

`/employer/postings`

- tabs **Active / Draft / Closed**, keyword search, status filter, and sorting (newest,
  oldest, most applicants);
- each card shows applicant count; actions include **View Applicants** and a "More
  options" menu (edit, close/reopen, etc.).
- **Post New Job** opens a form with: Job Title, Job Overview (description), Location
  (typed or chosen from Philippines location presets), **Job Type** (Full-time /
  Part-time / Contract / Internship / Freelance), **Experience Level** (Entry–Lead),
  Duration (shown for Part-time/Contract), **Pay Type** (Monthly / Hourly / Annual /
  Project-based) and a **Salary Range** picker with presets or a custom amount
  (e.g., `₱45,000 – ₱65,000 / month`), plus **Required** and **Preferred** skill tags.
- Postings default to **15 days active** (the server stamps `expires_at`); expired jobs
  disappear from the student board automatically. You can extend/renew a listing from
  the postings page.

### 6.4 Reviewing applicants

Two views:

**Per posting — Applicant Tracking** (`/employer/postings/[id]/applicants`)
lists applicants with cover note, **Skill Match**, and a status dropdown.

**Aggregate — Candidates** (`/employer/candidates`) gives a pipeline across all jobs:
search, filter by status or job, and sort by applied date or **Highest Match Score**.
Each row shows the candidate, their position, the match score, a **✓ Verified** badge
(when their application carries verified credentials), status, and applied date. Change
the candidate's status inline with the dropdown (Pending → Reviewing → Interview →
Offered → Rejected).

**Full review — Applicant detail** (`/employer/postings/[id]/applicants/[appId]`):

- the applicant's **CVR rendered as a paper resume** (`ResumeDocumentRenderer`) directly
  from their verified CVR export;
- badges for **Verified Credentials** and the CVR template used;
- the **match score** and matched/missing skills;
- the candidate's status dropdown;
- a link to the **public verification page** for the CVR (`/verify/cvr/<id>`, opens in a
  new tab).

You can also open the standalone resume route (`.…/resume`) for a print-friendly view.

> Candidate matching: VECTOR cross-references the student's verified credentials (skill
> tags on issued/approved credentials) against your posting's required skills to produce
> the percentage match score. This is why "verify more skills" is such a strong student
> incentive.

### 6.5 Employer help

`/employer/help` includes a searchable FAQ (posting a job, the 15-day active window,
candidate skill matching, exporting/verifying CVRs, updating company profile) and
support contacts.

---

<a id="part-4-super-admin"></a>
## Part 4 — Super Admin

**Home:** `/admin/dashboard` — **Verify Users**
**Sidebar:** Verify Users · Analytics · Audit Logs · System Metrics

The Super Admin runs the platform and can step into the Registrar workspace too
(middleware grants `super_admin` access to `/registrar`).

### 7.1 Verify Users (role & account administration)

`/admin/dashboard`

- summary stats (total / active / inactive users, registrar count, active %);
- searchable, role-filterable user directory;
- **role changes** — promote/demote a user (e.g., approve a pending registrar or grant
  employer/student status) through `/api/admin`; every change is recorded in the
  activity/audit log and takes effect immediately;
- **Suspend / Restore** — temporarily revoke access without deleting data;
- **Delete user** — permanent deletion of the account, credentials, skills, and
  notifications (destructive — double-check first).

### 7.2 Analytics

`/admin/analytics` — aggregate platform statistics (user counts, active vs. inactive,
and related metrics).

### 7.3 Audit Logs

`/admin/audit-logs` — the immutable trail of administrative actions and verification
events (who did what, to whom, when), consumed from the audit-log API.

### 7.4 System Metrics

`/admin/system-metrics` — operational health: total requests, error rate, and average
response duration from the request-logging pipeline.

> Registrars additionally see the shared **Credential Reviews** queue (Section 4.4) and
> can approve/reject submissions, since they own credential issuance.

---

<a id="8-public-verification-portal"></a>
## 8. The Public Verification Portal

No account is required. Two kinds of pages exist, both read from the database only and
both rate-limited.

### 8.1 Verify a credential

**Page:** `/verify/[id]` (the `[id]` is the credential's UUID — effectively a
private share link the student controls).

- shows a status pill: **"Verified by Institution"** (green) or **"Verification
  Unavailable"** with the reason (e.g., *This credential has been revoked.*);
- the credential card: verified skill, holder's name, certificate number, issue date,
  issuing registrar and cohort/batch;
- **Share This Credential**: a **QR code** (scan-to-verify) plus a **copy link** box;
- a light/dark theme toggle for the visitor.

**Semantics:** *verified* = the credential exists in the database and is **not revoked**.
The endpoint redacts PII (the student ID is never exposed) and limits requests per IP.

### 8.2 Verify a CVR (resume snapshot)

**Page:** `/verify/cvr/[id]` — the full rendered resume with verification states for its
credential blocks (all-verified / partially-verified / unverified styling), the
student's name, and the sharing affordances. Employers reach this from an applicant's
review screen; students copy it from their CVR list.

### 8.3 How links are shared in practice

- Registrar issues credential → student sees it → shares the credential verify link
  anywhere (email, LinkedIn, application forms).
- Student generates a CVR → attaches it to a job application → employer clicks through
  to the public CVR verification page.
- Anyone with the link can confirm authenticity instantly — no middleman, no support
  ticket to the registrar.

---

<a id="9-status-lifecycles"></a>
## 9. Status Lifecycles (quick reference)

### Account status

| Value | Meaning |
| --- | --- |
| `pending_verification` | Registered, e-mail not yet confirmed — locked to `/verify-email` |
| `active` | Verified, full access to role portal |
| `suspended` | Access revoked by Super Admin until restored |

### Credential submission (bring-your-own credential)

| Status | Stage | Who acts |
| --- | --- | --- |
| `pending` | Uploaded; awaiting AI read | System (AI) |
| `ai_reviewed` | AI finished; student confirms data | Student |
| `pending` (submitted) | In the registrar review queue | Registrar |
| `approved` | Skills converted to verified credentials | Registrar |
| `rejected` | Declined with a reason sent to the student | Registrar |

### Job application

| Status | Meaning |
| --- | --- |
| `pending` | Received, not yet reviewed |
| `reviewing` / `under_review` | Employer is reviewing |
| `shortlisted` | Moved forward |
| `interview` / `interviewing` | Interview stage |
| `offered` | Offer extended |
| `rejected` | Not moving forward |

### Job posting

| Status | Meaning |
| --- | --- |
| `active` | Visible on the student job board (auto-expires after the deadline; 15 days by default) |
| `draft` | Saved, not visible |
| `closed` | Hidden/ended by the employer |

### Skill market health

`Rising / Growing / Stable / Cooling / Declining` are derived from the slope of job
market demand for that skill; `Pending` means market data hasn't been computed yet.

---

<a id="10-troubleshooting-faq"></a>
## 10. Troubleshooting & FAQ

### Students

**"What is a Verified Credential?"**
A certificate issued by your institution and recorded in the registry. Employers can
verify it independently with the link — no middleman.

**"How do I upload my resume (CVR)?"**
Sidebar → **Resume**. Fill in personal details, education, experience, etc., then
Generate CVR — verified credentials are pulled in automatically.

**"What does Market Score mean?"**
How well your verified skills match current employer demand. Higher = more aligned with
what companies hire for.

**"Why is a skill shown as Declining?"**
Fewer recent job postings list that skill. Consider upskilling — check the AI Career
Coach for recommendations.

**"My upload says 'Duplicate credential detected'."**
You already have a verified credential with that skill. You can cancel, or proceed with
the duplicate warning if it is genuinely a different document you want on record.

**"My credential was rejected — why?"**
Open **Credentials → Pending Submissions**; the rejection card shows the registrar's
reason. Fix the issue (or upload the correct document) and resubmit.

**"Can I export my CVR as a PDF?"**
Yes — Resume page → Export, pick a template, download.

**"I get redirected to /verify-email forever."**
Complete the 6-digit verification code from your inbox. Check spam; use "resend code"
if needed.

### Registrars

**"How do I issue a certificate?"**
Certificate Workspace → Issue Certificate → search the student → pick template → fill
fields → **Issue Verified Certificate**.

**"What is a template?"**
The field definition of a certificate type (e.g., Academic Degree). Build your own in
the Template Builder; it drives both single issuance and CSV columns.

**"CSV upload failed / rows invalid?"**
CSV needs a `student_id` column plus the selected template's columns, ≤ 1 MB and ≤ 500
rows. Fix the reported rows and re-upload.

**"Can I undo an issued certificate?"**
No — records are permanent. Revoke it and, if needed, issue a corrected one with a
private note referencing the original.

**"Why does a submission show High Risk?"**
The AI found suspicious signals (formatting, dates, institution, content) or the email
domain doesn't match the claimed institution. Open the document and the AI Analysis
panel before deciding.

### Employers

**"How do I post a job?"**
Postings → **Post New Job** → fill details & skills → submit. It stays active for 15
days by default; extend/renew from the postings page.

**"How does candidate skill matching work?"**
VECTOR cross-references each student's **verified** credentials with your required
skills to compute the match %.

**"How do I verify a candidate's CVR?"**
Open the applicant → the CVR renders with badges; use the **public verification link**
(`/verify/cvr/<id>`) to confirm independently.

**"I can't post a job — profile error."**
Complete your **Company Profile** first (the form links there).

**"A posting disappeared from the board."**
It likely expired (15-day default) or was closed. Reopen/extend from Manage Postings.

### Security & platform notes

- Roles are enforced at the UI **and** every API; pending accounts are locked out.
- Issuance, revocation, role changes, and verification events are recorded in
  immutable audit logs.
- Verification endpoints are rate-limited and never leak the student ID.
- Private registrar notes are encrypted at rest and never visible to students.

---

<a id="11-appendix"></a>
## 11. Appendix — page map & glossary

### Page map (local dev base: `http://localhost:3000`)

**Public / marketing & legal**
`/` landing · `/privacy` · `/terms` · `/security`

**Auth**
`/login` · `/register` (student) · `/registrar-register` · `/employer-register` ·
`/forgot-password` · `/verify-email`

**Student**
`/student/dashboard` · `/student/credentials` · `/student/credentials/upload` ·
`/student/skills` · `/student/skills/[credentialId]` · `/student/coach` ·
`/student/cvr` · `/student/jobs` · `/student/jobs/[jobId]` · `/student/applications` ·
`/student/explore-courses` · `/student/profile` · `/student/profile/edit` ·
`/student/profile/security` · `/student/settings` · `/student/help`

**Registrar**
`/registrar/dashboard` (Certificate Workspace) · `/registrar/students` (Issued Records) ·
`/registrar/users` (User & credential directory) · `/registrar/help`

**Employer**
`/employer/dashboard` · `/employer/postings` · `/employer/postings/[id]` ·
`/employer/postings/[id]/applicants` ·
`/employer/postings/[id]/applicants/[appId]` (+ `/resume`) · `/employer/candidates` ·
`/employer/profile` · `/employer/help`

**Super Admin**
`/admin/dashboard` (Verify Users) · `/admin/analytics` · `/admin/audit-logs` ·
`/admin/system-metrics`

**Public verification**
`/verify/[credentialId]` · `/verify/cvr/[cvrExportId]`

### Glossary

| Term | Meaning |
| --- | --- |
| **Credential** | A verified skill record issued to a student (with issuer, serial, dates, skill tags) |
| **Verified credential** | Exists in the database, issued by a registrar, not revoked |
| **CVR** | Credentialed (Verified) Resume — a resume whose blocks link to verified credentials |
| **Skill tags** | The machine-readable skills on a credential; they feed market health, matches, and the CVR |
| **Skill health** | Market demand trend of a skill (rising/stable/decaying), refreshed from job data |
| **AI extraction** | Reading an uploaded PDF and extracting credential fields + fraud signals with an LLM |
| **Fraud score** | 0–1 risk score the AI assigns to a student-uploaded document |
| **Schema / template** | The field definition of a certificate type used to issue credentials and validate CSVs |
| **Review queue** | Pending student-uploaded submissions awaiting registrar approval |
| **Trust Score** | Share of a student's credential slots that are verified (dashboard) |
| **Match score** | % overlap between an employer posting's required skills and a student's verified skills |
| **Verify link** | Public `/verify/...` URL acting as the tamper-check page for a credential or CVR |
