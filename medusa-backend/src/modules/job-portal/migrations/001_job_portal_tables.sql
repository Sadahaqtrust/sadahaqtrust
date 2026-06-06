-- Job Portal Tables (Naukri.com-style)
-- Run: psql -U medusa_user -d medusa_digitalrohtak -f 001_job_portal_tables.sql

CREATE TABLE IF NOT EXISTS job_employer_profile (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  city TEXT DEFAULT 'Rohtak',
  state TEXT DEFAULT 'Haryana',
  employee_count TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_mobile TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_seeker_profile (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT,
  full_name TEXT NOT NULL,
  headline TEXT,
  skills TEXT,
  experience_years INTEGER DEFAULT 0,
  current_company TEXT,
  current_designation TEXT,
  education TEXT,
  resume_url TEXT,
  preferred_locations TEXT,
  preferred_salary_min INTEGER,
  preferred_salary_max INTEGER,
  notice_period_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_listing (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employer_id TEXT NOT NULL REFERENCES job_employer_profile(id),
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  location TEXT,
  city TEXT DEFAULT 'Rohtak',
  state TEXT DEFAULT 'Haryana',
  salary_min INTEGER,
  salary_max INTEGER,
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  job_type TEXT DEFAULT 'full-time',
  skills_required TEXT,
  industry TEXT,
  vacancies INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_application (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES job_listing(id),
  seeker_id TEXT NOT NULL REFERENCES job_seeker_profile(id),
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ,
  employer_notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_listing_employer ON job_listing(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_listing_active ON job_listing(is_active, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_listing_city ON job_listing(city);
CREATE INDEX IF NOT EXISTS idx_job_listing_type ON job_listing(job_type);
CREATE INDEX IF NOT EXISTS idx_job_application_job ON job_application(job_id);
CREATE INDEX IF NOT EXISTS idx_job_application_seeker ON job_application(seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_application_status ON job_application(status);
CREATE INDEX IF NOT EXISTS idx_employer_customer ON job_employer_profile(customer_id);
CREATE INDEX IF NOT EXISTS idx_seeker_customer ON job_seeker_profile(customer_id);
