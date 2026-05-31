# 🛡️ VECTOR Platform Threat Model

This document outlines the security architecture, potential threats, and mitigation strategies for the **VECTOR** decentralized micro-credentialing platform.

---

## 🏗️ Data Flow Diagram (DFD)

```text
[ Student ] 
     │
     │ 1. Upload Resume / View Dashboard
     ▼
[ Web Portal (Next.js) ] <───> [ Supabase DB (PostgreSQL) ]
     │          │                     │
     │          └─────────────────────┼──────────────────┐
     │ 2. Extract Skills              │ 3. Store Logs   │
     ▼                                ▼                  │
[ AI Engine (Gemini) ]          [ Audit Logs (RLS) ]     │
     │                                ^                  │
     │                                │ 4. Log Action    │
     │                                │                  │
     ▼                                │                  │
[ Blockchain (Polygon Amoy) ] <───────┘                  │
     │                                                   │
     │ 5. Verify / Query Credentials                     │
     ▼                                                   │
[ Job Market APIs / Public ] <───────────────────────────┘
```

---

## 🛡️ STRIDE Analysis

| Component | Threat Type | Description | Mitigation |
| --- | --- | --- | --- |
| **Web Portal** | **Spoofing** | Attacker impersonates a Registrar to mint tokens. | Supabase Auth + `REGISTRAR_ROLE` check in `VectorToken.sol`. |
| **Web Portal** | **Tampering** | CSRF attack to change user profile data. | `csrf.ts` middleware validation. |
| **Supabase DB** | **Information Disclosure** | Unauthorized access to institutional notes. | AES-256 encryption in `encryption.ts` + RLS policies. |
| **Smart Contract** | **Repudiation** | User claims they didn't authorize a revoke. | Blockchain event logs + `onlyRole(REGISTRAR_ROLE)`. |
| **AI Engine** | **Denial of Service** | Flooding the API with massive resumes. | `rate-limiter.ts` implementation. |
| **Smart Contract** | **Elevation of Privilege** | Student calls `mintSkill` directly. | OpenZeppelin `AccessControl`. |

---

## 🔒 OWASP Top 10 Mapping

| OWASP Item | Affected? | Mitigation Strategy |
| --- | --- | --- |
| **A01: Broken Access Control** | Yes | Server-side role checks and Supabase RLS. |
| **A02: Cryptographic Failures** | Yes | AES-256 for sensitive DB fields; TLS for all traffic. |
| **A03: Injection** | Yes | Zod schema validation for all API inputs; `csv-validator.ts`. |
| **A04: Insecure Design** | No | Security-first architecture with decentralized trust. |
| **A05: Security Misconfiguration** | Yes | Environment variable protection; no `.env` in Git. |
| **A06: Vulnerable Components** | Yes | Regular `npm audit` and dependabot monitoring. |
| **A07: Identification/Auth Failures** | Yes | Leveraging Supabase Auth (MFA capable). |
| **A08: Software/Data Integrity** | Yes | Blockchain-backed credentials prevent modification. |
| **A09: Logging/Monitoring** | Yes | Tamper-evident `audit-rls.sql` policies. |
| **A10: SSRF** | No | No user-supplied URL fetching in core logic. |

---

## 📉 Risk Scoring Matrix

| Threat ID | Threat Description | Likelihood (1-5) | Impact (1-5) | Score | Mitigation Reference |
| --- | --- | --- | --- | --- | --- |
| T01 | Credential Spoofing (Registrar level) | 2 | 5 | 10 | `VectorToken.sol` (RBAC) |
| T02 | SQL/NOSQL Injection in AI prompt | 3 | 4 | 12 | `csv-validator.ts`, Zod |
| T03 | CSRF on Admin dashboard | 3 | 3 | 9 | `csrf.ts` middleware |
| T04 | Data Leak of Private Instructor Notes | 2 | 4 | 8 | `encryption.ts` |
| T05 | Brute Force on Auth API | 4 | 3 | 12 | `rate-limiter.ts` |
| T06 | Fraudulent Revocation | 1 | 5 | 5 | Multi-sig (Planned Upgrade) |
| T07 | Replay Attack on Blockchain | 2 | 4 | 8 | EVM native Nonce protection |
| T08 | Prompt Injection (Gemini) | 4 | 2 | 8 | `ai-test.ts` (Behavioral Suite) |

---

## 🛠️ Mitigation References

- **Input Validation:** [Zod Schemas](file:///packages/web-portal/vector-web/src/lib/validations/schemas.ts)
- **Data Integrity:** [Audit Logs RLS](file:///packages/web-portal/vector-web/src/lib/audit-rls.sql)
- **Encryption:** [Encryption Utility](file:///packages/web-portal/vector-web/src/lib/encryption.ts)
- **Rate Limiting:** [Middleware](file:///packages/web-portal/vector-web/src/middleware.ts)
- **Blockchain Security:** [AccessControl](file:///packages/blockchain-core/contracts/VectorToken.sol)
