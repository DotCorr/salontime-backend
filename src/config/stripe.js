const Stripe = require('stripe');

// Validate required environment variables
const requiredStripeVars = ['STRIPE_SECRET_KEY'];
const missingVars = requiredStripeVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing Stripe environment variables: ${missingVars.join(', ')}`);
  console.warn('Stripe functionality will be disabled until these are provided.');
}

// Initialize Stripe (will be null if no secret key)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
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

