# VECTOR System Pivot — Technical Review & Risk Assessment

**Author:** AI Engineering Partner (Antigravity)  
**Date:** June 2, 2026  
**Context:** Review of the "System Pivot & Revised Direction" planning document following capstone defense feedback.  
**Audience:** Development team, to be referenced alongside the original pivot document during adviser consultation and team alignment meeting.

---

## 1. Executive Summary

The pivot is **strategically correct**. The panel's feedback removes the blockchain justification, and the revised direction (AI-verified credential job platform) is more defensible, more practical, and more aligned with a capstone timeline. However, the document underestimates three things: the scope of the job platform expansion, the complexity of the blockchain extraction, and the fragility of the AI provider situation. This review maps each risk to a concrete recommendation.

---

## 2. What the Pivot Gets Right

### 2.1 Blockchain Removal — Fully Endorsed

The reasoning in the planning document's Section 3 is airtight. Here's what the codebase confirms:

| Metric | Value |
|---|---|
| `packages/blockchain-core` files (excl. node_modules) | 53 files |
| `packages/blockchain-core` size (excl. node_modules) | 1.9 MB |
| Frontend files importing `ethers` | 8 files |
| Frontend files referencing blockchain/wallet/contract | 32 files |
| Total `wallet_address` references in frontend | 162 occurrences |

The blockchain is technically functional — Hardhat compiles, contracts deploy, MetaMask connects, tokens mint on Polygon Amoy. But this entire subsystem serves **one user**: the demo environment. No external institution is minting. The on-chain data loop is closed, meaning the app writes data to a chain and then reads it back from the same chain. That's not decentralization, it's a round trip with gas fees.

> [!TIP]
> **The "invisible tech" argument is your strongest card.** If a fresh graduate needs to install MetaMask, understand gas fees, and switch to Polygon Amoy just to view their resume — you've already lost the user. Lead with this in the adviser meeting.

### 2.2 Hybrid Verification Model — Intellectually Honest

The planning document's Section 4 identifies the single most important technical insight: **AI has no ground truth to verify against.** Without institutional issuers providing the source of truth, saying "AI verifies credentials" is a misrepresentation.

The proposed hybrid model is much more defensible:

```
Student submits credential
        ↓
AI Fraud Detection (flag suspicious patterns, formatting anomalies, tampering)
        ↓
Email Domain Verification (did this come from registrar@phinma.edu.ph?)
        ↓
QR Code Verification (does institution's QR link resolve to a valid registrar page?)
        ↓
Human Registrar Review (final approval/rejection)
        ↓
Verified badge applied
```

> [!IMPORTANT]
> **Key reframe for the manuscript:** We don't say "AI verifies credentials." We say "AI assists in credential fraud detection by flagging suspicious submissions for human review." This is accurate, honest, and still technically impressive. Any panelist who probes "can AI actually verify?" will hit a well-reasoned answer instead of a weak claim.

### 2.3 Registrar Role Preservation — Keep the Existing Infrastructure

The planning document discusses pivoting away from registrars. **Pushback: don't abandon this role.** The current codebase has a fully working registrar system:

- Registrar dashboard with credential management
- RBAC (Role-Based Access Control) with `student`, `registrar`, `super_admin` roles
- Batch credential issuance flow
- User management with CSV upload
- Custom credential schema builder

This is some of the most polished code in the project. The pivot should **reframe** registrars as **credential reviewers**, not remove them. The workflow change is:

| Before (Blockchain) | After (Pivot) |
|---|---|
| Registrar mints token on-chain | Registrar reviews AI-flagged submissions |
| Student receives blockchain token | Student receives database-verified badge |
| Verification = on-chain lookup | Verification = database status + AI confidence score |

This reframe preserves ~80% of existing registrar UI. The code change is replacing contract calls with database status updates. That's a weekend of work, not a rebuild.

---

## 3. What the Pivot Gets Wrong (or Underestimates)

### 3.1 Job Platform Scope — This is a Second Product

> [!CAUTION]
> The planning document's Section 5 describes building "LinkedIn + JobStreet with AI verification." This is the single biggest risk in the entire pivot.

