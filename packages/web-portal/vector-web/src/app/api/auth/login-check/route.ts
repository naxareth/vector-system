import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Initialize ADMIN client to bypass RLS for the rate limit check
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. Get Client IP (FIX: await headers())
    const headersList = await headers(); // <--- This was the fix
    const forwardedFor = headersList.get('x-forwarded-for');
    
    // On localhost, IP is often missing, so we use a placeholder to allow testing
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // 2. Query the Rate Limit Table
    const { data: limitRecord } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('ip', ip)
      .eq('endpoint', 'login')
      .single();

    // CONFIGURATION
    const MAX_ATTEMPTS = 5; 
    const WINDOW_MINUTES = 15;

    if (limitRecord) {
      const lastAttempt = new Date(limitRecord.last_attempt).getTime();
      const timeDiffMins = (Date.now() - lastAttempt) / 60000;

      // BLOCK if max attempts reached within window
      if (timeDiffMins < WINDOW_MINUTES && limitRecord.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
          { status: 429 }
        );
      }

      // RESET or INCREMENT
      const shouldReset = timeDiffMins >= WINDOW_MINUTES;
      
      await supabaseAdmin
        .from('rate_limits')
        .update({ 
          attempts: shouldReset ? 1 : limitRecord.attempts + 1, 
          last_attempt: new Date().toISOString() 
        })
        .eq('ip', ip)
        .eq('endpoint', 'login');

    } else {
      // FIRST ATTEMPT: Create record
      await supabaseAdmin.from('rate_limits').insert({
        ip,
        endpoint: 'login',
        attempts: 1,
        last_attempt: new Date().toISOString()
      });
    }

    // ALLOW ACCESS
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Rate Limit Error:", error);
    // Fail open so we don't block legitimate users if the DB hiccups
    return NextResponse.json({ success: true }); 
  }
}