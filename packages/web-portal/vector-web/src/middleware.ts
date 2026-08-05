import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { logSystemTraffic } from '@/lib/logger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';

const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin', '/employer'];
// 1. Added registrar and student quick-entry routes to AUTH_PATHS
const AUTH_PATHS = [
  '/login',
  '/register',
  '/registrar-register',
  '/registrar-login',
  '/student-register',
  '/student-login',
  '/employer-register',
  '/employer-login',
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
    const requestOrigin = request.headers.get('origin');
    const isSameOriginRequest = !requestOrigin || requestOrigin === url.origin;
    
    // Backward compatibility: allow same-origin browser requests without a CSRF header.
    // Cross-site requests must still provide a valid double-submit token.
    if (csrfCookie && ((headerToken && csrfCookie !== headerToken) || (!headerToken && !isSameOriginRequest))) {
      console.warn(`🚨 CSRF Attempt Blocked: ${request.method} ${pathname}. Expected ${csrfCookie}, got ${headerToken}`);
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' }, 
        { status: 403 }
      );
    }
  }

  // Always ensure a CSRF token is generated/refreshed for the browser
  const token = generateCsrfToken(response, csrfCookie);
  // Add the token to the response headers so the frontend can read it once (non-HttpOnly header)
  response.headers.set('x-csrf-token', token);

  // --- LOGGING HELPER ---
  const logAndReturn = (res: NextResponse) => {
    const duration = Date.now() - startTime;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Preserve any session cookies attached during middleware processing
    response.cookies.getAll().forEach(c => {
      res.cookies.set(c);
    });

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

  const isApiRoute = pathname.startsWith('/api/');
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('auth-token') || c.name.startsWith('sb-'));

  let user = null;

  if (!isApiRoute && hasAuthCookie) {
    try {
      const { data, error } = await supabase.auth.getUser();
      // Keep user object if authenticated, or if rate-limited (429) to avoid false logout
      if (data?.user) {
        user = data.user;
      } else if (error && (error as { status?: number }).status === 429) {
        console.warn(`[Middleware] Supabase auth rate limited (429). Bypassing redirect.`);
      }
    } catch {
      // Ignore transient network errors
    }
  }

  // --- RULE: UNAUTHENTICATED USERS ---
  // 2. Added `&& !AUTH_PATHS.includes(pathname)` to prevent prefix collisions
  if (!user && !isApiRoute && PROTECTED_PATHS.some(p => pathname.startsWith(p)) && !AUTH_PATHS.includes(pathname)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    return logAndReturn(NextResponse.redirect(`${baseUrl}/login${url.search}`));
  }

  // --- LOGIC FOR AUTHENTICATED USERS ---
  if (user) {
    let role = 'student';
    let status = 'active';

    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        role = profile.role || 'student';
        status = profile.status || 'active';
      }
    } catch {
      // If DB query fails or rate-limited, fallback safely to active to avoid false logouts
    }

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
      const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : role === 'employer' ? '/employer/dashboard' : '/student/dashboard';
      return logAndReturn(NextResponse.redirect(`${baseUrl}${targetPath}${url.search}`));
    }

    // --- RULE 3: AUTH PATHS ---
    if (AUTH_PATHS.some(p => pathname.startsWith(p)) && status === 'active') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
      const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : role === 'employer' ? '/employer/dashboard' : '/student/dashboard';
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

    if (pathname.startsWith('/employer')) {
      if (role === 'employer' || role === 'super_admin') {
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