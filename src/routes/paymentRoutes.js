const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Webhook route (no auth required) - must be first
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// All other payment routes require authentication
router.use(authenticateToken);

// Client payment routes
router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/confirm/:paymentIntentId', paymentController.confirmPayment);
router.get('/history', paymentController.getPaymentHistory);

// Salon owner payment routes
router.get('/salon', paymentController.getSalonPayments);
router.get('/analytics', paymentController.getPaymentAnalytics);

// Subscription routes
router.post('/subscription', paymentController.processSubscription);

module.exports = router;

