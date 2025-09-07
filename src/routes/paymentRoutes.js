const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticateToken);

// Client payment routes
router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/methods', paymentController.getPaymentMethods);
router.delete('/methods/:payment_method_id', paymentController.deletePaymentMethod);
router.get('/history', paymentController.getPaymentHistory);

// Salon owner payment routes
router.post('/refund', paymentController.processRefund);
router.get('/analytics', paymentController.getRevenueAnalytics);

module.exports = router;

