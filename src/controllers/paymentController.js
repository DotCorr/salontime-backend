const { supabase } = require('../config/database');
const stripeS      // Calculate application fee (platform commission)
      // NO COMMISSION - salon owners pay via subscription only
      const applicationFeeAmount = 0; // Platform revenue comes from subscriptions
      const amountInCents = Math.round(booking.total_amount * 100);

      // Create payment intent
      const paymentIntentData = await stripeService.createPaymentIntent({
        amount: amountInCents,
        currency: 'usd',
        customer_id: req.user.stripe_customer_id,
        payment_method_id,
        connected_account_id: stripeAccount.stripe_account_id,
        // NO APPLICATION FEE - 100% goes to salon owner
        metadata: {
          booking_id: booking.id,
          salon_id: booking.salon_id,
          service_id: booking.service_id
        }
      });../services/stripeService');
const emailService = require('../services/emailService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class PaymentController {
  // Create payment intent for booking
  createPaymentIntent = asyncHandler(async (req, res) => {
    const { booking_id, payment_method_id, save_payment_method = false } = req.body;

    if (!booking_id) {
      throw new AppError('Booking ID is required', 400, 'BOOKING_ID_REQUIRED');
    }

    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          salons(*, user_profiles(*))
        `)
        .eq('id', booking_id)
        .eq('client_id', req.user.id)
        .single();

      if (bookingError || !booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      if (booking.status !== 'pending') {
        throw new AppError('Booking is not in pending status', 400, 'INVALID_BOOKING_STATUS');
      }

      // Get salon's Stripe account
      const { data: stripeAccount, error: stripeError } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('salon_id', booking.salon_id)
        .eq('account_status', 'active')
        .single();

      if (stripeError || !stripeAccount) {
        throw new AppError('Salon payment not set up', 400, 'SALON_PAYMENT_NOT_SETUP');
      }

      // Ensure customer has Stripe customer ID
      let customerId = req.user.stripe_customer_id;
      if (!customerId) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', req.user.id)
          .single();

        const customer = await stripeService.createOrGetCustomer({
          user_id: req.user.id,
          email: userProfile.email,
          full_name: userProfile.full_name
        });

        customerId = customer.id;
      }

      // Calculate application fee (platform commission)
      // NO COMMISSION - salon owners pay via subscription only
      const applicationFeeAmount = 0; // Platform revenue comes from subscriptions
      const amountInCents = Math.round(booking.total_amount * 100);

      // Create payment intent
      const paymentIntentData = await stripeService.createPaymentIntent({
        amount: amountInCents,
        currency: 'usd',
        customer_id: customerId,
        payment_method_id,
        connected_account_id: stripeAccount.stripe_account_id,
        // NO APPLICATION FEE - 100% goes to salon owner
        metadata: {
          booking_id: booking.id,
          salon_id: booking.salon_id,
          service_id: booking.service_id
        }
      });

      // Save payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: booking.id,
          amount: booking.total_amount,
          platform_fee: 0, // No platform fee - revenue from subscriptions only
          stripe_payment_intent_id: paymentIntentData.id,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) {
        throw new AppError('Failed to save payment record', 500, 'PAYMENT_RECORD_FAILED');
      }

      // Save payment method if requested
      if (save_payment_method && payment_method_id) {
        await stripeService.attachPaymentMethod(
          payment_method_id,
          customerId
        );
      }

      res.status(200).json({
        success: true,
        data: {
          client_secret: paymentIntentData.client_secret,
          payment_id: payment.id,
          amount: booking.total_amount,
          platform_fee: 0 // No commission - subscription-based revenue model
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create payment intent', 500, 'PAYMENT_INTENT_FAILED');
    }
  });

  // Confirm payment and update booking
  confirmPayment = asyncHandler(async (req, res) => {
    const { payment_id, stripe_payment_intent_id } = req.body;

    if (!payment_id || !stripe_payment_intent_id) {
      throw new AppError('Payment ID and Stripe Payment Intent ID are required', 400, 'MISSING_PAYMENT_INFO');
    }

    try {
      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          bookings(*, services(*), salons(*), user_profiles!client_id(*))
        `)
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      }

      // Verify payment with Stripe
      const paymentIntent = await stripeService.retrievePaymentIntent(stripe_payment_intent_id);

      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            stripe_charge_id: paymentIntent.latest_charge,
            processed_at: new Date().toISOString()
          })
          .eq('id', payment_id);

        // Update booking status to confirmed
        const { data: updatedBooking, error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.booking_id)
          .select(`
            *,
            services(*),
            salons(*)
          `)
          .single();

        if (bookingUpdateError) {
          throw new AppError('Failed to update booking status', 500, 'BOOKING_UPDATE_FAILED');
        }

        // Send payment confirmation email
        emailService.sendPaymentReceipt(
          { ...updatedBooking, service_name: payment.bookings.services.name },
          payment.bookings.user_profiles,
          payment.bookings.salons,
          {
            amount: payment.amount,
            payment_method: paymentIntent.payment_method?.type || 'card',
            transaction_id: paymentIntent.latest_charge
          }
        );

        res.status(200).json({
          success: true,
          data: {
            payment,
            booking: updatedBooking,
            message: 'Payment confirmed successfully'
          }
        });

      } else {
        // Update payment status to failed
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
          })
          .eq('id', payment_id);

        throw new AppError('Payment was not successful', 400, 'PAYMENT_FAILED');
      }

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to confirm payment', 500, 'PAYMENT_CONFIRMATION_FAILED');
    }
  });

  // Get user's payment methods
  getPaymentMethods = asyncHandler(async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.status(200).json({
          success: true,
          data: { payment_methods: [] }
        });
      }

      const paymentMethods = await stripeService.getCustomerPaymentMethods(
        req.user.stripe_customer_id
      );

      res.status(200).json({
        success: true,
        data: { payment_methods: paymentMethods }
      });

    } catch (error) {
      throw new AppError('Failed to fetch payment methods', 500, 'PAYMENT_METHODS_FETCH_FAILED');
    }
  });

  // Delete payment method
  deletePaymentMethod = asyncHandler(async (req, res) => {
    const { payment_method_id } = req.params;

    try {
      await stripeService.detachPaymentMethod(payment_method_id);

      res.status(200).json({
        success: true,
        message: 'Payment method deleted successfully'
      });

    } catch (error) {
      throw new AppError('Failed to delete payment method', 500, 'PAYMENT_METHOD_DELETE_FAILED');
    }
  });

  // Get payment history
  getPaymentHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          bookings(
            *,
            services(*),
            salons(*)
          )
        `)
        .eq('bookings.client_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new AppError('Failed to fetch payment history', 500, 'PAYMENT_HISTORY_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch payment history', 500, 'PAYMENT_HISTORY_FETCH_FAILED');
    }
  });

  // Process refund (salon owner only)
  processRefund = asyncHandler(async (req, res) => {
    const { payment_id, amount, reason } = req.body;

    if (!payment_id) {
      throw new AppError('Payment ID is required', 400, 'PAYMENT_ID_REQUIRED');
    }

    try {
      // Get payment and verify salon ownership
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          bookings(*, salons(owner_id))
        `)
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      }

      if (payment.bookings.salons.owner_id !== req.user.id) {
        throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      if (payment.status !== 'completed') {
        throw new AppError('Cannot refund incomplete payment', 400, 'INVALID_PAYMENT_STATUS');
      }

      // Process refund through Stripe
      const refundAmount = amount ? Math.round(amount * 100) : null;
      const refund = await stripeService.createRefund({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmount,
        reason: reason || 'requested_by_customer'
      });

      // Update payment record
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          status: refund.amount === payment.amount * 100 ? 'refunded' : 'partially_refunded',
          refund_amount: refund.amount / 100,
          refund_reason: reason
        })
        .eq('id', payment_id)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to update payment record', 500, 'PAYMENT_UPDATE_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          payment: updatedPayment,
          refund: {
            id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to process refund', 500, 'REFUND_PROCESSING_FAILED');
    }
  });

  // Get salon revenue analytics (salon owner only)
  getRevenueAnalytics = asyncHandler(async (req, res) => {
    const { period = '30', start_date, end_date } = req.query;

    try {
      // Get user's salon
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      // Calculate date range
      let dateFilter = '';
      if (start_date && end_date) {
        dateFilter = `processed_at.gte.${start_date},processed_at.lte.${end_date}`;
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        dateFilter = `processed_at.gte.${daysAgo.toISOString()}`;
      }

      // Get revenue data (subscription-based model)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          amount,
          processed_at,
          bookings!inner(salon_id, services(*))
        `)
        .eq('bookings.salon_id', salon.id)
        .eq('status', 'completed')
        .filter('processed_at', 'not.is', null);

      if (paymentsError) {
        throw new AppError('Failed to fetch revenue data', 500, 'REVENUE_DATA_FETCH_FAILED');
      }

      // Calculate analytics (subscription-based model - no commissions)
      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalFees = 0; // No platform fees - revenue from subscriptions only
      const netRevenue = totalRevenue; // 100% goes to salon owner
      const totalBookings = payments.length;

      // Group by service
      const serviceBreakdown = payments.reduce((acc, payment) => {
        const serviceName = payment.bookings.services.name;
        if (!acc[serviceName]) {
          acc[serviceName] = { count: 0, revenue: 0 };
        }
        acc[serviceName].count += 1;
        acc[serviceName].revenue += payment.amount; // Full amount to salon
        return acc;
      }, {});

      // Daily revenue for chart
      const dailyRevenue = payments.reduce((acc, payment) => {
        const date = payment.processed_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += payment.amount; // Full amount to salon
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: {
          summary: {
            total_revenue: totalRevenue,
            platform_fees: 0, // No platform fees - subscription model
            net_revenue: netRevenue, // 100% to salon owner
            total_bookings: totalBookings,
            average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0
          },
          service_breakdown: serviceBreakdown,
          daily_revenue: dailyRevenue,
          period: { start_date, end_date, days: period },
          revenue_model: "subscription_only" // No commission model
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch revenue analytics', 500, 'REVENUE_ANALYTICS_FAILED');
    }
  });
}

module.exports = new PaymentController();

