
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRLS() {
  try {
    console.log('Checking RLS status and policies for verified_credentials...');
    
    // 1. Check if RLS is enabled
    const rlsStatus = await prisma.$queryRawUnsafe(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE relname = 'verified_credentials' AND nspname = 'public';
    `);
    console.log('\n--- RLS Status ---');
    console.log(rlsStatus);

    // 2. List all policies
    const policies = await prisma.$queryRawUnsafe(`
      SELECT * FROM pg_policies WHERE tablename = 'verified_credentials';
    `);
    console.log('\n--- Policies ---');
    console.log(policies);

  } catch (err) {
    console.error('❌ Failed to check RLS:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRLS();
