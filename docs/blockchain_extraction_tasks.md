# Phase 2: Blockchain Extraction — Task-by-Task Execution Plan

> **STATUS: COMPLETED** (June 2026)  
> *This document serves as a historical reference for the architectural pivot away from Web3/blockchain infrastructure.*

> **Branch:** `feat/blockchain-extraction` (create from `main`)  
> **Rule:** Build check (`npm run lint --workspace=vector-web`) after every task. Commit after each green build.

---

## Pre-Flight

```bash
git checkout main && git pull origin main
git checkout -b feat/blockchain-extraction
```

---

## Batch 1: Delete Pure-Blockchain Files (Low Risk)

These files are entirely blockchain code. No surgical editing needed — just delete.

### Task 1.1 — Delete `src/lib/blockchain.ts`
- **File:** `packages/web-portal/vector-web/src/lib/blockchain.ts` (93 lines)
- **Action:** DELETE the entire file
- **Why:** This exports `CONTRACT_ADDRESS`, `VECTOR_TOKEN_ABI`, `SKILL_MAP`, `getReadOnlyProvider`, `fetchWalletSkillNames`. All consumers will be rewritten in later tasks.
- ⚠️ **DO NOT BUILD YET** — other files import from this. Continue to Task 1.2.

### Task 1.2 — Delete `src/app/api/mint/route.ts`
- **File:** `packages/web-portal/vector-web/src/app/api/mint/route.ts` (92 lines)
- **Action:** DELETE the entire file
- **Why:** The mint endpoint issues blockchain tokens. This entire flow is being replaced by database-only credential issuance (which already exists in `api/registrar/credentials/route.ts`).

### Task 1.3 — Delete the `blockchain-core` package tests that Codex added
- **Files:**
  - `packages/blockchain-core/test/FuzzEdge.test.js`
  - `packages/blockchain-core/test/GasBenchmark.test.js`
- **Action:** DELETE both files
- **Why:** These are Hardhat test files for smart contracts we're removing.

**DO NOT lint/build after this batch** — broken imports are expected until Batch 2.

---

## Batch 2: Rewrite API Routes (Medium Risk — Server-Side Only)

These API routes import `ethers` and `blockchain.ts` directly. They need to be rewritten to use database-only verification.

### Task 2.1 — Rewrite `api/verify/[id]/route.ts` (185 lines)
- **File:** `packages/web-portal/vector-web/src/app/api/verify/[id]/route.ts`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 3)
  - `import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain'` (line 4)
  - The entire blockchain verification block that creates an `ethers.JsonRpcProvider`, instantiates a contract, and calls `balanceOf()`
- **What to replace with:**
  - Verification should check the `verified_credentials` table status field instead
  - A credential is "verified" if it exists in the database with `status = 'verified'` (or equivalent)
  - Keep all the Prisma/Supabase queries that already exist in the file
  - Keep the response format identical so the frontend doesn't break
- **Scope lock:** DO NOT change the IPFS metadata retrieval logic if present — that's a separate concern

### Task 2.2 — Rewrite `api/verify/cvr/[id]/route.ts` (202 lines)
- **File:** `packages/web-portal/vector-web/src/app/api/verify/cvr/[id]/route.ts`
- **Same pattern as Task 2.1:** Remove ethers + blockchain imports, replace on-chain balance checks with database status checks
- Keep all CVR snapshot assembly logic intact

### Task 2.3 — Rewrite `api/registrar/revoke-credential/route.ts` (120 lines)
- **File:** `packages/web-portal/vector-web/src/app/api/registrar/revoke-credential/route.ts`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 6)
  - `import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain'` (line 7)
  - The entire "burn token on blockchain" section (~lines 73-100) that creates a wallet, connects to contract, and calls `burn()`
- **What to replace with:**
  - Update the credential status in the database to `'revoked'`
  - The Prisma/Supabase update may already exist in the file — just make sure the blockchain burn is removed and the DB update is the authoritative action
  - Keep the audit logging

**BUILD CHECK after Task 2.3.** Run `npm run lint --workspace=vector-web`. If green, commit: `"refactor: replace blockchain verification with database-only checks in API routes"`

---

## Batch 3: Rewrite Frontend Pages — Registrar Side (High Risk — Large Files)

These are 700-900 line React components with blockchain code interleaved with UI code. **Surgical editing required.**

### Task 3.1 — Edit `registrar/dashboard/page.tsx` (933 lines)
- **File:** `packages/web-portal/vector-web/src/app/registrar/dashboard/page.tsx`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 7)
  - `import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain'` (line 9)
  - Any `ethers.JsonRpcProvider` / contract instantiation code
  - The "No Wallet" badge/warning (around line 762) — replace with nothing or a simple status indicator
