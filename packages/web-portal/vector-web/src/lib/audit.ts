import { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction = 'ROLE_CHANGE' | 'USER_VERIFIED' | 'ACCOUNT_SUSPENDED';

interface LogOptions {
  actorId: string;
  targetId?: string;
  action: AuditAction;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Records an administrative action to the immutable audit ledger.
 * We pass the 'supabase' client explicitly to ensure we use the Service Role connection.
 */
export async function recordAuditLog(
  supabase: SupabaseClient, 
  {
    actorId,
    targetId,
    action,
    description,
    metadata = {}
  }: LogOptions
) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      target_id: targetId,
      action_type: action,
      description,
      metadata: { 
        ...metadata, 
        timestamp: new Date().toISOString() 
      }
    });

    if (error) {
      console.error('CRITICAL AUDIT FAILURE:', error);
      // In a strict banking app, you would throw an error here to stop the transaction.
      // For this project, logging the error is acceptable.
    }
  } catch (err) {
    console.error('Audit Log System Error:', err);
  }
}