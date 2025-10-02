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

-- STEP 1.5: Ensure services table has all required columns
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS name VARCHAR(200);

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) CHECK (price >= 0);

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS duration INTEGER CHECK (duration > 0);

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- STEP 2: Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'salon_owner', 'staff', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    business_hours JSONB,
    amenities JSONB,
    images JSONB,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id UUID,
    staff_id UUID,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    client_notes TEXT,
    salon_notes TEXT,
    family_member_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    relationship VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    account_status VARCHAR(50) DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id UUID,
    preferred_date DATE,
    preferred_time TIME,
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'booked', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'stylist',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Drop existing policies if they exist (to avoid conflicts)
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

-- STEP 4: Create secure RLS policies (with error handling)

-- User profiles: users can read/update their own profile, service role can create profiles
DO $$
BEGIN
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
CREATE POLICY "Service role can create user profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Salons: salon owners can manage their salons, clients can view active salons
DO $$
BEGIN
CREATE POLICY "Salon owners can manage their salons" ON public.salons
    FOR ALL USING (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
CREATE POLICY "Anyone can view active salons" ON public.salons
    FOR SELECT USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Services: salon owners can manage their services, clients can view active services, staff can view their salon's services
DO $$
BEGIN
CREATE POLICY "Salon owners can manage their services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.salons 
            WHERE salons.id = services.salon_id 
            AND salons.owner_id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
CREATE POLICY "Staff can view salon services" ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE staff.salon_id = services.salon_id 
            AND staff.user_id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- STEP 6: Add Services System

-- Create service categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration INTEGER NOT NULL CHECK (duration > 0), -- Duration in minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_salon_id ON public.services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON public.service_categories(is_active);

-- Insert default service categories (with error handling)
DO $$
BEGIN
INSERT INTO public.service_categories (name, description, icon, color) VALUES
('Hair', 'Hair styling and cutting services', 'scissors', '#FF6B6B'),
('Nails', 'Nail care and manicure services', 'hand', '#4ECDC4'),
('Skincare', 'Facial and skincare treatments', 'sparkles', '#45B7D1'),
('Massage', 'Relaxation and therapeutic massage', 'heart', '#96CEB4'),
('Makeup', 'Beauty and makeup services', 'palette', '#FFEAA7'),
('Other', 'Other beauty and wellness services', 'star', '#DDA0DD')
ON CONFLICT (name) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Categories might already exist, continue
        NULL;
END $$;

-- Enable RLS for services tables
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_categories (public read access)
CREATE POLICY "Service categories are viewable by everyone" ON public.service_categories
    FOR SELECT USING (true);

-- Create RLS policies for services
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

-- Add updated_at triggers for services tables
CREATE TRIGGER handle_service_categories_updated_at
    BEFORE UPDATE ON public.service_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- STEP 7: Add Chat System

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique conversation between client and salon
    UNIQUE(client_id, salon_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants (for future group chat support)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

-- Chat reports table
CREATE TABLE IF NOT EXISTS public.chat_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat system
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_salon_id ON public.conversations(salon_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation_id ON public.chat_reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter_id ON public.chat_reports(reporter_id);

-- Enable RLS for chat tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (client_id = auth.uid() OR salon_id = auth.uid());

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (client_id = auth.uid() OR salon_id = auth.uid());

CREATE POLICY "Users can update their conversations" ON public.conversations
    FOR UPDATE USING (client_id = auth.uid() OR salon_id = auth.uid());

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- Create RLS policies for conversation participants
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = conversation_participants.conversation_id 
            AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
        )
    );

CREATE POLICY "Users can join conversations they're part of" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = conversation_participants.conversation_id 
            AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
        )
    );

-- Create RLS policies for chat reports
CREATE POLICY "Users can create reports for their conversations" ON public.chat_reports
    FOR INSERT WITH CHECK (
        reporter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = chat_reports.conversation_id 
            AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
        )
    );

