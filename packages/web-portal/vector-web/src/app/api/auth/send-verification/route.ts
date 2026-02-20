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

    // 3. Save to database
    // We invalidate older codes by just letting them exist, but we could also delete them here to keep the table clean
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

    // 4. Send the Email via Nodemailer
    const emailResult = await sendVerificationEmail(email, code);

    if (!emailResult.success) {
      console.error("Nodemailer Error:", emailResult.error);
      return NextResponse.json({ success: false, message: "Failed to dispatch email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification code sent successfully" });

  } catch (error) {
    console.error("Verification Route Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}