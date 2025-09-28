const { supabase, supabaseAdmin } = require('../config/database');
const stripeService = require('../services/stripeService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class SalonController {
  // Create salon profile
  createSalon = asyncHandler(async (req, res) => {
    const {
      business_name,
      description,
      address,
      city,
      state,
      zip_code,
      phone,
      email,
      business_hours
    } = req.body;

    // Validate required fields
    if (!business_name) {
      throw new AppError('Business name is required', 400, 'MISSING_BUSINESS_NAME');
    }
    if (!city) {
      throw new AppError('City is required', 400, 'MISSING_CITY');
    }
    if (!state) {
      throw new AppError('State is required', 400, 'MISSING_STATE');
    }
    if (!zip_code) {
      throw new AppError('Zip code is required', 400, 'MISSING_ZIP_CODE');
    }

    try {
      // Check if user already has a salon
      const { data: existingSalon } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', req.user.id)
        .single();

      if (existingSalon) {
        throw new AppError('User already has a salon registered', 409, 'SALON_ALREADY_EXISTS');
      }

      // Create salon record (use admin client to bypass RLS)
      const { data: salon, error } = await supabaseAdmin
        .from('salons')
        .insert([{
          owner_id: req.user.id,
          business_name,
          description,
          address,
          city,
          state,
          zip_code,
          phone,
          email,
          business_hours
        }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new AppError('Failed to create salon', 500, 'SALON_CREATION_FAILED');
      }

      // Automatically create Stripe Connect account for the salon
      let stripeAccountData = null;
      let onboardingUrl = null;
      
      try {
        // Get user profile for Stripe account creation
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', req.user.id)
          .single();

        // Create Stripe Connect account
        const stripeAccount = await stripeService.createConnectAccount({
          business_name: salon.business_name,
          salon_id: salon.id,
          owner_id: req.user.id,
          email: email || userProfile?.email,
          country: address?.country || 'US',
          business_type: req.body.business_type || 'individual'
        });

        // Update salon with Stripe account ID
        await supabaseAdmin
          .from('salons')
          .update({
            stripe_account_id: stripeAccount.id,
            stripe_account_status: 'pending'
          })
          .eq('id', salon.id);

        // Create Stripe account record in database
        await supabaseAdmin
          .from('stripe_accounts')
          .insert([{
            salon_id: salon.id,
            stripe_account_id: stripeAccount.id,
            account_status: 'pending',
            onboarding_completed: false
          }]);

        // Generate onboarding link for immediate setup
        const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/salon/dashboard?stripe_setup=success`;
        const refreshUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/salon/dashboard?stripe_setup=refresh`;
        
        const accountLink = await stripeService.createAccountLink(
          stripeAccount.id,
          returnUrl,
          refreshUrl
        );

        stripeAccountData = {
          stripe_account_id: stripeAccount.id,
          account_status: 'pending',
          onboarding_completed: false
        };

        onboardingUrl = accountLink.url;

      } catch (stripeError) {
        console.error('Stripe account creation failed during salon setup:', stripeError);
        // Don't fail salon creation if Stripe setup fails - salon owner can set it up later
      }

      res.status(201).json({
        success: true,
        data: { 
          salon: {
            ...salon,
            stripe_account_id: stripeAccountData?.stripe_account_id || null,
            stripe_account_status: stripeAccountData?.account_status || null
          },
          stripe_setup: {
            required: true,
            account_created: !!stripeAccountData,
            onboarding_url: onboardingUrl,
            message: stripeAccountData 
              ? 'Stripe account created. Complete onboarding to receive payments.'
              : 'Salon created successfully. Set up Stripe account to receive payments.'
          }
        }
      });

    } catch (error) {
      console.error('Salon creation error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create salon', 500, 'SALON_CREATION_FAILED');
    }
  });

  // Get salon profile
  getSalon = asyncHandler(async (req, res) => {
    const { salonId } = req.params;

    try {
      const { data: salon, error } = await supabase
        .from('salons')
        .select(`
          *,
          services(*),
          staff(*)
        `)
        .eq('id', salonId)
        .eq('is_active', true)
        .single();

      if (error || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: { salon }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch salon', 500, 'SALON_FETCH_FAILED');
    }
  });

  // Get current user's salon
  getMySalon = asyncHandler(async (req, res) => {
    try {
      console.log('Looking for salon with owner_id:', req.user.id);
      
      const { data: salon, error } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      console.log('Salon query result:', { salon, error });

      if (error || !salon) {
        // Let's also check what salons exist in the database
        const { data: allSalons, error: allSalonsError } = await supabaseAdmin
          .from('salons')
          .select('id, owner_id, business_name')
          .limit(5);
        
        console.log('All salons in database:', { allSalons, allSalonsError });
        throw new AppError('No salon found for this user', 404, 'SALON_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: { salon }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch salon', 500, 'SALON_FETCH_FAILED');
    }
  });

  // Update salon profile
  updateSalon = asyncHandler(async (req, res) => {
    const {
      business_name,
      description,
      address,
      phone,
      email,
      business_hours
    } = req.body;

    try {
      const { data: salon, error } = await supabase
        .from('salons')
        .update({
          business_name,
          description,
          address,
          phone,
          email,
          business_hours
        })
        .eq('owner_id', req.user.id)
        .select()
        .single();

      if (error || !salon) {
        throw new AppError('Failed to update salon or salon not found', 400, 'SALON_UPDATE_FAILED');
      }

      res.status(200).json({
        success: true,
        data: { salon }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update salon', 500, 'SALON_UPDATE_FAILED');
    }
  });

  // Search salons
  searchSalons = asyncHandler(async (req, res) => {
    const { location, service, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
      let query = supabase
        .from('salons')
        .select(`
          *,
          services(*),
          reviews(rating)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Add location filter if provided
      if (location) {
        query = query.ilike('address->city', `%${location}%`);
      }

      const { data: salons, error } = await query;

      if (error) {
        throw new AppError('Failed to search salons', 500, 'SALON_SEARCH_FAILED');
      }

      // Calculate average ratings
      const salonsWithRatings = salons.map(salon => ({
        ...salon,
        average_rating: salon.reviews.length > 0
          ? salon.reviews.reduce((sum, review) => sum + review.rating, 0) / salon.reviews.length
          : 0,
        total_reviews: salon.reviews.length
      }));

      res.status(200).json({
        success: true,
        data: {
          salons: salonsWithRatings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: salonsWithRatings.length
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to search salons', 500, 'SALON_SEARCH_FAILED');
    }
  });

  // Create Stripe Connect account
  createStripeAccount = asyncHandler(async (req, res) => {
    try {
      // Get user's salon
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon) {
        throw new AppError('Salon not found. Create a salon profile first.', 404, 'SALON_NOT_FOUND');
      }

      // Check if Stripe account already exists
      if (salon.stripe_account_id) {
        throw new AppError('Stripe account already exists for this salon', 409, 'STRIPE_ACCOUNT_EXISTS');
      }

      // Create Stripe Connect account
      const stripeAccount = await stripeService.createConnectAccount({
        business_name: salon.business_name,
        salon_id: salon.id,
        owner_id: req.user.id,
        country: salon.address?.country || 'NL'
      });

      // Update salon with Stripe account ID
      console.log('Updating salon with Stripe account ID:', stripeAccount.id);
      console.log('Salon ID:', salon.id);
      
      // First, let's check if the salon exists with this ID
      const { data: checkSalon, error: checkError } = await supabaseAdmin
        .from('salons')
        .select('id, stripe_account_id, stripe_account_status')
        .eq('id', salon.id);
      
      console.log('Salon check result:', { checkSalon, checkError });
      
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('salons')
        .update({
          stripe_account_id: stripeAccount.id,
          stripe_account_status: 'pending'
        })
        .eq('id', salon.id)
        .select('id, stripe_account_id, stripe_account_status');

      console.log('Salon update result:', { updateData, updateError });

      if (updateError) {
        console.error('Salon update error:', updateError);
        throw new AppError('Failed to update salon with Stripe account', 500, 'SALON_UPDATE_FAILED');
      }

      // Create Stripe account record
      await supabaseAdmin
        .from('stripe_accounts')
        .insert([{
          salon_id: salon.id,
          stripe_account_id: stripeAccount.id,
          account_status: 'pending',
          onboarding_completed: false
        }]);

      res.status(201).json({
        success: true,
        data: {
          stripe_account_id: stripeAccount.id,
          message: 'Stripe Connect account created successfully'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create Stripe account', 500, 'STRIPE_ACCOUNT_CREATION_FAILED');
    }
  });

  // Generate Stripe onboarding link
  generateStripeOnboardingLink = asyncHandler(async (req, res) => {
    try {
      // Get user's salon
      const { data: salon, error: salonError } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      console.log('Salon lookup result:', { salon, salonError });
      console.log('User ID:', req.user.id);

      if (salonError) {
        console.error('Salon lookup error:', salonError);
        throw new AppError(`Salon lookup failed: ${salonError.message}`, 404, 'SALON_NOT_FOUND');
      }

      if (!salon) {
        console.error('No salon found for user:', req.user.id);
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      if (!salon.stripe_account_id) {
        console.error('No Stripe account ID found for salon:', salon.id);
        throw new AppError('Stripe account not found for this salon', 404, 'STRIPE_ACCOUNT_NOT_FOUND');
      }

      const returnUrl = `${process.env.FRONTEND_URL}/salon-owner/stripe/return`;
      const refreshUrl = `${process.env.FRONTEND_URL}/salon-owner/stripe/refresh`;

      const accountLink = await stripeService.createAccountLink(
        salon.stripe_account_id,
        returnUrl,
        refreshUrl
      );

      res.status(200).json({
        success: true,
        data: {
          onboarding_url: accountLink.url,
          expires_at: accountLink.expires_at
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate onboarding link', 500, 'STRIPE_ONBOARDING_LINK_FAILED');
    }
  });

  // Get Stripe dashboard link
  getStripeDashboardLink = asyncHandler(async (req, res) => {
    try {
      // Get user's salon
      const { data: salon, error: salonError } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError) {
        throw new AppError(`Salon lookup failed: ${salonError.message}`, 404, 'SALON_NOT_FOUND');
      }

      if (!salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      if (!salon.stripe_account_id) {
        throw new AppError('Stripe account not found for this salon', 404, 'STRIPE_ACCOUNT_NOT_FOUND');
      }

      // Check if account is fully onboarded
      if (salon.stripe_account_status !== 'active') {
        throw new AppError('Stripe account not fully onboarded', 400, 'ACCOUNT_NOT_READY');
      }

      // Generate dashboard link using Stripe's createLoginLink
      const dashboardLink = await stripeService.createDashboardLink(salon.stripe_account_id);

      res.status(200).json({
        success: true,
        data: {
          dashboard_url: dashboardLink.url,
          expires_at: dashboardLink.expires_at
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate dashboard link', 500, 'DASHBOARD_LINK_FAILED');
    }
  });

  // Get Stripe account status
  getStripeAccountStatus = asyncHandler(async (req, res) => {
    try {
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('stripe_account_id, stripe_accounts(*)')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon || !salon.stripe_account_id) {
        return res.status(200).json({
          success: true,
          data: {
            has_stripe_account: false,
            account_status: 'not_created'
          }
        });
      }

      const accountStatus = await stripeService.getAccountStatus(salon.stripe_account_id);

      res.status(200).json({
        success: true,
        data: {
          has_stripe_account: true,
          account_status: accountStatus.charges_enabled ? 'active' : 'pending',
          details_submitted: accountStatus.details_submitted,
          charges_enabled: accountStatus.charges_enabled,
          payouts_enabled: accountStatus.payouts_enabled,
          requirements: accountStatus.requirements
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get Stripe account status', 500, 'STRIPE_STATUS_FETCH_FAILED');
    }
  });
}

module.exports = new SalonController();