CREATE POLICY "Users can view their own reports" ON public.chat_reports
    FOR SELECT USING (reporter_id = auth.uid());

-- Add updated_at triggers for chat tables
CREATE TRIGGER handle_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_reports_updated_at
    BEFORE UPDATE ON public.chat_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- STEP 8: Create remaining policies with comprehensive error handling
DO $$
BEGIN
    -- Staff policies
    CREATE POLICY "Salon owners can manage their staff" ON public.staff
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = staff.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Staff can view salon staff" ON public.staff
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.staff s2
                WHERE s2.salon_id = staff.salon_id 
                AND s2.user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Booking policies
    CREATE POLICY "Clients can manage their bookings" ON public.bookings
        FOR ALL USING (auth.uid() = client_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Salon owners can manage salon bookings" ON public.bookings
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Staff can view salon bookings" ON public.bookings
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.staff 
                WHERE staff.salon_id = bookings.salon_id 
                AND staff.user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Payment policies
    CREATE POLICY "Clients can view their payments" ON public.payments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.bookings 
                WHERE bookings.id = payments.booking_id 
                AND bookings.client_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Salon owners can view salon payments" ON public.payments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.bookings 
                JOIN public.salons ON salons.id = bookings.salon_id
                WHERE bookings.id = payments.booking_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Service role can manage all payments" ON public.payments
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Review policies
    CREATE POLICY "Clients can manage their reviews" ON public.reviews
        FOR ALL USING (auth.uid() = client_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Anyone can view visible reviews" ON public.reviews
        FOR SELECT USING (is_visible = true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Salon owners can view salon reviews" ON public.reviews
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = reviews.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Family members policies
    CREATE POLICY "Users can manage their family members" ON public.family_members
        FOR ALL USING (auth.uid() = parent_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Waitlist policies
    CREATE POLICY "Clients can manage their waitlist entries" ON public.waitlist
        FOR ALL USING (auth.uid() = client_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Salon owners can view waitlist for their salon" ON public.waitlist
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = waitlist.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Salon owners can update waitlist entries for their salon" ON public.waitlist
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = waitlist.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Stripe accounts policies
    CREATE POLICY "Salon owners can manage their Stripe accounts" ON public.stripe_accounts
        FOR ALL USING (
            salon_id IN (
                SELECT id FROM public.salons WHERE owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Service role can manage all stripe accounts" ON public.stripe_accounts
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Service categories policies
    CREATE POLICY "Service categories are viewable by everyone" ON public.service_categories
        FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Chat system policies
    CREATE POLICY "Users can view their conversations" ON public.conversations
        FOR SELECT USING (client_id = auth.uid() OR salon_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can create conversations" ON public.conversations
        FOR INSERT WITH CHECK (client_id = auth.uid() OR salon_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can update their conversations" ON public.conversations
        FOR UPDATE USING (client_id = auth.uid() OR salon_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can view messages in their conversations" ON public.messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.conversations 
                WHERE conversations.id = messages.conversation_id 
                AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can send messages in their conversations" ON public.messages
        FOR INSERT WITH CHECK (
            sender_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.conversations 
                WHERE conversations.id = messages.conversation_id 
                AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can update their own messages" ON public.messages
        FOR UPDATE USING (sender_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can delete their own messages" ON public.messages
        FOR DELETE USING (sender_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.conversations 
                WHERE conversations.id = conversation_participants.conversation_id 
                AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can join conversations they're part of" ON public.conversation_participants
        FOR INSERT WITH CHECK (
            user_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.conversations 
                WHERE conversations.id = conversation_participants.conversation_id 
                AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can create reports for their conversations" ON public.chat_reports
        FOR INSERT WITH CHECK (
            reporter_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.conversations 
                WHERE conversations.id = chat_reports.conversation_id 
                AND (conversations.client_id = auth.uid() OR conversations.salon_id = auth.uid())
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users can view their own reports" ON public.chat_reports
        FOR SELECT USING (reporter_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
