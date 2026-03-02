// ---------------------------------------------------------------------------
// IPFS Metadata Privacy — Checkpoint #2 Security Mitigation
//
// Ensures that only non-sensitive, publicly safe data is ever uploaded to
// IPFS. Private records (notes, emails, student IDs) stay in Supabase.
//
// IPFS data is IMMUTABLE and PUBLIC — once pinned, it cannot be deleted.
// This module acts as the single gateway for building IPFS payloads.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sensitive field blocklist — these must NEVER leave Supabase
// ---------------------------------------------------------------------------

/**
 * Fields that contain PII or private data and must be stripped from
 * any payload before it is sent to IPFS or any public storage.
 */
export const SENSITIVE_FIELDS = new Set([
    // Student PII
    'email',
    'phone',
    'student_id',
    'studentId',
    'wallet_address',
    'walletAddress',
    'ip_address',
    'ip',

    // Private records
    'private_notes',
    'privateNotes',
    'encrypted_notes',
    'password',
    'password_hash',

    // Auth / keys
    'supabase_service_role_key',
    'encryption_key',
    'api_key',
    'secret',
    'token',
    'session',
    'cookie',

    // Internal IDs that could enable enumeration
    'user_id',
    'userId',
    'registrar_id',
    'batch_id',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CredentialInput {
    id?: string;
    skill_name?: string;
    issued_at?: string | Date;
    issuer_did?: string;
    certificate_number?: string;
    schema_url?: string;
    transaction_hash?: string;
    token_id?: string;
    credential_data?: Record<string, any>;
    // Sensitive fields that MUST be stripped
    private_notes?: string;
    user_id?: string;
    wallet_address?: string;
    email?: string;
    student_id?: string;
    [key: string]: any;
}

export interface IpfsMetadata {
    /** Public credential identifier */
    credentialId: string;
    /** Human-readable skill name */
    skillName: string;
    /** ISO 8601 issuance timestamp */
    issuedAt: string;
    /** W3C DID of the issuing registrar */
    issuerDid: string | null;
    /** Certificate reference number */
    certificateNumber: string | null;
    /** URL to the W3C JSON-LD schema */
    schemaUrl: string | null;
    /** On-chain transaction hash (for cross-referencing Polygonscan) */
    transactionHash: string | null;
    /** On-chain token ID */
    tokenId: string | null;
    /** Filtered credential data (sensitive fields removed) */
    credentialSubject: Record<string, any>;
    /** ISO 8601 timestamp of metadata generation */
    generatedAt: string;
    /** Privacy notice */
    notice: string;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Recursively strip sensitive fields from any object.
 * Returns a deep copy — the original is never mutated.
 */
export function stripSensitiveFields<T extends Record<string, any>>(
    data: T
): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip any key in the blocklist
        if (SENSITIVE_FIELDS.has(key)) {
            continue;
        }

        // Recurse into nested objects (but not arrays of primitives)
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            result[key] = stripSensitiveFields(value);
        } else if (Array.isArray(value)) {
            // For arrays, recurse into objects within the array
            result[key] = value.map((item) =>
                item && typeof item === 'object' && !(item instanceof Date)
                    ? stripSensitiveFields(item)
                    : item
            );
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Build an IPFS-safe metadata payload from a credential record.
 * 
 * This is the ONLY function that should be used to create IPFS payloads.
 * It guarantees:
 * - No PII (email, phone, student_id, wallet_address)
 * - No private records (private_notes, encrypted data)
 * - No internal IDs (user_id, registrar_id, batch_id)
 * - Only publicly verifiable credential information
 */
export function buildIpfsMetadata(credential: CredentialInput): IpfsMetadata {
    // Strip sensitive fields from nested credential_data if present
    const safeCredentialData = credential.credential_data
        ? stripSensitiveFields(credential.credential_data)
        : {};

    const metadata: IpfsMetadata = {
        credentialId: credential.id ?? '',
        skillName: credential.skill_name ?? '',
        issuedAt: credential.issued_at
            ? new Date(credential.issued_at).toISOString()
            : new Date().toISOString(),
        issuerDid: credential.issuer_did ?? null,
        certificateNumber: credential.certificate_number ?? null,
        schemaUrl: credential.schema_url ?? null,
        transactionHash: credential.transaction_hash ?? null,
        tokenId: credential.token_id ?? null,
        credentialSubject: safeCredentialData,
        generatedAt: new Date().toISOString(),
        notice:
            'This metadata is publicly accessible and immutable. ' +
            'Private student records are stored securely in Supabase and are not included.',
    };

    return metadata;
}

/**
 * Final safety check: scan a payload for any sensitive field that may
 * have leaked through. Returns a list of flagged field paths.
 *
 * Call this as a last line of defense before pinning to IPFS.
 */
export function validateIpfsPayload(
    payload: Record<string, any>,
    _path: string = ''
): string[] {
    const violations: string[] = [];

    for (const [key, value] of Object.entries(payload)) {
        const fullPath = _path ? `${_path}.${key}` : key;

        if (SENSITIVE_FIELDS.has(key)) {
            violations.push(fullPath);
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            violations.push(...validateIpfsPayload(value, fullPath));
        } else if (Array.isArray(value)) {
            value.forEach((item, idx) => {
                if (item && typeof item === 'object') {
                    violations.push(...validateIpfsPayload(item, `${fullPath}[${idx}]`));
                }
            });
        }
    }

    return violations;
}
