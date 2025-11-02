-- Schema Cleanup and Fix Migration
-- This migration:
-- 1. Fixes missing foreign key constraint on bookings.salon_id
-- 2. Removes duplicate/unused tables
-- 3. Standardizes column names
-- 4. Ensures RLS is properly configured
-- 5. Fixes data inconsistencies

BEGIN;

-- ============================================================================
-- PART 1: Fix Critical Issues
-- ============================================================================

-- Fix 1: Add missing foreign key constraint for bookings.salon_id
-- This is the immediate issue causing the booking creation failure
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bookings_salon_id_fkey' 
        AND conrelid = 'public.bookings'::regclass
    ) THEN
        ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_salon_id_fkey 
        FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added bookings_salon_id_fkey constraint';
    ELSE
        RAISE NOTICE 'bookings_salon_id_fkey constraint already exists';
    END IF;
END $$;

-- Fix 2: Add missing foreign key for services.salon_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'services_salon_id_fkey' 
        AND conrelid = 'public.services'::regclass
    ) THEN
        ALTER TABLE public.services
        ADD CONSTRAINT services_salon_id_fkey 
        FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added services_salon_id_fkey constraint';
    ELSE
        RAISE NOTICE 'services_salon_id_fkey constraint already exists';
    END IF;
END $$;

-- Fix 3: Add missing foreign key for staff.salon_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'staff_salon_id_fkey' 
        AND conrelid = 'public.staff'::regclass
    ) THEN
        ALTER TABLE public.staff
        ADD CONSTRAINT staff_salon_id_fkey 
        FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added staff_salon_id_fkey constraint';
    ELSE
        RAISE NOTICE 'staff_salon_id_fkey constraint already exists';
    END IF;
END $$;

-- Fix 4: Standardize bookings columns
-- Remove total_amount from bookings (it belongs in payments table)
-- Note: We only remove the column if it exists and we can do it safely
DO $$
BEGIN
    -- Check if total_amount column exists and has data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'total_amount'
    ) THEN
        -- Check if there's any data in total_amount
        IF EXISTS (SELECT 1 FROM public.bookings WHERE total_amount IS NOT NULL) THEN
            -- Don't drop if there's data - just leave it for now
            RAISE NOTICE 'total_amount column exists with data - leaving it for backward compatibility';
        ELSE
            -- Safe to drop if no data
            ALTER TABLE public.bookings DROP COLUMN IF EXISTS total_amount;
            RAISE NOTICE 'Dropped total_amount column from bookings';
        END IF;
    END IF;
END $$;

-- Fix 5: Standardize salon_notes vs staff_notes
-- bookings table should have salon_notes (not staff_notes)
DO $$
BEGIN
    -- If staff_notes exists but salon_notes doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'staff_notes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'salon_notes'
    ) THEN
        ALTER TABLE public.bookings RENAME COLUMN staff_notes TO salon_notes;
        RAISE NOTICE 'Renamed staff_notes to salon_notes';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Remove Duplicate/Unused Tables
-- ============================================================================

-- Remove duplicate 'favorites' table (we use 'user_favorites')
-- First, migrate any data if it exists
DO $$
DECLARE
    fav_count INTEGER;
BEGIN
    -- Check if favorites table exists and has data
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'favorites'
    ) THEN
        -- Count existing records
        EXECUTE 'SELECT COUNT(*) FROM public.favorites' INTO fav_count;
        
        IF fav_count > 0 THEN
            -- Migrate data to user_favorites (avoiding duplicates)
            INSERT INTO public.user_favorites (user_id, salon_id, created_at)
            SELECT f.user_id, f.salon_id, f.created_at
            FROM public.favorites f
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_favorites uf
                WHERE uf.user_id = f.user_id AND uf.salon_id = f.salon_id
            )
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Migrated % records from favorites to user_favorites', fav_count;
        END IF;
        
        -- Drop the duplicate table
        DROP TABLE IF EXISTS public.favorites CASCADE;
        RAISE NOTICE 'Dropped duplicate favorites table';
    END IF;
END $$;

-- Remove unused embedding tables (if not being used by backend)
-- Check if they're referenced anywhere first
DO $$
BEGIN
    -- These tables are not used by any backend controllers
    -- Only drop if they exist and are empty (to be safe)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'salon_embeddings'
    ) AND NOT EXISTS (SELECT 1 FROM public.salon_embeddings LIMIT 1) THEN
        DROP TABLE IF EXISTS public.salon_embeddings CASCADE;
        RAISE NOTICE 'Dropped unused salon_embeddings table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_embeddings'
    ) AND NOT EXISTS (SELECT 1 FROM public.user_embeddings LIMIT 1) THEN
        DROP TABLE IF EXISTS public.user_embeddings CASCADE;
        RAISE NOTICE 'Dropped unused user_embeddings table';
    END IF;
END $$;

-- Remove unused user_interactions table (if not being used)
-- Note: Keeping salon_views as it might be used by analytics
DO $$
BEGIN
    -- Only drop if empty (to be safe)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_interactions'
    ) AND NOT EXISTS (SELECT 1 FROM public.user_interactions LIMIT 1) THEN
        DROP TABLE IF EXISTS public.user_interactions CASCADE;
        RAISE NOTICE 'Dropped unused user_interactions table';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Ensure RLS is Enabled on All Tables
-- ============================================================================

-- Enable RLS on all active tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Add Missing Indexes for Performance
-- ============================================================================

-- Index on bookings.salon_id (for the foreign key and queries)
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON public.bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON public.bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Index on services.salon_id
CREATE INDEX IF NOT EXISTS idx_services_salon_id ON public.services(salon_id);

-- Index on staff.salon_id
CREATE INDEX IF NOT EXISTS idx_staff_salon_id ON public.staff(salon_id);

-- Index on user_favorites for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_salon ON public.user_favorites(user_id, salon_id);

-- ============================================================================
-- PART 5: Ensure Required Columns Exist
-- ============================================================================

-- Make sure bookings has all required columns with proper types
DO $$
BEGIN
    -- Ensure client_id is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'client_id'
        AND is_nullable = 'YES'
    ) THEN
        -- Only set NOT NULL if all existing rows have client_id
        IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE client_id IS NULL) THEN
            ALTER TABLE public.bookings ALTER COLUMN client_id SET NOT NULL;
            RAISE NOTICE 'Set client_id to NOT NULL';
        END IF;
    END IF;
    
    -- Ensure salon_id is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'salon_id'
        AND is_nullable = 'YES'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE salon_id IS NULL) THEN
            ALTER TABLE public.bookings ALTER COLUMN salon_id SET NOT NULL;
            RAISE NOTICE 'Set salon_id to NOT NULL';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 6: Fix Waitlist Table Foreign Keys
-- ============================================================================

-- Add missing foreign key for waitlist.salon_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'waitlist_salon_id_fkey' 
        AND conrelid = 'public.waitlist'::regclass
    ) THEN
        ALTER TABLE public.waitlist
        ADD CONSTRAINT waitlist_salon_id_fkey 
        FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added waitlist_salon_id_fkey constraint';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration:
-- ✅ Fixed: Added bookings.salon_id foreign key constraint (CRITICAL FIX)
-- ✅ Fixed: Added other missing foreign key constraints
-- ✅ Cleaned: Removed duplicate 'favorites' table (migrated data to user_favorites)
-- ✅ Cleaned: Removed unused embedding tables (if empty)
-- ✅ Standardized: Column names (salon_notes vs staff_notes)
-- ✅ Ensured: RLS is enabled on all tables
-- ✅ Added: Performance indexes
-- ✅ Safe: All changes preserve existing data

