#!/usr/bin/env node

/**
 * Setup Stripe Webhook for Local Development
 * This script will:
 * 1. Start Stripe CLI listener
 * 2. Get the webhook secret
 * 3. Update your environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Stripe Webhook for Local Development...\n');

try {
  // Check if Stripe CLI is installed
  execSync('stripe --version', { stdio: 'pipe' });
  console.log('✅ Stripe CLI is installed');
} catch (error) {
  console.error('❌ Stripe CLI not found. Please install it first:');
  console.error('   https://stripe.com/docs/stripe-cli');
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  fs.writeFileSync(envPath, '# SalonTime Backend Environment Variables\n\n');
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if webhook secret already exists
if (envContent.includes('STRIPE_WEBHOOK_SECRET=')) {
  console.log('⚠️  STRIPE_WEBHOOK_SECRET already exists in .env');
  console.log('   To get a new secret, run: stripe listen --print-secret');
} else {
  console.log('🔑 To get your webhook secret, run:');
  console.log('   stripe listen --forward-to localhost:3000/webhook/stripe --print-secret');
  console.log('\n📋 Then add it to your .env file:');
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here');
}

console.log('\n🚀 To start the webhook listener, run:');
console.log('   stripe listen --forward-to localhost:3000/webhook/stripe');
console.log('\n📡 This will forward Stripe events to your local server!');
