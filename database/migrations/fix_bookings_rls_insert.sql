-- Fix bookings RLS policies to allow INSERT operations
-- The issue: Policies using only "USING" don't apply to INSERT operations
-- For INSERT, we need "WITH CHECK" clause

BEGIN;

-- Drop and recreate "Clients can manage their bookings" policy
-- This policy needs both USING (for SELECT/UPDATE/DELETE) and WITH CHECK (for INSERT)
DROP POLICY IF EXISTS "Clients can manage their bookings" ON public.bookings;

DO $$
BEGIN
    CREATE POLICY "Clients can manage their bookings" ON public.bookings
        FOR ALL 
        USING (auth.uid() = client_id)
        WITH CHECK (auth.uid() = client_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Ensure salon owners can also insert bookings (if they're booking for someone else)
-- Actually, salon owners can only manage bookings at their salon, not insert as client
-- So we keep the existing policy but make sure it works for INSERT too

-- The "Salon owners can manage salon bookings" policy also needs WITH CHECK
DROP POLICY IF EXISTS "Salon owners can manage salon bookings" ON public.bookings;

DO $$
BEGIN
    CREATE POLICY "Salon owners can manage salon bookings" ON public.bookings
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- Summary:
-- ✅ Fixed: Added WITH CHECK clause to "Clients can manage their bookings" policy
-- ✅ Fixed: Added WITH CHECK clause to "Salon owners can manage salon bookings" policy
-- ✅ Now: Clients can INSERT bookings where client_id = auth.uid()
-- ✅ Now: Salon owners can INSERT bookings at their salons

