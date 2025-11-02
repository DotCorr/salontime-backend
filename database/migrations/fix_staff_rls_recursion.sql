-- Fix infinite recursion in staff RLS policy
-- The issue: "Staff can view salon staff" policy checks staff table from within staff policy
-- This causes infinite recursion: staff policy -> checks staff -> triggers staff policy -> ...

-- Solution: Simplify policies to avoid staff-to-staff lookups
-- Staff can view other staff only if they're salon owner, or view their own record

-- Drop and recreate the problematic staff policy
DROP POLICY IF EXISTS "Staff can view salon staff" ON public.staff;

DO $$
BEGIN
    CREATE POLICY "Staff can view salon staff" ON public.staff
        FOR SELECT USING (
            -- Salon owner can see all their staff
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = staff.salon_id 
                AND salons.owner_id = auth.uid()
            )
            OR
            -- Staff can see their own record
            staff.user_id = auth.uid()
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix the "Staff can view salon services" policy to avoid recursion
-- This policy checks staff table which might trigger staff policies
DROP POLICY IF EXISTS "Staff can view salon services" ON public.services;

DO $$
BEGIN
    CREATE POLICY "Staff can view salon services" ON public.services
        FOR SELECT USING (
            -- Salon owner can see services
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = services.salon_id 
                AND salons.owner_id = auth.uid()
            )
            -- Note: Regular staff viewing is already covered by "Anyone can view active services"
            -- If staff needs to see inactive services, we'd need a security definer function
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix "Staff can view salon bookings" policy to avoid recursion
DROP POLICY IF EXISTS "Staff can view salon bookings" ON public.bookings;

DO $$
BEGIN
    CREATE POLICY "Staff can view salon bookings" ON public.bookings
        FOR SELECT USING (
            -- Salon owner can see bookings
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
            -- For staff to view bookings, they need salon owner access or we'd need a function
            -- Since staff bookings access is less critical, we'll use salon owner check
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
