import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';
import { headers } from 'next/headers'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 🛑 RATE LIMITING LOGIC 🛑
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    const { data: limitRecord } = await supabaseAdmin
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

    // --- EFFICIENT USER CHECK ---
    // Fetch just the ID from your public users table instead of loading all auth users
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      // Fake delay to simulate work (prevents timing attacks/email enumeration)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ success: true }); 
    }

    // Generate 6-Digit Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); 

    // Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({ 
        email, 
        code, 
        expires_at: expiresAt,
        type: 'PASSWORD_RESET' 
      });

    if (dbError) throw dbError;

    // Send Email
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