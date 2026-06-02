// ---------------------------------------------------------------------------
// Environment Variable Guard — Checkpoint #2 Security Mitigation
//
// Validates that critical secret keys are present at startup and ensures
// none are accidentally leaked via NEXT_PUBLIC_* client-side variables.
// ---------------------------------------------------------------------------

/**
 * Secret environment variables that MUST be present on the server
 * and MUST NEVER appear in any NEXT_PUBLIC_* variable.
 */
const BASE_REQUIRED_SECRETS = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
] as const;

type AIProvider = 'gemini' | 'groq' | 'ollama';

function resolveAIProvider(errors: string[]): AIProvider {
    const raw = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    if (raw === 'gemini' || raw === 'groq' || raw === 'ollama') {
        return raw;
    }
    errors.push(
        `INVALID: "AI_PROVIDER" must be one of gemini | groq | ollama (got "${raw}").`
    );
    return 'gemini';
}

function providerSecrets(provider: AIProvider): string[] {
    switch (provider) {
        case 'gemini':
            return ['GEMINI_API_KEY'];
        case 'groq':
            return ['GROQ_API_KEY'];
        case 'ollama':
            return [];
        default:
            return [];
    }
}

/**
 * Validate that all critical secrets are present and not leaked to the client.
 * Call this at application startup (e.g. in a top-level lib file or layout).
 *
 * @throws {Error} if any secret is missing or leaked via NEXT_PUBLIC_*
 */
export function validateSecretEnvVars(): void {
    const errors: string[] = [];
    const provider = resolveAIProvider(errors);
    const requiredSecrets = [...BASE_REQUIRED_SECRETS, ...providerSecrets(provider)];

    // 1. Check that each required secret is present and non-empty
    for (const key of requiredSecrets) {
        const value = process.env[key];
        if (!value || value.trim().length === 0) {
            errors.push(`MISSING: "${key}" is not set in environment variables.`);
        }
    }

    // 2. Check that no secret is accidentally exposed as a NEXT_PUBLIC_* variable
    //    (NEXT_PUBLIC_* vars are bundled into the client JS at build time)
    for (const key of requiredSecrets) {
        const publicKey = `NEXT_PUBLIC_${key}`;
        if (process.env[publicKey]) {
            errors.push(
                `LEAKED: "${key}" is exposed as "${publicKey}". ` +
                `NEXT_PUBLIC_* variables are visible to the browser. ` +
                `Remove "${publicKey}" and keep the key server-side only.`
            );
        }
    }

    if (errors.length > 0) {
        const msg = [
            '🛡️ SECURITY: Environment variable validation failed:',
            ...errors.map((e, i) => `  ${i + 1}. ${e}`),
        ].join('\n');
        throw new Error(msg);
    }
}

/**
 * Check a single environment variable.
 * Returns the value if present; throws if missing.
 */
export function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
        throw new Error(
            `🛡️ SECURITY: Required environment variable "${key}" is not set. ` +
            `The application cannot start without it.`
        );
    }
    return value;
}
