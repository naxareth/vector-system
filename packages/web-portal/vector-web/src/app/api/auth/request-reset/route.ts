import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';
import { headers } from 'next/headers'; 

// Initialize ADMIN client (bypasses RLS to save codes & check limits)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 🛑 RATE LIMITING LOGIC STARTS HERE 🛑
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    const { data: limitRecord, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('ip', ip)
      .eq('endpoint', 'request-reset')
      .single();

    const MAX_ATTEMPTS = 5;
    const WINDOW_MINUTES = 15;

    if (limitRecord) {
      const timeDiff = (new Date().getTime() - new Date(limitRecord.last_attempt).getTime()) / 60000;

      if (timeDiff < WINDOW_MINUTES && limitRecord.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
          { status: 429 } 
        );
      }

      const newCount = timeDiff >= WINDOW_MINUTES ? 1 : limitRecord.attempts + 1;
      
      await supabaseAdmin
        .from('rate_limits')
        .update({ attempts: newCount, last_attempt: new Date().toISOString() })
        .eq('ip', ip)
        .eq('endpoint', 'request-reset');
        
    } else {
      await supabaseAdmin.from('rate_limits').insert({
        ip,
        endpoint: 'request-reset',
        attempts: 1
      });
    }
    // 🛑 RATE LIMITING LOGIC ENDS HERE 🛑

    // --- EXISTING LOGIC BELOW ---

    // 6. Check if user exists (Anti-Enumeration: Fake success if not found)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = users?.users.find(u => u.email === email);

    if (!user) {
      // Fake delay to simulate work (prevents timing attacks)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true }); 
    }

    // 7. Generate 6-Digit Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Aligned to 15 mins

    // 8. Save to DB with specific OTP type
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({ 
        email, 
        code, 
        expires_at: expiresAt,
        type: 'PASSWORD_RESET' 
      });

    if (dbError) throw dbError;

    // 9. Send Email
    const emailResult = await sendPasswordResetEmail(email, code);
    
    if (!emailResult.success) {
      return NextResponse.json({ success: false, message: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Password Reset Request Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}