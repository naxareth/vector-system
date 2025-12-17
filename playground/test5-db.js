require('dotenv').config();

console.log("🗄️ Testing Database Connection...");
console.log("Database URL present:", process.env.DATABASE_URL ? "✅ Yes" : "❌ No");

if (process.env.DATABASE_URL) {
    const { execSync } = require('child_process');
    const fs = require('fs');
    
    // Create minimal schema
    const schemaDir = './prisma';
    if (!fs.existsSync(schemaDir)) fs.mkdirSync(schemaDir);
    
    fs.writeFileSync('./prisma/schema.prisma', `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model TestLog {
  id        Int      @id @default(autoincrement())
  message   String
  createdAt DateTime @default(now())
}
    `);
    
    console.log("✅ Prisma schema created at ./prisma/schema.prisma");
    console.log("Next: Run 'npx prisma db push' to create table in Supabase");
}