const { supabase } = require('../config/database');
const supabaseService = require('../services/supabaseService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class AuthController {
  // Generate OAuth URL for WebView
  generateOAuthUrl = asyncHandler(async (req, res) => {
    const { provider, user_type } = req.body;

    // Validate provider
    const supportedProviders = ['google', 'facebook']; // Remove apple for now as requested
    if (!supportedProviders.includes(provider)) {
      throw new AppError('Unsupported OAuth provider', 400, 'UNSUPPORTED_PROVIDER');
    }

    // Validate user type
    const validUserTypes = ['client', 'salon_owner'];
    if (!validUserTypes.includes(user_type)) {
      throw new AppError('Invalid user type', 400, 'INVALID_USER_TYPE');
    }

    // Generate redirect URL with user type
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?user_type=${user_type}`;

    try {
      const oauthUrl = await supabaseService.generateOAuthUrl(provider, redirectUrl);

      res.status(200).json({
        success: true,
        data: {
          oauth_url: oauthUrl,
          provider: provider,
          user_type: user_type
        }
      });
    } catch (error) {
      throw new AppError(`Failed to generate ${provider} OAuth URL`, 500, 'OAUTH_GENERATION_FAILED');
    }
  });

  // Handle OAuth callback from WebView
  handleOAuthCallback = asyncHandler(async (req, res) => {
    const { access_token, refresh_token, user_type } = req.body;

    if (!access_token) {
      throw new AppError('Access token is required', 400, 'MISSING_ACCESS_TOKEN');
    }

    if (!user_type) {
      throw new AppError('User type is required', 400, 'MISSING_USER_TYPE');
    }

    try {
      // Get user from Supabase using the access token
      const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

      if (userError || !user) {
        throw new AppError('Invalid access token', 401, 'INVALID_ACCESS_TOKEN');
      }

      // Check if user profile exists
      let userProfile;
      try {
        userProfile = await supabaseService.getUserProfile(user.id);
      } catch (error) {
        if (error.code === 'PROFILE_NOT_FOUND') {
          // Create new user profile
          const profileData = {
            id: user.id,
            user_type: user_type,
            first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || '',
            last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || null,
            language: 'en' // Default language
          };

          userProfile = await supabaseService.createUserProfile(profileData);
        } else {
          throw error;
        }
      }

      // Return user data and tokens
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            user_type: userProfile.user_type,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            avatar_url: userProfile.avatar_url,
            language: userProfile.language
          },
          session: {
            access_token: access_token,
            refresh_token: refresh_token,
            expires_in: 3600, // 1 hour
            token_type: 'bearer'
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('OAuth callback processing failed', 500, 'CALLBACK_PROCESSING_FAILED');
    }
  });

  // Refresh access token
  refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    try {
      const sessionData = await supabaseService.refreshSession(refresh_token);

      res.status(200).json({
        success: true,
        data: {
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            expires_in: sessionData.session.expires_in,
            token_type: 'bearer'
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Token refresh failed', 401, 'TOKEN_REFRESH_FAILED');
    }
  });

  // Get current user profile
  getProfile = asyncHandler(async (req, res) => {
    try {
      const userProfile = await supabaseService.getUserProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userProfile.id,
            email: req.user.email,
            user_type: userProfile.user_type,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            phone: userProfile.phone,
            avatar_url: userProfile.avatar_url,
            language: userProfile.language,
            created_at: userProfile.created_at,
            updated_at: userProfile.updated_at
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch user profile', 500, 'PROFILE_FETCH_FAILED');
    }
  });

  // Sign out user
  signOut = asyncHandler(async (req, res) => {
    try {
      await supabaseService.signOut(req.token);

      res.status(200).json({
        success: true,
        message: 'Successfully signed out'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Sign out failed', 500, 'SIGNOUT_FAILED');
    }
  });

  // Check authentication status
  checkAuth = asyncHandler(async (req, res) => {
    // If we reach this point, the token is valid (checked by middleware)
    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user_id: req.user.id,
        email: req.user.email
      }
    });
  });

  // Email/Password login
  login = asyncHandler(async (req, res) => {
    const { email, password, user_type } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    if (!user_type || !['client', 'salon_owner'].includes(user_type)) {
      throw new AppError('Valid user type is required', 400, 'INVALID_USER_TYPE');
    }

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (authError) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Get user profile
      const userProfile = await supabaseService.getUserProfile(authData.user.id);

      // Verify user type matches
      if (userProfile.user_type !== user_type) {
        throw new AppError('Account type mismatch', 403, 'USER_TYPE_MISMATCH');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            user_type: userProfile.user_type,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            avatar_url: userProfile.avatar_url,
            language: userProfile.language
          },
          session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_in: authData.session.expires_in,
            token_type: 'bearer'
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Login failed', 500, 'LOGIN_FAILED');
    }
  });

  // Email/Password registration
  register = asyncHandler(async (req, res) => {
    const { email, password, full_name, user_type } = req.body;

    // Validate required fields
    if (!email || !password || !full_name) {
      throw new AppError('Email, password, and full name are required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (!user_type || !['client', 'salon_owner'].includes(user_type)) {
      throw new AppError('Valid user type is required', 400, 'INVALID_USER_TYPE');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'PASSWORD_TOO_SHORT');
    }

    try {
      // Split full name into first and last name
      const nameParts = full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: full_name.trim(),
            user_type: user_type
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new AppError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');
        }
        throw new AppError('Registration failed', 400, 'REGISTRATION_FAILED');
      }

      if (!authData.user) {
        throw new AppError('Registration failed - no user data', 500, 'REGISTRATION_FAILED');
      }

      // Create user profile
      const profileData = {
        id: authData.user.id,
        user_type: user_type,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase().trim(),
        language: 'en'
      };

      const userProfile = await supabaseService.createUserProfile(profileData);

      // If email confirmation is required, don't return session yet
      if (!authData.session) {
        res.status(201).json({
          success: true,
          message: 'Registration successful. Please check your email to confirm your account.',
          data: {
            user: {
              id: authData.user.id,
              email: authData.user.email,
              user_type: userProfile.user_type,
              first_name: userProfile.first_name,
              last_name: userProfile.last_name
            },
            requires_email_confirmation: true
          }
        });
        return;
      }

      // Return session if email confirmation is not required
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            user_type: userProfile.user_type,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            avatar_url: userProfile.avatar_url,
            language: userProfile.language
          },
          session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_in: authData.session.expires_in,
            token_type: 'bearer'
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Registration failed', 500, 'REGISTRATION_FAILED');
    }
  });
}

module.exports = new AuthController();

