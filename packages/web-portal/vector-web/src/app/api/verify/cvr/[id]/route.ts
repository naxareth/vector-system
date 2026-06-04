import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRateLimiter } from '@/lib/rate-limiter'; // 🛡️ Checkpoint #2

// ---------------------------------------------------------------------------
// GET /api/verify/cvr/[id]
//
// Public — no auth required.
// Returns CVR snapshot, student identity, per-credential verification status,
// and isLatest flag so employers know if a newer version exists.
//
// 🛡️ SECURITY (Checkpoint #2):
//   - Rate limited: 10 requests/minute per IP
//   - PII redacted: email removed, studentId removed
// ---------------------------------------------------------------------------

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



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

  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid CVR export ID format.' }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 1. Fetch cvr_exports record
  // -------------------------------------------------------------------------
  let cvrExport;
  try {
    cvrExport = await prisma.cvr_exports.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            full_name: true,

            // 🛡️ student_id and email intentionally NOT selected (PII redaction)
          },
        },
      },
    });
  } catch (err) {
    console.error('[verify/cvr] DB error:', err);
    return NextResponse.json({ error: 'Database lookup failed.' }, { status: 500 });
  }

  if (!cvrExport) {
    return NextResponse.json({ error: 'CVR export not found.' }, { status: 404 });
  }

  // -------------------------------------------------------------------------
  // 2. isLatest check — does a newer CVR exist for this student?
  // -------------------------------------------------------------------------
  let isLatest = true;
  let newerExportDate: string | null = null;

  try {
    const newerExport = await prisma.cvr_exports.findFirst({
      where: {
        user_id: cvrExport.user_id,
        generated_at: { gt: cvrExport.generated_at ?? new Date(0) },
      },
      orderBy: { generated_at: 'desc' },
      select: { id: true, generated_at: true },
    });

    if (newerExport) {
      isLatest = false;
      newerExportDate = newerExport.generated_at?.toISOString() ?? null;
    }
  } catch (err) {
    // Non-fatal — default to isLatest: true if check fails
    console.error('[verify/cvr] isLatest check error:', err);
  }

  // -------------------------------------------------------------------------
  // 3. Fetch verified_credentials in this CVR
  // -------------------------------------------------------------------------
  let credentials: { id: string; skill_name: string; issued_at: Date | null; certificate_number: string | null; revoked: boolean | null; batch: { batch_name: string | null; registrar: { full_name: string | null } | null } | null }[] = [];
  if (cvrExport.credential_ids && cvrExport.credential_ids.length > 0) {
    try {
      credentials = await prisma.verified_credentials.findMany({
        where: { id: { in: cvrExport.credential_ids } },
        select: {
          id: true,
          skill_name: true,

          issued_at: true,
          certificate_number: true,
          revoked: true,
          batch: {
            select: {
              batch_name: true,
              registrar: {
                select: { full_name: true },
              },
            },
          },
        },
      });
    } catch (err) {
      console.error('[verify/cvr] credentials fetch error:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Verification per credential
  // -------------------------------------------------------------------------

  const verifiedCredentials = await Promise.all(
    credentials.map(async (cred) => {
      const onChain = {
        verified: !cred.revoked,
        balance: null,
        error: cred.revoked ? 'This credential has been revoked.' : null,
      };

      return {
        id: cred.id,
        skillName: cred.skill_name,

        issuedAt: cred.issued_at,
        certificateNumber: cred.certificate_number ?? null,
        batchName: cred.batch?.batch_name ?? null,
        registrarName: cred.batch?.registrar?.full_name ?? null,
        onChain,
      };
    })
  );

  // -------------------------------------------------------------------------
  // 5. Response
  // -------------------------------------------------------------------------
  return NextResponse.json(
    {
      cvrExport: {
        id: cvrExport.id,
        generatedAt: cvrExport.generated_at,
        template: cvrExport.template,
      },
      student: {
        fullName: cvrExport.users.full_name ?? 'Unknown',
        // 🛡️ studentId removed — not included in response (PII redaction)

      },
      credentials: verifiedCredentials,
      snapshot: cvrExport.snapshot,
      isLatest,
      newerExportDate,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    }
  );
}