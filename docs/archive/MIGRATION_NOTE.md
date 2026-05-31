# Database Migration Required

## Schema Changes
The following fields have been added to the `users` table in `prisma/schema.prisma`:

- `phone` (String?)
- `bio` (String?)
- `university` (String?)
- `major` (String?)
- `graduation_year` (String?)
- `location` (String?)

## Migration Steps

### If using Prisma with a database:
```bash
cd packages/web-portal/vector-web
npx prisma migrate dev --name add_profile_fields
npx prisma generate
```

### If using Supabase directly:
Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS graduation_year TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;
```

## After Migration
Restart your Next.js development server to ensure the changes take effect.