Here's what "employer job posting system + job matching + candidate discovery" actually requires:

| Feature | Estimated Effort | New Code |
|---|---|---|
| Employer role + registration + RBAC | Medium | New auth flow, middleware rules, dashboard |
| Job posting CRUD | Medium | New database schema, API routes, forms |
| Job search/browse with filters | Medium | Search indexing, pagination, filtering UI |
| Application tracking flow | High | Multi-state workflow, notifications both sides |
| AI matching engine | High | Skill-to-requirement comparison, ranking algorithms |
| Candidate discovery for employers | Medium | Search, filtering, privacy controls |

**Combined effort:** This is roughly equivalent to rebuilding the entire existing student-facing app from scratch. In a capstone timeline with manuscript revisions happening simultaneously, this is high-risk.

**Recommendation — Scope down to proof-of-concept:**

Build only:
1. Employer role with basic dashboard (reuse existing `DashboardLayout`)
2. Job posting CRUD (create/list/view — skip edit/delete for MVP)
3. A basic AI matching display: "Based on your verified skills, here are relevant positions"

Skip entirely:
- Full application tracking workflow
- Employer-initiated candidate search
- Notification system for applications

The thesis is about **credential verification**, not job matching. The job features are a *demonstration* that verified credentials have downstream value. The panel doesn't need a working JobStreet clone — they need to see that verified skills connect to real labor market data.

### 3.2 Blockchain Extraction — Not a Simple Delete

The planning document lists "Remove `packages/blockchain-core`" as a single bullet point. The actual extraction is surgical. Here's the full dependency map from a live codebase scan:

#### Files to DELETE entirely:
| File | Lines | Purpose |
|---|---|---|
| `packages/blockchain-core/` | entire package | Hardhat, Solidity, deployment scripts |
| `src/lib/blockchain.ts` | 93 | Contract ABI, provider, wallet skill fetch |
| `src/app/api/mint/route.ts` | 92 | Minting API route |
| `src/lib/ipfs.ts` | 206 | IPFS metadata builder and validator |

#### Files requiring SURGICAL EDITING (blockchain code interleaved with non-blockchain code):
| File | Blockchain References | What Changes |
|---|---|---|
| `src/app/student/dashboard/page.tsx` | `ethers` import, `fetchWalletSkillNames`, wallet connection UI, wallet-based credential cards | Remove wallet connect button, remove blockchain credential cards, keep DB-based credentials |
| `src/app/student/profile/page.tsx` | Wallet address field, MetaMask connect/disconnect, wallet status UI | Remove entire "Blockchain Wallet" section from profile form |
| `src/app/registrar/users/page.tsx` | `ethers` + contract interaction for revoking tokens, MetaMask prompt, chain ID checks | Replace on-chain revoke with database status update |
| `src/app/registrar/dashboard/page.tsx` | `ethers` import, on-chain badge display | Remove blockchain verification badges |
| `src/app/student/cvr/page.tsx` | `ethers` import, on-chain data in CVR generation | Remove on-chain references from CVR snapshot |
| `src/app/api/registrar/credentials/route.ts` | IPFS metadata build, privacy validation, `ipfs_metadata` in response | Remove IPFS pipeline, keep credential issuance to DB |
| `src/app/api/registrar/revoke-credential/route.ts` | Entire route uses `ethers` to burn tokens | Rewrite to database-only revocation |
| `src/app/api/verify/[id]/route.ts` | `ethers` for on-chain verification lookup | Rewrite to database-only verification |
| `src/app/api/verify/cvr/[id]/route.ts` | `ethers` for on-chain CVR verification | Rewrite to database-only verification |
| `src/app/verify/[id]/page.tsx` | On-chain verification badge display, Polygonscan links | Replace with database verification status |
| `src/app/verify/cvr/[id]/page.tsx` | On-chain CVR verification, Polygonscan links | Replace with database verification status |
| `src/components/cvr/PersonalDetailsSection.tsx` | Wallet references | Remove wallet field |
| `src/components/dashboard/RecentActivity.tsx` | Blockchain activity references | Update activity types |
| `src/hooks/useCVR.ts` | Blockchain credential references | Remove on-chain data merging |
| `src/lib/csv-validator.ts` | Wallet address validation | Remove wallet_address column validation |

