/**
 * Configuration Test Script
 * Tests if the new configuration module works correctly
 */

const config = require('./src/config');

console.log('🧪 Testing Configuration Module\n');

try {
  // Test validation
  console.log('1. Testing configuration validation...');
  config.validate();
  console.log('✅ Configuration validation passed\n');

  // Test configuration values
  console.log('2. Testing configuration values:');
  console.log(`   Server Port: ${config.server.port}`);
  console.log(`   API Version: ${config.server.api_version}`);
  console.log(`   Environment: ${config.server.node_env}`);
  console.log(`   Business Name: ${config.business.name}`);
  console.log(`   Trial Days: ${config.subscription.trial_days}`);
  console.log(`   Payment Currency: ${config.payment.currency}`);
  console.log(`   Platform Fee: ${config.payment.commission_rate}%`);
  console.log(`   Rate Limit Window: ${config.rateLimit.window_ms}ms`);
  console.log(`   Max Requests (Dev): ${config.rateLimit.dev_max_requests}`);
  console.log(`   Max Requests (Prod): ${config.rateLimit.prod_max_requests}\n`);

  // Test feature flags
  console.log('3. Testing feature flags:');
  console.log(`   Email Notifications: ${config.features.enable_email_notifications ? '✅' : '❌'}`);
  console.log(`   Analytics: ${config.features.enable_analytics ? '✅' : '❌'}`);
  console.log(`   Subscriptions: ${config.features.enable_subscriptions ? '✅' : '❌'}`);
  console.log(`   Webhooks: ${config.features.enable_webhooks ? '✅' : '❌'}\n`);

  // Test helper methods
  console.log('4. Testing helper methods:');
  console.log(`   Is Development: ${config.isDevelopment()}`);
  console.log(`   Is Production: ${config.isProduction()}`);
  console.log(`   Is Test: ${config.isTest()}\n`);

  // Test CORS origins
  console.log('5. Testing CORS configuration:');
  console.log(`   Allowed Origins: ${config.cors.allowed_origins.join(', ')}\n`);

  console.log('✅ Configuration Module Test Complete!');
  console.log('🎯 All configurable variables now centralized');
  console.log('🔧 Update .env file to change settings');

} catch (error) {
  console.error('❌ Configuration test failed:', error.message);
  process.exit(1);
}

