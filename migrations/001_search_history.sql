-- File: storefront/migrations/001_search_history.sql
-- Apply via: psql "$DATABASE_URL" -f migrations/001_search_history.sql
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS search_event (
  id                        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id                text         NOT NULL,
  query_text                text         NOT NULL DEFAULT '',
  query_truncated           boolean      NOT NULL DEFAULT false,
  cuisine                   text         NULL,
  result_restaurant_ids     text[]       NOT NULL DEFAULT '{}',
  result_count              integer      NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  match_reason_breakdown    jsonb        NOT NULL DEFAULT '{}'::jsonb,
  user_agent                text         NOT NULL DEFAULT '',
  locale                    text         NOT NULL DEFAULT '',
  source_ip_hash            text         NOT NULL,
  created_at                timestamptz  NOT NULL DEFAULT NOW(),
  CONSTRAINT search_event_query_len CHECK (char_length(query_text) <= 256),
  CONSTRAINT search_event_ua_len    CHECK (char_length(user_agent) <= 512),
  CONSTRAINT search_event_cuisine_len CHECK (cuisine IS NULL OR char_length(cuisine) <= 64)
);

CREATE INDEX IF NOT EXISTS idx_search_event_vid_created
  ON search_event (visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_event_created
  ON search_event (created_at);  -- retention worker scan key

CREATE TABLE IF NOT EXISTS visitor_preferences (
  visitor_id   text         PRIMARY KEY,
  opt_out      boolean      NOT NULL DEFAULT false,
  updated_at   timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_pref_optout
  ON visitor_preferences (visitor_id)
  WHERE opt_out = true;  -- partial index; hot path is "is this vid opted out?"

COMMIT;

-- Note: gen_random_uuid() requires pgcrypto. It is already enabled in
-- medusa_digitalrohtak (verified via \dx). If a future env disables it,
-- fall back to crypto.randomUUID() at the app layer and INSERT the uuid.
