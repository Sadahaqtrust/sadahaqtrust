-- Delivery Module Migration
-- Run: psql -U medusa_user -h 127.0.0.1 -d medusa_digitalrohtak -f this_file.sql

CREATE TABLE IF NOT EXISTS delivery_driver (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('available','busy','offline')),
  vehicle_type VARCHAR(20) DEFAULT 'bike' CHECK (vehicle_type IN ('bike','scooter','car','van')),
  vehicle_number VARCHAR(50),
  rating FLOAT DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_lat FLOAT,
  last_lng FLOAT,
  last_location_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_order (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  fulfillment_type VARCHAR(30) DEFAULT 'quick_commerce' CHECK (fulfillment_type IN ('quick_commerce','scheduled','pickup')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','dispatched','en_route','arrived','picked_up','completed','cancelled','failed')),
  driver_id VARCHAR(255),
  pickup_name VARCHAR(255) NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  dropoff_name VARCHAR(255) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat FLOAT,
  dropoff_lng FLOAT,
  scheduled_at TIMESTAMPTZ,
  tracking_number VARCHAR(50) UNIQUE,
  estimated_arrival TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cod_amount FLOAT DEFAULT 0,
  cod_currency VARCHAR(10) DEFAULT 'INR',
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_service_zone (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) DEFAULT 'Rohtak',
  state VARCHAR(100) DEFAULT 'Haryana',
  center_lat FLOAT NOT NULL,
  center_lng FLOAT NOT NULL,
  radius_km FLOAT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  base_charge FLOAT DEFAULT 0,
  per_km_charge FLOAT DEFAULT 5,
  free_delivery_above FLOAT DEFAULT 500,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_time_slot (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  slot_date VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  max_orders INTEGER DEFAULT 20,
  booked_orders INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  zone_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_tracking_event (
  id VARCHAR(255) PRIMARY KEY,
  delivery_order_id VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  message TEXT,
  message_hi TEXT,
  lat FLOAT,
  lng FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PostGIS geography columns for precise geospatial queries
ALTER TABLE delivery_driver ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
ALTER TABLE delivery_order ADD COLUMN IF NOT EXISTS pickup_location GEOGRAPHY(POINT, 4326);
ALTER TABLE delivery_order ADD COLUMN IF NOT EXISTS dropoff_location GEOGRAPHY(POINT, 4326);
ALTER TABLE delivery_service_zone ADD COLUMN IF NOT EXISTS center_location GEOGRAPHY(POINT, 4326);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_order_order_id ON delivery_order(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order_status ON delivery_order(status);
CREATE INDEX IF NOT EXISTS idx_delivery_order_tracking ON delivery_order(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_driver_status ON delivery_driver(status, is_active);
CREATE INDEX IF NOT EXISTS idx_tracking_event_order ON delivery_tracking_event(delivery_order_id);

-- Seed: Rohtak service zone
INSERT INTO delivery_service_zone (id, name, city, center_lat, center_lng, radius_km, base_charge, per_km_charge, free_delivery_above)
VALUES ('zone_rohtak_01', 'Rohtak City', 'Rohtak', 28.8955, 76.6066, 15, 20, 5, 500)
ON CONFLICT (id) DO NOTHING;

-- Seed: Sample driver
INSERT INTO delivery_driver (id, name, phone, status, vehicle_type, is_active)
VALUES ('drv_sample_01', 'Rahul Kumar', '+91-9876543210', 'available', 'bike', true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Delivery module migration completed' as result;
