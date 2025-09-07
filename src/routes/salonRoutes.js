const express = require('express');
const router = express.Router();
const salonController = require('../controllers/salonController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/search', salonController.searchSalons);
router.get('/:salonId', salonController.getSalon);

// Protected routes (require authentication)
router.use(authenticateToken);

// Salon owner routes
router.post('/', salonController.createSalon);
router.get('/my/salon', salonController.getMySalon);
router.put('/my/salon', salonController.updateSalon);

// Stripe Connect routes
router.post('/stripe/account', salonController.createStripeAccount);
router.get('/stripe/onboarding-link', salonController.generateStripeOnboardingLink);

module.exports = router;

