/**
 * Script to populate business hours for all salons
 * This is required for the booking system to calculate available slots
 * 
 * Usage: node scripts/utilities/populate-business-hours.js
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

// Default business hours template (Monday-Saturday: 9am-11pm, Sunday: 10am-11pm)
const defaultBusinessHours = {
  monday: { opening: '09:00', closing: '23:00', closed: false },
  tuesday: { opening: '09:00', closing: '23:00', closed: false },
  wednesday: { opening: '09:00', closing: '23:00', closed: false },
  thursday: { opening: '09:00', closing: '23:00', closed: false },
  friday: { opening: '09:00', closing: '23:00', closed: false },
  saturday: { opening: '09:00', closing: '23:00', closed: false },
  sunday: { opening: '10:00', closing: '23:00', closed: false } // Open on Sunday for testing
};

async function populateBusinessHours() {
  try {
    console.log('\n🕐 Populating business hours for all salons...\n');

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
    let skipped = 0;
    let errors = 0;

    for (const salon of salons) {
      try {
        let businessHours = salon.business_hours;

        // Check if salon already has valid business hours
        if (businessHours && typeof businessHours === 'object') {
          const hasValidHours = Object.keys(businessHours).some(day => {
            const dayHours = businessHours[day];
            if (typeof dayHours === 'object' && dayHours !== null) {
              return (dayHours.opening && dayHours.closing) || dayHours.closed === true;
            }
            return false;
          });

          if (hasValidHours) {
            console.log(`   ⏭️  ${salon.business_name}: Already has business hours, skipping`);
            skipped++;
            continue;
          }
        }

        // Normalize existing business hours or use defaults
        const normalizedHours = {};

        if (businessHours && typeof businessHours === 'object') {
          // Try to convert existing format to new format
          for (const [day, hours] of Object.entries(businessHours)) {
            const dayLower = day.toLowerCase();
            
            if (hours === null || hours === 'Closed' || hours === 'closed') {
              normalizedHours[dayLower] = { closed: true };
            } else if (typeof hours === 'string' && hours.includes('-')) {
              // Handle "09:00-18:00" format
              const [open, close] = hours.split('-');
              normalizedHours[dayLower] = {
                opening: open.trim(),
                closing: close.trim(),
                closed: false
              };
            } else if (typeof hours === 'object' && hours !== null) {
              // Handle {open: "09:00", close: "18:00"} format
              normalizedHours[dayLower] = {
                opening: hours.open || hours.opening || defaultBusinessHours[dayLower]?.opening,
                closing: hours.close || hours.closing || defaultBusinessHours[dayLower]?.closing,
                closed: hours.closed === true || hours.closed === 'true'
              };
            } else {
              // Use default for this day
              normalizedHours[dayLower] = defaultBusinessHours[dayLower] || { closed: true };
            }
          }
        }

        // Ensure all days are present
        for (const day of Object.keys(defaultBusinessHours)) {
          if (!normalizedHours[day]) {
            normalizedHours[day] = defaultBusinessHours[day];
          }
        }

        // Update salon
        const { error: updateError } = await supabase
          .from('salons')
          .update({ 
            business_hours: normalizedHours,
            updated_at: new Date().toISOString()
          })
          .eq('id', salon.id);

        if (updateError) {
          console.error(`   ❌ ${salon.business_name}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`   ✅ ${salon.business_name}: Business hours updated`);
          updated++;
        }
      } catch (error) {
        console.error(`   ❌ ${salon.business_name}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
(async () => {
  await populateBusinessHours();
  process.exit(0);
})();

