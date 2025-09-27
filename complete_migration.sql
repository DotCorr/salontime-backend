-- SalonTime Complete Database Migration
-- This script fixes RLS vulnerabilities AND adds missing Stripe columns
-- Run these commands in your Supabase SQL Editor

-- STEP 1: Add missing Stripe columns to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);

ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(20) DEFAULT 'pending' 
CHECK (stripe_account_status IN ('pending', 'active', 'inactive', 'restricted'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_salons_stripe_account_id ON public.salons(stripe_account_id);

-- STEP 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can create user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Salon owners can manage their salons" ON public.salons;
DROP POLICY IF EXISTS "Anyone can view active salons" ON public.salons;
DROP POLICY IF EXISTS "Salon owners can manage their services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Staff can view salon services" ON public.services;
DROP POLICY IF EXISTS "Salon owners can manage their staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can view salon staff" ON public.staff;
DROP POLICY IF EXISTS "Clients can manage their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Salon owners can manage salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Salon owners can view salon payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Clients can manage their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
DROP POLICY IF EXISTS "Salon owners can view salon reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can manage their family members" ON public.family_members;
DROP POLICY IF EXISTS "Clients can manage their waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Salon owners can view waitlist for their salon" ON public.waitlist;
DROP POLICY IF EXISTS "Salon owners can update waitlist entries for their salon" ON public.waitlist;
DROP POLICY IF EXISTS "Salon owners can manage their Stripe accounts" ON public.stripe_accounts;
DROP POLICY IF EXISTS "Service role can manage all stripe accounts" ON public.stripe_accounts;

-- STEP 3: Ensure RLS is enabled on all tables
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

-- STEP 4: Create secure RLS policies

-- User profiles: users can read/update their own profile, service role can create profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can create user profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Salons: salon owners can manage their salons, clients can view active salons
CREATE POLICY "Salon owners can manage their salons" ON public.salons
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view active salons" ON public.salons
    FOR SELECT USING (is_active = true);

-- Services: salon owners can manage their services, clients can view active services, staff can view their salon's services
CREATE POLICY "Salon owners can manage their services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = services.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view salon services" ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE staff.salon_id = services.salon_id 
            AND staff.user_id = auth.uid()
        )
    );

-- Staff: salon owners can manage their staff, staff can view their salon's staff
CREATE POLICY "Salon owners can manage their staff" ON public.staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = staff.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view salon staff" ON public.staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff s2
            WHERE s2.salon_id = staff.salon_id 
            AND s2.user_id = auth.uid()
        )
    );

-- Bookings: clients can manage their bookings, salon owners can manage bookings at their salon, staff can view their salon's bookings
CREATE POLICY "Clients can manage their bookings" ON public.bookings
    FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Salon owners can manage salon bookings" ON public.bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = bookings.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view salon bookings" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE staff.salon_id = bookings.salon_id 
            AND staff.user_id = auth.uid()
        )
    );

-- Payments: clients can view their payments, salon owners can view their salon's payments, service role can manage all
CREATE POLICY "Clients can view their payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = payments.booking_id 
            AND bookings.client_id = auth.uid()
        )
    );

CREATE POLICY "Salon owners can view salon payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            JOIN public.salons ON salons.id = bookings.salon_id
            WHERE bookings.id = payments.booking_id 
            AND salons.owner_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all payments" ON public.payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Reviews: clients can manage their reviews, anyone can view visible reviews, salon owners can view their salon's reviews
CREATE POLICY "Clients can manage their reviews" ON public.reviews
    FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Anyone can view visible reviews" ON public.reviews
    FOR SELECT USING (is_visible = true);

CREATE POLICY "Salon owners can view salon reviews" ON public.reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = reviews.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

-- Family members: users can manage their family members
CREATE POLICY "Users can manage their family members" ON public.family_members
    FOR ALL USING (auth.uid() = parent_id);

-- Waitlist policies: clients can manage their waitlist entries, salon owners can manage their salon's waitlist
CREATE POLICY "Clients can manage their waitlist entries" ON public.waitlist
    FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Salon owners can view waitlist for their salon" ON public.waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = waitlist.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

CREATE POLICY "Salon owners can update waitlist entries for their salon" ON public.waitlist
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = waitlist.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );

-- Stripe accounts policies: salon owners can manage their Stripe accounts, service role can manage all
CREATE POLICY "Salon owners can manage their Stripe accounts" ON public.stripe_accounts
    FOR ALL USING (
        salon_id IN (
            SELECT id FROM public.salons WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all stripe accounts" ON public.stripe_accounts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- STEP 5: Create or replace the updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS handle_salons_updated_at ON public.salons;
DROP TRIGGER IF EXISTS handle_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS handle_stripe_accounts_updated_at ON public.stripe_accounts;
DROP TRIGGER IF EXISTS handle_waitlist_updated_at ON public.waitlist;

-- Add updated_at triggers
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_salons_updated_at
    BEFORE UPDATE ON public.salons
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_stripe_accounts_updated_at
    BEFORE UPDATE ON public.stripe_accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_waitlist_updated_at
    BEFORE UPDATE ON public.waitlist
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
