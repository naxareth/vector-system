# 🛡️ Security Mitigations — Checkpoint #2

**Group 7** | Leader: Denulan, Ace Philip Soriano  
Members: Amrinto, De Guzman, Doria, Valencia, Arenas

---

## 1. CSV Input Validation

**Threat:** A malicious registrar (or compromised account) uploads a crafted CSV with formula injection payloads (`=CMD()`, `+SUM()`), oversized files, or malformed data that bypasses downstream validation.

**Mitigation:**

| Layer | Protection |
|---|---|
| File-level | MIME type check (`text/csv` only), max size 1 MB |
| Header validation | Requires `student_id`, `skill_name`, `wallet_address` |
| Cell sanitization | Formula-injection chars (`=`, `+`, `-`, `@`, `\t`, `\r`) neutralized with single-quote prefix |
| Row validation | Zod schemas enforce UUID for student_id, Ethereum address for wallet_address |
| Endpoint | `POST /api/registrar/csv-upload` — auth + RBAC (registrar/super_admin only) |

**Files:**
- `src/lib/csv-validator.ts` — Validation & sanitization engine
- `src/app/api/registrar/csv-upload/route.ts` — Secure API endpoint

**Test Results (3 cases):**
```
✅ Test 1: Valid CSV parsed correctly (2 rows, correct fields)
✅ Test 2: Formula injection characters neutralized (=, +, @)
✅ Test 3: Invalid format rejected (wrong headers, empty file, wrong MIME, oversized)
```

---

## 2. API Key Protection

**Threat:** API keys (Gemini, Supabase Service Role, Encryption Key) could be leaked to the client-side bundle via `NEXT_PUBLIC_*` variables, or used inconsistently across routes with no startup validation.

**Mitigation:**

| Layer | Protection |
|---|---|
| Runtime guard | `requireEnv()` throws at startup if any key is missing |
| Leak detection | `validateSecretEnvVars()` checks no secret appears as `NEXT_PUBLIC_*` |
| Centralization | All routes use `@/lib/gemini.ts` singleton — no standalone `GoogleGenerativeAI` instances |
| AI engine | `ai-engine/src/nlp/gemini-client.ts` also has runtime guard |

**Files modified:**
- `src/lib/env-guard.ts` — New: runtime secret validation
- `src/lib/gemini.ts` — Uses `requireEnv()` instead of `process.env || ''`
- `src/app/api/chat/route.ts` — Refactored: centralized Gemini import
- `src/app/api/cvr/analyze/route.ts` — Refactored: centralized Gemini import
- `src/app/api/registrar/credentials/route.ts` — Refactored: centralized Gemini import
- `packages/ai-engine/src/nlp/gemini-client.ts` — Added runtime guard

**Test Results (3 cases):**
```
✅ Test 1: Missing key guard throws with specific error messages
✅ Test 2: Client-side leak (NEXT_PUBLIC_GEMINI_API_KEY) detected and flagged
✅ Test 3: Valid configuration with all keys passes silently
```

---

## 3. IPFS Metadata Privacy

**Threat:** IPFS data is **immutable and public**. If credential records are pinned as-is, private student data (email, notes, wallet address, student ID) becomes permanently public and irrecoverable.

**Mitigation:**

| Layer | Protection |
|---|---|
| Sensitive blocklist | 20+ fields (email, phone, wallet_address, private_notes, password, etc.) |
| `buildIpfsMetadata()` | Single gateway function — only outputs safe public fields |
| `stripSensitiveFields()` | Deep recursive stripping of nested objects and arrays |
| `validateIpfsPayload()` | Final safety check before pinning — catches any leaked fields |

**What goes to IPFS:** skill name, issue date, issuer DID, certificate number, schema URL, tx hash, token ID  
**What stays in Supabase:** email, student_id, wallet_address, private_notes, user_id, phone, passwords

**Files:**
- `src/lib/ipfs.ts` — Privacy-aware metadata builder (was empty before)

**Test Results (3 cases):**
```
✅ Test 1: Sensitive fields (email, notes, wallet, studentId) stripped from output
✅ Test 2: Public fields (skill, issuerDid, certNumber) correctly preserved
✅ Test 3: Deep nested sensitive data (3 levels + arrays) detected and stripped
```

---

## 4. Verification Link Rate Limiting

**Threat:** Public verification endpoints (`/api/verify/[id]`, `/api/verify/cvr/[id]`) have no rate limiting — an attacker could brute-force UUID guesses or scrape student PII (student ID, email, full wallet address).

**Mitigation:**

| Layer | Protection |
|---|---|
| Rate limiter | Sliding window: 10 requests/minute per IP |
| 429 response | Returns `Retry-After` header and `X-RateLimit-Remaining` |
| PII redaction | `studentId` removed from response, `email` removed from DB query |
| Wallet truncation | Full `0x1234...abcd` → `0x1234...abcd` (first 6 + last 4 only) |
| Verify page UI | `Student ID` field removed from the verification page |

**Files:**
- `src/lib/rate-limiter.ts` — New: sliding window rate limiter
- `src/app/api/verify/[id]/route.ts` — Rate limiting + PII redaction
- `src/app/api/verify/cvr/[id]/route.ts` — Rate limiting + PII redaction
- `src/app/verify/[id]/page.tsx` — Removed studentId from UI

**Test Results (3 cases):**
```
✅ Test 1: 5 requests under limit all allowed (remaining count correct)
✅ Test 2: 11th request rejected with retryAfterMs > 0 (different IP unaffected)
✅ Test 3: Blocked requests allowed again after window expires (500ms test window)
```

---

## 5. Minting Authorization

**Threat:** Unauthorized users could trigger the NFT credential minting process, either by directly calling minting API endpoints or exploiting weak access controls, allowing them to issue fraudulent credentials on-chain.

**Mitigation:**

| Layer | Protection |
|---|---|
| RBAC enforcement | Only `registrar` and `super_admin` roles can trigger minting endpoints |
| JWT validation | All minting routes validate session tokens server-side before processing |
| Smart contract checks | On-chain permission guard — only authorized minter address can call `mint()` |
| Request signing | Minting requests require a server-signed payload; client cannot forge a mint call |
| Audit logging | Every mint attempt (success or rejection) is logged with user ID, timestamp, and credential ID |

**What is protected:** Only verified, role-authorized registrars can issue credentials; students and public users have no minting access at any layer.

**Files:**
- `src/lib/auth-guard.ts` — RBAC middleware for minting routes
- `src/app/api/registrar/mint/route.ts` — Auth-gated minting endpoint
- `contracts/CredentialNFT.sol` — `onlyMinter` modifier on `mint()` function
- `src/lib/mint-signer.ts` — Server-side payload signing before contract call

**Test Results (3 cases):**
```
✅ Test 1: Registrar role successfully authorized to mint credential
✅ Test 2: Student role rejected with 403 Forbidden on mint attempt
✅ Test 3: Forged/unsigned mint payload rejected before reaching smart contract
```

---

## Running All Tests

```bash
cd packages/web-portal/vector-web
cmd /c "npx tsx src/__tests__/security/csv-validation.test.ts"
cmd /c "npx tsx src/__tests__/security/api-key-protection.test.ts"
cmd /c "npx tsx src/__tests__/security/ipfs-privacy.test.ts"
cmd /c "npx tsx src/__tests__/security/rate-limiter.test.ts"
cmd /c "npx tsx src/__tests__/security/minting-authorization.test.ts"
```

**Total: 83 assertions passed, 0 failures across 15 test cases (3 per mitigation).**
