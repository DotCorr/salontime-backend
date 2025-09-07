const { supabase } = require('../config/database');
const stripeService = require('../services/stripeService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const config = require('../config');

class SubscriptionController {
  // Create premium subscription for salon owner
  createSubscription = asyncHandler(async (req, res) => {
    const { payment_method_id } = req.body;

    try {
      // Get salon and check if owner
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      if (salon.subscription_plan === 'plus' && salon.subscription_status === 'active') {
        throw new AppError('Already subscribed to premium plan', 400, 'ALREADY_SUBSCRIBED');
      }

      // Create customer if doesn't exist
      let customerId = salon.stripe_customer_id;
      if (!customerId) {
        const customer = await stripeService.createCustomer({
          email: req.user.email,
          name: salon.business_name,
          user_id: req.user.id
        });
        customerId = customer.id;

        // Update salon with customer ID
        await supabase
          .from('salons')
          .update({ stripe_customer_id: customerId })
          .eq('id', salon.id);
      }

      // Attach payment method if provided
      if (payment_method_id) {
        await stripeService.attachPaymentMethod(payment_method_id, customerId);
        
        // Set as default payment method
        await stripeService.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: payment_method_id,
          },
        });
      }

      // Create subscription with configurable trial period
      const priceId = config.stripe.plus_plan_price_id;
      const subscription = await stripeService.createSubscription(customerId, priceId, config.subscription.trial_days);

      // Update salon record
      const { data: updatedSalon, error: updateError } = await supabase
        .from('salons')
        .update({
          subscription_plan: 'plus',
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          subscription_ends_at: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
        })
        .eq('id', salon.id)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to update salon subscription', 500, 'SALON_UPDATE_FAILED');
      }

      res.status(201).json({
        success: true,
        data: {
          salon: updatedSalon,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            trial_end: subscription.trial_end,
            current_period_end: subscription.current_period_end,
            client_secret: subscription.latest_invoice?.payment_intent?.client_secret
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create subscription', 500, 'SUBSCRIPTION_CREATION_FAILED');
    }
  });

  // Get subscription status
  getSubscriptionStatus = asyncHandler(async (req, res) => {
    try {
      const { data: salon, error } = await supabase
        .from('salons')
        .select(`
          subscription_plan,
          subscription_status,
          trial_ends_at,
          subscription_ends_at,
          stripe_subscription_id,
          last_payment_date
        `)
        .eq('owner_id', req.user.id)
        .single();

      if (error || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      // Check if trial has expired and subscription is not active
      const now = new Date();
      const trialEnded = salon.trial_ends_at && new Date(salon.trial_ends_at) < now;
      const subscriptionExpired = salon.subscription_ends_at && new Date(salon.subscription_ends_at) < now;

      let accessStatus = 'active';
      if (salon.subscription_plan === 'basic') {
        accessStatus = 'basic';
      } else if (trialEnded && salon.subscription_status !== 'active') {
        accessStatus = 'expired';
      } else if (subscriptionExpired && salon.subscription_status !== 'active') {
        accessStatus = 'expired';
      }

      res.status(200).json({
        success: true,
        data: {
          ...salon,
          access_status: accessStatus,
          days_remaining: salon.trial_ends_at ? 
            Math.max(0, Math.ceil((new Date(salon.trial_ends_at) - now) / (1000 * 60 * 60 * 24))) : 
            null
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get subscription status', 500, 'SUBSCRIPTION_STATUS_FAILED');
    }
  });

  // Cancel subscription
  cancelSubscription = asyncHandler(async (req, res) => {
    const { immediate = false } = req.body;

    try {
      const { data: salon, error } = await supabase
        .from('salons')
        .select('stripe_subscription_id')
        .eq('owner_id', req.user.id)
        .single();

      if (error || !salon || !salon.stripe_subscription_id) {
        throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
      }

      // Cancel subscription
      const subscription = await stripeService.cancelSubscription(
        salon.stripe_subscription_id, 
        !immediate
      );

      // Update salon record if immediate cancellation
      if (immediate) {
        await supabase
          .from('salons')
          .update({
            subscription_plan: 'basic',
            subscription_status: 'cancelled',
            subscription_ends_at: new Date().toISOString()
          })
          .eq('owner_id', req.user.id);
      }

      res.status(200).json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
          },
          message: immediate ? 
            'Subscription cancelled immediately' : 
            'Subscription will cancel at period end'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to cancel subscription', 500, 'SUBSCRIPTION_CANCEL_FAILED');
    }
  });

  // Create billing portal session
  createBillingPortal = asyncHandler(async (req, res) => {
    try {
      const { data: salon, error } = await supabase
        .from('salons')
        .select('stripe_customer_id')
        .eq('owner_id', req.user.id)
        .single();

      if (error || !salon || !salon.stripe_customer_id) {
        throw new AppError('No customer record found', 404, 'NO_CUSTOMER');
      }

      const returnUrl = `${config.frontend.url}/dashboard/subscription`;
      const session = await stripeService.createBillingPortalSession(
        salon.stripe_customer_id,
        returnUrl
      );

      res.status(200).json({
        success: true,
        data: {
          url: session.url
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create billing portal', 500, 'BILLING_PORTAL_FAILED');
    }
  });

  // Check subscription access (middleware helper)
  checkSubscriptionAccess = asyncHandler(async (req, res, next) => {
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

      // Allow access if:
      // 1. Basic plan (always allowed)
      // 2. Plus plan with active subscription
      // 3. Plus plan within trial period
      if (salon.subscription_plan === 'basic') {
        req.subscriptionPlan = 'basic';
        return next();
      }

      if (salon.subscription_plan === 'plus') {
        if (salon.subscription_status === 'active' || 
            (salon.subscription_status === 'trialing' && !trialEnded)) {
          req.subscriptionPlan = 'plus';
          return next();
        }
      }

      // Access denied - subscription expired
      throw new AppError(
        'Premium subscription required. Please upgrade your plan to continue.',
        403,
        'SUBSCRIPTION_REQUIRED'
      );

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check subscription access', 500, 'SUBSCRIPTION_CHECK_FAILED');
    }
  });
}

module.exports = new SubscriptionController();

