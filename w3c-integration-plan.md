
---

# VECTOR: W3C Verifiable Credentials Integration Plan

## 1. Executive Summary

To transition VECTOR from a static, hardcoded credential system to a truly flexible "Dynamic Career Engine," the platform will adopt the **W3C Verifiable Credentials Data Model**. This allows external issuers (registrars, bootcamps) to define their own custom micro-credential templates without requiring backend database updates.

The core of this architecture relies on **Decentralized Identifiers (DIDs)** for users and institutions, and **JSON-LD Schema Registries** for flexible credential definitions.

## 2. Phase 1: Database Schema Overhaul (Prisma)

The database must shift from enforcing rigid credential columns to serving as a flexible registry for custom schemas.

* **Retire Rigid Tables:** Remove or heavily modify the existing `credential_definitions` table which relies on hardcoded enums (e.g., Academic, Seminar).
* **Create `CredentialSchema` Table:** Add a new table to store the custom templates published by issuers.
* Fields: `id` (UUID), `issuer_id` (UUID linking to `users` table), `title` (String), `json_schema` (JSONB).


* **Update `verified_credentials` Table:** Modify the existing table to support dynamic payloads.
* Add `schema_url` (String) to link the credential to its defining template.
* Add `credential_data` (JSONB) to store the flexible payload (the `credentialSubject`).
* Ensure `issuer_did` and `metadata_uri` are properly utilized for W3C compliance.



## 3. Phase 2: Backend API Registry (Next.js Edge/Node.js)

Create the infrastructure to allow issuers to publish templates and verifiable credentials.

* **Create `POST /api/schemas`:** An endpoint for verified registrars to upload a new JSON template. It validates the issuer's session via Supabase Auth and saves the `json_schema` to PostgreSQL.
* **Create `GET /api/schemas/[id]`:** A public, read-only endpoint that serves the raw JSON schema. This acts as the `@context` URL required by the W3C standard.
* **Refactor `POST /api/registrar/credentials`:** Update the minting endpoint. Instead of validating against a hardcoded list, it must:
1. Fetch the requested `schema_url`.
2. Validate the incoming student data against that specific schema using Zod.
3. Generate a standard W3C JSON-LD payload containing the `credentialSubject`.



## 4. Phase 3: Blockchain Alignment (Polygon Amoy Testnet)

The smart contracts do not need a complete rewrite, but the metadata they point to must change.

* **Update `VectorToken.sol`:** Ensure the ERC-1155 `uri(uint256 id)` function points directly to the Next.js backend endpoint that serves the completed W3C JSON-LD credential.
* **Implement DIDs:** Format all wallet addresses on-chain and in the JSON as Decentralized Identifiers (e.g., `did:polygon:amoy:<wallet_address>`).

## 5. Phase 4: Frontend UI Updates (React/Tailwind)

The user interfaces must be updated to handle dynamic data rather than static fields.

* **Create `SchemaBuilder.tsx`:** Build a dashboard component in the Registrar portal (`src/app/registrar/dashboard`) where institutions can dynamically create credential templates (e.g., adding fields for "Hours Completed" or "Course Link").
* **Refactor `CredentialCard.tsx`:** Update the student dashboard component (`src/components/dashboard/CredentialCard.tsx`) to dynamically iterate through the `credential_data` JSONB object. It should render any custom key-value pair the issuer created without breaking the UI.

## 6. Phase 5: AI Engine Integration

The AI must learn to read dynamic schemas to accurately perform Predictive Relevance Analysis.

* **Update `skill-extractor.ts`:** Refactor the Google Gemini API prompt. When analyzing a credential, the AI must first fetch the associated `schema_url` to understand the context of the custom fields before comparing them to the JSearch market data.

---