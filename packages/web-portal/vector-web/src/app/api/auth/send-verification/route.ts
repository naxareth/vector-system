import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationEmail } from '@/lib/email';

// Initialize Supabase Admin Client to securely bypass RLS for token generation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    // 1. Generate a cryptographically secure 6-digit code
    // Using crypto.getRandomValues is safer than Math.random() for auth tokens
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = (array[0] % 900000 + 100000).toString(); // Ensures it's always 6 digits (100000-999999)

    // 2. Set Expiration Time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // 3. Save to database & ensure public.users profile exists with correct role
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email: email,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database Error inserting verification code:", dbError);
      return NextResponse.json({ success: false, message: "Failed to generate secure code" }, { status: 500 });
    }

    // Ensure public.users profile exists with role from user_metadata if created via auth.signUp
    try {
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const targetAuthUser = authUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (targetAuthUser) {
        const userRole = targetAuthUser.user_metadata?.role || 'employer';
        const fullName = targetAuthUser.user_metadata?.full_name || email.split('@')[0];

        const { data: existingProfile } = await supabaseAdmin
          .from('users')
          .select('id, status')
          .eq('email', email)
          .maybeSingle();

        if (!existingProfile) {
          await supabaseAdmin.from('users').insert({
            id: targetAuthUser.id,
            email: email,
            full_name: fullName,
            role: userRole,
            status: 'pending_verification',
          });
        }
      }
    } catch (profileErr) {
      console.warn("Could not pre-sync user profile during send-verification:", profileErr);
    }

    // 4. Send the Email via Nodemailer
    const emailResult = await sendVerificationEmail(email, code);

    if (!emailResult.success) {
      console.error("Nodemailer Error:", emailResult.error);
      return NextResponse.json({ success: false, message: "Failed to dispatch email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification code sent successfully" });

  } catch (error: unknown) {
    console.error("Verification Route Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}