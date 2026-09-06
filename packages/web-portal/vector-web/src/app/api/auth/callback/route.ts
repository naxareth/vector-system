import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const requestedRole = searchParams.get('role');

  if (code) {
    const cookieStore = await cookies();

    // 1. STANDARD CLIENT: Exchanges the code for a session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: Record<string, unknown>) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: Record<string, unknown>) { cookieStore.delete({ name, ...options }) },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session?.user) {
      console.log(`✅ Login Successful for: ${session.user.email}`);

      // 2. GOD MODE CLIENT: Create a temporary admin client to fetch/create the profile reliably
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
      let { data: userProfile, error: profileError } = await adminClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const metadataRole = session.user.user_metadata?.role;
      const targetRole = requestedRole || metadataRole || 'student';

      // If user profile does not exist yet in public.users (e.g. new Google OAuth signup)
      if (profileError || !userProfile) {
        console.log(`⚠️ User profile missing for ${session.user.id}, creating profile with role: ${targetRole}`);
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        const { data: newProfile, error: insertError } = await adminClient
          .from('users')
          .insert({
            id: session.user.id,
            full_name: fullName,
            email: session.user.email,
            role: targetRole,
          })
          .select('role')
          .single();

        if (insertError) {
          console.error("❌ Failed to create user profile during OAuth callback:", insertError.message);
        } else if (newProfile) {
          userProfile = newProfile;
        }
      }

      const role = userProfile?.role || targetRole;
      console.log(`👉 Final Resolved Role: ${role}`);

      // 4. Determine Redirect URL based on role
      let redirectUrl = '/student/dashboard?login=success';
      if (role === 'employer') {
        redirectUrl = '/employer/dashboard';
      } else if (role === 'registrar') {
        redirectUrl = '/registrar/dashboard';
      } else if (role === 'super_admin') {
        redirectUrl = '/admin/dashboard';
      }

      // Prioritize 'next' param if it exists, unless it's just default
      if (next && next !== '/student/dashboard') {
        redirectUrl = next;
      }

      console.log(`🚀 Redirecting to: ${redirectUrl}`);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
      return NextResponse.redirect(`${baseUrl}${redirectUrl}`);
    }
    
    console.error('❌ OAuth Exchange Error:', error?.message);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
}