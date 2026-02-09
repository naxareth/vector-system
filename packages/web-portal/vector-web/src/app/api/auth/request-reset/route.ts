import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/email';

// Initialize ADMIN client (bypasses RLS to save codes)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 1. Check if user exists (Anti-Enumeration: Fake success if not found)
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);

    if (!user) {
      // Fake delay to simulate work
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true }); 
    }

    // 2. Generate 6-Digit Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // 3. Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({ email, code, expires_at: expiresAt });

    if (dbError) throw dbError;

    // 4. Send Email (or Log to Console)
    await sendOTP(email, code);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("OTP Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}