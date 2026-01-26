import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { students, batchName, registrarId } = body;

    // 1. Create the Batch Record
    const batch = await prisma.minting_batches.create({
      data: {
        batch_name: batchName,
        total_students: students.length,
        // In a real app, use the actual logged-in Registrar ID
        // For MVP, we can leave it null or use a seed ID
      }
    });

    // 2. Loop through students and save them to DB
    // (In production, we would loop to Mint on Blockchain here too)
    const results = [];
    
    for (const student of students) {
      // A. Create/Find User
      const user = await prisma.users.upsert({
        where: { wallet_address: student.wallet_address },
        update: {},
        create: {
          full_name: student.full_name,
          student_id: student.student_id,
          wallet_address: student.wallet_address,
          role: 'student'
        }
      });

      // B. Create "Verified Credential" Record
      const credential = await prisma.verified_credentials.create({
        data: {
          user_id: user.id,
          batch_id: batch.id,
          skill_name: student.skill_name,
          token_id: Math.floor(Math.random() * 1000).toString(), // Mock Token ID for now
          transaction_hash: "0xMockHash..." + Date.now(), // Mock Hash
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