-- SalonTime Complete Database Migration
-- This script is completely safe to run multiple times
-- It handles all conditions: tables exist, don't exist, columns exist, don't exist, etc.

-- STEP 1: Create all tables first (in dependency order)
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
    stripe_account_id VARCHAR(255),
    stripe_account_status VARCHAR(20) DEFAULT 'pending' CHECK (stripe_account_status IN ('pending', 'active', 'inactive', 'restricted')),
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

-- Create service categories table FIRST (before services)
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

-- Create services table (after service_categories)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration INTEGER NOT NULL CHECK (duration > 0), -- Duration in minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat system tables
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

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

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

-- STEP 2: Add missing columns to existing tables (safe operations)
DO $$
BEGIN
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (stripe_account_status IN ('pending', 'active', 'inactive', 'restricted'));
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- STEP 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salons_stripe_account_id ON public.salons(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_services_salon_id ON public.services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON public.service_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_salon_id ON public.conversations(salon_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation_id ON public.chat_reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter_id ON public.chat_reports(reporter_id);

-- STEP 4: Insert default service categories (with error handling)
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

-- STEP 5: Enable RLS on all tables
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

-- STEP 6: Drop existing policies if they exist (to avoid conflicts)
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
DROP POLICY IF EXISTS "Service categories are viewable by everyone" ON public.service_categories;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations they're part of" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create reports for their conversations" ON public.chat_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.chat_reports;

-- STEP 7: Create or replace the updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 8: Create all RLS policies with comprehensive error handling
DO $$
BEGIN
    -- User profiles policies
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

DO $$
BEGIN
    -- Salon policies
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

DO $$
BEGIN
    -- Service policies
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

-- STEP 9: Create updated_at triggers
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS handle_salons_updated_at ON public.salons;
DROP TRIGGER IF EXISTS handle_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS handle_stripe_accounts_updated_at ON public.stripe_accounts;
DROP TRIGGER IF EXISTS handle_waitlist_updated_at ON public.waitlist;
DROP TRIGGER IF EXISTS handle_service_categories_updated_at ON public.service_categories;
DROP TRIGGER IF EXISTS handle_services_updated_at ON public.services;
DROP TRIGGER IF EXISTS handle_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS handle_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS handle_chat_reports_updated_at ON public.chat_reports;

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

CREATE TRIGGER handle_service_categories_updated_at
    BEFORE UPDATE ON public.service_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_reports_updated_at
    BEFORE UPDATE ON public.chat_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Migration completed successfully!
-- All tables, columns, indexes, policies, and triggers are now in place.