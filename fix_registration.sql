-- Add missing INSERT policy for user_profiles to allow service role to create profiles
CREATE POLICY "Service role can create user profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