#### Dependencies to UNINSTALL:
```
ethers (from web-portal package.json)
```

#### CSP Headers to UPDATE (`next.config.ts`):
Remove from `connect-src`:
- `https://rpc-amoy.polygon.technology`
- `https://polygon-amoy-bor-rpc.publicnode.com`

#### Database Schema Changes (Prisma):
- `users.wallet_address` column → remove or deprecate
- `verified_credentials.token_id` → remove or repurpose
- `verified_credentials.transaction_hash` → remove or repurpose
- `minting_batches` table → rename to `credential_batches` or remove blockchain-specific fields

> [!WARNING]
> **This is approximately 15-20 files requiring coordinated changes.** If the extraction is done carelessly, the app will have broken imports, runtime crashes on pages that reference deleted modules, and TypeScript errors throughout. It needs to be done methodically, file-by-file, with a build check after each batch.

### 3.3 AI Provider Situation — More Urgent Than the Document Suggests

The planning document's Section 8 treats the AI provider decision as an open question for later. Based on the actual rate limits (confirmed at **15-20 RPD for Gemini free tier**), this is a **blocker**, not a backlog item.

The current codebase has AI in these critical paths:

| Route | Purpose | Calls per user action |
|---|---|---|
| `src/app/api/chat/route.ts` | AI career coach chatbot | 1 per message |
| `src/app/api/cvr/analyze/route.ts` | CVR AI analysis | 1 per CVR generation |
| `src/app/api/registrar/credentials/route.ts` | Course generation from skill tags | 1 per credential issued |
| `src/app/api/analyze/route.ts` | Skill health analysis | 1 per dashboard load |

A single user going through the registration → dashboard → chat → CVR flow would consume **4-6 requests minimum**. With the new fraud detection features, that could double. At 15-20 RPD, you can demo the system exactly **3 times per day** before hitting the wall.

**Current architecture (good news):**
All AI calls already flow through a centralized module:
```
src/lib/gemini.ts  →  exports GEMINI_MODEL, genAI, geminiModel
```
Three route files import from this module. The abstraction layer is 60% done.

**What needs to happen:**
1. Create `src/lib/ai-provider.ts` — strategy pattern that can route to Gemini, Groq, or Ollama
2. Each provider gets its own adapter: `gemini-adapter.ts`, `groq-adapter.ts`, `ollama-adapter.ts`
3. Environment variable `AI_PROVIDER=groq|gemini|ollama` controls which adapter is active
4. All route files import from `ai-provider.ts` instead of `gemini.ts`
5. Prompt templates may need adjustment per model (Llama 3 vs Gemini have different system prompt behaviors)

**Timeline recommendation:** Do this FIRST. It unblocks all other development by removing the 15 RPD ceiling.

---

## 4. Recommended Execution Order

Based on dependency analysis and risk assessment:

### Phase 1: AI Provider Abstraction (Unblock Development)
- Build the provider abstraction layer
- Integrate Groq (primary development provider) and Ollama (demo fallback)
- Keep Gemini adapter as an option
- Test all 4 AI-dependent routes against new providers
- **Why first:** Every other phase needs AI calls during development/testing. Can't iterate on fraud detection, CVR analysis, or job matching while limited to 15 RPD.

### Phase 2: Blockchain Surgical Extraction (Remove the Old Foundation)
- Follow the file-by-file map in Section 3.2
- Delete `packages/blockchain-core` entirely
- Remove `ethers` dependency
- Rewrite all verification routes to database-only
- Update CSP headers
- Update Prisma schema
- Build check after every batch of files
- **Why second:** The blockchain code is interleaved with everything. Every new feature you build on top of blockchain code is wasted work. Extract it cleanly before building new features.

### Phase 3: Credential Verification Reframe (Rebuild the Core Value)
- Registrar becomes "credential reviewer"
- Build PDF upload + AI extraction for resume digitalization
- Build AI fraud detection pipeline (flagging, not absolute verification)
- Email domain verification
- QR code verification
- Duplicate credential detection
- **Why third:** This IS the thesis. It's the core differentiator. But it depends on Phase 1 (AI provider) and Phase 2 (clean blockchain-free codebase).

