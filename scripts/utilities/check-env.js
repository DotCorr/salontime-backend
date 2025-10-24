#!/usr/bin/env node

/**
 * Check Environment Variables
 */

// Load environment variables
require('dotenv').config();

console.log('🔍 Checking Environment Variables...\n');

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const missing = [];
const present = [];

required.forEach(key => {
  if (process.env[key]) {
    present.push(key);
    console.log(`✅ ${key}: ${process.env[key].substring(0, 10)}...`);
  } else {
    missing.push(key);
    console.log(`❌ ${key}: Not set`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Present: ${present.length}/${required.length}`);
console.log(`❌ Missing: ${missing.length}/${required.length}`);

if (missing.length > 0) {
  console.log(`\n🔧 Missing variables:`);
  missing.forEach(key => console.log(`   - ${key}`));
  
  if (missing.includes('STRIPE_WEBHOOK_SECRET')) {
    console.log(`\n💡 To get webhook secret:`);
    console.log(`   stripe listen --print-secret`);
  }
} else {
  console.log(`\n🎉 All required environment variables are set!`);
}
