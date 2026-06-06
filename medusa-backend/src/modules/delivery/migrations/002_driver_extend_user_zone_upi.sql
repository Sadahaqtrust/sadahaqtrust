-- Migration 002: Extend delivery_driver with user_id, zone_id, upi_vpa
-- Requirements: 4.1, 4.2, 7.4
-- Run: psql -U medusa_user -h 127.0.0.1 -d medusa_digitalrohtak -f this_file.sql

-- user_id: links the Driver record to a Medusa customer ID
ALTER TABLE delivery_driver
  ADD COLUMN IF NOT EXISTS user_id TEXT;

-- zone_id: references the assigned ServiceZone for dispatch
ALTER TABLE delivery_driver
  ADD COLUMN IF NOT EXISTS zone_id TEXT;

-- upi_vpa: the Rider's UPI Virtual Payment Address used for delivery-fee disbursements
ALTER TABLE delivery_driver
  ADD COLUMN IF NOT EXISTS upi_vpa TEXT;

-- Index for fast Driver lookup by Medusa customer ID (used in registration gate and accept flow)
CREATE INDEX IF NOT EXISTS idx_delivery_driver_user_id ON delivery_driver(user_id);

-- Index for zone-based driver queries (used in broadcast stream and re-broadcast job)
CREATE INDEX IF NOT EXISTS idx_delivery_driver_zone_id ON delivery_driver(zone_id);

SELECT 'Migration 002: delivery_driver user_id/zone_id/upi_vpa columns added' AS result;
