#!/usr/bin/env node

/**
 * Test Webhook Handler
 * This script will manually trigger a webhook event to test the handler
 */

require('dotenv').config();
const { supabaseAdmin } = require('./src/config/database');

async function testWebhook() {
  console.log('🧪 Testing Webhook Handler...\n');

  try {
    // Get the salon with Stripe account
    const { data: salon, error: salonError } = await supabaseAdmin
      .from('salons')
      .select('*')
      .eq('stripe_account_id', 'acct_1SBzxPLLoD387BhE')
      .single();

    if (salonError || !salon) {
      console.error('❌ Salon not found:', salonError);
      return;
    }

    console.log('✅ Found salon:', salon.business_name);
    console.log('📊 Current status:', salon.stripe_account_status);

    // Simulate a webhook event by manually updating the status
    console.log('\n🔄 Simulating webhook event...');
    
    const { error: updateError } = await supabaseAdmin
      .from('salons')
      .update({
        stripe_account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', 'acct_1SBzxPLLoD387BhE');

    if (updateError) {
      console.error('❌ Failed to update salon:', updateError);
    } else {
      console.log('✅ Salon status updated to active!');
    }

    // Also update stripe_accounts table
    const { error: accountsError } = await supabaseAdmin
      .from('stripe_accounts')
      .update({
        account_status: 'active',
        charges_enabled: true,
        payouts_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', 'acct_1SBzxPLLoD387BhE');

    if (accountsError) {
      console.error('❌ Failed to update stripe_accounts:', accountsError);
    } else {
      console.log('✅ Stripe account status updated to active!');
    }

    console.log('\n🎉 Test completed! Check your app now.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhook();

