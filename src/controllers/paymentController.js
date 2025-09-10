const stripeService = require('../services/stripeService');
const { supabase } = require('../config/database');
const config = require('../config');

class PaymentController {
  // Handle Stripe webhooks (no auth required - uses webhook signature verification)
  async handleWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = config.stripe.webhook_secret;
      
      if (!endpointSecret) {
        console.error('Webhook secret not configured');
        return res.status(400).send('Webhook secret not configured');
      }

      // Verify webhook signature
      const event = stripeService.constructWebhookEvent(req.body, sig, endpointSecret);
      
      console.log('Received webhook event:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  // Create payment intent for service booking
  async createPaymentIntent(req, res) {
    try {
      const { amount, currency = 'usd', serviceId, salonId } = req.body;
      const userId = req.user.id;

      if (!amount || !serviceId || !salonId) {
        return res.status(400).json({ 
          error: 'Missing required fields: amount, serviceId, salonId' 
        });
      }

      // Get salon's Stripe account
      const { data: salon } = await supabase
        .from('salons')
        .select('stripe_account_id, name')
        .eq('id', salonId)
        .single();

      if (!salon || !salon.stripe_account_id) {
        return res.status(404).json({ 
          error: 'Salon not found or Stripe not configured' 
        });
      }

      // Create payment intent - NO APPLICATION FEE (commission removed)
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        transfer_data: {
          destination: salon.stripe_account_id,
        },
        metadata: {
          userId,
          serviceId,
          salonId,
          salonName: salon.name
        }
      });

      // Store payment record
      const { error: dbError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          salon_id: salonId,
          service_id: serviceId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: amount,
          currency,
          status: 'pending'
        });

