-- Migration 002 — Provider Auth, Posts, Comments, Files
-- Run: psql postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak -f 002_provider_auth_posts.sql

-- provider_auth: seller login independent of buyer/customer account
CREATE TABLE IF NOT EXISTS provider_auth (
  id           VARCHAR(255) PRIMARY KEY,
  provider_id  VARCHAR(255) NOT NULL REFERENCES service_provider(id) ON DELETE CASCADE,
  email        VARCHAR(150),
  mobile       VARCHAR(15),
  pin_hash     VARCHAR(255) NOT NULL,
  type         VARCHAR(10)  NOT NULL DEFAULT 'seller',
  is_active    BOOLEAN      DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE (email, mobile, type)
);
CREATE INDEX IF NOT EXISTS idx_pauth_email  ON provider_auth(email);
CREATE INDEX IF NOT EXISTS idx_pauth_mobile ON provider_auth(mobile);

-- provider_post: blog feed posts by provider
CREATE TABLE IF NOT EXISTS provider_post (
  id          VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL REFERENCES service_provider(id) ON DELETE CASCADE,
  content     TEXT         NOT NULL,
  images      TEXT[],
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ppost_provider ON provider_post(provider_id);

-- provider_post_comment: public comments on posts (images only, no video/audio)
CREATE TABLE IF NOT EXISTS provider_post_comment (
  id           VARCHAR(255) PRIMARY KEY,
  post_id      VARCHAR(255) NOT NULL REFERENCES provider_post(id) ON DELETE CASCADE,
  author_name  VARCHAR(150),
  author_email VARCHAR(150),
  content      TEXT         NOT NULL,
  images       TEXT[],
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pcomment_post ON provider_post_comment(post_id);

-- provider_file: uploaded files (PDF + images only, no video/audio)
CREATE TABLE IF NOT EXISTS provider_file (
  id           VARCHAR(255) PRIMARY KEY,
  provider_id  VARCHAR(255) NOT NULL REFERENCES service_provider(id) ON DELETE CASCADE,
  file_url     VARCHAR(500) NOT NULL,
  file_name    VARCHAR(255),
  file_type    VARCHAR(50),
  file_size_kb INT,
  category     VARCHAR(50)  DEFAULT 'document',
  uploaded_at  TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pfile_provider ON provider_file(provider_id);

SELECT 'Migration 002 complete' AS status;
