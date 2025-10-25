const express = require('express');
const router = express.Router();
const businessHoursController = require('../controllers/businessHoursController');

// Get salon's business hours
router.get('/:salonId/business-hours', businessHoursController.getBusinessHours);

// Update salon's business hours
router.put('/:salonId/business-hours', businessHoursController.updateBusinessHours);

module.exports = router;

