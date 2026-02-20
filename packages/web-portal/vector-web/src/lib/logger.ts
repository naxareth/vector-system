import { createClient } from '@supabase/supabase-js';

// We use the Service Role Key so we can insert logs without needing an active user session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogPayload {
  method: string;
  path: string;
  status: number;
  ip_address?: string;
  duration?: number;
  user_agent?: string;
}

export const logSystemTraffic = async (data: LogPayload) => {
  try {
    const { error } = await supabaseAdmin.from('system_logs').insert([data]);
    if (error) {
      console.error('System Logger DB Error:', error.message);
    }
  } catch (err) {
    console.error('System Logger Execution Error:', err);
  }
};