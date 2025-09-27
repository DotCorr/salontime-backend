#!/usr/bin/env node

/**
 * Check Current Status
 * This script will check the current Stripe account status
 */

require('dotenv').config();
const { supabaseAdmin } = require('./src/config/database');

async function checkStatus() {
  console.log('🔍 Checking Current Status...\n');

  try {
    // Check salon status
    const { data: salon, error: salonError } = await supabaseAdmin
      .from('salons')
      .select('*')
      .eq('stripe_account_id', 'acct_1SBzxPLLoD387BhE')
      .single();

    if (salonError || !salon) {
      console.error('❌ Salon not found:', salonError);
      return;
    }

    console.log('🏢 Salon:', salon.business_name);
    console.log('📊 Stripe Account Status:', salon.stripe_account_status);
    console.log('🆔 Stripe Account ID:', salon.stripe_account_id);

    // Check stripe_accounts table
    const { data: account, error: accountError } = await supabaseAdmin
      .from('stripe_accounts')
      .select('*')
      .eq('stripe_account_id', 'acct_1SBzxPLLoD387BhE')
      .single();

    if (accountError) {
      console.log('⚠️  No stripe_accounts record found');
    } else {
      console.log('💳 Stripe Account Details:');
      console.log('   Status:', account.account_status);
      console.log('   Charges Enabled:', account.charges_enabled);
      console.log('   Payouts Enabled:', account.payouts_enabled);
    }

    console.log('\n🎯 Next Steps:');
    if (salon.stripe_account_status === 'active') {
      console.log('✅ Stripe account is active!');
      console.log('✅ "Payment setup required" should disappear from UI');
    } else {
      console.log('⚠️  Status is still pending');
      console.log('💡 Try completing Stripe onboarding again');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkStatus();
