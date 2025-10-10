const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate sample salons
function generateSampleSalons(count = 100) {
  const cities = [
    { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { name: "Utrecht", lat: 52.0907, lng: 5.1214 },
    { name: "The Hague", lat: 52.0705, lng: 4.3007 },
    { name: "Eindhoven", lat: 51.4416, lng: 5.4697 },
    { name: "Tilburg", lat: 51.5555, lng: 5.0913 },
    { name: "Groningen", lat: 53.2194, lng: 6.5665 },
    { name: "Almere", lat: 52.3508, lng: 5.2647 },
    { name: "Breda", lat: 51.5719, lng: 4.7683 },
    { name: "Nijmegen", lat: 51.8426, lng: 5.8590 }
  ];

  const businessTypes = [
    "Hair Studio", "Beauty Lounge", "The Hair Company", "Salon", "Hair & Beauty",
    "Style Studio", "Beauty Bar", "Hair Design", "Beauty Center", "Style Lounge"
  ];

  const services = [
    ["Hair Cut", "Hair Color", "Styling"],
    ["Hair Cut", "Hair Color", "Manicure", "Pedicure"],
    ["Hair Cut", "Highlights", "Keratin Treatment"],
    ["Hair Cut", "Hair Color", "Facial", "Massage"],
    ["Hair Cut", "Styling", "Bridal", "Makeup"]
  ];

  const amenities = [
    ["WiFi", "Parking"],
    ["WiFi", "Parking", "Wheelchair Accessible"],
    ["WiFi", "Parking", "Refreshments"],
    ["WiFi", "Wheelchair Accessible"],
    ["Parking", "Wheelchair Accessible", "Refreshments"]
  ];

  const salons = [];
  
  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const serviceSet = services[Math.floor(Math.random() * services.length)];
    const amenitySet = amenities[Math.floor(Math.random() * amenities.length)];
    
    const salon = {
      owner_id: 'abd7c6ee-ead0-474f-bc24-0a2135d5405d', // Your user ID
      business_name: `${businessType} ${city.name} ${i + 1}`,
      description: `Professional ${businessType.toLowerCase()} in ${city.name}. Offering quality hair and beauty services with experienced stylists.`,
      address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${city.name}`,
      city: city.name,
      state: "Netherlands",
      zip_code: `${Math.floor(Math.random() * 9000) + 1000} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      phone: `+31 ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
      email: `info@${businessType.toLowerCase().replace(/\s+/g, '')}${city.name.toLowerCase()}${i + 1}.nl`,
      website: `https://${businessType.toLowerCase().replace(/\s+/g, '')}${city.name.toLowerCase()}${i + 1}.nl`,
      rating_average: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
      rating_count: Math.floor(Math.random() * 200) + 10,
      business_hours: {
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "09:00-17:00",
        sunday: "Closed"
      },
      is_active: true
    };
    
    salons.push(salon);
  }
  
  return salons;
}

// POST /api/sample-data/seed - Add sample salons
router.post('/seed', async (req, res) => {
  try {
    const { count = 100 } = req.body;
    
    console.log(`🌱 Seeding ${count} sample salons...`);
    
    const sampleSalons = generateSampleSalons(count);
    
    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < sampleSalons.length; i += batchSize) {
      const batch = sampleSalons.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('salons')
        .insert(batch);
        
      if (error) {
        console.error(`❌ Error inserting batch ${i}-${i + batchSize}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Failed to insert sample data'
        });
      }
      
      inserted += batch.length;
      console.log(`✅ Inserted batch ${i}-${i + batchSize} (${inserted}/${sampleSalons.length})`);
    }
    
    res.json({
      success: true,
      message: `Successfully seeded ${inserted} sample salons`,
      count: inserted
    });
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/sample-data/clear - Remove all salons
router.delete('/clear', async (req, res) => {
  try {
    console.log('🗑️ Clearing all salons...');
    
    const { error } = await supabase
      .from('salons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) {
      console.error('❌ Error clearing salons:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to clear salons'
      });
    }
    
    res.json({
      success: true,
      message: 'All salons cleared successfully'
    });
    
  } catch (error) {
    console.error('❌ Error clearing salons:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/sample-data/status - Get salon count
router.get('/status', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('salons')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error getting salon count:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get salon count'
      });
    }
    
    res.json({
      success: true,
      salonCount: count || 0
    });
    
  } catch (error) {
    console.error('❌ Error getting salon count:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
