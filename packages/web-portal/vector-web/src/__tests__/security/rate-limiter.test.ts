// ---------------------------------------------------------------------------
// Test: Rate Limiter — Checkpoint #2
// 3 test cases as required by the rubric
//
// Run: npx tsx src/__tests__/security/rate-limiter.test.ts
// ---------------------------------------------------------------------------

import { RateLimiter } from '../../lib/rate-limiter';

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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('\n🛡️  VERIFICATION RATE LIMITING — Security Test Suite\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 1: Under limit — requests within window are allowed
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test Case 1: Requests under the limit are allowed');
{
    const limiter = new RateLimiter(60_000, 10); // 10 per minute
    const testIp = '192.168.1.1';

    // Make 5 requests — all should be allowed
    let allAllowed = true;
    for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit(testIp);
        if (!result.allowed) allAllowed = false;
    }

    assert(allAllowed, 'All 5 requests under the limit are allowed');

    const lastResult = limiter.checkLimit(testIp);
    assert(lastResult.allowed, '6th request still under limit (10 max)');
    assert(lastResult.remaining === 4, `Remaining count correct (expected 4, got ${lastResult.remaining})`);

    limiter.destroy();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 2: Over limit — 11th request is rejected with retryAfterMs
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest Case 2: Requests over the limit are rejected');
{
    const limiter = new RateLimiter(60_000, 10); // 10 per minute
    const testIp = '10.0.0.1';

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
        limiter.checkLimit(testIp);
    }

    // 11th request should be rejected
    const overLimit = limiter.checkLimit(testIp);
    assert(!overLimit.allowed, '11th request is rejected');
    assert(overLimit.remaining === 0, 'Remaining is 0 when over limit');
    assert(overLimit.retryAfterMs > 0, `retryAfterMs is positive (${overLimit.retryAfterMs}ms)`);
    assert(overLimit.retryAfterMs <= 60_000, `retryAfterMs is within window (${overLimit.retryAfterMs}ms)`);

    // Different IP should still be allowed
    const differentIp = limiter.checkLimit('10.0.0.2');
    assert(differentIp.allowed, 'Different IP is not affected by rate limit');

    limiter.destroy();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 3: Window expiry — blocked requests allowed after window resets
// (Wrapped in async IIFE to avoid top-level await in CJS)
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\nTest Case 3: Rate limit resets after window expires');

    // Use a very short window (500ms) for fast testing
    const limiter = new RateLimiter(500, 3); // 3 per 500ms
    const testIp = '172.16.0.1';

    // Exhaust the limit
    limiter.checkLimit(testIp);
    limiter.checkLimit(testIp);
    limiter.checkLimit(testIp);

    // Should be blocked now
    const blocked = limiter.checkLimit(testIp);
    assert(!blocked.allowed, 'Request blocked after limit exhausted');

    // Wait for window to expire
    await sleep(600);

    // Should be allowed again
    const afterExpiry = limiter.checkLimit(testIp);
    assert(afterExpiry.allowed, 'Request allowed after window expires');
    assert(afterExpiry.remaining === 2, `Remaining reset to 2 after window expiry (got ${afterExpiry.remaining})`);

    limiter.destroy();

    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'─'.repeat(50)}\n`);

    if (failed > 0) process.exit(1);
})();
