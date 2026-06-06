-- Migration 002: Add lifecycle fields to delivery_order table
-- Extends the DeliveryOrder model with the new platform lifecycle columns
-- Run: psql -U medusa_user -h 127.0.0.1 -d medusa_digitalrohtak -f this_file.sql

-- Add lifecycle_status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_lifecycle_status') THEN
    CREATE TYPE delivery_lifecycle_status AS ENUM (
      'broadcast',
      'assigned',
      'ready_for_pickup',
      'picked_up',
      'delivered',
      'complete',
      'unassigned',
      'expired'
    );
  END IF;
END$$;

-- Add lifecycle_status column (nullable — existing rows keep NULL until transitioned)
ALTER TABLE delivery_order
  ADD COLUMN IF NOT EXISTS lifecycle_status delivery_lifecycle_status;

-- Add rebroadcast_count with default 0
ALTER TABLE delivery_order
  ADD COLUMN IF NOT EXISTS rebroadcast_count INTEGER NOT NULL DEFAULT 0;

-- Add delivery_fee (nullable float — set when a rider is assigned)
ALTER TABLE delivery_order
  ADD COLUMN IF NOT EXISTS delivery_fee FLOAT;

-- Add seller_channel_id (nullable text — links order to a Sales Channel handle)
ALTER TABLE delivery_order
  ADD COLUMN IF NOT EXISTS seller_channel_id TEXT;

-- Add last_location_at (nullable timestamptz — updated by the broadcast-monitor job)
ALTER TABLE delivery_order
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_delivery_order_lifecycle_status
  ON delivery_order(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_delivery_order_seller_channel
  ON delivery_order(seller_channel_id);

CREATE INDEX IF NOT EXISTS idx_delivery_order_broadcast_recount
  ON delivery_order(lifecycle_status, rebroadcast_count)
  WHERE lifecycle_status = 'broadcast';

SELECT 'Migration 002: delivery_order lifecycle columns added' AS result;
