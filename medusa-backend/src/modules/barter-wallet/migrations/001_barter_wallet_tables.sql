-- Barter Wallet Module: Wallet & Transaction Ledger (PostgreSQL)

CREATE TABLE IF NOT EXISTS barter_wallet (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  lifetime_earned DECIMAL(12,2) DEFAULT 0,
  lifetime_spent DECIMAL(12,2) DEFAULT 0,
  frozen_balance DECIMAL(12,2) DEFAULT 0,
  currency_code VARCHAR(10) DEFAULT 'BRT',
  is_active BOOLEAN DEFAULT TRUE,
  last_transaction_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_user ON barter_wallet(user_id);

CREATE TABLE IF NOT EXISTS barter_transaction (
  id VARCHAR(255) PRIMARY KEY,
  wallet_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id VARCHAR(255) NULL,
  description TEXT NULL,
  metadata TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_txn_wallet ON barter_transaction(wallet_id);
CREATE INDEX IF NOT EXISTS idx_txn_reference ON barter_transaction(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_txn_created ON barter_transaction(created_at DESC);
