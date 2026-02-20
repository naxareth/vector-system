import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
      },
    }
  );

  try {
    // 1. Authenticate the User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Authorize the Role
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Super Admin access required.' }, { status: 403 });
    }

    // 3. Fetch the latest 200 logs
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    // 4. Calculate quick metrics
    const total = logs.length;
    const errors = logs.filter((l) => l.status >= 400).length;
    const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';
    
    // Filter out requests that took 0ms or failed to record time for accurate averages
    const timedLogs = logs.filter((l) => l.duration !== null && l.duration > 0);
    const avgDuration = timedLogs.length > 0 
      ? Math.round(timedLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0) / timedLogs.length) 
      : 0;

    return NextResponse.json({ 
      success: true, 
      metrics: { total, errorRate, avgDuration },
      logs 
    });

  } catch (error: any) {
    console.error('System Logs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}