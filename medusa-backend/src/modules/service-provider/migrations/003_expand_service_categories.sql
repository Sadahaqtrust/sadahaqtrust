-- Migration 003: Expand service categories to 122+ total (116+ subcategories)
-- Run: psql postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak -f this_file.sql

-- More Professional Services (expanding from 10 to 30)
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_vakilsearch','Vakilsearch / Legal Tech','vakilsearch-legal-tech','cat_professional',11),
('cat_tax_consultant','Income Tax Consultant','income-tax-consultant','cat_professional',12),
('cat_gst_consultant','GST Consultant','gst-consultant','cat_professional',13),
('cat_financial_planner','Financial Planner','financial-planner','cat_professional',14),
('cat_stock_advisor','Stock Market Advisor','stock-market-advisor','cat_professional',15),
('cat_loan_agent','Loan Agent / DSA','loan-agent-dsa','cat_professional',16),
('cat_mutual_fund','Mutual Fund Advisor','mutual-fund-advisor','cat_professional',17),
('cat_surveyor','Land Surveyor','land-surveyor','cat_professional',18),
('cat_valuer','Property Valuer','property-valuer','cat_professional',19),
('cat_town_planner','Town Planner','town-planner','cat_professional',20),
('cat_structural_eng','Structural Engineer','structural-engineer','cat_professional',21),
('cat_mep_eng','MEP Engineer','mep-engineer','cat_professional',22),
('cat_landscape','Landscape Designer','landscape-designer','cat_professional',23),
('cat_vastu','Vastu Consultant','vastu-consultant','cat_professional',24),
('cat_immigration','Immigration Consultant','immigration-consultant','cat_professional',25),
('cat_visa_agent','Visa Agent','visa-agent','cat_professional',26),
('cat_passport_agent','Passport Agent','passport-agent','cat_professional',27),
('cat_detective','Private Detective','private-detective','cat_professional',28),
('cat_security_guard','Security Guard Service','security-guard-service','cat_professional',29),
('cat_event_mgmt','Event Management','event-management','cat_professional',30)
ON CONFLICT (slug) DO NOTHING;

-- More Home Services
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_inverter','Inverter / Battery Repair','inverter-battery-repair','cat_home',21),
('cat_solar','Solar Panel Installation','solar-panel-installation','cat_home',22),
('cat_tiles','Tiles & Marble Work','tiles-marble-work','cat_home',23),
('cat_glass','Glass & Aluminium Work','glass-aluminium-work','cat_home',24),
('cat_welding','Welding / Fabrication','welding-fabrication','cat_home',25),
('cat_false_ceiling','False Ceiling','false-ceiling','cat_home',26),
('cat_modular_kitchen','Modular Kitchen','modular-kitchen','cat_home',27),
('cat_gardener','Gardener / Landscaping','gardener-landscaping','cat_home',28),
('cat_packers','Packers & Movers','packers-movers','cat_home',29)
ON CONFLICT (slug) DO NOTHING;

-- More Health
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_vet','Veterinary Doctor','veterinary-doctor','cat_health',13),
('cat_eye_doc','Eye Specialist','eye-specialist','cat_health',14),
('cat_derma','Dermatologist','dermatologist','cat_health',15),
('cat_ortho','Orthopedic','orthopedic','cat_health',16),
('cat_gynec','Gynecologist','gynecologist','cat_health',17),
('cat_pediatric','Pediatrician','pediatrician','cat_health',18)
ON CONFLICT (slug) DO NOTHING;

-- More Education
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_art_class','Art / Drawing Classes','art-drawing-classes','cat_education',10),
('cat_spoken_eng','Spoken English','spoken-english','cat_education',11),
('cat_ielts','IELTS / TOEFL Coaching','ielts-toefl-coaching','cat_education',12),
('cat_govt_exam','Govt Exam Coaching','govt-exam-coaching','cat_education',13),
('cat_neet','NEET / JEE Coaching','neet-jee-coaching','cat_education',14)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Migration 003 complete. Total categories: ' || COUNT(*) AS status FROM service_category;
SELECT 'Professional services: ' || COUNT(*) AS prof_count FROM service_category WHERE parent_id = 'cat_professional';
