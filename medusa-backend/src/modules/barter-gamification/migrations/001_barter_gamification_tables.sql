-- Barter Gamification Module: Badges, Levels, Leaderboards (PostgreSQL)

CREATE TABLE IF NOT EXISTS barter_badge (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  icon_url TEXT NULL,
  category VARCHAR(50) NOT NULL,
  tier VARCHAR(20) DEFAULT 'bronze',
  criteria_type VARCHAR(50) NOT NULL,
  criteria_value INT NOT NULL,
  criteria_metadata TEXT NULL,
  bonus_credits DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_badge_category ON barter_badge(category);
CREATE INDEX IF NOT EXISTS idx_badge_active ON barter_badge(is_active, sort_order);

CREATE TABLE IF NOT EXISTS barter_user_badge (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  badge_id VARCHAR(255) NOT NULL,
  earned_at TIMESTAMP NULL,
  is_displayed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ubadge_user ON barter_user_badge(user_id);
CREATE INDEX IF NOT EXISTS idx_ubadge_badge ON barter_user_badge(badge_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ubadge_unique ON barter_user_badge(user_id, badge_id);

CREATE TABLE IF NOT EXISTS barter_user_level (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  xp_total INT DEFAULT 0,
  level INT DEFAULT 1,
  level_name VARCHAR(50) DEFAULT 'Newcomer',
  tasks_completed INT DEFAULT 0,
  current_streak_days INT DEFAULT 0,
  longest_streak_days INT DEFAULT 0,
  last_active_date VARCHAR(10) NULL,
  reputation_score INT DEFAULT 0,
  referral_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ulevel_user ON barter_user_level(user_id);
CREATE INDEX IF NOT EXISTS idx_ulevel_xp ON barter_user_level(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_ulevel_level ON barter_user_level(level DESC);

CREATE TABLE IF NOT EXISTS barter_leaderboard_entry (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  xp_earned INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  credits_earned DECIMAL(10,2) DEFAULT 0,
  rank INT DEFAULT 0,
  locality VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lb_period ON barter_leaderboard_entry(period_type, period_key, rank);
CREATE INDEX IF NOT EXISTS idx_lb_user ON barter_leaderboard_entry(user_id);
CREATE INDEX IF NOT EXISTS idx_lb_locality ON barter_leaderboard_entry(locality, period_type, period_key);
