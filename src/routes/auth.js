const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post('/oauth/generate-url', authController.generateOAuthUrl);
router.post('/oauth/callback', authController.handleOAuthCallback);
router.post('/refresh', authController.refreshToken);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/signout', authenticateToken, authController.signOut);
router.get('/check', authenticateToken, authController.checkAuth);

module.exports = router;

