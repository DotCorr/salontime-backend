const analyticsService = require('../services/analyticsService');

/**
 * Track salon view
 * POST /api/salons/:id/track-view
 */
async function trackView(req, res) {
  try {
    const { id: salonId } = req.params;
    const userId = req.user?.id || null;
    const { session_id, source, device_type } = req.body;

    const result = await analyticsService.trackSalonView(salonId, userId, {
      session_id,
      source,
      device_type,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to track view',
        details: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message: 'View tracked successfully',
    });
  } catch (error) {
    console.error('Error in trackView controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get salon view statistics
 * GET /api/salons/:id/analytics/views
 */
async function getViewStats(req, res) {
  try {
    const { id: salonId } = req.params;

    const result = await analyticsService.getSalonViewStats(salonId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get view stats',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getViewStats controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get trending salons
 * GET /api/salons/trending
 */
async function getTrendingSalons(req, res) {
  try {
    const { limit = 10, latitude, longitude, radius = 50 } = req.query;

    const result = await analyticsService.getTrendingSalons(
      parseInt(limit),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      parseInt(radius)
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get trending salons',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getTrendingSalons controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get new salons
 * GET /api/salons/new
 */
async function getNewSalons(req, res) {
  try {
    const { days = 30, limit = 10, latitude, longitude, radius = 25 } = req.query;

    const result = await analyticsService.getNewSalons(
      parseInt(days),
      parseInt(limit),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      parseInt(radius)
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get new salons',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getNewSalons controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get featured salons
 * GET /api/salons/featured
 */
async function getFeaturedSalons(req, res) {
  try {
    const { limit = 10, latitude, longitude, radius = 50 } = req.query;

    const result = await analyticsService.getFeaturedSalons(
      parseInt(limit),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      parseInt(radius)
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get featured salons',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getFeaturedSalons controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get popular salons
 * GET /api/salons/popular-rated
 */
async function getPopularSalons(req, res) {
  try {
    const {
      min_rating = 4.5,
      min_reviews = 10,
      limit = 10,
      latitude,
      longitude,
      radius = 50,
    } = req.query;

    const result = await analyticsService.getPopularSalons(
      parseFloat(min_rating),
      parseInt(min_reviews),
      parseInt(limit),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      parseInt(radius)
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get popular salons',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getPopularSalons controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get salon analytics summary (for salon owners)
 * GET /api/salons/:id/analytics
 */
async function getSalonAnalytics(req, res) {
  try {
    const { id: salonId } = req.params;

    // Check if user owns this salon
    if (req.user.role === 'salon_owner') {
      const { supabase } = require('../config/database');
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', salonId)
        .single();

      if (!salon || salon.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view analytics for this salon',
        });
      }
    }

    const result = await analyticsService.getSalonAnalytics(salonId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get salon analytics',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getSalonAnalytics controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Update trending scores (admin only or cron job)
 * POST /api/salons/update-trending-scores
 */
async function updateTrendingScores(req, res) {
  try {
    // This endpoint should be protected and only accessible by admin or cron job
    const result = await analyticsService.updateAllTrendingScores();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update trending scores',
        details: result.error,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateTrendingScores controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

module.exports = {
  trackView,
  getViewStats,
  getTrendingSalons,
  getNewSalons,
  getFeaturedSalons,
  getPopularSalons,
  getSalonAnalytics,
  updateTrendingScores,
};

