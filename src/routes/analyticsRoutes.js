const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes (with optional authentication for better tracking)
router.post('/salons/:id/track-view', optionalAuth, analyticsController.trackView);
router.get('/salons/trending', analyticsController.getTrendingSalons);
router.get('/salons/new', analyticsController.getNewSalons);
router.get('/salons/featured', analyticsController.getFeaturedSalons);
router.get('/salons/popular-rated', analyticsController.getPopularSalons);

// Protected routes (require authentication)
router.get('/salons/:id/analytics/views', authenticateToken, analyticsController.getViewStats);
router.get('/salons/:id/analytics', authenticateToken, analyticsController.getSalonAnalytics);

// Admin/Cron routes
router.post('/salons/update-trending-scores', analyticsController.updateTrendingScores);

module.exports = router;

