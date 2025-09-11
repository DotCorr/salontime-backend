-- SalonTime Database Schema for Supabase
-- Run these commands in your Supabase SQL Editor
-- NOTE: JWT secret is managed through Supabase Dashboard → Settings → API

-- Create user profiles table (extends Supabase auth.users)
-- NOTE: Temporarily removed foreign key constraint due to Supabase timing issues
-- We'll maintain referential integrity through application logic
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,  -- Will match auth.users(id) but no FK constraint
    user_type VARCHAR(20) CHECK (user_type IN ('client', 'salon_owner', 'admin')) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    language VARCHAR(10) DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create salons table
CREATE TABLE salons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    business_hours JSONB,
    amenities TEXT[],
    images TEXT[],
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(20) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'plus')),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'cancelled', 'unpaid')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in minutes
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id), -- Optional: if staff has own account
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    specialties TEXT[], -- Array of specialties
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    client_notes TEXT,
    staff_notes TEXT,
    total_amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) CHECK (status IN ('succeeded', 'failed', 'refunded')),
    payment_method JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_accounts table for managing Stripe Connect accounts
CREATE TABLE stripe_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'inactive', 'restricted')),
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'usd',
  business_type TEXT DEFAULT 'individual',
  capabilities JSONB DEFAULT '{}',
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_stripe_accounts_salon_id ON stripe_accounts(salon_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON stripe_accounts(stripe_account_id);

-- Add RLS policies for stripe_accounts
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Salon owners can view and update their own Stripe accounts
CREATE POLICY "Salon owners can manage their Stripe accounts" ON stripe_accounts
  FOR ALL USING (
    salon_id IN (
      SELECT id FROM salons WHERE owner_id = auth.uid()
    )
  );

-- Platform can view all accounts (for webhooks and admin)
CREATE POLICY "Service role can manage all stripe accounts" ON stripe_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE PRIMARY KEY,
    booking_confirmations BOOLEAN DEFAULT true,
    appointment_reminders BOOLEAN DEFAULT true,
    payment_confirmations BOOLEAN DEFAULT true,
    review_requests BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON public.user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_salons_owner_id ON public.salons(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON public.bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON public.reviews(salon_id);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Services: salon owners can manage their services, clients can view active services
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

-- Bookings: clients can manage their bookings, salon owners can manage bookings at their salon
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

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

