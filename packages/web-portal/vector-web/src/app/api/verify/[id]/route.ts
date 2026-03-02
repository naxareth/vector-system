import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain';
import { verifyRateLimiter } from '@/lib/rate-limiter'; // 🛡️ Checkpoint #2

// ---------------------------------------------------------------------------
// GET /api/verify/[id]
//
// Public endpoint — no auth required. Resolves a credential UUID to:
//   1. DB record (skill, student identity, issuer, dates)
//   2. On-chain verification against Polygon Amoy (token balance check)
//
// 🛡️ SECURITY (Checkpoint #2):
//   - Rate limited: 10 requests/minute per IP
//   - PII redacted: studentId removed, walletAddress truncated
//
// Why UUID as the identifier:
//   - Not enumerable (v4 random 128-bit) unlike sequential token_id
//   - Not exposed by default on-chain unlike transaction_hash
//   - Acts as a "secret" share link the student controls
// ---------------------------------------------------------------------------

const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology/';

/** Truncate a string for public display (e.g. wallet address) */
function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
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
        token_id: true,
        transaction_hash: true,
        issuer_did: true,
        schema_url: true,
        issued_at: true,
        certificate_number: true,
        // Join student identity
        student: {
          select: {
            full_name: true,
            wallet_address: true,
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
  // 2. On-chain verification via Polygon Amoy RPC
  //    — Checks the student's wallet actually holds the token
  //    — Standalone: no MetaMask, no frontend wallet required
  // -------------------------------------------------------------------------
  let onChain: {
    verified: boolean;
    balance: number | null;
    tokenId: string | null;
    error: string | null;
  } = { verified: false, balance: null, tokenId: null, error: null };

  const { wallet_address } = credential.student;
  const tokenId = credential.token_id;

  if (wallet_address && tokenId) {
    try {
      const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      const balance: bigint = await contract.balanceOf(wallet_address, BigInt(tokenId));

      onChain = {
        verified: balance > 0n,
        balance: Number(balance),
        tokenId,
        error: null,
      };
    } catch (err: any) {
      console.error('[verify] On-chain check failed:', err.message);
      // Non-fatal: return DB data with chain error flagged
      onChain = {
        verified: false,
        balance: null,
        tokenId,
        error: 'Could not reach Polygon Amoy RPC. Chain status unavailable.',
      };
    }
  } else {
    onChain.error = 'No wallet address or token ID associated with this credential.';
  }

  // -------------------------------------------------------------------------
  // 3. Build response — 🛡️ only expose safe public fields (Checkpoint #2)
  //    - studentId: REMOVED (PII)
  //    - walletAddress: TRUNCATED (only first 6 + last 4 chars)
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
        transactionHash: credential.transaction_hash ?? null,
      },
      student: {
        fullName: credential.student.full_name ?? 'Unknown',
        // 🛡️ studentId removed — not included in response
        // 🛡️ walletAddress truncated for privacy
        walletAddress: wallet_address ? truncateAddress(wallet_address) : null,
      },
      issuedBy: {
        batchName: credential.batch?.batch_name ?? null,
        registrarName: credential.batch?.registrar?.full_name ?? null,
      },
      onChain,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    }
  );
}