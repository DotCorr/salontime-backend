const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile management
router.put('/profile', userController.updateProfile);
router.get('/profile', userController.getProfile);
router.get('/dashboard', userController.getDashboard);

// Notification settings
router.get('/notification-settings', userController.getNotificationSettings);
router.put('/notification-settings', userController.updateNotificationSettings);

module.exports = router;

