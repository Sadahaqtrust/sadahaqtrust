-- Barter Tasks Module: Task Marketplace (PostgreSQL)

CREATE TABLE IF NOT EXISTS barter_task (
  id VARCHAR(255) PRIMARY KEY,
  posted_by VARCHAR(255) NOT NULL,
  poster_type VARCHAR(50) DEFAULT 'partner',
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) NULL,
  reward_credits DECIMAL(10,2) NOT NULL,
  estimated_minutes INT DEFAULT 30,
  difficulty VARCHAR(20) DEFAULT 'easy',
  min_age INT DEFAULT 14,
  max_age INT DEFAULT 25,
  skills_required TEXT NULL,
  location_type VARCHAR(20) DEFAULT 'remote',
  locality VARCHAR(255) NULL,
  max_applicants INT DEFAULT 1,
  current_applicants INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'open',
  deadline TIMESTAMP NULL,
  instructions_url TEXT NULL,
  verification_type VARCHAR(30) DEFAULT 'self_report',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(100) NULL,
  tags TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_status ON barter_task(status, is_active);
CREATE INDEX IF NOT EXISTS idx_task_category ON barter_task(category);
CREATE INDEX IF NOT EXISTS idx_task_posted_by ON barter_task(posted_by);
CREATE INDEX IF NOT EXISTS idx_task_locality ON barter_task(locality);

CREATE TABLE IF NOT EXISTS barter_task_application (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL,
  applicant_id VARCHAR(255) NOT NULL,
  status VARCHAR(30) DEFAULT 'applied',
  applied_at TIMESTAMP NULL,
  accepted_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  submitted_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  proof_url TEXT NULL,
  proof_notes TEXT NULL,
  rejection_reason TEXT NULL,
  rating_by_poster INT NULL,
  rating_by_doer INT NULL,
  feedback_by_poster TEXT NULL,
  feedback_by_doer TEXT NULL,
  credits_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_task ON barter_task_application(task_id);
CREATE INDEX IF NOT EXISTS idx_app_applicant ON barter_task_application(applicant_id);
CREATE INDEX IF NOT EXISTS idx_app_status ON barter_task_application(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_unique ON barter_task_application(task_id, applicant_id);
