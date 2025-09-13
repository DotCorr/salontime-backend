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
    console.log('⚠️  Stripe not configured - payments will be disabled');
    console.log('   Fix: Add valid STRIPE_SECRET_KEY to .env file');
    console.log('   Get keys from: https://dashboard.stripe.com/test/apikeys');
    return;
  }

  try {
    // For development, skip the connection test if using placeholder keys
    if (config.stripe.secret_key && config.stripe.secret_key.includes('YOUR_REAL')) {
      console.log('⚠️  Using placeholder Stripe keys - payments disabled for development');
      console.log('   Replace with real keys from: https://dashboard.stripe.com/test/apikeys');
      return;
    }

    await stripe.accounts.list({ limit: 1 });
    console.log('✅ Stripe connection established');
  } catch (error) {
    console.log('⚠️  Stripe connection failed - payments will be disabled');
    console.log('   Fix: Add valid STRIPE_SECRET_KEY to .env file');
    console.log('   Error:', error.message);
  }
};

// Test connection on startup
testStripeConnection();

module.exports = {
  stripe,
  isStripeEnabled: !!stripe
};

