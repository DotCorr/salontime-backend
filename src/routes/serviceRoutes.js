const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

// Get all services for a salon
router.get('/', authenticateToken, serviceController.getSalonServices);

// Create a new service
router.post('/', authenticateToken, serviceController.createService);

// Get service categories
router.get('/categories', authenticateToken, serviceController.getServiceCategories);

// Update a service
router.put('/:serviceId', authenticateToken, serviceController.updateService);

// Delete a service
router.delete('/:serviceId', authenticateToken, serviceController.deleteService);

module.exports = router;