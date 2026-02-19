import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const cookieStore = await cookies();

    // 1. STANDARD CLIENT: Exchanges the code for a session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: any) { cookieStore.delete({ name, ...options }) },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session?.user) {
      console.log(`✅ Login Successful for: ${session.user.email}`);

      // 2. GOD MODE CLIENT: Create a temporary admin client to fetch the role reliably
      // We do this because RLS might block the standard client during the callback phase
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ MUST BE SERVICE_ROLE_KEY
        {
          cookies: {
             get(name: string) { return cookieStore.get(name)?.value },
          }
        }
      );

      // 3. Fetch Role using Admin Client
      const { data: userProfile, error: profileError } = await adminClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("❌ Critical: Failed to fetch user role even with Admin Client:", profileError.message);
      } else {
        console.log(`👉 Detected Role: ${userProfile?.role}`);
      }

      // 4. Determine Redirect
      const role = userProfile?.role || 'student';
      
      let redirectUrl = '/student/dashboard';
      if (role === 'registrar') {
        redirectUrl = '/registrar/dashboard';
      } else if (role === 'super_admin') {
        redirectUrl = '/admin/dashboard';
      }

      // Prioritize 'next' param if it exists, unless it's just the default
      if (next && next !== '/student/dashboard') {
        redirectUrl = next;
      }

      console.log(`🚀 Redirecting to: ${redirectUrl}`);
      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }
    
    console.error('❌ OAuth Exchange Error:', error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}