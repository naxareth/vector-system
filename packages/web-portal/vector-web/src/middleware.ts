import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // 1. Initial Response
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // --- RULE: UNAUTHENTICATED USERS ---
  // Ensure unauthenticated users cannot access protected paths
  if (!user && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    console.log(`🛡️ GUEST BLOCKED: Redirecting to /login`);
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // --- LOGIC FOR AUTHENTICATED USERS ---
  if (user) {
    console.log(`🔍 MIDDLEWARE check for: ${user.email} | Path: ${pathname}`);

    // Fetch both role and status
    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || 'student';
    const status = profile?.status || 'pending_verification'; // Default to pending for safety

    // --- RULE 1: PENDING VERIFICATION LOCKOUT ---
    // If the user hasn't verified their email, they can ONLY access the verify-email page
    if (status === 'pending_verification') {
      if (pathname !== '/verify-email') {
        console.log(`🔒 LOCKOUT: User ${user.email} is pending verification. Forcing to /verify-email`);
        url.pathname = '/verify-email';
        // Append email so the verification page knows who to verify
        url.searchParams.set('email', user.email || '');
        return NextResponse.redirect(url);
      }
      // If they are already on the verify-email page, let them stay
      return response;
    }

    // --- RULE 2: VERIFIED USERS ON VERIFICATION PAGE ---
    // If a verified user tries to go back to the verify-email page, bounce them to their dashboard
    if (status === 'active' && pathname === '/verify-email') {
      console.log(`✅ User ${user.email} is already verified. Redirecting to dashboard.`);
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return NextResponse.redirect(url);
    }

    // --- RULE 3: AUTH PATHS (Redirecting logged-in, verified users away from /login) ---
    if (AUTH_PATHS.some(p => pathname.startsWith(p)) && status === 'active') {
      console.log(`🚩 RULE 3 (Auth Path): User is ${role} and verified, redirecting to dashboard`);
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return NextResponse.redirect(url);
    }

    // --- RULE 4: RBAC ENFORCEMENT (For verified users) ---
    // Check A: Admin accessing Admin paths
    if (pathname.startsWith('/admin')) {
      if (role === 'super_admin') {
        console.log(`✅ ACCESS GRANTED: ${user.email} is Super Admin to /admin`);
        return response;
      } else {
        console.log(`⛔ ACCESS DENIED: ${user.email} is ${role}, NOT Admin. Booting to student.`);
        url.pathname = '/student/dashboard';
        return NextResponse.redirect(url);
      }
    }

    // Check B: Admin trapped in Student paths (FORCE MOVE)
    if (pathname.startsWith('/student') && role === 'super_admin') {
      console.log(`🚀 FORCE REDIRECT: Super Admin ${user.email} detected in /student. Moving to /admin.`);
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }

    // Check C: Registrar paths
    if (pathname.startsWith('/registrar')) {
      if (role === 'registrar' || role === 'super_admin') {
        return response;
      } else {
        url.pathname = '/student/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};