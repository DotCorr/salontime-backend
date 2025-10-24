const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserProfile() {
  try {
    console.log('🔍 Checking current user profiles...');
    
    // Check existing profiles
    const { data: existingProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profileError) {
      console.log('❌ Profile error:', profileError);
      return;
    }
    
    console.log('👤 Found', existingProfiles.length, 'existing profiles');
    existingProfiles.forEach(profile => {
      console.log(`  - ${profile.id}: ${profile.first_name} ${profile.last_name}`);
    });
    
    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth error:', authError);
      return;
    }
    
    console.log('👥 Found', authUsers.users.length, 'users in auth');
    authUsers.users.forEach(user => {
      console.log(`  - ${user.id}: ${user.email}`);
    });
    
    // Find the user that's trying to log in (from the logs: abd7c6ee-ead0-474f-bc24-0a2135d5405d)
    const targetUserId = 'abd7c6ee-ead0-474f-bc24-0a2135d5405d';
    const targetUser = authUsers.users.find(user => user.id === targetUserId);
    
    if (!targetUser) {
      console.log('❌ Target user not found in auth');
      return;
    }
    
    console.log('🎯 Target user found:', targetUser.email);
    
    // Check if this user already has a profile
    const existingProfile = existingProfiles.find(profile => profile.id === targetUserId);
    
    if (existingProfile) {
      console.log('✅ User already has a profile:', existingProfile);
    } else {
      console.log('🔧 Creating profile for target user...');
      
      const profileData = {
        id: targetUserId,
        first_name: targetUser.user_metadata?.first_name || 'Tahiru',
        last_name: targetUser.user_metadata?.last_name || '',
        user_type: 'client'
      };
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();
        
      if (createError) {
        console.log('❌ Failed to create profile:', createError);
      } else {
        console.log('✅ Created profile for', targetUser.email, ':', newProfile.id);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

fixUserProfile();
