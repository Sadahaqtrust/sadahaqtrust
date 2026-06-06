-- Create the user_activity_audit_log table for Digital Rohtak storefront
-- Database: medusa_digitalrohtak

CREATE TABLE IF NOT EXISTS user_activity_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
  email VARCHAR(255),
  action_type VARCHAR(100) NOT NULL,
  action_details JSONB DEFAULT '{}',
  ip_address VARCHAR(45) NOT NULL DEFAULT 'unknown',
  device_details JSONB DEFAULT '{}',
  hostname VARCHAR(255),
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON user_activity_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON user_activity_audit_log (action_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON user_activity_audit_log ("timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON user_activity_audit_log (user_id, "timestamp");
