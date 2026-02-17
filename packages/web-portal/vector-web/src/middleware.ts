import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require a valid Supabase session
const PROTECTED_PATHS = [
  '/registrar', 
  '/student', 
  '/api/mint', 
  '/api/student', 
  '/api/analyze', 
  '/api/chat', 
  '/api/verify-registrar',
];

// Routes that should redirect TO dashboard if already logged in
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  
  // 1. Create an initial response object
  // We will attach cookies to this object as we go
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // This updates the REQUEST cookies (so the middleware sees the new session immediately)
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          );
          
          // This updates the RESPONSE cookies (so the browser gets them)
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Refresh session if expired
  // IMPORTANT: This call might trigger 'setAll' above, updating 'response' with new cookies
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // --- RULE 1: PROTECTED ROUTES ---
  if (isProtectedPath(pathname) && !user) {
    // API routes -> Return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Page routes -> Redirect to login
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname); // Remember where they wanted to go
    
    // 🛑 CRITICAL FIX: We must carry over the cookies to the redirect
    const redirectResponse = NextResponse.redirect(url);
    
    // Copy the Set-Cookie header from the 'response' object to ensure tokens persist
    const setCookieHeader = response.headers.get('Set-Cookie');
    if (setCookieHeader) {
      redirectResponse.headers.set('Set-Cookie', setCookieHeader);
    }
    
    return redirectResponse;
  }

  // --- RULE 2: ALREADY LOGGED IN (Visiting /login) ---
  if (isAuthPath(pathname) && user) {
    // Check role to redirect correctly
    const role = user.user_metadata?.role || 'student';
    url.pathname = role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
    
    const redirectResponse = NextResponse.redirect(url);
    
    // Copy cookies here too!
    const setCookieHeader = response.headers.get('Set-Cookie');
    if (setCookieHeader) {
      redirectResponse.headers.set('Set-Cookie', setCookieHeader);
    }

    return redirectResponse;
  }

  // --- RULE 3: ROLE-BASED ACCESS CONTROL (RBAC) ---
  if (user && pathname.startsWith('/registrar')) {
    const role = user.user_metadata?.role;
    if (role !== 'registrar') {
      url.pathname = '/student/dashboard';
      const redirectResponse = NextResponse.redirect(url);
      // Copy cookies
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        redirectResponse.headers.set('Set-Cookie', setCookieHeader);
      }
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};