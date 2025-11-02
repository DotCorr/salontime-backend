-- Add stripe_checkout_session_id column to payments table
-- This tracks Stripe Checkout sessions created for payment links

BEGIN;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_checkout_session ON public.payments(stripe_checkout_session_id);

COMMIT;

-- Summary:
-- ✅ Added stripe_checkout_session_id column to track payment links
-- ✅ Added index for performance

