import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    let email = '';
    try {
      const body = await req.json();
      email = body?.email;
    } catch (e) {
      // Empty body is fine
    }

    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    // Query the Rate Limit Table
    const { data: limitRecord } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('ip', ip)
      .eq('endpoint', 'login')
      .single();

    const MAX_ATTEMPTS = 5; 
    const WINDOW_MINUTES = 15;

    if (limitRecord) {
      const lastAttempt = new Date(limitRecord.last_attempt).getTime();
      const timeDiffMins = (Date.now() - lastAttempt) / 60000;

      if (timeDiffMins < WINDOW_MINUTES && limitRecord.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
          { status: 429 }
        );
      }

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
      await supabaseAdmin.from('rate_limits').insert({
        ip,
        endpoint: 'login',
        attempts: 1,
        last_attempt: new Date().toISOString()
      });
    }

    // 🛑 THE FIX: Safely check for OAuth-Only Account 🛑
    if (email) {
      // 1. Get the user ID from your public users table
      const { data: publicUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (publicUser) {
        // 2. Fetch the Auth User securely using the Admin API
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(publicUser.id);
        
        if (authData?.user?.identities) {
          // 3. Check their connected providers
          const identities = authData.user.identities;
          const hasGoogle = identities.some(identity => identity.provider === 'google');
          const hasEmailPassword = identities.some(identity => identity.provider === 'email');

          // If they have Google but have never set a local password
          if (hasGoogle && !hasEmailPassword) {
            return NextResponse.json(
              { 
                success: false, 
                isOAuthOnly: true,
                message: 'It looks like you signed up with Google. Please log in using Google, or use "Forgot Password" to set up a local password.' 
              },
              { status: 403 }
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Login Check Error:", error);
    return NextResponse.json({ success: true }); 
  }
}