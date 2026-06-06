-- ============================================================
--  sadahaqtrust_db — Sadahaq Trust Grievance Platform
--  Version  : 1.0
--  Date     : 2025-04-18
--  Prefix   : sq_  (all sadahaq tables)
--  Charset  : utf8mb4 / utf8mb4_0900_ai_ci
--  Engine   : InnoDB
--
--  Run this script on sadahaqtrust_db after renaming from
--  the spare TastyIgniter DB.  Existing TastyIgniter tables
--  are untouched.  All new tables use the sq_ prefix.
-- ============================================================

USE sadahaqtrust_db;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- TABLE 1 : sq_people
-- Single identity store for all humans in the system.
-- Role-specific detail lives in the *_profiles tables below.
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_people (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  role            ENUM(
                    'citizen',
                    'volunteer',
                    'mentor',
                    'staff',
                    'admin'
                  )                NOT NULL DEFAULT 'citizen',
  full_name       VARCHAR(120)     NOT NULL,
  name_hi         VARCHAR(120)     NULL     COMMENT 'Name in Devanagari',
  phone           VARCHAR(15)      NOT NULL,
  alt_phone       VARCHAR(15)      NULL,
  email           VARCHAR(120)     NULL,
  aadhaar_last4   CHAR(4)          NULL     COMMENT 'Last 4 digits only — no full Aadhaar stored',
  ward            VARCHAR(60)      NULL,
  locality        VARCHAR(100)     NULL,
  block_name      VARCHAR(60)      NULL     COMMENT 'Rohtak / Kalanaur / Maham / Sampla / Lakkar Haara',
  photo_url       VARCHAR(255)     NULL,
  bio             TEXT             NULL,
  is_active       TINYINT(1)       NOT NULL DEFAULT 1,
  is_verified     TINYINT(1)       NOT NULL DEFAULT 0,
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_people_phone (phone),
  KEY idx_people_role (role),
  KEY idx_people_block (block_name),
  KEY idx_people_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Master person registry — citizens, volunteers, mentors, staff';

-- ============================================================
-- TABLE 2 : sq_govt_departments
-- Directory of all Haryana / Rohtak district govt offices.
-- Used to map a grievance to the right department & portal.
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_govt_departments (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  dept_code             VARCHAR(40)   NOT NULL COMMENT 'Short machine key e.g. MC_ROHTAK',
  name_en               VARCHAR(180)  NOT NULL,
  name_hi               VARCHAR(180)  NULL,
  category              VARCHAR(80)   NULL     COMMENT 'Utility / Revenue / Health / Police / Education …',
  tier                  ENUM(
                          'state',
                          'district',
                          'block',
                          'ward'
                        )             NOT NULL DEFAULT 'district',
  parent_dept_id        INT UNSIGNED  NULL     COMMENT 'Self-ref: block office → district office',
  head_designation      VARCHAR(120)  NULL     COMMENT 'e.g. Deputy Commissioner',
  head_officer          VARCHAR(120)  NULL     COMMENT 'Current officer name',
  office_address        VARCHAR(255)  NULL,
  phone                 VARCHAR(15)   NULL,
  email                 VARCHAR(120)  NULL,
  website_url           VARCHAR(255)  NULL,
  grievance_portal_url  VARCHAR(255)  NULL,
  portal_type           ENUM(
                          'cm_window',
                          'samadhan',
                          'namaste_rohtak',
                          'direct',
                          'other'
                        )             NULL,
  avg_resolution_days   TINYINT       NULL     COMMENT 'Tracked over time for SLA guidance',
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_code (dept_code),
  KEY idx_dept_category (category),
  KEY idx_dept_tier (tier),
  CONSTRAINT fk_dept_parent FOREIGN KEY (parent_dept_id)
    REFERENCES sq_govt_departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Haryana govt department directory — state + Rohtak district';

-- ============================================================
-- TABLE 3 : sq_mentor_profiles
-- One row per mentor — extends sq_people (role = mentor).
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_mentor_profiles (
  id                      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  person_id               INT UNSIGNED  NOT NULL,
  expertise               VARCHAR(255)  NULL COMMENT 'Comma-sep: RTI, Legal, Health, Revenue …',
  profession              VARCHAR(100)  NULL,
  organisation            VARCHAR(150)  NULL,
  linkedin_url            VARCHAR(255)  NULL,
  how_can_help            TEXT          NULL,
  max_cases_per_month     TINYINT       NULL DEFAULT 5,
  available_for_mentoring TINYINT(1)    NOT NULL DEFAULT 1,
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mentor_person (person_id),
  CONSTRAINT fk_mentor_person FOREIGN KEY (person_id)
    REFERENCES sq_people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Extended profile for mentors / advisors';

-- ============================================================
-- TABLE 4 : sq_volunteer_profiles
-- One row per volunteer — extends sq_people (role = volunteer).
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_volunteer_profiles (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  person_id       INT UNSIGNED  NOT NULL,
  volunteer_type  ENUM(
                    'paid',
                    'unpaid'
                  )             NOT NULL DEFAULT 'unpaid',
  dept_expertise  VARCHAR(255)  NULL COMMENT 'Comma-sep dept_codes this volunteer handles',
  languages       VARCHAR(100)  NULL DEFAULT 'Hindi,English',
  cases_handled   INT UNSIGNED  NOT NULL DEFAULT 0,
  cases_resolved  INT UNSIGNED  NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2)  NULL     COMMENT '0.00–5.00 citizen rating',
  on_duty         TINYINT(1)    NOT NULL DEFAULT 0,
  joined_at       DATE          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_volunteer_person (person_id),
  KEY idx_volunteer_duty (on_duty),
  CONSTRAINT fk_volunteer_person FOREIGN KEY (person_id)
    REFERENCES sq_people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Extended profile for volunteers and paid staff';

-- ============================================================
-- TABLE 5 : sq_citizens
-- One row per citizen — extends sq_people (role = citizen).
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_citizens (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  person_id         INT UNSIGNED  NOT NULL,
  preferred_lang    ENUM('hi','en') NOT NULL DEFAULT 'hi',
  income_group      ENUM('BPL','APL','general') NULL,
  consent_given     TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'DPDP Act 2023 consent flag',
  consent_at        TIMESTAMP     NULL,
  total_grievances  INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_citizen_person (person_id),
  CONSTRAINT fk_citizen_person FOREIGN KEY (person_id)
    REFERENCES sq_people (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Extended profile for registered citizens / complainants';

-- ============================================================
-- TABLE 6 : sq_grievances
-- Master ticket table — one row per complaint filed.
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_grievances (
  id                    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ticket_no             VARCHAR(20)    NOT NULL COMMENT 'Format: SQ-YYYY-NNNNN e.g. SQ-2025-00001',
  citizen_id            INT UNSIGNED   NOT NULL,
  assigned_volunteer_id INT UNSIGNED   NULL,
  dept_id               INT UNSIGNED   NULL,
  mentor_id             INT UNSIGNED   NULL COMMENT 'sq_people.id of advising mentor',
  category              VARCHAR(80)    NULL COMMENT 'Electricity / Water / Ration / Roads / Health …',
  sub_category          VARCHAR(80)    NULL,
  description           TEXT           NOT NULL,
  description_hi        TEXT           NULL     COMMENT 'Hindi version of complaint',
  attachments_json      JSON           NULL     COMMENT 'Array of file URLs',
  status                ENUM(
                          'new',
                          'assigned',
                          'filed',
                          'pending_govt',
                          'escalated',
                          'resolved',
                          'closed',
                          'rejected'
                        )              NOT NULL DEFAULT 'new',
  priority              ENUM(
                          'low',
                          'medium',
                          'high',
                          'urgent'
                        )              NOT NULL DEFAULT 'medium',
  channel               ENUM(
                          'web',
                          'whatsapp',
                          'walkin',
                          'phone'
                        )              NOT NULL DEFAULT 'web',
  govt_portal_used      VARCHAR(60)    NULL     COMMENT 'cm_window / samadhan / namaste_rohtak / direct',
  govt_ref_no           VARCHAR(100)   NULL     COMMENT 'Reference number from govt portal',
  govt_response         TEXT           NULL,
  escalation_level      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=none 1=senior officer 2=CM Window 3=RTI',
  citizen_rating        TINYINT        NULL     COMMENT '1–5 rating given by citizen on resolution',
  citizen_feedback      TEXT           NULL,
  due_date              DATE           NULL,
  resolved_at           TIMESTAMP      NULL,
  created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_no (ticket_no),
  KEY idx_grievance_citizen (citizen_id),
  KEY idx_grievance_volunteer (assigned_volunteer_id),
  KEY idx_grievance_dept (dept_id),
  KEY idx_grievance_status (status),
  KEY idx_grievance_category (category),
  KEY idx_grievance_channel (channel),
  KEY idx_grievance_created (created_at),
  CONSTRAINT fk_grievance_citizen FOREIGN KEY (citizen_id)
    REFERENCES sq_citizens (id),
  CONSTRAINT fk_grievance_volunteer FOREIGN KEY (assigned_volunteer_id)
    REFERENCES sq_volunteer_profiles (id) ON DELETE SET NULL,
  CONSTRAINT fk_grievance_dept FOREIGN KEY (dept_id)
    REFERENCES sq_govt_departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_grievance_mentor FOREIGN KEY (mentor_id)
    REFERENCES sq_people (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Master grievance / ticket table — one row per complaint';

-- ============================================================
-- TABLE 7 : sq_grievance_logs
-- Full audit trail — every action on every grievance.
-- Never updated, only inserted.
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_grievance_logs (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  grievance_id  INT UNSIGNED  NOT NULL,
  actor_id      INT UNSIGNED  NOT NULL COMMENT 'sq_people.id of person taking action',
  actor_role    ENUM(
                  'citizen',
                  'volunteer',
                  'mentor',
                  'staff',
                  'admin',
                  'system'
                )             NOT NULL,
  action        VARCHAR(80)   NOT NULL COMMENT 'e.g. created / assigned / filed_cm_window / escalated / resolved',
  old_status    VARCHAR(40)   NULL,
  new_status    VARCHAR(40)   NULL,
  note          TEXT          NULL,
  meta_json     JSON          NULL     COMMENT 'Extra context: govt_ref_no, portal used etc.',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_log_grievance (grievance_id),
  KEY idx_log_actor (actor_id),
  KEY idx_log_action (action),
  KEY idx_log_created (created_at),
  CONSTRAINT fk_log_grievance FOREIGN KEY (grievance_id)
    REFERENCES sq_grievances (id) ON DELETE CASCADE,
  CONSTRAINT fk_log_actor FOREIGN KEY (actor_id)
    REFERENCES sq_people (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Immutable audit log — every status change and action on grievances';

-- ============================================================
-- TABLE 8 : sq_notifications
-- Outbound notifications (WhatsApp / SMS / email) per person.
-- ============================================================
CREATE TABLE IF NOT EXISTS sq_notifications (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  person_id     INT UNSIGNED  NOT NULL,
  grievance_id  INT UNSIGNED  NULL,
  channel       ENUM(
                  'whatsapp',
                  'sms',
                  'email'
                )             NOT NULL,
  template_key  VARCHAR(80)   NULL     COMMENT 'e.g. ticket_created / status_update / resolved',
  message       TEXT          NOT NULL,
  status        ENUM(
                  'queued',
                  'sent',
                  'delivered',
                  'failed'
                )             NOT NULL DEFAULT 'queued',
  sent_at       TIMESTAMP     NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_person (person_id),
  KEY idx_notif_grievance (grievance_id),
  KEY idx_notif_status (status),
  CONSTRAINT fk_notif_person FOREIGN KEY (person_id)
    REFERENCES sq_people (id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_grievance FOREIGN KEY (grievance_id)
    REFERENCES sq_grievances (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Outbound notification queue — WhatsApp, SMS, email';

-- ============================================================
-- TURN FK CHECKS BACK ON
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED DATA : Rohtak district govt departments
-- ============================================================
INSERT INTO sq_govt_departments
  (dept_code, name_en, name_hi, category, tier, head_designation, portal_type, grievance_portal_url)
VALUES
  ('DC_ROHTAK',        'Deputy Commissioner Office Rohtak',        'उपायुक्त कार्यालय रोहतक',              'Revenue',    'district', 'Deputy Commissioner',        'direct',         NULL),
  ('SP_ROHTAK',        'SP Office Rohtak',                         'पुलिस अधीक्षक कार्यालय रोहतक',         'Police',     'district', 'Superintendent of Police',   'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('MC_ROHTAK',        'Municipal Corporation Rohtak',              'नगर निगम रोहतक',                       'Urban',      'district', 'Commissioner MC',            'namaste_rohtak', NULL),
  ('CMO_ROHTAK',       'Chief Medical Officer Rohtak',              'मुख्य चिकित्सा अधिकारी रोहतक',         'Health',     'district', 'Chief Medical Officer',      'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('PGIMS_ROHTAK',     'PGIMS Rohtak',                              'पंडित भगवत दयाल शर्मा आयुर्विज्ञान',   'Health',     'district', 'Director PGIMS',             'direct',         NULL),
  ('DHBVN_ROHTAK',     'DHBVN Rohtak Division',                     'दक्षिण हरियाणा बिजली वितरण निगम',      'Utility',    'district', 'Executive Engineer',         'direct',         NULL),
  ('PHED_ROHTAK',      'PHED Water Supply Rohtak',                  'जन स्वास्थ्य अभियांत्रिकी विभाग',      'Utility',    'district', 'Executive Engineer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('DEO_ROHTAK',       'District Education Officer Rohtak',         'जिला शिक्षा अधिकारी रोहतक',            'Education',  'district', 'District Education Officer', 'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('DFC_ROHTAK',       'District Food Controller Rohtak',           'जिला खाद्य नियंत्रक रोहतक',            'Food',       'district', 'District Food Controller',   'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('RTA_ROHTAK',       'Regional Transport Authority Rohtak',       'क्षेत्रीय परिवहन प्राधिकरण रोहतक',     'Transport',  'district', 'Secretary RTA',              'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('CDPO_ROHTAK',      'CDPO / Anganwadi Rohtak',                   'बाल विकास परियोजना अधिकारी रोहतक',     'WCD',        'district', 'Child Development Officer',  'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('EMPLOYMENT_RHK',   'Employment Exchange Rohtak',                'रोजगार कार्यालय रोहतक',                 'Labour',     'district', 'Employment Officer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('HSVP_ROHTAK',      'HSVP Rohtak Estate Office',                 'हरियाणा शहरी विकास प्राधिकरण रोहतक',   'Housing',    'district', 'Estate Officer',             'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('PWD_ROHTAK',       'PWD (B&R) Division Rohtak',                 'लोक निर्माण विभाग रोहतक',              'Roads',      'district', 'Executive Engineer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('AGRI_ROHTAK',      'Agriculture Department Rohtak',             'कृषि विभाग रोहतक',                     'Agriculture','district', 'Deputy Director Agriculture', 'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('SOCIAL_RHK',       'Social Justice & Empowerment Rohtak',       'सामाजिक न्याय एवं अधिकारिता रोहतक',    'Social',     'district', 'District Social Welfare',    'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('LABOUR_ROHTAK',    'Labour Department Rohtak',                  'श्रम विभाग रोहतक',                     'Labour',     'district', 'Deputy Labour Commissioner', 'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('REVENUE_ROHTAK',   'Revenue / Tehsil Office Rohtak',            'राजस्व / तहसील कार्यालय रोहतक',         'Revenue',    'district', 'Tehsildar',                  'cm_window',      'https://cmwindow.haryana.gov.in'),
  ('BDO_ROHTAK',       'Block Development Office Rohtak Block',     'खंड विकास एवं पंचायत अधिकारी रोहतक',  'Rural',      'block',    'Block Dev. Officer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('BDO_KALANAUR',     'Block Development Office Kalanaur',         'खंड विकास एवं पंचायत अधिकारी कलानौर', 'Rural',      'block',    'Block Dev. Officer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('BDO_MAHAM',        'Block Development Office Maham',            'खंड विकास एवं पंचायत अधिकारी महम',     'Rural',      'block',    'Block Dev. Officer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('BDO_SAMPLA',       'Block Development Office Sampla',           'खंड विकास एवं पंचायत अधिकारी सांपला', 'Rural',      'block',    'Block Dev. Officer',         'samadhan',       'https://samadhaan.haryana.gov.in'),
  ('BDO_LAKKAR',       'Block Development Office Lakkar Haara',     'खंड विकास एवं पंचायत अधिकारी लक्कड़ हाड़ा','Rural', 'block',    'Block Dev. Officer',         'samadhan',       'https://samadhaan.haryana.gov.in');

-- ============================================================
-- SEED DATA : Sadahaq Trust admin account (sq_people)
-- ============================================================
INSERT INTO sq_people
  (role, full_name, name_hi, phone, email, block_name, is_active, is_verified)
VALUES
  ('admin', 'Sadahaq Trust Admin', 'सदाहक ट्रस्ट एडमिन', '9999000001', 'admin@sadahaqtrust.org', 'Rohtak', 1, 1);

-- ============================================================
-- VERIFY: show table list and row counts
-- ============================================================
SELECT
  table_name                              AS `Table`,
  table_rows                              AS `Approx rows`,
  ROUND(data_length / 1024, 1)            AS `Data KB`,
  table_comment                           AS `Purpose`
FROM information_schema.tables
WHERE table_schema = 'sadahaqtrust_db'
  AND table_name LIKE 'sq_%'
ORDER BY table_name;

