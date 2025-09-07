const { stripe, isStripeEnabled } = require('../config/stripe');
const { AppError } = require('../middleware/errorHandler');

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.isEnabled = isStripeEnabled;
  }

  // Check if Stripe is enabled
  _checkStripeEnabled() {
    if (!this.isEnabled) {
      throw new AppError('Stripe not configured. Add STRIPE_SECRET_KEY to environment.', 503, 'STRIPE_NOT_CONFIGURED');
    }
  }

  // Create Connect account for salon owner
  async createConnectAccount(salonData) {
    this._checkStripeEnabled();

    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: salonData.country || 'US',
        business_type: salonData.business_type || 'individual',
        email: salonData.email,
        business_profile: {
          name: salonData.business_name,
          product_description: 'Beauty and salon services',
          mcc: '7230', // Beauty shops
          url: salonData.website || undefined,
        },
        metadata: {
          salon_id: salonData.salon_id,
          owner_id: salonData.owner_id,
        },
      });

      return account;
    } catch (error) {
      throw new AppError(`Stripe account creation failed: ${error.message}`, 500, 'STRIPE_ACCOUNT_CREATION_FAILED');
    }
  }

  // Create account link for onboarding
  async createAccountLink(accountId, returnUrl, refreshUrl) {
    this._checkStripeEnabled();

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        return_url: returnUrl,
        refresh_url: refreshUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      throw new AppError(`Account link creation failed: ${error.message}`, 500, 'STRIPE_LINK_CREATION_FAILED');
    }
  }

  // Get account status
  async getAccountStatus(accountId) {
    this._checkStripeEnabled();

    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      return {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities,
      };
    } catch (error) {
      throw new AppError(`Failed to retrieve account status: ${error.message}`, 500, 'STRIPE_ACCOUNT_RETRIEVAL_FAILED');
    }
  }

  // Create payment intent with application fee
  async createPaymentIntent(paymentData) {
    this._checkStripeEnabled();

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: paymentData.amount,
        currency: paymentData.currency || 'usd',
        customer: paymentData.customer_id,
        payment_method: paymentData.payment_method_id,
        confirmation_method: 'manual',
        confirm: true,
        return_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        application_fee_amount: paymentData.application_fee_amount,
        transfer_data: {
          destination: paymentData.connected_account_id,
        },
        metadata: paymentData.metadata || {},
      });

      return paymentIntent;
    } catch (error) {
      throw new AppError(`Payment intent creation failed: ${error.message}`, 500, 'STRIPE_PAYMENT_INTENT_FAILED');
    }
  }

  // Retrieve payment intent
  async retrievePaymentIntent(paymentIntentId) {
    this._checkStripeEnabled();

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new AppError(`Payment intent retrieval failed: ${error.message}`, 500, 'STRIPE_PAYMENT_RETRIEVAL_FAILED');
    }
  }

  // Create or get customer
  async createOrGetCustomer(userData) {
    this._checkStripeEnabled();

    try {
      // Check if customer already exists
      if (userData.stripe_customer_id) {
        try {
          const customer = await this.stripe.customers.retrieve(userData.stripe_customer_id);
          return customer;
        } catch (error) {
          // Customer not found, create new one
          console.log('Existing customer not found, creating new one');
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.full_name || userData.name,
        metadata: {
          user_id: userData.user_id || userData.id,
          created_from: 'salontime_app'
        }
      });

      // Update user profile with Stripe customer ID
      if (userData.user_id || userData.id) {
        const { supabase } = require('../config/database');
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userData.user_id || userData.id);
      }

      return customer;
    } catch (error) {
      throw new AppError(`Customer creation failed: ${error.message}`, 500, 'STRIPE_CUSTOMER_CREATION_FAILED');
    }
  }

  // Attach payment method to customer
  async attachPaymentMethod(paymentMethodId, customerId) {
    this._checkStripeEnabled();

    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return true;
    } catch (error) {
      throw new AppError(`Payment method attachment failed: ${error.message}`, 500, 'STRIPE_PAYMENT_METHOD_ATTACH_FAILED');
    }
  }

  // Detach payment method
  async detachPaymentMethod(paymentMethodId) {
    this._checkStripeEnabled();

    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      throw new AppError(`Payment method detachment failed: ${error.message}`, 500, 'STRIPE_PAYMENT_METHOD_DETACH_FAILED');
    }
  }

  // Get customer payment methods
  async getCustomerPaymentMethods(customerId) {
    this._checkStripeEnabled();

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year
      }));
    } catch (error) {
      throw new AppError(`Payment methods retrieval failed: ${error.message}`, 500, 'STRIPE_PAYMENT_METHODS_FAILED');
    }
  }

  // Create refund
  async createRefund(refundData) {
    this._checkStripeEnabled();

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: refundData.payment_intent,
        amount: refundData.amount,
        reason: refundData.reason || 'requested_by_customer'
      });

      return refund;
    } catch (error) {
      throw new AppError(`Refund creation failed: ${error.message}`, 500, 'STRIPE_REFUND_FAILED');
    }
  }

  // Handle Stripe webhooks
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = this.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  // Handle Stripe Connect account updates
  async handleAccountUpdated(account) {
    const { supabase } = require('../config/database');
    
    try {
      const { error } = await supabase
        .from('stripe_accounts')
        .update({
          status: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
          capabilities: account.capabilities,
          requirements: account.requirements
        })
        .eq('stripe_account_id', account.id);

      if (error) {
        console.error('Failed to update Stripe account status:', error);
      }
    } catch (error) {
      console.error('Error handling account update webhook:', error);
    }
  }

  // Handle successful payments
  async handlePaymentSucceeded(paymentIntent) {
    const { supabase } = require('../config/database');
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          stripe_charge_id: paymentIntent.latest_charge,
          processed_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('Failed to update payment status:', error);
      }
    } catch (error) {
      console.error('Error handling payment success webhook:', error);
    }
  }

  // Handle failed payments
  async handlePaymentFailed(paymentIntent) {
    const { supabase } = require('../config/database');
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('Failed to update payment status:', error);
      }
    } catch (error) {
      console.error('Error handling payment failure webhook:', error);
    }
  }

  // Get account dashboard link
  async createDashboardLink(accountId) {
    this._checkStripeEnabled();

    try {
      const link = await this.stripe.accounts.createLoginLink(accountId);
      return link;
    } catch (error) {
      throw new AppError(`Dashboard link creation failed: ${error.message}`, 500, 'STRIPE_DASHBOARD_LINK_FAILED');
    }
  }
}

module.exports = new StripeService();

