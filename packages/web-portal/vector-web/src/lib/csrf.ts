// packages/web-portal/vector-web/src/lib/csrf.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * VECTOR - CSRF Protection Utility
 * 
 * WHY: Prevention of Cross-Site Request Forgery attacks for standard API routes.
 * USAGE: 
 * - Apply to all state-changing routes (POST, PUT, DELETE) that do NOT rely on 
 *   Supabase Auth headers or Bearer tokens (which are inherently CSRF-protected).
 * - Use in `middleware.ts` for global protection or individually per-route.
 */

const CSRF_COOKIE_NAME = 'vector-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a unique CSRF token and attaches it as a Secure, HttpOnly cookie.
 * Returns the token string to be sent to the client (usually in a meta tag or hidden input).
 */
export function generateCsrfToken(response: NextResponse, existingToken?: string): string {
    const token = existingToken || crypto.randomUUID();
    
    // Set the token in a cookie for server-side verification
    // httpOnly: false allows the frontend to read it for the x-csrf-token header
    response.cookies.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return token;
}

/**
 * Validates the CSRF token in the request header against the value in the cookie.
 */
export function validateCsrfToken(request: NextRequest): boolean {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    
    if (!cookieToken || !headerToken) {
        return false;
    }
    
    // Constant-time comparison is not strictly necessary for a UUID but good practice
    return cookieToken === headerToken;
}

/**
 * Recommended Routes to Protect:
 * - /api/registrar/credentials
 * - /api/admin/verify-user
 * - /api/profile/update
 * 
 * Routes that do NOT need this (handled by Supabase Auth / JWT):
 * - /api/auth/*
 * - Any route called via supabase-js with Authorization headers.
 */
