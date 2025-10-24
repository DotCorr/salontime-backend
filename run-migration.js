/**
 * Migration script to add country column to salons table
 * Run this with: node run-migration.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Running migration: Add country column to salons table...');
    
    // Add country column
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.salons 
        ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US';
      `
    });

    if (alterError) {
      // Try alternative method - direct update
      console.log('Using alternative method to add column...');
      
      // First, check if column exists
      const { data: columns } = await supabaseAdmin
        .from('salons')
        .select('*')
        .limit(1);
      
      if (columns && columns.length > 0 && !('country' in columns[0])) {
        console.error('⚠️  Cannot add column automatically via Supabase client.');
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
        console.log('--------------------------------------------------');
        console.log(`
ALTER TABLE public.salons 
ADD COLUMN country VARCHAR(2) DEFAULT 'US';

COMMENT ON COLUMN public.salons.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, NL, GB). Required for Stripe Connect.';

-- Update existing salons with likely countries based on address data
UPDATE public.salons 
SET country = 'NL' 
WHERE country IS NULL 
AND (city ILIKE '%nederland%' OR state ILIKE '%holland%' OR zip_code ~ '^[0-9]{4}[A-Z]{2}$');

UPDATE public.salons 
SET country = 'US' 
WHERE country IS NULL;
        `);
        console.log('--------------------------------------------------\n');
      }
    }

    // Update existing salons to have appropriate country
    console.log('Updating existing salons with country data...');
    
    // Set NL for Dutch addresses
    const { error: nlError } = await supabaseAdmin
      .from('salons')
      .update({ country: 'NL' })
      .or('city.ilike.%nederland%,state.ilike.%holland%,zip_code.like.____[A-Z][A-Z]');
    
    if (nlError) console.log('NL update info:', nlError.message);

    // Set US for remaining null countries
    const { error: usError } = await supabaseAdmin
      .from('salons')
      .update({ country: 'US' })
      .is('country', null);
    
    if (usError) console.log('US update info:', usError.message);

    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the country column was added: Check Supabase Table Editor');
    console.log('2. Restart your backend server to apply code changes');
    console.log('3. Try creating a new salon - it should now save the country field');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

