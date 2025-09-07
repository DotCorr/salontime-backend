const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/auth');

// All subscription routes require authentication
router.use(authenticateToken);

// Subscription management routes
router.post('/create', subscriptionController.createSubscription);
router.get('/status', subscriptionController.getSubscriptionStatus);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/billing-portal', subscriptionController.createBillingPortal);

module.exports = router;