- **What to keep:**
  - ALL Prisma/Supabase queries
  - ALL UI components unrelated to blockchain
  - The entire credential table/list UI (just remove the wallet column)
  - Sidebar, header, layout — everything
- **Scope lock:** DO NOT modify any component that doesn't reference `ethers`, `blockchain`, `wallet`, or `MetaMask`

### Task 3.2 — Edit `registrar/users/page.tsx` (767 lines)
- **File:** `packages/web-portal/vector-web/src/app/registrar/users/page.tsx`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 6)
  - `import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain'` (line 7)
  - Any on-chain revocation logic (should now call the rewritten API route from Task 2.3)
  - `wallet_address` column display — remove or replace with a "verification status" column
- **What to keep:** Everything else — user list, search, filters, RBAC checks

### Task 3.3 — Edit `registrar/help/page.tsx`
- **File:** `packages/web-portal/vector-web/src/app/registrar/help/page.tsx`
- **What to remove:** The FAQ entry about MetaMask wallets (line 10)
- **What to replace with:** A FAQ about how verification now works (database-based review)

**BUILD CHECK after Task 3.3.** If green, commit: `"refactor: remove blockchain dependencies from registrar pages"`

---

## Batch 4: Rewrite Frontend Pages — Student Side (High Risk — Large Files)

### Task 4.1 — Edit `student/dashboard/page.tsx` (787 lines)
- **File:** `packages/web-portal/vector-web/src/app/student/dashboard/page.tsx`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 26)
  - `import { fetchWalletSkillNames } from '@/lib/blockchain'` (line 27)
  - The MetaMask wallet connection button/flow
  - Any `window.ethereum` / provider connection logic
  - The wallet status display
- **What to replace with:**
  - Credentials should come from the database (`verified_credentials` table) instead of the blockchain
  - Replace the wallet connection section with a "Profile Completion" card or just remove it
- **Scope lock:** DO NOT touch the skill analytics section, course recommendations, or sidebar

### Task 4.2 — Edit `student/cvr/page.tsx` (793 lines)
- **File:** `packages/web-portal/vector-web/src/app/student/cvr/page.tsx`
- **What to remove:**
  - `import { ethers } from 'ethers'` (line 6)
  - `import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain'` (line 9)
  - Any on-chain balance check that determines if a credential is "verified"
- **What to replace with:**
  - Credential verification status should come from the database record
  - A credential is "verified" if it exists in `verified_credentials` with the appropriate status

### Task 4.3 — Edit `student/coach/page.tsx` (784 lines)
- **File:** `packages/web-portal/vector-web/src/app/student/coach/page.tsx`
- **What to remove:**
  - `import { fetchWalletSkillNames } from '@/lib/blockchain'` (line 11)
  - Any calls to `fetchWalletSkillNames()` — replace with a database query for the student's verified skills

### Task 4.4 — Edit `student/skills/page.tsx` (346 lines)
- **File:** `packages/web-portal/vector-web/src/app/student/skills/page.tsx`
- **What to remove:**
  - `import { fetchWalletSkillNames } from '@/lib/blockchain'` (line 4)
  - Replace with database-sourced skill data

### Task 4.5 — Edit `student/skills/[id]/page.tsx`
- **File:** `packages/web-portal/vector-web/src/app/student/skills/[id]/page.tsx`
- **What to remove:**
  - `import { SKILL_MAP } from '@/lib/blockchain'` (line 8)
  - Replace SKILL_MAP usage with a database lookup or remove the bc- ID decoding if no longer relevant

### Task 4.6 — Edit `hooks/useCVR.ts` (206 lines)
- **File:** `packages/web-portal/vector-web/src/hooks/useCVR.ts`
- **What to remove:**
  - `import { fetchWalletSkillNames } from '@/lib/blockchain'` (line 4)
  - Replace blockchain skill fetching with database queries

**BUILD CHECK after Task 4.6.** If green, commit: `"refactor: remove blockchain dependencies from student pages"`

---

## Batch 5: Update Prompts and Text Content (Low Risk)

### Task 5.1 — Update AI prompts
- **Files:**
  - `packages/ai-engine/src/nlp/gemini-client.ts` (line 22): Change "decentralized micro-credentialing platform" → "AI-powered credential verification platform"
  - `packages/ai-engine/src/nlp/skill-extractor.ts` (line 30): Same change
  - `packages/web-portal/vector-web/src/app/api/cvr/analyze/route.ts`:
    - Line 132: Change `'Blockchain Verified'` → `'Registrar Verified'`
    - Line 201: Change "Blockchain-verified skills carry on-chain proof" → "Registrar-verified credentials carry institutional validation"
    - Line 236: Change "blockchain-verified" → "registrar-verified"

