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

  // --- DIAGNOSTIC LOG START ---
  if (user) {
    console.log(`🔍 MIDDLEWARE check for: ${user.email} | Path: ${pathname}`);
  }

  // --- RULE: AUTH PATHS (Redirecting logged-in users away from /login) ---
  if (user && AUTH_PATHS.some(p => pathname.startsWith(p))) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
    const role = profile?.role || 'student';
    console.log(`🚩 RULE 2 (Auth Path): User is ${role}, redirecting to dashboard`);
    url.pathname = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';
    return NextResponse.redirect(url);
  }

  // --- RULE: RBAC ENFORCEMENT ---
  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
    const role = profile?.role || 'student';

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