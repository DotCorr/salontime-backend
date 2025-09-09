// Simple test to see if backend runs
require('dotenv').config();
console.log('🔧 Testing backend startup...');

const config = require('./src/config');
console.log('✅ Config loaded');

const { supabase } = require('./src/config/database');
console.log('✅ Supabase loaded');

console.log('✅ Basic imports working');
console.log('🚀 Backend test complete');

