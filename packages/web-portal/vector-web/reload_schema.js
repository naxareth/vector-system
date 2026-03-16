
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reloadCache() {
  try {
    console.log('Attempting to reload PostgREST schema cache...');
    // This command notifies PostgREST to refresh its cache of the database schema
    await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload schema';");
    console.log('✅ Success! PostgREST schema cache reload signal sent.');
    
    // Also verify columns while we are at it
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'verified_credentials'
    `);
    console.log('\n--- Table Columns ---');
    console.log(columns.map(c => c.column_name).join(', '));
    
  } catch (err) {
    console.error('❌ Failed to reload schema cache:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reloadCache();
