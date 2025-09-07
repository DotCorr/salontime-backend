const Stripe = require('stripe');
const config = require('./index');

// Initialize Stripe (will be null if no secret key)
const stripe = config.stripe.secret_key 
  ? new Stripe(config.stripe.secret_key, {
      apiVersion: '2023-10-16',
    })
  : null;

// Test Stripe connection
const testStripeConnection = async () => {
  if (!stripe) {
    console.log('⚠️  Stripe not configured - add STRIPE_SECRET_KEY to enable payments');
    return;
  }

  try {
    await stripe.accounts.list({ limit: 1 });
    console.log('✅ Stripe connection established');
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
  }
};

// Test connection on startup
testStripeConnection();

module.exports = {
  stripe,
  isStripeEnabled: !!stripe
};