### Phase 4: Job Platform MVP (Proof of Concept Layer)
- Employer role + basic RBAC
- Job posting CRUD
- Basic AI matching display
- **Why last:** This is scope expansion. Only do it after the core is stable. If time runs out, the thesis still stands on credential verification alone.

---

## 5. What Survives the Pivot (Reusable Assets)

Not everything is being thrown away. Here's what carries forward with minimal or no changes:

| Asset | Status | Notes |
|---|---|---|
| Auth system (Supabase + middleware) | ✅ Keep as-is | Login, registration, RBAC, email verification, password reset — all clean |
| Admin dashboard | ✅ Keep as-is | System metrics, user management, analytics |
| Registrar dashboard (UI) | ✅ Keep 80% | Remove blockchain-specific UI, keep credential management |
| Student dashboard (core) | ✅ Keep 70% | Remove wallet UI, keep skill analytics and credential display |
| AI career coach (chat) | ✅ Keep as-is | Just swap the AI provider adapter |
| Skill decay analytics | ✅ Keep as-is | Core thesis feature, provider-agnostic |
| CVR system | ✅ Keep 90% | Remove on-chain references, keep the PDF generation |
| Credential schema builder | ✅ Keep as-is | Already database-only |
| Security hardening | ✅ Keep as-is | CSP, CSRF, rate limiting, encryption, env-guard |
| Course recommendation engine | ✅ Keep as-is | Just swap the AI provider adapter |
| Help pages / Tours | ✅ Keep with text updates | Update references from "blockchain" to new terminology |

**Estimated code preservation: ~65-70% of the 24,965 lines of source code survive the pivot.** The rest is blockchain-specific code that gets surgically removed or rewritten.

---

## 6. Risks to Flag for Adviser Meeting

| Risk | Severity | Mitigation |
|---|---|---|
| Job platform scope creep | 🔴 High | Hard-scope to proof-of-concept; 3 features max |
| Blockchain extraction breaks something | 🟡 Medium | Methodical file-by-file extraction with build checks |
| AI provider switch changes output quality | 🟡 Medium | Test all prompts against new model before committing |
| Manuscript rewrite delays code work | 🟡 Medium | Parallelize: one person on manuscript, others on code |
| Demo day AI rate limits | 🔴 High | Ollama local fallback eliminates internet/quota dependency |
| Prisma schema migration breaks prod data | 🟡 Medium | Test migration on staging DB first |

---

## 7. Questions for Adviser Consultation

These should be answered before any code changes begin:

1. **Title:** Does the title officially change? The suggested revision ("VECTOR: An AI-Powered Micro-Credentialing System with Predictive Career Analytics and Skill Decay Detection") drops "Decentralized." Does the adviser approve?

2. **Blockchain in Chapter 5:** The original vision (multi-institutional blockchain network) gets documented as "Recommendations for Future Work." Does the adviser want this framed as a limitation or as a future direction?

3. **Scope boundary:** Is the job platform (employer postings + matching) required by the panel, or was it a suggestion? This determines whether it's MVP or stretch goal.

4. **AI provider:** Does the adviser have a preference or institutional constraint? Some advisers prefer documented APIs (Gemini/OpenAI) over open-source models (Llama/Ollama) for reproducibility.

5. **Timeline:** How many weeks do we have until the revised defense? This determines whether Phase 4 (job platform) is in scope at all.

---

## 8. Conclusion

The pivot is the right move. The blockchain removal is justified, the hybrid verification model is intellectually honest, and the registrar infrastructure can be preserved with minimal rework. The two biggest risks are **job platform scope creep** and **AI provider rate limits** — both of which have clear mitigations.

The recommended approach: **Fix the AI provider ceiling first, extract blockchain second, rebuild verification third, add job features last.** Each phase produces a working, demonstrable system. If time runs out at any phase boundary, you still have a defensible thesis.

The original VECTOR wasn't wrong — it was just too ambitious for a capstone. The pivot narrows focus to what's demonstrable and defensible while preserving the technical depth that makes the project impressive.
