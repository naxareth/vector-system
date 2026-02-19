import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/email';
import { headers } from 'next/headers'; // 1. Import headers to grab IP address

// Initialize ADMIN client (bypasses RLS to save codes & check limits)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 🛑 RATE LIMITING LOGIC STARTS HERE 🛑
    
    // 1. Get Client IP Address
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    // 2. Query the Rate Limit Table
    const { data: limitRecord, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('ip', ip)
      .eq('endpoint', 'request-reset')
      .single();

    const MAX_ATTEMPTS = 5;
    const WINDOW_MINUTES = 15;

    if (limitRecord) {
      // Calculate time difference in minutes
      const timeDiff = (new Date().getTime() - new Date(limitRecord.last_attempt).getTime()) / 60000;

      // 3. Block if too many attempts in short window
      if (timeDiff < WINDOW_MINUTES && limitRecord.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
          { status: 429 } // HTTP 429 = Too Many Requests
        );
      }

      // 4. Reset counter if window passed, otherwise increment
      const newCount = timeDiff >= WINDOW_MINUTES ? 1 : limitRecord.attempts + 1;
      
      await supabaseAdmin
        .from('rate_limits')
        .update({ attempts: newCount, last_attempt: new Date().toISOString() })
        .eq('ip', ip)
        .eq('endpoint', 'request-reset');
        
    } else {
      // 5. First time visitor? Create record.
      await supabaseAdmin.from('rate_limits').insert({
        ip,
        endpoint: 'request-reset',
        attempts: 1
      });
    }
    // 🛑 RATE LIMITING LOGIC ENDS HERE 🛑


    // --- EXISTING LOGIC BELOW ---

    // 6. Check if user exists (Anti-Enumeration: Fake success if not found)
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);

    if (!user) {
      // Fake delay to simulate work (prevents timing attacks)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true }); 
    }

    // 7. Generate 6-Digit Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // 8. Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({ email, code, expires_at: expiresAt });

    if (dbError) throw dbError;

    // 9. Send Email
    await sendOTP(email, code);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("OTP Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}