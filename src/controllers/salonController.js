const { supabase } = require('../config/database');
const stripeService = require('../services/stripeService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class SalonController {
  // Create salon profile
  createSalon = asyncHandler(async (req, res) => {
    const {
      business_name,
      description,
      address,
      phone,
      email,
      business_hours
    } = req.body;

    // Validate required fields
    if (!business_name) {
      throw new AppError('Business name is required', 400, 'MISSING_BUSINESS_NAME');
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

      // Create salon record
      const { data: salon, error } = await supabase
        .from('salons')
        .insert([{
          owner_id: req.user.id,
          business_name,
          description,
          address,
          phone,
          email,
          business_hours
        }])
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to create salon', 500, 'SALON_CREATION_FAILED');
      }

      res.status(201).json({
        success: true,
        data: { salon }
      });

    } catch (error) {
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
      const { data: salon, error } = await supabase
        .from('salons')
        .select(`
          *,
          services(*),
          staff(*),
          stripe_accounts(*)
        `)
        .eq('owner_id', req.user.id)
        .single();

      if (error || !salon) {
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
      const { error: updateError } = await supabase
        .from('salons')
        .update({
          stripe_account_id: stripeAccount.id,
          stripe_account_status: 'pending'
        })
        .eq('id', salon.id);

      if (updateError) {
        throw new AppError('Failed to update salon with Stripe account', 500, 'SALON_UPDATE_FAILED');
      }

      // Create Stripe account record
      await supabase
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
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon || !salon.stripe_account_id) {
        throw new AppError('Salon or Stripe account not found', 404, 'SALON_OR_STRIPE_NOT_FOUND');
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

