// Load environment variables first
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side doesn't need session persistence
      detectSessionInUrl: false // Server-side doesn't detect sessions from URL
    }
  }
);

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
      console.warn('⚠️  Supabase connection warning:', error.message);
    } else {
      console.log('✅ Supabase connection established');
    }
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
};

// Test connection on startup
testConnection();

module.exports = {
  supabase,
  supabaseAdmin
};

