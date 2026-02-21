import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    // Delete any pending password reset codes for this email
    const { error } = await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'PASSWORD_RESET'); // Ensures we don't delete email verification codes

    if (error) {
      console.error("Failed to delete OTP during cancellation:", error);
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel Reset Request Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}