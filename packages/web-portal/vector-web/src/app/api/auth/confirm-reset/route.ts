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
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'PASSWORD_RESET') 
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Code Fetch Error:", fetchError);
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid or expired code' }, { status: 400 });
    }

    // 2. EFFICIENTLY Get User ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ success: false, message: 'User error' }, { status: 400 });
    }

    // 3. Force Password Update (This attaches a local password to Google accounts!)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password } 
    );

    if (updateError) throw updateError;

    // 4. Clean up used code
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'PASSWORD_RESET');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Reset Error:", error);
    return NextResponse.json({ success: false, message: 'Failed to reset password' }, { status: 500 });
  }
}