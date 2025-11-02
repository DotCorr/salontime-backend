/**
 * Force update Sunday hours for all salons to be open (10:00-16:00) for testing
 * Usage: node scripts/utilities/force-update-sunday-hours.js
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceUpdateSundayHours() {
  try {
    console.log('\n🕐 Force updating Sunday hours for all salons...\n');

    // Get all salons
    const { data: salons, error: salonsError } = await supabase
      .from('salons')
      .select('id, business_name, business_hours');

    if (salonsError) {
      throw salonsError;
    }

    if (!salons || salons.length === 0) {
      console.log('⚠️  No salons found');
      return;
    }

    console.log(`Found ${salons.length} salons\n`);

    let updated = 0;
    let errors = 0;

    for (const salon of salons) {
      try {
        let businessHours = salon.business_hours || {};

        // Ensure Sunday is set to open (10:00-23:00 for testing)
        businessHours.sunday = { opening: '10:00', closing: '23:00', closed: false };

        // Ensure all other days exist with defaults if missing (extended hours)
        const defaultDays = {
          monday: { opening: '09:00', closing: '23:00', closed: false },
          tuesday: { opening: '09:00', closing: '23:00', closed: false },
          wednesday: { opening: '09:00', closing: '23:00', closed: false },
          thursday: { opening: '09:00', closing: '23:00', closed: false },
          friday: { opening: '09:00', closing: '23:00', closed: false },
          saturday: { opening: '09:00', closing: '23:00', closed: false },
        };

        for (const [day, hours] of Object.entries(defaultDays)) {
          if (!businessHours[day]) {
            businessHours[day] = hours;
          }
        }

        // Update salon
        const { error: updateError } = await supabase
          .from('salons')
          .update({ 
            business_hours: businessHours,
            updated_at: new Date().toISOString()
          })
          .eq('id', salon.id);

        if (updateError) {
          console.error(`   ❌ ${salon.business_name}: ${updateError.message}`);
          errors++;
        } else {
          updated++;
          if (updated % 100 === 0) {
            console.log(`   ✅ Updated ${updated} salons...`);
          }
        }
      } catch (error) {
        console.error(`   ❌ ${salon.business_name}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
(async () => {
  await forceUpdateSundayHours();
  process.exit(0);
})();

