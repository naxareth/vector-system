import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain';

// ---------------------------------------------------------------------------
// GET /api/verify/cvr/[id]
//
// Public — no auth required.
// Returns CVR snapshot, student identity, per-credential on-chain status,
// and isLatest flag so employers know if a newer version exists.
// ---------------------------------------------------------------------------

const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology/';
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            student_id: true,
            wallet_address: true,
            email: true,
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
  let credentials: any[] = [];
  if (cvrExport.credential_ids && cvrExport.credential_ids.length > 0) {
    try {
      credentials = await prisma.verified_credentials.findMany({
        where: { id: { in: cvrExport.credential_ids } },
        select: {
          id: true,
          skill_name: true,
          token_id: true,
          transaction_hash: true,
          issued_at: true,
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
  // 4. On-chain verification per credential
  // -------------------------------------------------------------------------
  const walletAddress = cvrExport.users?.wallet_address;
  const verifiedCredentials = await Promise.all(
    credentials.map(async (cred) => {
      let onChain: { verified: boolean; balance: number | null; error: string | null } =
        { verified: false, balance: null, error: null };

      if (walletAddress && cred.token_id) {
        try {
          const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
          const balance: bigint = await contract.balanceOf(walletAddress, BigInt(cred.token_id));
          onChain = { verified: balance > BigInt(0), balance: Number(balance), error: null };
        } catch {
          onChain = { verified: false, balance: null, error: 'Could not reach Polygon Amoy RPC.' };
        }
      } else {
        onChain.error = 'No wallet address or token ID associated with this credential.';
      }

      return {
        id: cred.id,
        skillName: cred.skill_name,
        tokenId: cred.token_id,
        transactionHash: cred.transaction_hash ?? null,
        issuedAt: cred.issued_at,
        batchName: cred.batch?.batch_name ?? null,
        registrarName: cred.batch?.registrar?.full_name ?? null,
        onChain,
      };
    })
  );

  // -------------------------------------------------------------------------
  // 5. Response
  // -------------------------------------------------------------------------
  return NextResponse.json({
    cvrExport: {
      id: cvrExport.id,
      generatedAt: cvrExport.generated_at,
      template: cvrExport.template,
    },
    student: {
      fullName: cvrExport.users?.full_name ?? 'Unknown',
      studentId: cvrExport.users?.student_id ?? null,
      walletAddress: walletAddress ?? null,
    },
    credentials: verifiedCredentials,
    snapshot: cvrExport.snapshot,
    isLatest,
    newerExportDate,
  });
}