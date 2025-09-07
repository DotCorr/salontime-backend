const { supabase } = require('../config/database');
const { AppError } = require('./errorHandler');

// Middleware to check if salon owner has active subscription for premium features
const requirePremiumSubscription = async (req, res, next) => {
  try {
    const { data: salon, error } = await supabase
      .from('salons')
      .select(`
        subscription_plan,
        subscription_status,
        trial_ends_at,
        subscription_ends_at
      `)
      .eq('owner_id', req.user.id)
      .single();

    if (error || !salon) {
      throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
    }

    const now = new Date();
    const trialEnded = salon.trial_ends_at && new Date(salon.trial_ends_at) < now;
    const subscriptionExpired = salon.subscription_ends_at && new Date(salon.subscription_ends_at) < now;

    // Check if has premium access
    if (salon.subscription_plan === 'plus') {
      if (salon.subscription_status === 'active' || 
          (salon.subscription_status === 'trialing' && !trialEnded)) {
        req.subscriptionPlan = 'plus';
        return next();
      }
    }

    // No premium access
    throw new AppError(
      'Premium subscription required. Upgrade to access this feature.',
      403,
      'PREMIUM_SUBSCRIPTION_REQUIRED'
    );

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to check subscription', 500, 'SUBSCRIPTION_CHECK_FAILED');
  }
};

// Middleware to add subscription info to request
const addSubscriptionInfo = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const { data: salon, error } = await supabase
      .from('salons')
      .select(`
        subscription_plan,
        subscription_status,
        trial_ends_at,
        subscription_ends_at
      `)
      .eq('owner_id', req.user.id)
      .single();

    if (!error && salon) {
      const now = new Date();
      const trialEnded = salon.trial_ends_at && new Date(salon.trial_ends_at) < now;
      const subscriptionExpired = salon.subscription_ends_at && new Date(salon.subscription_ends_at) < now;

      req.subscription = {
        plan: salon.subscription_plan,
        status: salon.subscription_status,
        hasAccess: salon.subscription_plan === 'basic' || 
                  (salon.subscription_plan === 'plus' && 
                   (salon.subscription_status === 'active' || 
                    (salon.subscription_status === 'trialing' && !trialEnded))),
        trialEnded,
        subscriptionExpired
      };
    } else {
      req.subscription = {
        plan: 'basic',
        status: 'inactive',
        hasAccess: true,
        trialEnded: false,
        subscriptionExpired: false
      };
    }

    next();
  } catch (error) {
    // Don't fail the request if subscription check fails
    req.subscription = {
      plan: 'basic',
      status: 'inactive',
      hasAccess: true,
      trialEnded: false,
      subscriptionExpired: false
    };
    next();
  }
};

module.exports = {
  requirePremiumSubscription,
  addSubscriptionInfo
};

