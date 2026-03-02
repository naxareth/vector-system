// ---------------------------------------------------------------------------
// Test: API Key Protection — Checkpoint #2
// 3 test cases as required by the rubric
//
// Run: npx tsx src/__tests__/security/api-key-protection.test.ts
// ---------------------------------------------------------------------------

import { validateSecretEnvVars, requireEnv } from '../../lib/env-guard';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${testName}`);
        failed++;
    }
}

console.log('\n🛡️  API KEY PROTECTION — Security Test Suite\n');

// Save original env values so we can restore them
const originalEnv = { ...process.env };

function restoreEnv() {
    // Restore all original values
    process.env = { ...originalEnv };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 1: Missing key guard — throws Error when GEMINI_API_KEY is absent
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test Case 1: Missing API key triggers error');
{
    // Remove the key
    delete process.env.GEMINI_API_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ENCRYPTION_KEY;

    let threw = false;
    let errorMsg = '';
    try {
        validateSecretEnvVars();
    } catch (e: any) {
        threw = true;
        errorMsg = e.message;
    }

    assert(threw, 'validateSecretEnvVars() throws when keys are missing');
    assert(errorMsg.includes('GEMINI_API_KEY'), 'Error message mentions GEMINI_API_KEY');
    assert(errorMsg.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Error message mentions SUPABASE_SERVICE_ROLE_KEY');
    assert(errorMsg.includes('ENCRYPTION_KEY'), 'Error message mentions ENCRYPTION_KEY');

    // Also test requireEnv directly
    let requireThrew = false;
    try {
        requireEnv('GEMINI_API_KEY');
    } catch {
        requireThrew = true;
    }
    assert(requireThrew, 'requireEnv() throws when key is missing');

    restoreEnv();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 2: Client-side leak detection — NEXT_PUBLIC_ secret triggers error
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest Case 2: Client-side leak detection');
{
    // Set valid keys
    process.env.GEMINI_API_KEY = 'test-key-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes00000';

    // Simulate a leak — someone accidentally set a NEXT_PUBLIC_ version
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'leaked-key';

    let threw = false;
    let errorMsg = '';
    try {
        validateSecretEnvVars();
    } catch (e: any) {
        threw = true;
        errorMsg = e.message;
    }

    assert(threw, 'Throws when a secret is exposed as NEXT_PUBLIC_*');
    assert(errorMsg.includes('LEAKED'), 'Error message includes LEAKED warning');
    assert(
        errorMsg.includes('NEXT_PUBLIC_GEMINI_API_KEY'),
        'Error identifies the specific leaked variable'
    );

    // Clean up the leaked var
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    restoreEnv();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 3: Valid configuration — all keys present, no leaks → passes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest Case 3: Valid configuration passes silently');
{
    process.env.GEMINI_API_KEY = 'test-key-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes00000';

    // Make sure no NEXT_PUBLIC_ leak exists
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

    let threw = false;
    try {
        validateSecretEnvVars();
    } catch {
        threw = true;
    }

    assert(!threw, 'validateSecretEnvVars() passes when all keys are present');

    // Test requireEnv returns the value
    const value = requireEnv('GEMINI_API_KEY');
    assert(value === 'test-key-123', 'requireEnv() returns the correct value');

    restoreEnv();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
