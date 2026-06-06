-- Barter Currency Module: Digital Currency & Mutual Credit (PostgreSQL)

CREATE TABLE IF NOT EXISTS barter_currency_account (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  account_type VARCHAR(30) DEFAULT 'individual',
  balance DECIMAL(12,2) DEFAULT 0,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  total_issued DECIMAL(12,2) DEFAULT 0,
  total_redeemed DECIMAL(12,2) DEFAULT 0,
  trust_score INT DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  is_frozen BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_caccount_user ON barter_currency_account(user_id);
CREATE INDEX IF NOT EXISTS idx_caccount_type ON barter_currency_account(account_type);

CREATE TABLE IF NOT EXISTS barter_credit_line (
  id VARCHAR(255) PRIMARY KEY,
  from_account_id VARCHAR(255) NOT NULL,
  to_account_id VARCHAR(255) NOT NULL,
  credit_amount DECIMAL(12,2) NOT NULL,
  utilized DECIMAL(12,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP NULL,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cl_from ON barter_credit_line(from_account_id);
CREATE INDEX IF NOT EXISTS idx_cl_to ON barter_credit_line(to_account_id);
CREATE INDEX IF NOT EXISTS idx_cl_status ON barter_credit_line(status);

CREATE TABLE IF NOT EXISTS barter_currency_transfer (
  id VARCHAR(255) PRIMARY KEY,
  from_account_id VARCHAR(255) NOT NULL,
  to_account_id VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transfer_type VARCHAR(30) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id VARCHAR(255) NULL,
  status VARCHAR(20) DEFAULT 'completed',
  description TEXT NULL,
  from_balance_after DECIMAL(12,2) DEFAULT 0,
  to_balance_after DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_from ON barter_currency_transfer(from_account_id);
CREATE INDEX IF NOT EXISTS idx_ct_to ON barter_currency_transfer(to_account_id);
CREATE INDEX IF NOT EXISTS idx_ct_created ON barter_currency_transfer(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_reference ON barter_currency_transfer(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS barter_currency_config (
  id VARCHAR(255) PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cconfig_key ON barter_currency_config(config_key);

-- Insert default config values
INSERT INTO barter_currency_config (id, config_key, config_value, description) VALUES
  ('cfg_001', 'currency_name', 'BRT', 'Name of the platform digital currency'),
  ('cfg_002', 'currency_symbol', '₿', 'Symbol for display'),
  ('cfg_003', 'max_individual_credit_limit', '500', 'Maximum credit limit for individual accounts'),
  ('cfg_004', 'max_partner_credit_limit', '5000', 'Maximum credit limit for partner accounts'),
  ('cfg_005', 'new_user_credit_limit', '50', 'Initial credit limit for new users'),
  ('cfg_006', 'trust_score_credit_multiplier', '5', 'Credit limit = trust_score * this value')
ON CONFLICT (config_key) DO NOTHING;
