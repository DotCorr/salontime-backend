-- Analytics and Featured Salons Migration
-- Run this migration to add analytics tracking and featured salon support
-- Safe to run multiple times

-- =============================================
-- STEP 1: Add analytics columns to salons table
-- =============================================

-- Add analytics and trending fields
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,2) DEFAULT 0.0;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS popularity_rank INTEGER;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS last_booking_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain trending_score
COMMENT ON COLUMN public.salons.trending_score IS 'Calculated score based on recent views, bookings, favorites, and ratings. Updated hourly.';

-- =============================================
-- STEP 2: Create salon_views tracking table
-- =============================================

CREATE TABLE IF NOT EXISTS public.salon_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    session_id VARCHAR(255), -- For non-authenticated users
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50), -- 'search', 'map', 'featured', 'nearby', etc.
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_salon_views_salon_id ON public.salon_views(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_views_user_id ON public.salon_views(user_id);
CREATE INDEX IF NOT EXISTS idx_salon_views_viewed_at ON public.salon_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_salon_views_salon_viewed ON public.salon_views(salon_id, viewed_at DESC);

-- =============================================
-- STEP 3: Create favorites table (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_salon_id ON public.favorites(salon_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.favorites(created_at DESC);

-- =============================================
-- STEP 4: Add indexes for analytics queries
-- =============================================

CREATE INDEX IF NOT EXISTS idx_salons_trending_score ON public.salons(trending_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_salons_is_featured ON public.salons(is_featured, featured_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_salons_created_at ON public.salons(created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_salons_rating_count ON public.salons(rating_average DESC, rating_count DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_salons_subscription_status ON public.salons(subscription_status) WHERE is_active = true;

-- =============================================
-- STEP 5: Create function to update trending score
-- =============================================

CREATE OR REPLACE FUNCTION calculate_salon_trending_score(salon_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    recent_views INTEGER;
    recent_bookings INTEGER;
    recent_favorites INTEGER;
    salon_rating DECIMAL(3,2);
    salon_age_days INTEGER;
    recency_bonus DECIMAL(5,2);
    trending_score DECIMAL(10,2);
BEGIN
    -- Get recent activity (last 7 days)
    SELECT COUNT(*) INTO recent_views
    FROM salon_views
    WHERE salon_id = salon_uuid
    AND viewed_at > NOW() - INTERVAL '7 days';
    
    SELECT COUNT(*) INTO recent_bookings
    FROM bookings
    WHERE salon_id = salon_uuid
    AND created_at > NOW() - INTERVAL '7 days'
    AND status IN ('confirmed', 'completed');
    
    SELECT COUNT(*) INTO recent_favorites
    FROM favorites
    WHERE salon_id = salon_uuid
    AND created_at > NOW() - INTERVAL '7 days';
    
    -- Get salon rating
    SELECT rating_average INTO salon_rating
    FROM salons
    WHERE id = salon_uuid;
    
    -- Calculate recency bonus for new salons
    SELECT EXTRACT(DAY FROM NOW() - created_at) INTO salon_age_days
    FROM salons
    WHERE id = salon_uuid;
    
    IF salon_age_days < 30 THEN
        recency_bonus := 20.0;
    ELSE
        recency_bonus := 0.0;
    END IF;
    
    -- Calculate trending score
    -- Formula: (views * 0.5) + (bookings * 3) + (favorites * 2) + (rating * 10) + recency_bonus
    trending_score := (recent_views * 0.5) + 
                     (recent_bookings * 3.0) + 
                     (recent_favorites * 2.0) + 
                     (COALESCE(salon_rating, 0) * 10.0) + 
                     recency_bonus;
    
    RETURN trending_score;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 6: Create function to update all trending scores
-- =============================================

CREATE OR REPLACE FUNCTION update_all_trending_scores()
RETURNS void AS $$
BEGIN
    UPDATE salons
    SET trending_score = calculate_salon_trending_score(id),
        updated_at = NOW()
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 7: Create function to increment view count
-- =============================================

CREATE OR REPLACE FUNCTION increment_salon_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE salons
    SET view_count = view_count + 1
    WHERE id = NEW.salon_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_increment_view_count ON salon_views;
CREATE TRIGGER trigger_increment_view_count
AFTER INSERT ON salon_views
FOR EACH ROW
EXECUTE FUNCTION increment_salon_view_count();

-- =============================================
-- STEP 8: Create function to increment favorite count
-- =============================================

CREATE OR REPLACE FUNCTION update_salon_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE salons
        SET favorite_count = favorite_count + 1
        WHERE id = NEW.salon_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE salons
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = OLD.salon_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_favorite_count ON favorites;
CREATE TRIGGER trigger_update_favorite_count
AFTER INSERT OR DELETE ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_salon_favorite_count();

-- =============================================
-- STEP 9: Create function to update booking count
-- =============================================

CREATE OR REPLACE FUNCTION update_salon_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'completed') THEN
        UPDATE salons
        SET booking_count = booking_count + 1,
            last_booking_at = NOW()
        WHERE id = NEW.salon_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status IN ('confirmed', 'completed') AND OLD.status NOT IN ('confirmed', 'completed') THEN
            UPDATE salons
            SET booking_count = booking_count + 1,
                last_booking_at = NOW()
            WHERE id = NEW.salon_id;
        ELSIF NEW.status NOT IN ('confirmed', 'completed') AND OLD.status IN ('confirmed', 'completed') THEN
            UPDATE salons
            SET booking_count = GREATEST(booking_count - 1, 0)
            WHERE id = NEW.salon_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_booking_count ON bookings;
CREATE TRIGGER trigger_update_booking_count
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_salon_booking_count();

-- =============================================
-- STEP 10: Set featured flag based on subscription
-- =============================================

-- Mark active paid subscribers as featured
UPDATE salons
SET is_featured = true,
    featured_until = subscription_ends_at
WHERE subscription_status = 'active'
  AND subscription_plan IN ('premium', 'professional', 'enterprise')
  AND is_active = true;

-- =============================================
-- STEP 11: Initial trending score calculation
-- =============================================

-- Calculate initial trending scores for all active salons
SELECT update_all_trending_scores();

-- =============================================
-- STEP 12: Create view for salon analytics dashboard
-- =============================================

CREATE OR REPLACE VIEW salon_analytics_summary AS
SELECT 
    s.id,
    s.business_name,
    s.trending_score,
    s.view_count,
    s.booking_count,
    s.favorite_count,
    s.rating_average,
    s.rating_count,
    s.is_featured,
    s.subscription_status,
    s.subscription_plan,
    COUNT(DISTINCT sv.id) FILTER (WHERE sv.viewed_at > NOW() - INTERVAL '7 days') as views_last_7_days,
    COUNT(DISTINCT b.id) FILTER (WHERE b.created_at > NOW() - INTERVAL '7 days' AND b.status IN ('confirmed', 'completed')) as bookings_last_7_days,
    COUNT(DISTINCT f.id) FILTER (WHERE f.created_at > NOW() - INTERVAL '7 days') as favorites_last_7_days,
    s.created_at,
    s.updated_at
FROM salons s
LEFT JOIN salon_views sv ON s.id = sv.salon_id
LEFT JOIN bookings b ON s.id = b.salon_id
LEFT JOIN favorites f ON s.id = f.salon_id
WHERE s.is_active = true
GROUP BY s.id, s.business_name, s.trending_score, s.view_count, s.booking_count, 
         s.favorite_count, s.rating_average, s.rating_count, s.is_featured, 
         s.subscription_status, s.subscription_plan, s.created_at, s.updated_at;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Analytics migration completed successfully!';
    RAISE NOTICE '📊 Added analytics tracking tables and columns';
    RAISE NOTICE '🔥 Trending score calculation functions created';
    RAISE NOTICE '⭐ Featured salon system ready';
    RAISE NOTICE '🚀 Run SELECT update_all_trending_scores(); to recalculate scores';
END $$;

