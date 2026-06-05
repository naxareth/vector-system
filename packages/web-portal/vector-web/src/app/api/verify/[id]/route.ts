import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRateLimiter } from '@/lib/rate-limiter'; // 🛡️ Checkpoint #2

// ---------------------------------------------------------------------------
// GET /api/verify/[id]
//
// Public endpoint — no auth required. Resolves a credential UUID to:
//   1. DB record (skill, student identity, issuer, dates)
//   2. Database verification (revocation check)
//
// 🛡️ SECURITY (Checkpoint #2):
//   - Rate limited: 10 requests/minute per IP
//   - PII redacted: studentId removed
//
// Why UUID as the identifier:
//   - Not enumerable (v4 random 128-bit)
//   - Not publicly exposed by default
//   - Acts as a "secret" share link the student controls
// ---------------------------------------------------------------------------




export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // -------------------------------------------------------------------------
  // 🛡️ Rate Limiting (Checkpoint #2)
  // -------------------------------------------------------------------------
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || _req.headers.get('x-real-ip')
    || 'unknown';

  const rateCheck = verifyRateLimiter.checkLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const { id } = await params;

  // Basic UUID format guard
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid credential ID format.' }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 1. Database lookup
  // -------------------------------------------------------------------------
  let credential;
  try {
    credential = await prisma.verified_credentials.findUnique({
      where: { id },
      select: {
        id: true,
        skill_name: true,

        issuer_did: true,
        schema_url: true,
        issued_at: true,
        certificate_number: true,
        revoked: true,
        // Join student identity
        student: {
          select: {
            full_name: true,
            // 🛡️ student_id intentionally NOT selected (PII redaction)
          },
        },
        // Join batch / registrar info
        batch: {
          select: {
            batch_name: true,
            registrar: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error('[verify] DB error:', err);
    return NextResponse.json({ error: 'Database lookup failed.' }, { status: 500 });
  }

  if (!credential) {
    return NextResponse.json({ error: 'Credential not found.' }, { status: 404 });
  }

  // -------------------------------------------------------------------------
  // 2. Verification
  //    — A credential is verified if it exists in the database and is not revoked.
  // -------------------------------------------------------------------------
  const verification = {
    verified: !credential.revoked,
    balance: null,
    error: credential.revoked ? 'This credential has been revoked.' : null,
  };

  // -------------------------------------------------------------------------
  // 3. Build response — 🛡️ only expose safe public fields (Checkpoint #2)
  //    - studentId: REMOVED (PII)

  // -------------------------------------------------------------------------
  return NextResponse.json(
    {
      credential: {
        id: credential.id,
        skillName: credential.skill_name,
        issuedAt: credential.issued_at,
        certificateNumber: credential.certificate_number ?? null,
        issuerDid: credential.issuer_did ?? null,
        schemaUrl: credential.schema_url ?? null,

      },
      student: {
        fullName: credential.student.full_name ?? 'Unknown',
        // 🛡️ studentId removed — not included in response

      },
      issuedBy: {
        batchName: credential.batch?.batch_name ?? null,
        registrarName: credential.batch?.registrar?.full_name ?? null,
      },
      verification,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    }
  );
}