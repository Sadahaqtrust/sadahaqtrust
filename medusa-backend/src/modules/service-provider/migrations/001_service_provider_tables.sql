-- Service Provider Module Migration
-- Matches Medusa model.define() naming: singular table names, VARCHAR(255) PKs
-- Run: psql postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak -f this_file.sql

CREATE TABLE IF NOT EXISTS service_category (
  id VARCHAR(255) PRIMARY KEY,
  parent_id VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(255),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS service_provider (
  id VARCHAR(255) PRIMARY KEY,
  category_id VARCHAR(255),
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(150),
  gender VARCHAR(10),
  date_of_birth DATE,
  profile_photo VARCHAR(255),
  short_bio TEXT,
  locality VARCHAR(150),
  address TEXT,
  pincode VARCHAR(10),
  city VARCHAR(50) DEFAULT 'Rohtak',
  state VARCHAR(50) DEFAULT 'Haryana',
  lat FLOAT,
  lng FLOAT,
  service_radius_km INT DEFAULT 5,
  experience_years INT,
  languages_spoken VARCHAR(255),
  service_location VARCHAR(20) DEFAULT 'Both',
  home_visit_charges FLOAT DEFAULT 0,
  working_days VARCHAR(50),
  working_hours_start VARCHAR(10),
  working_hours_end VARCHAR(10),
  slot_duration_minutes INT DEFAULT 60,
  advance_booking_days INT DEFAULT 7,
  cancellation_window_hours INT DEFAULT 2,
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_percent INT DEFAULT 0,
  accepts_cash BOOLEAN DEFAULT TRUE,
  accepts_upi BOOLEAN DEFAULT TRUE,
  accepts_card BOOLEAN DEFAULT FALSE,
  whatsapp_number VARCHAR(15),
  social_instagram VARCHAR(255),
  social_facebook VARCHAR(255),
  intro_video VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  rating_avg FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_service (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  category_id VARCHAR(255),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  duration_minutes INT DEFAULT 60,
  base_price FLOAT NOT NULL,
  service_location VARCHAR(20) DEFAULT 'Both',
  images TEXT,
  tags VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS service_variant (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price FLOAT NOT NULL,
  duration_minutes INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS service_addon (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price FLOAT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_availability (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  day_of_week VARCHAR(3) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_blackout_date (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS appointment (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255),
  provider_id VARCHAR(255) NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  variant_id VARCHAR(255),
  scheduled_date VARCHAR(20) NOT NULL,
  scheduled_time VARCHAR(10) NOT NULL,
  duration_minutes INT NOT NULL,
  location_type VARCHAR(30) NOT NULL,
  customer_address TEXT,
  customer_lat FLOAT,
  customer_lng FLOAT,
  status VARCHAR(20) DEFAULT 'pending',
  base_amount FLOAT NOT NULL,
  addons_amount FLOAT DEFAULT 0,
  home_visit_charge FLOAT DEFAULT 0,
  discount_amount FLOAT DEFAULT 0,
  total_amount FLOAT NOT NULL,
  deposit_amount FLOAT DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(10),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  notes TEXT,
  cancelled_by VARCHAR(10),
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS appointment_addon (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL,
  addon_id VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  price FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_review (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  rating SMALLINT NOT NULL,
  review_text TEXT,
  photo VARCHAR(255),
  tags VARCHAR(255),
  provider_reply TEXT,
  replied_at TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_qa (
  id VARCHAR(255) PRIMARY KEY,
  category_id VARCHAR(255),
  customer_id VARCHAR(255),
  provider_id VARCHAR(255),
  question TEXT NOT NULL,
  answer TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_id_proof (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  id_type VARCHAR(30) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  front_image VARCHAR(255),
  back_image VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_professional_id (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  org_name VARCHAR(150) NOT NULL,
  id_field_label VARCHAR(150) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  certificate_image VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sp_category ON service_provider(category_id);
CREATE INDEX IF NOT EXISTS idx_sp_locality ON service_provider(locality);
CREATE INDEX IF NOT EXISTS idx_sp_active ON service_provider(is_active, is_verified);
CREATE INDEX IF NOT EXISTS idx_ps_provider ON provider_service(provider_id);
CREATE INDEX IF NOT EXISTS idx_appt_provider ON appointment(provider_id);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointment(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointment(status);

-- Seed: Top level categories
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_beauty','Beauty & Wellness','beauty-wellness',NULL,1),
('cat_spa','Spa & Massage','spa-massage',NULL,2),
('cat_home','Home Services','home-services',NULL,3),
('cat_health','Health & Medical','health-medical',NULL,4),
('cat_professional','Professional Services','professional-services',NULL,5),
('cat_education','Education & Tutoring','education-tutoring',NULL,6),
('cat_events','Events & Photography','events-photography',NULL,7),
('cat_personal','Personal Care & Other','personal-care-other',NULL,8)
ON CONFLICT (slug) DO NOTHING;

-- Seed: Subcategories
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_womens_salon','Women''s Salon','womens-salon','cat_beauty',1),
('cat_mens_salon','Men''s Salon / Barber','mens-salon-barber','cat_beauty',2),
('cat_bridal','Bridal Makeup','bridal-makeup','cat_beauty',3),
('cat_nail','Nail Art','nail-art','cat_beauty',4),
('cat_tattoo','Tattoo Artist','tattoo-artist','cat_beauty',5),
('cat_mehendi','Mehendi Artist','mehendi-artist','cat_beauty',6),
('cat_threading','Eyebrow Threading','eyebrow-threading','cat_beauty',7),
('cat_waxing','Waxing','waxing','cat_beauty',8),
('cat_facial','Facial & Skincare','facial-skincare','cat_beauty',9),
('cat_swedish','Swedish Massage','swedish-massage','cat_spa',1),
('cat_deep_tissue','Deep Tissue Massage','deep-tissue-massage','cat_spa',2),
('cat_ayurvedic','Ayurvedic Massage','ayurvedic-massage','cat_spa',3),
('cat_couples','Couples Massage','couples-massage','cat_spa',4),
('cat_head_massage','Head Massage','head-massage','cat_spa',5),
('cat_foot','Foot Massage','foot-massage','cat_spa',6),
('cat_sports','Sports Massage','sports-massage','cat_spa',7),
('cat_spa_women','Spa for Women','spa-for-women','cat_spa',8),
('cat_spa_men','Spa for Men','spa-for-men','cat_spa',9),
('cat_plumber','Plumber','plumber','cat_home',1),
('cat_electrician','Electrician','electrician','cat_home',2),
('cat_carpenter','Carpenter','carpenter','cat_home',3),
('cat_painter','Painter','painter','cat_home',4),
('cat_ac','AC Repair & Service','ac-repair-service','cat_home',5),
('cat_geyser','Geyser Repair','geyser-repair','cat_home',6),
('cat_washing','Washing Machine Repair','washing-machine-repair','cat_home',7),
('cat_fridge','Refrigerator Repair','refrigerator-repair','cat_home',8),
('cat_tv','TV Repair','tv-repair','cat_home',9),
('cat_ro','RO / Water Purifier','ro-water-purifier','cat_home',10),
('cat_cctv','CCTV Installation','cctv-installation','cat_home',11),
('cat_cleaning','Full Home Deep Cleaning','full-home-deep-cleaning','cat_home',12),
('cat_kitchen_clean','Kitchen Cleaning','kitchen-cleaning','cat_home',13),
('cat_bathroom_clean','Bathroom Cleaning','bathroom-cleaning','cat_home',14),
('cat_sofa','Sofa & Carpet Cleaning','sofa-carpet-cleaning','cat_home',15),
('cat_pest','Pest Control','pest-control','cat_home',16),
('cat_waterproof','Waterproofing','waterproofing','cat_home',17),
('cat_doctor','Doctor (General Physician)','doctor-general-physician','cat_health',1),
('cat_dentist','Dentist','dentist','cat_health',2),
('cat_physio','Physiotherapist','physiotherapist','cat_health',3),
('cat_dietitian','Dietitian / Nutritionist','dietitian-nutritionist','cat_health',4),
('cat_psychologist','Psychologist / Counselor','psychologist-counselor','cat_health',5),
('cat_ayush','Ayurvedic Practitioner','ayurvedic-practitioner','cat_health',6),
('cat_homeo','Homeopathy','homeopathy','cat_health',7),
('cat_nurse','Nurse / Home Care','nurse-home-care','cat_health',8),
('cat_yoga','Yoga Instructor','yoga-instructor','cat_health',9),
('cat_fitness','Fitness Trainer','fitness-trainer','cat_health',10),
('cat_lawyer','Lawyer / Advocate','lawyer-advocate','cat_professional',1),
('cat_ca','CA / Tax Consultant','ca-tax-consultant','cat_professional',2),
('cat_cs','Company Secretary','company-secretary','cat_professional',3),
('cat_property','Property Agent / Broker','property-agent-broker','cat_professional',4),
('cat_insurance','Insurance Advisor','insurance-advisor','cat_professional',5),
('cat_architect','Architect','architect','cat_professional',6),
('cat_interior','Interior Designer','interior-designer','cat_professional',7),
('cat_notary','Notary / Documentation','notary-documentation','cat_professional',8),
('cat_tutor_1_5','School Tutor (Class 1-5)','school-tutor-1-5','cat_education',1),
('cat_tutor_6_10','School Tutor (Class 6-10)','school-tutor-6-10','cat_education',2),
('cat_tutor_11_12','School Tutor (Class 11-12)','school-tutor-11-12','cat_education',3),
('cat_coaching','Competitive Exam Coaching','competitive-exam-coaching','cat_education',4),
('cat_music','Music Classes','music-classes','cat_education',5),
('cat_dance','Dance Classes','dance-classes','cat_education',6),
('cat_coding','Computer / Coding Classes','computer-coding-classes','cat_education',7),
('cat_driving','Driving Instructor','driving-instructor','cat_education',8),
('cat_photo','Photographer','photographer','cat_events',1),
('cat_video','Videographer','videographer','cat_events',2),
('cat_dj','DJ / Sound System','dj-sound-system','cat_events',3),
('cat_decorator','Event Decorator','event-decorator','cat_events',4),
('cat_caterer','Caterer','caterer','cat_events',5),
('cat_pandit','Pandit / Priest','pandit-priest','cat_events',6),
('cat_band','Band / Baaja','band-baaja','cat_events',7),
('cat_tailor','Tailor / Stitching','tailor-stitching','cat_personal',1),
('cat_laundry','Laundry / Dry Cleaning','laundry-dry-cleaning','cat_personal',2),
('cat_pet','Pet Grooming','pet-grooming','cat_personal',3),
('cat_carwash','Car Wash / Detailing','car-wash-detailing','cat_personal',4),
('cat_chef','Personal Chef / Cook','personal-chef-cook','cat_personal',5),
('cat_astro','Astrologer / Vastu','astrologer-vastu','cat_personal',6)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Migration complete. Categories: ' || COUNT(*) AS status FROM service_category;

-- Additional 8 categories (added to reach 90 total)
INSERT INTO service_category (id, name, slug, parent_id, sort_order) VALUES
('cat_chimney',    'Chimney Repair',              'chimney-repair',              'cat_home',         18),
('cat_furniture',  'Furniture Assembly',           'furniture-assembly',          'cat_home',         19),
('cat_laptop',     'Laptop / Mobile Repair',       'laptop-mobile-repair',        'cat_home',         20),
('cat_lab',        'Lab Test (Home Collection)',   'lab-test-home-collection',    'cat_health',       11),
('cat_meditation', 'Meditation Coach',             'meditation-coach',            'cat_health',       12),
('cat_hr',         'HR / Recruitment Consultant',  'hr-recruitment-consultant',   'cat_professional', 9),
('cat_civil_eng',  'Civil Engineer',               'civil-engineer',              'cat_professional', 10),
('cat_language',   'Language Classes',             'language-classes',            'cat_education',    9)
ON CONFLICT (slug) DO NOTHING;
