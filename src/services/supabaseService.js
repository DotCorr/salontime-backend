const { supabase, supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class SupabaseService {
  // User Profile Operations
  async getUserProfile(userId) {
    console.log('🔍 SupabaseService.getUserProfile called with userId:', userId);
    console.log('🔍 User ID type:', typeof userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('🔍 Supabase query result - data:', data);
    console.log('🔍 Supabase query result - error:', error);

    if (error) {
      console.log('❌ Supabase error code:', error.code);
      console.log('❌ Supabase error message:', error.message);
      
      if (error.code === 'PGRST116') {
        console.log('❌ No user profile found for ID:', userId);
        console.log('🔧 Attempting to create user profile automatically...');
        
        // Try to get user info from auth to create profile
        try {
          const { data: authUser, error: authError } = await supabase.auth.getUser();
          if (authError || !authUser.user) {
            throw new AppError('User not found in auth system', 404, 'USER_NOT_FOUND');
          }
          
          // Create basic profile with auth data
          const profileData = {
            id: userId,
            first_name: authUser.user.user_metadata?.first_name || 'User',
            last_name: authUser.user.user_metadata?.last_name || '',
            email: authUser.user.email,
            role: 'client', // Default role
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('🔧 Creating profile with data:', profileData);
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([profileData])
            .select()
            .single();
            
          if (createError) {
            console.log('❌ Failed to create profile:', createError);
            throw new AppError('Failed to create user profile', 500, 'PROFILE_CREATE_FAILED');
          }
          
          console.log('✅ Profile created successfully:', newProfile);
          return newProfile;
        } catch (createError) {
          console.log('❌ Error creating profile:', createError);
          throw new AppError('User profile not found and could not be created', 404, 'PROFILE_NOT_FOUND');
        }
      }
      throw new AppError('Failed to fetch user profile', 500, 'DATABASE_ERROR');
    }

    console.log('✅ User profile found:', data);
    return data;
  }

  async createUserProfile(profileData) {
    console.log('SupabaseService.createUserProfile called with:', profileData);

    // Use upsert to handle existing profiles and prevent duplicates
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert([profileData], { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    console.log('Supabase upsert result:', { data: !!data, error });

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new AppError('User profile already exists', 409, 'PROFILE_EXISTS');
      }
      if (error.code === '23503') { // Foreign key violation
        throw new AppError('User not found in auth system', 500, 'USER_NOT_FOUND');
      }
      throw new AppError('Failed to create user profile', 500, 'DATABASE_ERROR');
    }

    return data;
  }

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update user profile', 500, 'DATABASE_ERROR');
    }

    return data;
  }

  // Authentication helpers
  async checkUserExists(email) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (error && error.status !== 400) {
      throw new AppError('Failed to check user existence', 500, 'AUTH_ERROR');
    }

    return !!data.user;
  }

  // OAuth URL generation
  async generateOAuthUrl(provider, redirectUrl) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      throw new AppError(`Failed to generate ${provider} OAuth URL`, 500, 'OAUTH_ERROR');
    }

    return data.url;
  }

  // Session management
  async refreshSession(refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new AppError('Failed to refresh session', 401, 'REFRESH_FAILED');
    }

    return data;
  }

  async signOut(token) {
    const { error } = await supabase.auth.signOut(token);

    if (error) {
      throw new AppError('Failed to sign out', 500, 'SIGNOUT_ERROR');
    }

    return true;
  }

  // User Settings Operations
  async getUserSettings(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default settings
        return await this.createUserSettings(userId);
      }
      throw new AppError('Failed to fetch user settings', 500, 'DATABASE_ERROR');
    }

    return data;
  }

  async createUserSettings(userId) {
    const defaultSettings = {
      user_id: userId,
      language: 'en',
      theme: 'light',
      color_scheme: 'orange',
      notifications_enabled: true,
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      booking_reminders: true,
      marketing_emails: false,
      location_sharing: true,
      data_analytics: true
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert([defaultSettings])
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create user settings', 500, 'DATABASE_ERROR');
    }

    return data;
  }

  async updateUserSettings(userId, updates) {
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Settings don't exist, create them first
        await this.createUserSettings(userId);
        // Try update again
        return await this.updateUserSettings(userId, updates);
      }
      throw new AppError('Failed to update user settings', 500, 'DATABASE_ERROR');
    }

    return data;
  }
}

module.exports = new SupabaseService();

