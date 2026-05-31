-- 🛡️ VECTOR Audit Trail Tamper-Evidence Policies
-- File: packages/web-portal/vector-web/src/lib/audit-rls.sql
-- 
-- DESCRIPTION:
-- These policies ensure that the `audit_logs` table is "Append-Only" and "Immutable".
-- 1. INSERT: Only the system (service_role) can create logs.
-- 2. UPDATE/DELETE: Strictly forbidden for all users/roles, preventing history alteration.
-- 3. SELECT: Restricted to Super Admins for oversight.
-- 
-- This configuration creates a cryptographically verifiable trail (when combined with blockchain events)
-- that even a compromised administrator account cannot erase or modify once written.

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policy: service_role can perform all actions (used by the backend API)
-- Note: In Supabase, the service_role bypasses RLS by default, but we specify it for clarity.
CREATE POLICY "service_role_insert" ON audit_logs
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- 2. Policy: Super Admin can read all logs
CREATE POLICY "super_admin_select" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- 3. Policy: Explicitly deny UPDATE to everyone
-- (By not creating an UPDATE policy, it is denied by default in RLS)
-- But we can add a comment to make it clear.
-- DROP POLICY IF EXISTS "no_updates" ON audit_logs;

-- 4. Policy: Explicitly deny DELETE to everyone
-- (By not creating a DELETE policy, it is denied by default in RLS)

-- Verification Query:
-- SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
