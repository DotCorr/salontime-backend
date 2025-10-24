-- Add country column to salons table for Stripe Connect requirements
-- This is required for creating Stripe Connect accounts

-- Add country column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'salons' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.salons 
        ADD COLUMN country VARCHAR(2) DEFAULT 'NL';
        
        -- Add comment to column
        COMMENT ON COLUMN public.salons.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, NL, GB). Required for Stripe Connect account creation.';
    END IF;
END $$;

-- Update existing salons to have a default country if null
-- All salons default to NL since this is primarily a Dutch app
UPDATE public.salons 
SET country = 'NL' 
WHERE country IS NULL;

