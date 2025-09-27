#!/usr/bin/env node

/**
 * Trigger Real Webhook Event
 * This script will trigger a real webhook event using Stripe CLI
 */

const { execSync } = require('child_process');

console.log('🚀 Triggering real webhook event...\n');

try {
  // Trigger a test webhook event
  const result = execSync('stripe trigger account.updated', { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  
  console.log('✅ Webhook event triggered!');
  console.log('📡 Check your backend logs for webhook processing...');
  
} catch (error) {
  console.error('❌ Failed to trigger webhook:', error.message);
  console.log('\n💡 Make sure Stripe CLI is running:');
  console.log('   stripe listen --forward-to localhost:3000/webhook/stripe');
}
