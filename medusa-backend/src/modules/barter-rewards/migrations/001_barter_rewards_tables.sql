-- Barter Rewards Module: Rewards Marketplace (PostgreSQL)

CREATE TABLE IF NOT EXISTS barter_reward_partner (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT NULL,
  category VARCHAR(100) NOT NULL,
  contact_person VARCHAR(255) NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  website TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  total_rewards_supplied INT DEFAULT 0,
  total_redemptions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barter_reward (
  id VARCHAR(255) PRIMARY KEY,
  partner_id VARCHAR(255) NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) NULL,
  image_url TEXT NULL,
  credit_cost DECIMAL(10,2) NOT NULL,
  retail_value DECIMAL(10,2) DEFAULT 0,
  stock_total INT DEFAULT 0,
  stock_remaining INT DEFAULT 0,
  delivery_type VARCHAR(30) DEFAULT 'digital',
  delivery_instructions TEXT NULL,
  voucher_code_pool TEXT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  min_age INT DEFAULT 14,
  max_redemptions_per_user INT DEFAULT 0,
  tags TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reward_category ON barter_reward(category);
CREATE INDEX IF NOT EXISTS idx_reward_active ON barter_reward(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_reward_partner ON barter_reward(partner_id);

CREATE TABLE IF NOT EXISTS barter_reward_redemption (
  id VARCHAR(255) PRIMARY KEY,
  reward_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  credits_spent DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  voucher_code VARCHAR(255) NULL,
  delivery_address TEXT NULL,
  fulfilled_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redemption_user ON barter_reward_redemption(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_reward ON barter_reward_redemption(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON barter_reward_redemption(status);
