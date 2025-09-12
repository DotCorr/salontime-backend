const { supabase, supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class SupabaseService {
  // User Profile Operations
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }
      throw new AppError('Failed to fetch user profile', 500, 'DATABASE_ERROR');
    }

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
}

module.exports = new SupabaseService();

