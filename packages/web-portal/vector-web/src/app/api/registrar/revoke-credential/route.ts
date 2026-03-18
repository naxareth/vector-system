import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain';

export const dynamic = 'force-dynamic';

const RevokeSchema = z.object({
  credentialId: z.string().uuid(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // 1. Auth check - must be registrar
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {}
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is registrar or super_admin
    const currentUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (currentUser?.role !== 'registrar' && currentUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validate request payload
    const body = await req.json();
    const { credentialId } = RevokeSchema.parse(body);

    // 3. Fetch the credential to be revoked
    const credential = await prisma.verified_credentials.findUnique({
      where: { id: credentialId },
      include: { student: { select: { wallet_address: true } } },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.revoked) {
      return NextResponse.json({ error: 'Credential is already revoked' }, { status: 400 });
    }

    // 4. Burn the token on blockchain (Administrative Revocation)
    let transactionHash = null;

    if (credential.token_id) {
      const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (!deployerKey) {
        console.warn('[revoke] DEPLOYER_PRIVATE_KEY not configured. Performing database-only revocation (Soft Revoke).');
      } else {
        try {
          const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology/';
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const signer = new ethers.Wallet(deployerKey, provider);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);

          // Administrative Revoke: Registrar burns the token on behalf of the student
          const studentWallet = credential.student?.wallet_address;
          if (!studentWallet) throw new Error('Student has no wallet address');

          const tx = await contract.revokeSkill(studentWallet, credential.token_id, 1);
          const receipt = await tx.wait();
          transactionHash = tx.hash;

          console.log(`[revoke] Successfully burned token ${credential.token_id}: ${transactionHash}`);
        } catch (blockchainError: any) {
          console.error('[revoke] Blockchain burn failed:', blockchainError);
        }
      }
    }

    // 5. Mark credential as revoked in database
    const updated = await prisma.verified_credentials.update({
      where: { id: credentialId },
      data: {
        revoked: true,
        transaction_hash: transactionHash || credential.transaction_hash,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('[registrar/revoke-credential] POST error:', error);
    return NextResponse.json({ error: 'Failed to revoke credential' }, { status: 500 });
  }
}