### Task 5.2 — Update legal/marketing pages
- **Files:**
  - `src/app/(legal)/security/page.tsx` (line 18): Remove "blockchain-anchored verification" text
  - `src/app/(legal)/terms/page.tsx`: Remove MetaMask/wallet references
  - `src/app/(legal)/privacy/page.tsx`: Remove minting/contract references
  - `src/app/student/help/page.tsx`: Update any blockchain FAQs
  - `src/app/student/profile/page.tsx`: Remove wallet_address display if present
  - `src/components/shared/RegistrarTour.tsx`: Remove blockchain/minting tour steps

### Task 5.3 — Update verification display pages
- **Files:**
  - `src/app/verify/[id]/page.tsx`: Remove wallet/MetaMask display, show database verification status
  - `src/app/verify/cvr/[id]/page.tsx`: Same treatment

**BUILD CHECK + commit:** `"refactor: update prompts and text content to remove blockchain language"`

---

## Batch 6: Infrastructure Cleanup (Low Risk)

### Task 6.1 — Clean CSP headers
- **File:** `packages/web-portal/vector-web/next.config.ts` (line 64)
- **What to remove from `connect-src`:**
  - `https://rpc-amoy.polygon.technology`
  - `https://polygon-amoy-bor-rpc.publicnode.com`
- **What to add:** `https://api.groq.com` (for when Groq calls are made server-side, future-proofing)
- **Keep:** `https://*.pinata.cloud` (IPFS may still be used for metadata storage — decide later)

### Task 6.2 — Clean `api/registrar/credentials/route.ts`
- **File:** `packages/web-portal/vector-web/src/app/api/registrar/credentials/route.ts`
- Review for any `wallet_address` references and remove them
- The IPFS metadata building can stay for now (it stores credential metadata, not blockchain data)

### Task 6.3 — Clean test files
- **Files:**
  - `src/__tests__/security/csv-validation.test.ts`: Remove wallet_address from test data if present
  - `src/__tests__/security/ipfs-privacy.test.ts`: Keep — IPFS privacy tests are still relevant
  - `src/__tests__/performance/perf-benchmark.ts`: Remove wallet references from test fixtures

### Task 6.4 — Clean `src/lib/csv-validator.ts`
- Remove `wallet_address` from CSV validation schema if present

### Task 6.5 — Clean `api/search-courses/route.ts` and `api/registrar/users/route.ts`
- Remove any `wallet_address` references from queries/responses

### Task 6.6 — Remove `ethers` dependency
- **File:** `packages/web-portal/vector-web/package.json`
- Run: `npm uninstall ethers --workspace=vector-web`
- This should be the LAST step — only after all imports are removed

**FINAL BUILD CHECK:** `npm run lint --workspace=vector-web && npx --prefix packages/web-portal/vector-web next build`  
**Commit:** `"refactor: remove blockchain infrastructure, CSP cleanup, and uninstall ethers"`

---

## Post-Extraction Verification

After all 6 batches, run these checks:

```bash
# 1. Zero blockchain references should remain (except maybe docs/)
grep -rn "ethers\|blockchain\|CONTRACT_ADDRESS\|VECTOR_TOKEN\|SKILL_MAP\|MetaMask\|wallet_address" \
  --include="*.ts" --include="*.tsx" packages/web-portal/vector-web/src/ | grep -v node_modules

# 2. Full build
npm run lint --workspace=vector-web && npx --prefix packages/web-portal/vector-web next build

# 3. Check ethers is gone from package.json
grep "ethers" packages/web-portal/vector-web/package.json
```

If all clean → push branch, open PR.

---

## Decision: What Happens to IPFS?

**Keep for now.** IPFS is used for credential metadata storage (PDF hashes, credential JSON). It's not inherently blockchain — it's a content-addressed storage system. The panel's feedback was specifically about removing the blockchain partnership model, not about removing IPFS.

We can revisit IPFS removal as a separate task if needed. For now, `ipfs.ts` and the Pinata integration stay.

---

## Summary

| Batch | Files | Risk | Estimated Tasks |
|-------|-------|------|----------------|
| 1. Delete pure blockchain files | 4 | Low | 3 |
| 2. Rewrite API routes | 3 | Medium | 3 |
| 3. Registrar pages | 3 | High | 3 |
| 4. Student pages | 6 | High | 6 |
| 5. Prompts and text | ~10 | Low | 3 |
| 6. Infrastructure cleanup | ~6 | Low | 6 |
| **Total** | **~32** | | **24 tasks** |
