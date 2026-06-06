CREATE TABLE IF NOT EXISTS upi_merchant_config (
  id VARCHAR(255) PRIMARY KEY,
  merchant_upi_id VARCHAR(255) NOT NULL,
  merchant_upi_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upi_payment (
  id VARCHAR(255) PRIMARY KEY,
  cart_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255),
  merchant_upi_id VARCHAR(255) NOT NULL,
  merchant_upi_name VARCHAR(255) NOT NULL,
  merchant_amount FLOAT NOT NULL,
  merchant_utr VARCHAR(255),
  merchant_payment_status VARCHAR(20) DEFAULT 'pending' CHECK (merchant_payment_status IN ('pending','captured')),
  rider_upi_id VARCHAR(255),
  rider_upi_name VARCHAR(255),
  rider_amount FLOAT,
  rider_utr VARCHAR(255),
  rider_payment_status VARCHAR(20) DEFAULT 'not_applicable' CHECK (rider_payment_status IN ('pending','captured','not_applicable')),
  requires_delivery BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upi_payment_cart_id ON upi_payment(cart_id);
CREATE INDEX IF NOT EXISTS idx_upi_payment_order_id ON upi_payment(order_id);

INSERT INTO upi_merchant_config (id, merchant_upi_id, merchant_upi_name, is_active)
VALUES ('merchant_01', 'sadahaqtrust@upi', 'Digital Rohtak', true)
ON CONFLICT (id) DO NOTHING;

SELECT 'UPI module migration completed' as result;
