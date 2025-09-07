const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { authenticateToken } = require('../middleware/auth');

// All onboarding routes require authentication
router.use(authenticateToken);

// Complete salon owner onboarding
router.post('/salon-owner', onboardingController.completeSalonOwnerOnboarding);

// Get onboarding status
router.get('/status', onboardingController.getOnboardingStatus);

// Complete Stripe onboarding (called after Stripe redirect)
router.post('/stripe/complete', onboardingController.completeStripeOnboarding);

module.exports = router;

