-- Migration 002: UPI Payment Deferred-Commit State Machine Fields
-- Extends upi_payment table for the deferred-commit UPI split payment flow.
-- Requirements: 7.1, 7.3, 7.5, 7.6
-- Run: psql -U medusa_user -h 127.0.0.1 -d medusa_digitalrohtak -f this_file.sql

-- Add utr_status enum column (pending → utr_submitted → disbursed | expired)
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS utr_status VARCHAR(20)
    NOT NULL DEFAULT 'pending'
    CHECK (utr_status IN ('pending', 'utr_submitted', 'disbursed', 'expired'));

-- Timestamp when the Customer successfully submitted a UTR
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS utr_submitted_at TIMESTAMPTZ;

-- Timestamp when both UPI disbursement instructions were issued successfully
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;

-- Expiry deadline: set to created_at + 15 minutes on order creation (Requirement 7.6)
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Flag set true when one or both disbursement API calls fail after Rider accepts (Requirement 7.10)
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS disbursement_failure BOOLEAN NOT NULL DEFAULT false;

-- UTR submission attempt counter — formalised from existing in-memory logic
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

-- Companion timestamp for rate-limit window checks (already referenced in security.ts)
ALTER TABLE upi_payment
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Index for expiry job: quickly find pending payments past their deadline (Requirement 7.6)
CREATE INDEX IF NOT EXISTS idx_upi_payment_utr_status ON upi_payment(utr_status);
CREATE INDEX IF NOT EXISTS idx_upi_payment_expires_at ON upi_payment(expires_at)
  WHERE utr_status = 'pending';

SELECT 'Migration 002: upi_payment deferred-commit columns added' AS result;
