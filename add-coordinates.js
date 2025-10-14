const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// City coordinates for geocoding
const cityCoordinates = {
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  'Utrecht': { lat: 52.0907, lng: 5.1214 },
  'The Hague': { lat: 52.0705, lng: 4.3007 },
  'Eindhoven': { lat: 51.4416, lng: 5.4697 },
  'Tilburg': { lat: 51.5555, lng: 5.0913 },
  'Groningen': { lat: 53.2194, lng: 6.5665 },
  'Almere': { lat: 52.3508, lng: 5.2647 },
  'Breda': { lat: 51.5719, lng: 4.7683 },
  'Nijmegen': { lat: 51.8426, lng: 5.8590 }
};

async function addCoordinatesToSalons() {
  try {
    console.log('🌍 Fetching all salons...');
    
    // Get all salons
    const { data: salons, error } = await supabase
      .from('salons')
      .select('id, city, address');
    
    if (error) {
      console.error('❌ Error fetching salons:', error);
      return;
    }
    
    console.log(`📍 Found ${salons.length} salons to update`);
    
    // Update each salon with coordinates
    let updated = 0;
    let failed = 0;
    
    for (const salon of salons) {
      const cityData = cityCoordinates[salon.city];
      
      if (cityData) {
        // Generate random offset within ~10km radius for variety
        const latOffset = (Math.random() - 0.5) * 0.18; // ~10km
        const lngOffset = (Math.random() - 0.5) * 0.18; // ~10km
        
        const latitude = cityData.lat + latOffset;
        const longitude = cityData.lng + lngOffset;
        
        const { error: updateError } = await supabase
          .from('salons')
          .update({ 
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6)
          })
          .eq('id', salon.id);
        
        if (updateError) {
          console.error(`❌ Failed to update ${salon.id}:`, updateError.message);
          failed++;
        } else {
          updated++;
          if (updated % 100 === 0) {
            console.log(`✅ Updated ${updated} salons...`);
          }
        }
      } else {
        console.warn(`⚠️  No coordinates found for city: ${salon.city}`);
        failed++;
      }
    }
    
    console.log(`\n✅ Completed!`);
    console.log(`   Updated: ${updated} salons`);
    console.log(`   Failed: ${failed} salons`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
addCoordinatesToSalons();

