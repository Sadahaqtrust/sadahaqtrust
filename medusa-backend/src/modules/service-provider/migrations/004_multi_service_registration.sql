-- Migration 004: Enable multi-service registration (same person, multiple services)
-- Run: psql postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak -f this_file.sql

-- Drop single-mobile unique constraint (was preventing multi-service registration)
ALTER TABLE service_provider DROP CONSTRAINT IF EXISTS service_provider_mobile_key;

-- Add new unique constraint: same person can register for multiple categories
-- but cannot duplicate the same category
ALTER TABLE service_provider ADD CONSTRAINT service_provider_mobile_category_key 
  UNIQUE (mobile, category_id);

-- Single sign-on: provider_auth already has (email, mobile, type) unique
-- One auth entry per person, login returns ALL their service profiles

-- Create 2 dummy profiles across all 30 professional services
-- Dummy 1: Rajesh Dummy (9999000001) | Dummy 2: Priya Dummy (9999000002)
-- Both use PIN: 1234

INSERT INTO service_provider (id, category_id, full_name, mobile, email, gender, locality, pincode, experience_years, short_bio, working_days, working_hours_start, working_hours_end, is_active, is_verified, created_at, updated_at)
SELECT 
  'sp_dummy1_' || id, id, 'Rajesh Dummy', '9999000001', 'dummy1@digitalrohtak.online',
  'Male', 'Model Town', '124001', 5, 'Dummy profile for testing — ' || name,
  'Mon,Tue,Wed,Thu,Fri,Sat', '09:00', '18:00', true, true, NOW(), NOW()
FROM service_category WHERE parent_id = 'cat_professional'
ON CONFLICT (mobile, category_id) DO NOTHING;

INSERT INTO service_provider (id, category_id, full_name, mobile, email, gender, locality, pincode, experience_years, short_bio, working_days, working_hours_start, working_hours_end, is_active, is_verified, created_at, updated_at)
SELECT 
  'sp_dummy2_' || id, id, 'Priya Dummy', '9999000002', 'dummy2@digitalrohtak.online',
  'Female', 'Sector 14', '124001', 8, 'Dummy profile for testing — ' || name,
  'Mon,Tue,Wed,Thu,Fri', '10:00', '19:00', true, true, NOW(), NOW()
FROM service_category WHERE parent_id = 'cat_professional'
ON CONFLICT (mobile, category_id) DO NOTHING;

-- Auth entries (PIN: 1234)
INSERT INTO provider_auth (id, provider_id, email, mobile, pin_hash, type, is_active, created_at)
VALUES 
  ('pauth_dummy1', 'sp_dummy1_cat_lawyer', 'dummy1@digitalrohtak.online', '9999000001',
   '$2b$10$JjnsfPv5kiYAD.7F8ILUbeUuIxtVxKfbbgXHQiy1ClYSUHlX2kheC', 'seller', true, NOW()),
  ('pauth_dummy2', 'sp_dummy2_cat_lawyer', 'dummy2@digitalrohtak.online', '9999000002',
   '$2b$10$JjnsfPv5kiYAD.7F8ILUbeUuIxtVxKfbbgXHQiy1ClYSUHlX2kheC', 'seller', true, NOW())
ON CONFLICT DO NOTHING;

SELECT 'Migration 004 complete.' AS status;
SELECT 'Dummy1 profiles: ' || COUNT(*) FROM service_provider WHERE mobile = '9999000001';
SELECT 'Dummy2 profiles: ' || COUNT(*) FROM service_provider WHERE mobile = '9999000002';
