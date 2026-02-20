import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { logSystemTraffic } from '@/lib/logger';

const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

// ⚠️ Notice the addition of 'event: NextFetchEvent'
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const startTime = Date.now(); // Start the timer
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // 1. Initial Response
  let response = NextResponse.next({ request: { headers: request.headers } });

  // --- LOGGING HELPER ---
  // This safely handles the response and fires off the DB log in the background
  const logAndReturn = (res: NextResponse) => {
    const duration = Date.now() - startTime;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // event.waitUntil allows the response to finish and send to the user,
    // while the database insert happens asynchronously in the background.
    event.waitUntil(
      logSystemTraffic({
        method: request.method,
        path: pathname,
        status: res.status,
        ip_address: ip,
        duration: duration,
        user_agent: userAgent,
      })
    );

    return res;
  };

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
  if (!user && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    url.pathname = '/login';
    return logAndReturn(NextResponse.redirect(url));
  }

  // --- LOGIC FOR AUTHENTICATED USERS ---
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || 'student';
    const status = profile?.status || 'pending_verification'; 

    // --- RULE 1: PENDING VERIFICATION LOCKOUT ---
    if (status === 'pending_verification') {
      if (pathname !== '/verify-email') {
        url.pathname = '/verify-email';
        url.searchParams.set('email', user.email || '');
        return logAndReturn(NextResponse.redirect(url));
      }
      return logAndReturn(response);
    }

    // --- RULE 2: VERIFIED USERS ON VERIFICATION PAGE ---
    if (status === 'active' && pathname === '/verify-email') {
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return logAndReturn(NextResponse.redirect(url));
    }

    // --- RULE 3: AUTH PATHS ---
    if (AUTH_PATHS.some(p => pathname.startsWith(p)) && status === 'active') {
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return logAndReturn(NextResponse.redirect(url));
    }

    // --- RULE 4: RBAC ENFORCEMENT ---
    if (pathname.startsWith('/admin')) {
      if (role === 'super_admin') {
        return logAndReturn(response);
      } else {
        url.pathname = '/student/dashboard';
        return logAndReturn(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith('/student') && role === 'super_admin') {
      url.pathname = '/admin/dashboard';
      return logAndReturn(NextResponse.redirect(url));
    }

    if (pathname.startsWith('/registrar')) {
      if (role === 'registrar' || role === 'super_admin') {
        return logAndReturn(response);
      } else {
        url.pathname = '/student/dashboard';
        return logAndReturn(NextResponse.redirect(url));
      }
    }
  }

  return logAndReturn(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};