import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the Admin client to securely bypass RLS for verification checks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ success: false, message: "Email and code are required." }, { status: 400 });
    }

    // 1. Fetch the most recent code for this email
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ success: false, message: "Invalid verification code." }, { status: 400 });
    }

    // 2. Check if the code has expired
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ success: false, message: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // 3. Update the User's Status
    // Changing status from 'pending_verification' to 'verified' (or your active enum value)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ status: 'active' }) 
      .eq('email', email);

    if (updateError) {
       console.error("Failed to update user status:", updateError);
       return NextResponse.json({ success: false, message: "Failed to activate account." }, { status: 500 });
    }

    // 4. Delete the used code to prevent replay attacks
    await supabaseAdmin.from('verification_codes').delete().eq('id', record.id);

    return NextResponse.json({ success: true, message: "Account verified successfully!" });

  } catch (error) {
    console.error("Verification Validation Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}