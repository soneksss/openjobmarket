-- Migration: Create CV access audit log table
-- Date: 2026-01-06
-- Description: Audit trail for CV access attempts (GDPR/LGPD compliance requirement)

-- Create audit log table
CREATE TABLE cv_access_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
  accessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  access_type VARCHAR(50) NOT NULL
    CHECK (access_type IN ('view', 'download', 'metadata', 'denied')),
  access_allowed BOOLEAN NOT NULL,
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_cv_audit_professional ON cv_access_audit_log(professional_id);
CREATE INDEX idx_cv_audit_accessed_at ON cv_access_audit_log(accessed_at);
CREATE INDEX idx_cv_audit_accessed_by ON cv_access_audit_log(accessed_by_user_id);

-- Enable RLS on audit log (only admins and cv owners can view)
ALTER TABLE cv_access_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: CV owners can view their own audit logs
CREATE POLICY "CV owners view own audit logs" ON cv_access_audit_log
FOR SELECT USING (
  professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins view all audit logs" ON cv_access_audit_log
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'admin'
  )
);

-- Policy: System can insert audit logs
CREATE POLICY "System inserts audit logs" ON cv_access_audit_log
FOR INSERT WITH CHECK (true);

-- Add comments
COMMENT ON TABLE cv_access_audit_log IS
  'Audit trail for CV access attempts - GDPR/LGPD compliance requirement';
COMMENT ON COLUMN cv_access_audit_log.access_type IS
  'Type of access: view, download, metadata (admin), or denied';
COMMENT ON COLUMN cv_access_audit_log.access_allowed IS
  'Whether the access was allowed or denied';
COMMENT ON COLUMN cv_access_audit_log.access_reason IS
  'Reason for allowing/denying access (e.g., "visibility setting: public", "admin cannot access content")';
