-- Ensure role column exists in user_profiles table
-- This migration is safe to run multiple times

-- Check if the column exists, if not add it
DO $$ 
BEGIN
    -- Try to add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'salon_owner', 'staff', 'admin'));
        
        RAISE NOTICE 'Added role column to user_profiles table';
    ELSE
        RAISE NOTICE 'Role column already exists in user_profiles table';
    END IF;
    
    -- Also ensure the check constraint exists
    BEGIN
        ALTER TABLE public.user_profiles 
        DROP CONSTRAINT IF EXISTS user_profiles_role_check;
        
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('client', 'salon_owner', 'staff', 'admin'));
        
        RAISE NOTICE 'Updated role check constraint';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Check constraint already exists';
    END;
    
END $$;

-- Update any NULL roles to 'client'
UPDATE public.user_profiles 
SET role = 'client' 
WHERE role IS NULL;

-- Create index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Log the completion
DO $$ 
BEGIN
    RAISE NOTICE 'Migration ensure_role_column.sql completed successfully';
END $$;

