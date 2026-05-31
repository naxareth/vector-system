import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Auth check - must be registrar or super_admin
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      select: { role: true, wallet_address: true },
    });

    if (currentUser?.role !== 'registrar' && currentUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch all minting batches for this registrar
    const batches = await prisma.minting_batches.findMany({
      where: { registrar_id: user.id },
      select: { id: true },
    });

    console.log(`[registrar/users] Found ${batches.length} batches for registrar ${user.id}`);

    const batchIds = batches.map((b) => b.id);

    // 3. Get all credentials from those batches
    let credentialsInBatches: { user_id: string }[] = [];
    if (batchIds.length > 0) {
      credentialsInBatches = await prisma.verified_credentials.findMany({
        where: { batch_id: { in: batchIds } },
        select: { user_id: true },
      });
    }

    console.log(`[registrar/users] Found ${credentialsInBatches.length} credentials in batches`);

    // 4. Extract unique student IDs from batches
    const uniqueStudentIds = new Set(credentialsInBatches.map((c) => c.user_id));

    // 5. As a fallback, also fetch recent credentials created by this registrar
    // that might not have a batch (for backwards compatibility with old issuances)
    // These are identified by issuer_did containing the registrar's wallet or user ID
    if (batches.length === 0) {
      console.log(`[registrar/users] No batches found, looking for direct credentials...`);
      
      const recentCredentials = await prisma.verified_credentials.findMany({
        where: {
          issued_at: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
          }
        },
        select: { user_id: true, issuer_did: true },
      });

      // Filter credentials issued by this registrar based on issuer_did
      const registrarWallet = `did:polygon:amoy:${currentUser.wallet_address || ''}`;
      const registrarWebDid = `did:web:yourdomain.com:registrar:${user.id}`;

      recentCredentials.forEach(cred => {
        if (cred.issuer_did && 
            (cred.issuer_did.includes(user.id) || 
             cred.issuer_did === registrarWallet || 
             cred.issuer_did === registrarWebDid)) {
          uniqueStudentIds.add(cred.user_id);
        }
      });

      console.log(`[registrar/users] Found ${uniqueStudentIds.size} students from recent credentials`);
    }

    const studentIds = Array.from(uniqueStudentIds);

    // If no credentials exist, return empty array
    if (studentIds.length === 0) {
      console.log(`[registrar/users] No credentials found, returning empty array`);
      return NextResponse.json([]);
    }

    // 6. Fetch only students that this registrar has issued credentials to
    const users = await prisma.users.findMany({
      where: {
        id: { in: studentIds },
        role: 'student',
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        wallet_address: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    console.log(`[registrar/users] Found ${users.length} student users`);

    // 7. For each user, fetch their credentials issued by this registrar
    const usersWithCredentials = await Promise.all(
      users.map(async (userRecord) => {
        let credentials: { id: string; skill_name: string; issued_at: Date | null; transaction_hash: string | null; token_id: string; revoked: boolean; issuer_did: string | null }[] = [];
        
        // First try to get credentials from batches
        if (batchIds.length > 0) {
          credentials = await prisma.verified_credentials.findMany({
            where: {
              user_id: userRecord.id,
              batch_id: { in: batchIds },
            },
            select: {
              id: true,
              skill_name: true,
              issued_at: true,
              transaction_hash: true,
              token_id: true,
              revoked: true,
              issuer_did: true,
            },
            orderBy: { issued_at: 'desc' },
          });
        }

        // If no batch credentials found and we have no batches, get all credentials for this user
        // (for backwards compatibility)
        if (credentials.length === 0 && batchIds.length === 0) {
          credentials = await prisma.verified_credentials.findMany({
            where: {
              user_id: userRecord.id,
              issued_at: {
                gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
              }
            },
            select: {
              id: true,
              skill_name: true,
              issued_at: true,
              transaction_hash: true,
              token_id: true,
              revoked: true,
              issuer_did: true,
            },
            orderBy: { issued_at: 'desc' },
          });

          // Filter by registrar
          const registrarWallet = `did:polygon:amoy:${currentUser.wallet_address || ''}`;
          const registrarWebDid = `did:web:yourdomain.com:registrar:${user.id}`;

          credentials = credentials.filter(c => 
            c.issuer_did && 
            (c.issuer_did.includes(user.id) || 
             c.issuer_did === registrarWallet || 
             c.issuer_did === registrarWebDid)
          );
        }

        return {
          ...userRecord,
          credentials: credentials.map(c => ({
            id: c.id,
            skill_name: c.skill_name,
            issued_at: c.issued_at,
            transaction_hash: c.transaction_hash,
            token_id: c.token_id,
            revoked: c.revoked,
          })),
          totalCredentials: credentials.length,
          activeCredentials: credentials.filter((c) => !c.revoked).length,
        };
      })
    );

    console.log(`[registrar/users] Returning ${usersWithCredentials.length} users with credentials`);
    return NextResponse.json(usersWithCredentials);
  } catch (error: unknown) {
    console.error('[registrar/users] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