      if (dbError) {
        console.error('Failed to store payment record:', dbError);
      }

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }

  // Confirm payment completion
  async confirmPayment(req, res) {
    try {
      const { paymentIntentId } = req.params;
      const userId = req.user.id;

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        return res.status(404).json({ error: 'Payment intent not found' });
      }

      // Update payment status in database
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: paymentIntent.status,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update payment status:', error);
      }

      res.json({
        status: paymentIntent.status,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  }

  // Get user's payment history
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          salons(name, address),
          services(name, duration)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        payments: payments || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: payments?.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Payment history error:', error);
      res.status(500).json({ error: 'Failed to retrieve payment history' });
    }
  }

  // Get salon's payment data (salon owner only)
  async getSalonPayments(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Verify user owns a salon
      const { data: salon } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (!salon) {
        return res.status(403).json({ error: 'Access denied: Not a salon owner' });
      }

      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          users(email, full_name),
          services(name, duration)
        `)
        .eq('salon_id', salon.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        payments: payments || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: payments?.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Salon payments error:', error);
      res.status(500).json({ error: 'Failed to retrieve salon payments' });
    }
  }

  // Get payment analytics (salon owner only)
  async getPaymentAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { period, start_date, end_date } = req.query;

      // Verify user owns a salon
      const { data: salon } = await supabase
        .from('salons')
        .select('id, business_name')
        .eq('owner_id', userId)
        .single();

      if (!salon) {
        return res.status(403).json({ error: 'Access denied: Not a salon owner' });
      }

      // Calculate date range
      let startDate, endDate;
      const now = new Date();

      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
      } else if (period) {
        const days = parseInt(period);
        if (isNaN(days) || days <= 0) {
          return res.status(400).json({ error: 'Invalid period parameter' });
        }
        endDate = new Date(now);
        startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      } else {
        // Default to last 30 days
        endDate = new Date(now);
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }

      // Format dates for Supabase query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get all successful payments within date range
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          amount,
          currency,
          created_at,
          services(name, category),
          bookings(appointment_date)
        `)
        .eq('salon_id', salon.id)
        .eq('status', 'succeeded')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate comprehensive analytics
      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalTransactions = payments.length;
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Revenue by service category
      const revenueByCategory = payments.reduce((acc, payment) => {
        const category = payment.services?.category || 'Other';
        acc[category] = (acc[category] || 0) + payment.amount;
        return acc;
      }, {});

      // Daily revenue trend
      const dailyRevenue = payments.reduce((acc, payment) => {
        const date = payment.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + payment.amount;
        return acc;
      }, {});

      // Monthly revenue trend (for longer periods)
      const monthlyRevenue = payments.reduce((acc, payment) => {
        const date = new Date(payment.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + payment.amount;
        return acc;
      }, {});

      // Top performing services
      const serviceRevenue = payments.reduce((acc, payment) => {
        const serviceName = payment.services?.name || 'Unknown Service';
        if (!acc[serviceName]) {
          acc[serviceName] = { revenue: 0, count: 0 };
        }
        acc[serviceName].revenue += payment.amount;
        acc[serviceName].count += 1;
        return acc;
      }, {});

      const topServices = Object.entries(serviceRevenue)
        .map(([name, data]) => ({
          name,
          revenue: data.revenue,
          transactionCount: data.count,
          averageValue: data.revenue / data.count
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate growth metrics
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const previousPeriodEnd = new Date(startDate);

      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('salon_id', salon.id)
        .eq('status', 'succeeded')
        .gte('created_at', previousPeriodStart.toISOString().split('T')[0])
        .lt('created_at', previousPeriodEnd.toISOString().split('T')[0]);

      const previousRevenue = previousPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      res.json({
        success: true,
        data: {
          salon: {
            id: salon.id,
            name: salon.business_name
          },
          period: {
            start_date: startDateStr,
            end_date: endDateStr,
            days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
          },
          summary: {
            totalRevenue,
            totalTransactions,
            averageTransaction,
            currency: payments[0]?.currency || 'usd'
          },
          growth: {
            previousPeriodRevenue: previousRevenue,
            revenueGrowth: Math.round(revenueGrowth * 100) / 100 // Round to 2 decimal places
          },
          trends: {
            daily: dailyRevenue,
            monthly: monthlyRevenue
          },
          breakdown: {
            byCategory: revenueByCategory,
            topServices
          }
        }
      });
    } catch (error) {
      console.error('Payment analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment analytics',
        code: 'ANALYTICS_ERROR'
      });
    }
  }

  // Process subscription payment
  async processSubscription(req, res) {
    try {
      const { planId, salonId } = req.body;
      const userId = req.user.id;

      if (!planId || !salonId) {
        return res.status(400).json({ 
          error: 'Missing required fields: planId, salonId' 
        });
      }

      // Verify user owns the salon
      const { data: salon } = await supabase
        .from('salons')
        .select('id, stripe_customer_id')
        .eq('id', salonId)
        .eq('owner_id', userId)
        .single();

      if (!salon) {
        return res.status(403).json({ error: 'Access denied: Salon not found or not owned by user' });
      }

      // Get subscription plan details
      const plan = config.subscription.plans[planId];
      if (!plan) {
        return res.status(400).json({ error: 'Invalid subscription plan' });
      }

      // Create subscription
      const subscription = await stripeService.createSubscription({
        customer: salon.stripe_customer_id,
        price: plan.stripePriceId,
        metadata: {
          salonId: salon.id,
          userId: userId,
          planId: planId
        }
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status
      });
    } catch (error) {
      console.error('Subscription processing error:', error);
      res.status(500).json({ error: 'Failed to process subscription' });
    }
  }

  // Handle successful payment webhook
  async handlePaymentSuccess(paymentIntent) {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'succeeded',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('Failed to update payment status:', error);
      }

      console.log(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }

  // Handle failed payment webhook
  async handlePaymentFailure(paymentIntent) {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('Failed to update payment status:', error);
      }

      console.log(`Payment failed: ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  // Handle subscription changes webhook
  async handleSubscriptionChange(subscription) {
    try {
      const salonId = subscription.metadata.salonId;
      
      if (!salonId) {
        console.error('No salon ID in subscription metadata');
        return;
      }

      const { error } = await supabase
        .from('salon_subscriptions')
        .upsert({
          salon_id: salonId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to update subscription status:', error);
      }

      console.log(`Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription change:', error);
    }
  }
}

module.exports = new PaymentController();

