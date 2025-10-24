const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { supabase } = require('../config/database');

/**
 * Cron job routes for Vercel scheduled functions
 * These endpoints should be protected by Vercel's cron secret
 */

// Middleware to verify cron secret (only for Vercel cron jobs)
const verifyCronSecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid cron secret',
    });
  }
  
  next();
};

/**
 * Update trending scores
 * GET /api/cron/update-trending-scores
 */
router.get('/update-trending-scores', verifyCronSecret, async (req, res) => {
  console.log(`🔄 [${new Date().toISOString()}] Cron: Starting trending scores update...`);
  
  try {
    const result = await analyticsService.updateAllTrendingScores();
    
    if (result.success) {
      console.log(`✅ [${new Date().toISOString()}] Cron: Trending scores updated successfully`);
      return res.status(200).json({
        success: true,
        message: 'Trending scores updated successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Cron: Error updating trending scores:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update trending scores',
      details: error.message,
    });
  }
});

/**
 * Update featured status based on subscriptions
 * GET /api/cron/update-featured-status
 */
router.get('/update-featured-status', verifyCronSecret, async (req, res) => {
  console.log(`⭐ [${new Date().toISOString()}] Cron: Starting featured status update...`);
  
  try {
    const now = new Date().toISOString();
    
    // Remove featured flag from expired subscriptions
    await supabase
      .from('salons')
      .update({ is_featured: false })
      .lt('featured_until', now)
      .eq('is_featured', true);
    
    // Add featured flag to active paid subscriptions
    await supabase
      .from('salons')
      .update({
        is_featured: true,
        featured_until: supabase.raw('subscription_ends_at')
      })
      .eq('subscription_status', 'active')
      .in('subscription_plan', ['premium', 'professional', 'enterprise'])
      .eq('is_active', true)
      .eq('is_featured', false);
    
    console.log(`✅ [${new Date().toISOString()}] Cron: Featured status updated successfully`);
    return res.status(200).json({
      success: true,
      message: 'Featured status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Cron: Error updating featured status:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update featured status',
      details: error.message,
    });
  }
});

/**
 * Clean up old salon views (older than 90 days)
 * GET /api/cron/cleanup-old-views
 */
router.get('/cleanup-old-views', verifyCronSecret, async (req, res) => {
  console.log(`🧹 [${new Date().toISOString()}] Cron: Starting old views cleanup...`);
  
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { error } = await supabase
      .from('salon_views')
      .delete()
      .lt('viewed_at', ninetyDaysAgo.toISOString());
    
    if (error) throw error;
    
    console.log(`✅ [${new Date().toISOString()}] Cron: Old views cleaned up successfully`);
    return res.status(200).json({
      success: true,
      message: 'Old views cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Cron: Error cleaning up old views:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clean up old views',
      details: error.message,
    });
  }
});

module.exports = router;

