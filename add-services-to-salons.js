const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample services for salons
const salonServiceTemplates = [
  // Hair Services
  { name: 'Haircut - Men', description: 'Professional men\'s haircut', price: 25.00, duration: 30, category: 'Hair' },
  { name: 'Haircut - Women', description: 'Women\'s haircut and styling', price: 45.00, duration: 60, category: 'Hair' },
  { name: 'Hair Coloring', description: 'Full hair color treatment', price: 75.00, duration: 120, category: 'Hair' },
  { name: 'Highlights', description: 'Partial or full highlights', price: 85.00, duration: 150, category: 'Hair' },
  { name: 'Balayage', description: 'Hand-painted highlights', price: 120.00, duration: 180, category: 'Hair' },
  { name: 'Wash & Blow Dry', description: 'Hair wash and styling', price: 30.00, duration: 45, category: 'Hair' },
  { name: 'Keratin Treatment', description: 'Smoothing keratin treatment', price: 150.00, duration: 180, category: 'Hair' },
  
  // Beauty Services
  { name: 'Manicure', description: 'Hand and nail care', price: 25.00, duration: 45, category: 'Nails' },
  { name: 'Pedicure', description: 'Foot and nail care', price: 35.00, duration: 60, category: 'Nails' },
  { name: 'Gel Nails', description: 'Gel nail application', price: 45.00, duration: 60, category: 'Nails' },
  { name: 'Facial Treatment', description: 'Deep cleansing facial', price: 60.00, duration: 60, category: 'Skincare' },
  { name: 'Eyebrow Threading', description: 'Eyebrow shaping', price: 15.00, duration: 15, category: 'Beauty' },
  { name: 'Eyelash Extensions', description: 'Individual lash extensions', price: 80.00, duration: 90, category: 'Beauty' },
  { name: 'Makeup Application', description: 'Professional makeup', price: 50.00, duration: 60, category: 'Beauty' },
  { name: 'Bridal Package', description: 'Complete bridal styling', price: 200.00, duration: 240, category: 'Special' },
];

async function addServicesToSalons() {
  try {
    console.log('🔍 Fetching all salons...');
    
    // Get all salons
    const { data: salons, error: salonsError } = await supabase
      .from('salons')
      .select('id, business_name');
    
    if (salonsError) {
      throw salonsError;
    }
    
    console.log(`✅ Found ${salons.length} salons`);
    
    let totalServicesAdded = 0;
    
    for (const salon of salons) {
      console.log(`\n📍 Processing: ${salon.business_name}`);
      
      // Randomly select 5-10 services for each salon
      const numServices = Math.floor(Math.random() * 6) + 5; // 5 to 10 services
      const shuffled = [...salonServiceTemplates].sort(() => Math.random() - 0.5);
      const selectedServices = shuffled.slice(0, numServices);
      
      // Prepare services with salon_id
      const services = selectedServices.map(service => ({
        salon_id: salon.id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category_id: null, // We'll add categories later if needed
        is_active: true
      }));
      
      // Insert services
      const { data, error } = await supabase
        .from('services')
        .insert(services)
        .select();
      
      if (error) {
        console.error(`   ❌ Error adding services to ${salon.business_name}:`, error.message);
        continue;
      }
      
      console.log(`   ✅ Added ${data.length} services to ${salon.business_name}`);
      totalServicesAdded += data.length;
    }
    
    console.log(`\n🎉 COMPLETE! Added ${totalServicesAdded} services to ${salons.length} salons`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Also update business_hours to proper format
async function updateBusinessHours() {
  try {
    console.log('\n🕐 Updating business hours format...');
    
    const { data: salons, error: salonsError } = await supabase
      .from('salons')
      .select('id, business_hours');
    
    if (salonsError) throw salonsError;
    
    for (const salon of salons) {
      // Convert "09:00-18:00" to { open: "09:00", close: "18:00" }
      const updatedHours = {};
      
      for (const [day, hours] of Object.entries(salon.business_hours || {})) {
        if (hours === 'Closed' || hours === 'closed') {
          updatedHours[day.toLowerCase()] = null;
        } else if (typeof hours === 'string' && hours.includes('-')) {
          const [open, close] = hours.split('-');
          updatedHours[day.toLowerCase()] = { open: open.trim(), close: close.trim() };
        } else {
          updatedHours[day.toLowerCase()] = hours; // Already in correct format
        }
      }
      
      // Update salon
      const { error } = await supabase
        .from('salons')
        .update({ business_hours: updatedHours })
        .eq('id', salon.id);
      
      if (error) {
        console.error(`   ❌ Error updating hours for salon ${salon.id}:`, error.message);
      }
    }
    
    console.log('✅ Business hours updated');
    
  } catch (error) {
    console.error('❌ Error updating business hours:', error);
  }
}

// Run both
(async () => {
  await updateBusinessHours();
  await addServicesToSalons();
  process.exit(0);
})();

