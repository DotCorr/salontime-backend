const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample salon data
const sampleSalons = [
  {
    business_name: "Hair Studio Amsterdam",
    description: "Premium hair salon in the heart of Amsterdam. Specializing in cuts, colors, and styling.",
    address: "Damrak 1, 1012 LP Amsterdam",
    city: "Amsterdam",
    state: "North Holland",
    zip_code: "1012 LP",
    phone: "+31 20 123 4567",
    email: "info@hairstudioamsterdam.nl",
    website: "https://hairstudioamsterdam.nl",
    rating_average: 4.8,
    rating_count: 127,
    price_range: "€€€",
    services: ["Hair Cut", "Hair Color", "Styling", "Bridal"],
    amenities: ["WiFi", "Parking", "Wheelchair Accessible"],
    business_hours: {
      monday: "09:00-18:00",
      tuesday: "09:00-18:00", 
      wednesday: "09:00-18:00",
      thursday: "09:00-18:00",
      friday: "09:00-18:00",
      saturday: "09:00-17:00",
      sunday: "Closed"
    },
    images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop"],
    latitude: 52.3676,
    longitude: 4.9041
  },
  {
    business_name: "Beauty Lounge Rotterdam",
    description: "Full-service beauty salon offering hair, nails, and skincare treatments.",
    address: "Coolsingel 123, 3012 AG Rotterdam",
    city: "Rotterdam", 
    state: "South Holland",
    zip_code: "3012 AG",
    phone: "+31 10 234 5678",
    email: "hello@beautyloungerotterdam.nl",
    website: "https://beautyloungerotterdam.nl",
    rating_average: 4.6,
    rating_count: 89,
    price_range: "€€",
    services: ["Hair Cut", "Hair Color", "Manicure", "Pedicure", "Facial"],
    amenities: ["WiFi", "Parking"],
    business_hours: {
      monday: "10:00-19:00",
      tuesday: "10:00-19:00",
      wednesday: "10:00-19:00", 
      thursday: "10:00-19:00",
      friday: "10:00-19:00",
      saturday: "09:00-18:00",
      sunday: "Closed"
    },
    images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop"],
    latitude: 51.9244,
    longitude: 4.4777
  },
  {
    business_name: "The Hair Company Utrecht",
    description: "Modern hair salon with experienced stylists and latest techniques.",
    address: "Oudegracht 456, 3511 AL Utrecht",
    city: "Utrecht",
    state: "Utrecht", 
    zip_code: "3511 AL",
    phone: "+31 30 345 6789",
    email: "info@haircompanyutrecht.nl",
    website: "https://haircompanyutrecht.nl",
    rating_average: 4.7,
    rating_count: 156,
    price_range: "€€€",
    services: ["Hair Cut", "Hair Color", "Highlights", "Perm", "Keratin Treatment"],
    amenities: ["WiFi", "Parking", "Wheelchair Accessible"],
    business_hours: {
      monday: "09:00-18:00",
      tuesday: "09:00-18:00",
      wednesday: "09:00-18:00",
      thursday: "09:00-18:00", 
      friday: "09:00-18:00",
      saturday: "09:00-17:00",
      sunday: "Closed"
    },
    images: ["https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop"],
    latitude: 52.0907,
    longitude: 5.1214
  }
];

// Generate 1000 sample salons
function generateSampleSalons() {
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

  // Real Unsplash images for hair salons and beauty parlors
  const salonImages = [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop", // Hair salon interior
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop", // Salon chairs
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop", // Modern salon
    "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&h=600&fit=crop", // Salon styling area
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop", // Beauty salon
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=600&fit=crop", // Hair washing station
    "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=800&h=600&fit=crop", // Salon mirror area
    "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=600&fit=crop", // Barber shop
    "https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=800&h=600&fit=crop", // Salon workspace
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=600&fit=crop", // Beauty parlor
    "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800&h=600&fit=crop", // Hairdressing salon
    "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop", // Hair salon tools
    "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&h=600&fit=crop", // Salon styling station
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=800&h=600&fit=crop", // Modern beauty salon
    "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=800&h=600&fit=crop"  // Salon interior design
  ];

  const salons = [];
  
  for (let i = 0; i < 1000; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const serviceSet = services[Math.floor(Math.random() * services.length)];
    const amenitySet = amenities[Math.floor(Math.random() * amenities.length)];
    const randomImage = salonImages[Math.floor(Math.random() * salonImages.length)];
    
    // Generate random coordinates near the city center (within ~10km radius)
    const latOffset = (Math.random() - 0.5) * 0.18; // ~10km
    const lngOffset = (Math.random() - 0.5) * 0.18; // ~10km
    const latitude = city.lat + latOffset;
    const longitude = city.lng + lngOffset;
    
    const salon = {
      owner_id: 'abd7c6ee-ead0-474f-bc24-0a2135d5405d', // Your user ID
      business_name: `${businessType} ${city.name} ${i + 1}`,
      description: `Professional ${businessType.toLowerCase()} in ${city.name}. Offering quality hair and beauty services.`,
      address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${city.name}`,
      city: city.name,
      state: "Netherlands",
      zip_code: `${Math.floor(Math.random() * 9000) + 1000} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      phone: `+31 ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
      email: `info@${businessType.toLowerCase().replace(/\s+/g, '')}${city.name.toLowerCase()}${i + 1}.nl`,
      images: [randomImage],
      website: `https://${businessType.toLowerCase().replace(/\s+/g, '')}${city.name.toLowerCase()}${i + 1}.nl`,
      rating_average: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
      rating_count: Math.floor(Math.random() * 200) + 10,
      latitude: latitude,
      longitude: longitude,
      business_hours: {
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "09:00-17:00",
        sunday: "Closed"
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    salons.push(salon);
  }
  
  return salons;
}

async function seedSampleData() {
  try {
    console.log('🌱 Starting sample data seeding...');
    
    // Generate sample salons
    const sampleSalons = generateSampleSalons();
    console.log(`📊 Generated ${sampleSalons.length} sample salons`);
    
    // Insert salons in batches
    const batchSize = 100;
    for (let i = 0; i < sampleSalons.length; i += batchSize) {
      const batch = sampleSalons.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('salons')
        .insert(batch);
        
      if (error) {
        console.error(`❌ Error inserting batch ${i}-${i + batchSize}:`, error);
      } else {
        console.log(`✅ Inserted batch ${i}-${i + batchSize}`);
      }
    }
    
    console.log('🎉 Sample data seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  }
}

async function clearSampleData() {
  try {
    console.log('🗑️ Clearing sample data...');
    
    // Delete all salons (be careful with this!)
    const { error } = await supabase
      .from('salons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) {
      console.error('❌ Error clearing sample data:', error);
    } else {
      console.log('✅ Sample data cleared!');
    }
    
  } catch (error) {
    console.error('❌ Error clearing sample data:', error);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'seed') {
  seedSampleData();
} else if (command === 'clear') {
  clearSampleData();
} else {
  console.log('Usage:');
  console.log('  node seed-sample-data.js seed  - Add 1000 sample salons');
  console.log('  node seed-sample-data.js clear - Remove all salons');
}

