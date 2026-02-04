import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, code, password } = await req.json();

    // 1. Verify Code from DB
    const { data: records } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid or expired code' }, { status: 400 });
    }

    // 2. Get User ID
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) return NextResponse.json({ success: false, message: 'User error' }, { status: 400 });

    // 3. Force Password Update
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) throw updateError;

    // 4. Clean up used code
    await supabaseAdmin.from('verification_codes').delete().eq('email', email);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Reset Error:", error);
    return NextResponse.json({ success: false, message: 'Failed to reset password' }, { status: 500 });
  }
}