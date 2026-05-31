// ---------------------------------------------------------------------------
// Test: IPFS Metadata Privacy — Checkpoint #2
// 3 test cases as required by the rubric
//
// Run: npx tsx src/__tests__/security/ipfs-privacy.test.ts
// ---------------------------------------------------------------------------

import {
    stripSensitiveFields,
    buildIpfsMetadata,
    validateIpfsPayload,
} from '../../lib/ipfs';

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

console.log('\n🛡️  IPFS METADATA PRIVACY — Security Test Suite\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 1: Sensitive fields are stripped from output
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test Case 1: Sensitive fields stripped from IPFS metadata');
{
    const credential = {
        id: 'cred-uuid-123',
        skill_name: 'React',
        issued_at: '2025-06-15T00:00:00Z',
        issuer_did: 'did:polygon:amoy:0x1234',
        certificate_number: 'CERT-001',
        schema_url: 'https://example.com/schema/1',
        transaction_hash: '0xabc123',
        token_id: '42',
        // --- SENSITIVE DATA that must NOT appear in output ---
        email: 'student@university.edu',
        private_notes: 'This student struggled with finals',
        user_id: 'user-uuid-456',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        student_id: 'STU-2025-001',
    };

    const metadata = buildIpfsMetadata(credential);

    // Sensitive fields must NOT be in the output
    const metadataStr = JSON.stringify(metadata);
    assert(!metadataStr.includes('student@university.edu'), 'Email is stripped');
    assert(!metadataStr.includes('struggled with finals'), 'Private notes are stripped');
    assert(!metadataStr.includes('user-uuid-456'), 'User ID is stripped');
    assert(!metadataStr.includes('0x1234567890abcdef'), 'Wallet address is stripped');
    assert(!metadataStr.includes('STU-2025-001'), 'Student ID is stripped');

    // Public fields must be PRESERVED
    assert(metadata.skillName === 'React', 'Skill name preserved');
    assert(metadata.issuerDid === 'did:polygon:amoy:0x1234', 'Issuer DID preserved');
    assert(metadata.certificateNumber === 'CERT-001', 'Certificate number preserved');
    assert(metadata.transactionHash === '0xabc123', 'Transaction hash preserved');
    assert(metadata.notice.length > 0, 'Privacy notice included');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 2: Public fields are correctly preserved in output
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest Case 2: Public fields correctly preserved');
{
    const credential = {
        id: 'test-id',
        skill_name: 'Blockchain Development',
        issued_at: new Date('2025-01-01'),
        issuer_did: 'did:web:university.edu',
        certificate_number: 'BC-2025-042',
        schema_url: 'https://api.vector.com/schemas/blockchain',
        transaction_hash: '0xdeadbeef',
        token_id: '99',
        credential_data: {
            courseName: 'Advanced Solidity',
            grade: 'A',
            // Sensitive nested field
            private_notes: 'Internal grading notes',
            email: 'hidden@test.com',
        },
    };

    const metadata = buildIpfsMetadata(credential);

    assert(metadata.credentialId === 'test-id', 'credentialId preserved');
    assert(metadata.skillName === 'Blockchain Development', 'skillName preserved');
    assert(metadata.tokenId === '99', 'tokenId preserved');

    // credentialSubject should have courseName and grade, but NOT private_notes/email
    assert(metadata.credentialSubject.courseName === 'Advanced Solidity', 'Nested courseName preserved');
    assert(metadata.credentialSubject.grade === 'A', 'Nested grade preserved');
    assert(!('private_notes' in metadata.credentialSubject), 'Nested private_notes stripped');
    assert(!('email' in metadata.credentialSubject), 'Nested email stripped');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 3: Deeply nested sensitive data is still stripped
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest Case 3: Deep nested sensitive fields detected and stripped');
{
    const deepData = {
        level1: {
            safe_field: 'visible',
            level2: {
                another_safe: true,
                email: 'deep@hidden.com',
                level3: {
                    private_notes: 'super secret',
                    wallet_address: '0xdeep',
                    public_info: 'ok',
                },
            },
        },
        arrayField: [
            { name: 'item1', user_id: 'uid-123' },
            { name: 'item2', password: 'secret' },
        ],
    };

    const stripped = stripSensitiveFields(deepData);

    // stripSensitiveFields should recursively remove all sensitive keys
    assert(stripped.level1.safe_field === 'visible', 'Level 1 safe field preserved');
    assert(stripped.level1.level2.another_safe === true, 'Level 2 safe field preserved');
    assert(!('email' in stripped.level1.level2), 'Level 2 email stripped');
    assert(stripped.level1.level2.level3.public_info === 'ok', 'Level 3 safe field preserved');
    assert(!('private_notes' in stripped.level1.level2.level3), 'Level 3 private_notes stripped');
    assert(!('wallet_address' in stripped.level1.level2.level3), 'Level 3 wallet_address stripped');

    // Array items
    assert(stripped.arrayField[0].name === 'item1', 'Array item 1 name preserved');
    assert(!('user_id' in stripped.arrayField[0]), 'Array item 1 user_id stripped');
    assert(!('password' in stripped.arrayField[1]), 'Array item 2 password stripped');

    // validateIpfsPayload should confirm the cleaned payload is safe
    const violations = validateIpfsPayload(stripped);
    assert(violations.length === 0, 'validateIpfsPayload confirms no violations after stripping');

    // validateIpfsPayload on the ORIGINAL should catch violations
    const rawViolations = validateIpfsPayload(deepData);
    assert(rawViolations.length > 0, 'validateIpfsPayload catches violations in raw data');
    assert(rawViolations.includes('level1.level2.email'), 'Identifies deep email violation');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
