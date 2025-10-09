const express = require('express');
const router = express.Router();
const userSettingsController = require('../controllers/userSettingsController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/user/settings - Get user settings
router.get('/settings', userSettingsController.getSettings);

// PUT /api/user/settings - Update user settings
router.put('/settings', userSettingsController.updateSettings);

// POST /api/user/settings - Create default settings (if needed)
router.post('/settings', userSettingsController.createDefaultSettings);

module.exports = router;
