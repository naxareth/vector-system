import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { logSystemTraffic } from '@/lib/logger';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';

const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin'];
// 1. Added registrar and student quick-entry routes to AUTH_PATHS
const AUTH_PATHS = [
  '/login',
  '/register',
  '/registrar-register',
  '/registrar-login',
  '/student-register',
  '/student-login',
  '/forgot-password',
];

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const startTime = Date.now(); // Start the timer
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // 1. Initial Response
  let response = NextResponse.next({ request: { headers: request.headers } });

  // --- CSRF PROTECTION (Task 9 Integration) ---
  const isStateChangingApi = pathname.startsWith('/api/') && 
                             ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
                             
  const csrfCookie = request.cookies.get('vector-csrf-token')?.value;
  
  if (isStateChangingApi && !pathname.includes('/api/auth')) {
    const headerToken = request.headers.get('x-csrf-token');
    
    // Fail-Safe: Only block if the cookie EXISTS but the header is wrong/missing.
    // This prevents breaking the app before the frontend is fully updated.
    if (csrfCookie && csrfCookie !== headerToken) {
      console.warn(`🚨 CSRF Attempt Blocked: ${request.method} ${pathname}. Expected ${csrfCookie}, got ${headerToken}`);
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' }, 
        { status: 403 }
      );
    }
  }

  // Always ensure a CSRF token is generated/refreshed for the browser
  const token = generateCsrfToken(response);
  // Add the token to the response headers so the frontend can read it once (non-HttpOnly header)
  response.headers.set('x-csrf-token', token);

  // --- LOGGING HELPER ---
  const logAndReturn = (res: NextResponse) => {
    const duration = Date.now() - startTime;
    const ip = (request as any).ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
  // 2. Added `&& !AUTH_PATHS.includes(pathname)` to prevent prefix collisions
  if (!user && PROTECTED_PATHS.some(p => pathname.startsWith(p)) && !AUTH_PATHS.includes(pathname)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    return logAndReturn(NextResponse.redirect(`${baseUrl}/login${url.search}`));
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        url.searchParams.set('email', user.email || '');
        return logAndReturn(NextResponse.redirect(`${baseUrl}/verify-email${url.search}`));
      }
      return logAndReturn(response);
    }

    // --- RULE 2: VERIFIED USERS ON VERIFICATION PAGE ---
    if (status === 'active' && pathname === '/verify-email') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
      const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return logAndReturn(NextResponse.redirect(`${baseUrl}${targetPath}${url.search}`));
    }

    // --- RULE 3: AUTH PATHS ---
    if (AUTH_PATHS.some(p => pathname.startsWith(p)) && status === 'active') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
      const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
      return logAndReturn(NextResponse.redirect(`${baseUrl}${targetPath}${url.search}`));
    }

    // --- RULE 4: RBAC ENFORCEMENT ---
    if (pathname.startsWith('/admin')) {
      if (role === 'super_admin') {
        return logAndReturn(response);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        return logAndReturn(NextResponse.redirect(`${baseUrl}/student/dashboard${url.search}`));
      }
    }

    if (pathname.startsWith('/student') && role === 'super_admin') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
      return logAndReturn(NextResponse.redirect(`${baseUrl}/admin/dashboard${url.search}`));
    }

    if (pathname.startsWith('/registrar')) {
      if (role === 'registrar' || role === 'super_admin') {
        return logAndReturn(response);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        return logAndReturn(NextResponse.redirect(`${baseUrl}/student/dashboard${url.search}`));
      }
    }
  }

  return logAndReturn(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};