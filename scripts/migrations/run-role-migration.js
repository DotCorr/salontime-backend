#!/usr/bin/env node

/**
 * Run migration to ensure role column exists
 * This script is safe to run multiple times
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runMigration() {
  try {
    console.log('🔧 Running migration: ensure_role_column.sql\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'ensure_role_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct execution...\n');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          // Note: Supabase client doesn't support raw SQL execution
          // This migration needs to be run manually in Supabase SQL Editor
        }
      }
      
      console.log('\n⚠️  This migration must be run manually in Supabase SQL Editor.');
      console.log('📋 Steps:');
      console.log('   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
      console.log('   2. Copy the contents of database/migrations/ensure_role_column.sql');
      console.log('   3. Paste and run the SQL');
      console.log('\n📄 Migration file location:', migrationPath);
      
    } else {
      console.log('✅ Migration completed successfully!');
      if (data) {
        console.log('Result:', data);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

