import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, code, password } = await req.json();

    // 1. Verify Code from DB, explicitly checking the type
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'PASSWORD_RESET') // Security Check: Must be a reset code
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

    // 2. Get User ID from Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;

    const user = users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User error' }, { status: 400 });
    }

    // 3. Force Password Update
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password } // Bypasses the need for the old password
    );

    if (updateError) throw updateError;

    // 4. Clean up used code (only deleting reset codes, preserving any active email verifications)
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