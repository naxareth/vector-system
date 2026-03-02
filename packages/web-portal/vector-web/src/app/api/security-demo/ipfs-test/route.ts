import { NextResponse } from 'next/server';
import { buildIpfsMetadata, validateIpfsPayload, stripSensitiveFields } from '@/lib/ipfs';

// ---------------------------------------------------------------------------
// POST /api/security-demo/ipfs-test
//
// Demo-only endpoint — shows before/after IPFS privacy stripping.
// Accepts a raw credential object, returns both the raw sensitive fields
// and the sanitized IPFS-safe output.
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Build the IPFS-safe metadata
        const safeMetadata = buildIpfsMetadata(body);

        // Also strip credential_data for comparison
        const strippedData = stripSensitiveFields(body);

        // Run violation check on raw data
        const rawViolations = validateIpfsPayload(body);

        // Run violation check on safe metadata
        const safeViolations = validateIpfsPayload(safeMetadata as any);

        return NextResponse.json({
            raw: {
                fieldCount: Object.keys(body).length,
                violations: rawViolations,
                violationCount: rawViolations.length,
            },
            sanitized: {
                metadata: safeMetadata,
                violations: safeViolations,
                violationCount: safeViolations.length,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
}
