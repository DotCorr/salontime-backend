const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/search', serviceController.searchServices);
router.get('/categories', serviceController.getServiceCategories);
router.get('/:serviceId', serviceController.getServiceDetails);
router.get('/salon/:salon_id', serviceController.getSalonServices);

// Protected routes (require authentication)
router.use(authenticateToken);

// Salon owner service management routes
router.post('/', serviceController.createService);
router.get('/my/services', serviceController.getMyServices);
router.put('/:serviceId', serviceController.updateService);
router.delete('/:serviceId', serviceController.deleteService);

module.exports = router;

