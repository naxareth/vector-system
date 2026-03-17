import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { students, batchName } = body;

    // Get the current user (registrar) from auth
    const cookieStore = await cookies();
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Create the Batch Record with the registrar ID
    const batch = await prisma.minting_batches.create({
      data: {
        batch_name: batchName,
        total_students: students.length,
        registrar_id: user.id, // Now properly set the registrar ID
      }
    });

    // 2. Loop through students and save them to DB
    const results = [];
    
    for (const student of students) {
      // A. Create/Find User
      const userRecord = await prisma.users.upsert({
        where: { wallet_address: student.wallet_address },
        update: {},
        create: {
          full_name: student.full_name,
          student_id: student.student_id,
          wallet_address: student.wallet_address,
          email: student.email || `${student.student_id}@student.local`,
          role: 'student'
        }
      });

      // B. Create "Verified Credential" Record
      const credential = await prisma.verified_credentials.create({
        data: {
          user_id: userRecord.id,
          batch_id: batch.id,
          skill_name: student.skill_name,
          token_id: Math.floor(Math.random() * 1000).toString(),
          transaction_hash: "0xMockHash..." + Date.now(),
          issuer_did: "PHINMA-Registrar-01"
        }
      });
      
      results.push(credential);
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `Successfully processed batch: ${batchName}`,
      mintedCount: results.length
    });

  } catch (error) {
    console.error('Minting Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}