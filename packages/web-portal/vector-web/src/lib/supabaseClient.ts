import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🛑 CHANGED: Use createBrowserClient to enable Cookie-based Auth
// This allows the Middleware to read the session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);