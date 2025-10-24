const cron = require('node-cron');
const analyticsService = require('../services/analyticsService');

/**
 * Scheduled Jobs for SalonTime
 * 
 * This file contains all scheduled background jobs
 */

/**
 * Update trending scores for all salons
 * Runs every hour at :00 minutes
 */
const updateTrendingScoresJob = cron.schedule('0 * * * *', async () => {
  console.log(`🔄 [${new Date().toISOString()}] Starting trending scores update...`);
  
  try {
    const result = await analyticsService.updateAllTrendingScores();
    
    if (result.success) {
      console.log(`✅ [${new Date().toISOString()}] Trending scores updated successfully`);
    } else {
      console.error(`❌ [${new Date().toISOString()}] Failed to update trending scores:`, result.error);
    }
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Error in trending scores job:`, error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Amsterdam" // Netherlands timezone
});

/**
 * Clean up old salon views (older than 90 days)
 * Runs daily at 2:00 AM
 */
const cleanupOldViewsJob = cron.schedule('0 2 * * *', async () => {
  console.log(`🧹 [${new Date().toISOString()}] Starting old views cleanup...`);
  
  try {
    const { supabase } = require('../config/database');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data, error } = await supabase
      .from('salon_views')
      .delete()
      .lt('viewed_at', ninetyDaysAgo.toISOString());
    
    if (error) throw error;
    
    console.log(`✅ [${new Date().toISOString()}] Old views cleaned up successfully`);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Error in cleanup job:`, error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Amsterdam"
});

/**
 * Update featured status based on subscription expiry
 * Runs every day at 1:00 AM
 */
const updateFeaturedStatusJob = cron.schedule('0 1 * * *', async () => {
  console.log(`⭐ [${new Date().toISOString()}] Starting featured status update...`);
  
  try {
    const { supabase } = require('../config/database');
    const now = new Date().toISOString();
    
    // Remove featured flag from expired subscriptions
    const { data: expired, error: expiredError } = await supabase
      .from('salons')
      .update({ is_featured: false })
      .lt('featured_until', now)
      .eq('is_featured', true);
    
    if (expiredError) throw expiredError;
    
    // Add featured flag to active paid subscriptions
    const { data: active, error: activeError } = await supabase
      .from('salons')
      .update({
        is_featured: true,
        featured_until: supabase.raw('subscription_ends_at')
      })
      .eq('subscription_status', 'active')
      .in('subscription_plan', ['premium', 'professional', 'enterprise'])
      .eq('is_active', true)
      .eq('is_featured', false);
    
    if (activeError) throw activeError;
    
    console.log(`✅ [${new Date().toISOString()}] Featured status updated successfully`);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Error in featured status job:`, error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Amsterdam"
});

/**
 * Start all scheduled jobs
 */
function startScheduledJobs() {
  console.log('📅 Starting scheduled jobs...');
  console.log('   - Trending scores update: Every hour at :00');
  console.log('   - Old views cleanup: Daily at 2:00 AM');
  console.log('   - Featured status update: Daily at 1:00 AM');
  
  updateTrendingScoresJob.start();
  cleanupOldViewsJob.start();
  updateFeaturedStatusJob.start();
  
  console.log('✅ All scheduled jobs started successfully');
}

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
function stopScheduledJobs() {
  console.log('🛑 Stopping scheduled jobs...');
  
  updateTrendingScoresJob.stop();
  cleanupOldViewsJob.stop();
  updateFeaturedStatusJob.stop();
  
  console.log('✅ All scheduled jobs stopped');
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  updateTrendingScoresJob,
  cleanupOldViewsJob,
  updateFeaturedStatusJob,
};

