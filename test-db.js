require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('🔍 Testing Supabase Database Connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('1. Testing connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message);
    } else {
      console.log('✅ Connection successful');
    }

    // Test 2: Check if user_profiles table exists
    console.log('\n2. Checking user_profiles table...');
    const { data: tableData, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ user_profiles table error:', tableError.message);
      console.log('❌ Code:', tableError.code);
    } else {
      console.log('✅ user_profiles table exists');
      console.log('📊 Sample data:', tableData);
    }

    // Test 3: List all tables in public schema
    console.log('\n3. Listing all tables in public schema...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list');

    if (tablesError) {
      console.log('❌ Could not list tables:', tablesError.message);
    } else {
      console.log('📋 Available tables:', tables);
    }

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

testDatabase();

